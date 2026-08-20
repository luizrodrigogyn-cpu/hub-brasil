import { env } from "cloudflare:workers";
import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";

export function isAdminEmail(email: string) {
  const configured = String((env as unknown as Record<string, unknown>).ADMIN_EMAILS || "");
  return configured.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export function isHubAdmin(user: ChatGPTUser | null): user is ChatGPTUser {
  return Boolean(user && isAdminEmail(user.email) && user.secondFactorVerified);
}

export async function requireHubAdmin(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  if (!isHubAdmin(user)) throw new Error("FORBIDDEN_OR_MFA_REQUIRED");
  return user;
}

export async function getApiUser() {
  return getChatGPTUser();
}
