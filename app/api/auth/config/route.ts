import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function GET() {
  const publishableKey = String((env as unknown as Record<string, unknown>).CLERK_PUBLISHABLE_KEY || "");
  if (!publishableKey.startsWith("pk_")) {
    return Response.json({ error: "Autenticação indisponível" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  return Response.json({ publishableKey }, { headers: { "cache-control": "no-store" } });
}
