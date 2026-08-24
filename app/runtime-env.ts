import { env } from "cloudflare:workers";

export function runtimeValue(key: string) {
  const bindings = env as unknown as Record<string, string | undefined>;
  return bindings[key] || process.env[key] || "";
}
