import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser } from "./chatgpt-auth";

export function isAdminEmail(email: string) {
  const configured = String((env as unknown as Record<string, unknown>).ADMIN_EMAILS || "");
  return configured.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export async function requireHubAdmin(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  if (!isAdminEmail(user.email)) throw new Error("FORBIDDEN");
  return user;
}

export async function getApiUser() {
  return getChatGPTUser();
}
