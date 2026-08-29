import { createClerkClient } from "@clerk/backend";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { runtimeValue } from "./runtime-env";
import { getDb } from "../db";
import { loginSessions } from "../db/schema";
import { blindIndex } from "./pii-crypto";

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

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const secretKey = runtimeValue("CLERK_SECRET_KEY");
  const publishableKey = runtimeValue("CLERK_PUBLISHABLE_KEY");
  if (!secretKey || !publishableKey) return null;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hub.niviontech.com.br";
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  const authorizedParties = runtimeValue("CLERK_AUTHORIZED_PARTIES").split(",").map((value) => value.trim()).filter(Boolean);
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
    if (auth.sessionId) {
      const now = new Date().toISOString();
      await getDb().insert(loginSessions).values({ sessionId: auth.sessionId, userId: auth.userId, emailHash: await blindIndex(email), lastSeenAt: now }).onConflictDoUpdate({ target: loginSessions.sessionId, set: { lastSeenAt: now } });
    }
    return { userId: auth.userId, displayName: fullName || email, email, fullName, secondFactorVerified: Array.isArray(factors) && Number(factors[1]) >= 0 };
  } catch {
    return null;
  }
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
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
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH ||
    pathname === "/signin-with-chatgpt" ||
    pathname === "/signout-with-chatgpt"
  );
}
