/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PRODUCT_IMAGES: R2Bucket;
  ERROR_QUEUE: Queue<ErrorReportMessage>;
  ERROR_ALERT_WEBHOOK_URL?: string;
  ADMIN_EMAILS: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_AUTHORIZED_PARTIES: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type ErrorReportMessage = {
  errorId: string;
  organizationId?: string | null;
  actorUserId?: string | null;
  source?: string;
  message?: string;
  details?: string;
  stack?: string;
  path?: string;
  userAgent?: string;
  occurredAt?: string;
};

function clipped(value: unknown, max: number) {
  return String(value || "").slice(0, max);
}

async function persistError(env: Env, message: ErrorReportMessage) {
  const incidentId = clipped(message.errorId, 100) || crypto.randomUUID();
  await env.DB.prepare(`INSERT OR IGNORE INTO error_incidents
    (id, organization_id, actor_user_id, source, severity, message, details, stack, path, user_agent, status, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`).bind(
      incidentId,
      message.organizationId || null,
      message.actorUserId || null,
      clipped(message.source, 30) || "client",
      "error",
      clipped(message.message, 500) || "Erro relatado pelo cliente",
      clipped(message.details, 2000) || null,
      clipped(message.stack, 6000) || null,
      clipped(message.path, 500) || null,
      clipped(message.userAgent, 500) || null,
      message.occurredAt || new Date().toISOString(),
    ).run();
  console.error(JSON.stringify({ event: "error_incident_queued", errorId: incidentId, organizationId: message.organizationId || null, path: message.path || null }));
  if (env.ERROR_ALERT_WEBHOOK_URL) {
    const alert = await fetch(env.ERROR_ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `Hub Brasil: novo erro ${incidentId} em ${clipped(message.path, 200) || "rota desconhecida"}` }),
    });
    if (!alert.ok) throw new Error(`Alert webhook returned ${alert.status}`);
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

// Cabeçalhos de segurança aplicados a toda resposta HTML/documento. CSP fica de fora por ora —
// definir uma política errada quebra o Clerk (login) e outros scripts legítimos silenciosamente;
// precisa ser testada em modo report-only num ambiente real antes de ativar em produção.
function withSecurityHeaders(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  if (!headers.has("x-content-type-options")) headers.set("x-content-type-options", "nosniff");
  if (!headers.has("referrer-policy")) headers.set("referrer-policy", "strict-origin-when-cross-origin");
  if (!headers.has("x-frame-options")) headers.set("x-frame-options", "DENY");
  if (!headers.has("permissions-policy")) headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  if (!headers.has("strict-transport-security")) headers.set("strict-transport-security", "max-age=31536000");
  headers.set("x-request-id", requestId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    if (url.protocol === "http:") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 308);
    }

    // The Clerk publishable key is designed to be public.  Serving it from the
    // Worker avoids relying on a server-component environment binding, which
    // is not consistently available during Vinext client hydration.
    if (url.pathname === "/hb-init") {
      return Response.json(
        { clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || "" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    try {
      return withSecurityHeaders(await handler.fetch(request, env, ctx), requestId);
    } catch (error) {
      console.error(JSON.stringify({ event: "worker_unhandled_error", requestId, method: request.method, path: url.pathname, message: error instanceof Error ? error.message : "Unknown error", stack: error instanceof Error ? error.stack?.slice(0, 4000) : undefined, occurredAt: new Date().toISOString() }));
      return withSecurityHeaders(Response.json({ error: "Não foi possível concluir esta solicitação.", errorId: requestId }, { status: 500 }), requestId);
    }
  },
  async queue(batch: MessageBatch<ErrorReportMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await persistError(env, message.body);
        message.ack();
      } catch (error) {
        console.error(JSON.stringify({ event: "error_queue_failure", messageId: message.id, error: error instanceof Error ? error.message : "unknown" }));
        message.retry();
      }
    }
  },
};

export default worker;
