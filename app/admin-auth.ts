import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { runtimeValue } from "./runtime-env";

export function isAdminEmail(email: string) {
  const configured = runtimeValue("ADMIN_EMAILS");
  return configured.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

function isAllowlistedAdmin(user: ChatGPTUser | null): user is ChatGPTUser {
  return Boolean(user && isAdminEmail(user.email));
}

export type AdminAccessState = "denied" | "needs_2fa" | "granted";

// O segundo fator pode ser reativado sem mudança de código definindo
// ADMIN_REQUIRE_2FA=true. Enquanto a opção estiver ausente/desativada, o
// gestor continua protegido pelo login do Clerk e pela allowlist de e-mails.
export function adminAccessState(user: ChatGPTUser | null): AdminAccessState {
  if (!isAllowlistedAdmin(user)) return "denied";
  const requireSecondFactor = runtimeValue("ADMIN_REQUIRE_2FA").toLowerCase() === "true";
  if (requireSecondFactor && !user.secondFactorVerified) return "needs_2fa";
  return "granted";
}

export function isHubAdmin(user: ChatGPTUser | null): user is ChatGPTUser {
  return adminAccessState(user) === "granted";
}

export async function requireHubAdmin(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  if (!isHubAdmin(user)) throw new Error("FORBIDDEN_OR_MFA_REQUIRED");
  return user;
}

export async function getApiUser() {
  return getChatGPTUser();
}
