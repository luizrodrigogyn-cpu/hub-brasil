import { env } from "cloudflare:workers";
import { getTenantContext } from "../../tenant-context";
import { FEATURES, requireFeature } from "../../features";

const MAX_BODY_BYTES = 16_000;

function safeText(value: unknown, max: number) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export async function POST(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site"].includes(fetchSite)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ error: "Formato inválido." }, { status: 415 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return Response.json({ error: "Relato muito grande." }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const errorId = safeText(body.errorId, 100) || crypto.randomUUID();
  const tenant = await getTenantContext();
  if (tenant) {
    const featureError = await requireFeature(tenant.organizationId, FEATURES.reports);
    if (featureError) return featureError;
  }
  const report = {
    event: "client_error_report",
    errorId,
    source: body.source === "boundary" ? "boundary" : "user",
    message: safeText(body.message, 500),
    details: safeText(body.details, 1000),
    stack: safeText(body.stack, 4000),
    path: safeText(body.path, 300),
    userAgent: safeText(body.userAgent, 300),
    organizationId: tenant?.organizationId || null,
    actorUserId: tenant?.user.userId || null,
    occurredAt: new Date().toISOString(),
  };
  try {
    await env.ERROR_QUEUE.send(report, { contentType: "json" });
  } catch (queueError) {
    console.error(JSON.stringify({ ...report, queueFallback: true, queueError: queueError instanceof Error ? queueError.message : "unknown" }));
  }
  return Response.json({ ok: true, errorId }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
