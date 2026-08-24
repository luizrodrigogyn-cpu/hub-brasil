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

// Segunda camada real de proteção: a allowlist de e-mail sozinha não é
// suficiente para liberar acesso administrativo. `secondFactorVerified`
// vem do Clerk (factorVerificationAge) e só é true quando a sessão atual
// passou de fato por verificação de segundo fator — não é só um texto de
// aviso, é checado em código antes de qualquer leitura/escrita de admin.
export function adminAccessState(user: ChatGPTUser | null): AdminAccessState {
  if (!isAllowlistedAdmin(user)) return "denied";
  if (!user.secondFactorVerified) return "needs_2fa";
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
