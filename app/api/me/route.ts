import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function GET() {
  const user = await getApiUser();
  if (!user) return Response.json({ authenticated: false });
  const [profile] = await getDb().select().from(leads).where(eq(leads.authUserId, user.userId));
  return Response.json({ authenticated: true, user: { email: user.email, name: user.displayName }, profile: profile || null });
}
