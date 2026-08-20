import { createClerkClient } from "@clerk/backend";
import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  secondFactorVerified: boolean;
};

const SIGN_IN_PATH = "/sign-in";
const SIGN_OUT_PATH = "/sign-out";
const CALLBACK_PATH = "/callback";

function isPreviewHost(host: string) {
  return host.split(":")[0].endsWith(".workers.dev");
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const bindings = env as unknown as Record<string, string | undefined>;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hub.niviontech.com.br";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const preview = isPreviewHost(host);
  const secretKey = preview ? bindings.CLERK_DEVELOPMENT_SECRET_KEY : bindings.CLERK_SECRET_KEY;
  const publishableKey = preview ? bindings.CLERK_DEVELOPMENT_PUBLISHABLE_KEY : bindings.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) return null;

  const authorizedParties = String(bindings.CLERK_AUTHORIZED_PARTIES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const clerk = createClerkClient({ secretKey, publishableKey });
    const state = await clerk.authenticateRequest(
      new Request(`${protocol}://${host}/`, { headers: new Headers(requestHeaders) }),
      authorizedParties.length ? { authorizedParties } : undefined,
    );
    if (!state.isAuthenticated) return null;
    const auth = state.toAuth();
    if (!auth.userId) return null;
    const clerkUser = await clerk.users.getUser(auth.userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    if (!email) return null;
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
    const factors = auth.factorVerificationAge;
    return {
      userId: auth.userId,
      displayName: fullName || email,
      email,
      fullName,
      secondFactorVerified: Array.isArray(factors) && Number(factors[1]) >= 0,
    };
  } catch {
    return null;
  }
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH
    || pathname === SIGN_OUT_PATH
    || pathname === CALLBACK_PATH
    || pathname === "/signin-with-chatgpt"
    || pathname === "/signout-with-chatgpt";
}
