import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "./chatgpt-auth";
import { runtimeValue } from "./runtime-env";

export function isAdminEmail(email: string) {
  const configured = runtimeValue("ADMIN_EMAILS");
  return configured.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export function isHubAdmin(user: ChatGPTUser | null): user is ChatGPTUser {
  // O acesso é limitado à lista de e-mails autorizados e cada entrada exige
  // o código enviado pelo Clerk. A segunda camada adicional será aplicada
  // pelo Cloudflare Access quando o domínio próprio estiver conectado.
  return Boolean(user && isAdminEmail(user.email));
}

export async function requireHubAdmin(returnTo = "/admin") {
  const user = await requireChatGPTUser(returnTo);
  if (!isHubAdmin(user)) throw new Error("FORBIDDEN_OR_MFA_REQUIRED");
  return user;
}

export async function getApiUser() {
  return getChatGPTUser();
}
