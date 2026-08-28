import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { leads, organizationMembers, organizations } from "../db/schema";
import { getApiUser, type AdminAccessState, adminAccessState } from "./admin-auth";

export type TenantContext = {
  user: NonNullable<Awaited<ReturnType<typeof getApiUser>>>;
  organizationId: string;
  membershipRole: string;
  profile: typeof leads.$inferSelect | null;
  adminState: AdminAccessState;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  const user = await getApiUser();
  if (!user) return null;
  const db = getDb();
  const [membership] = await db.select({ organizationId: organizationMembers.organizationId, membershipRole: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, user.userId), eq(organizationMembers.status, "active")))
    .limit(1);
  if (!membership) return null;
  const [profile] = await db.select().from(leads).where(and(eq(leads.authUserId, user.userId), eq(leads.organizationId, membership.organizationId))).limit(1);
  return { user, organizationId: membership.organizationId, membershipRole: membership.membershipRole, profile: profile || null, adminState: adminAccessState(user) };
}

export async function ensurePersonalOrganization(userId: string, displayName: string, kind: "client" | "supplier") {
  const db = getDb();
  const [current] = await db.select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .limit(1);
  if (current) return current.organizationId;
  const organizationId = `org-${userId}`;
  const safeName = displayName.trim().slice(0, 140) || "Minha organização";
  await db.insert(organizations).values({ id: organizationId, name: safeName, slug: organizationId.toLowerCase(), kind }).onConflictDoNothing();
  await db.insert(organizationMembers).values({ organizationId, userId, role: "owner", status: "active" }).onConflictDoNothing();
  return organizationId;
}
