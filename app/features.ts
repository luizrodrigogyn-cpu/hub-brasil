import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { featureCatalog, organizationFeatures } from "../db/schema";

export const FEATURES = {
  directory: "directory",
  quotes: "quotes",
  messages: "messages",
  ratings: "ratings",
  community: "community",
  events: "events",
  credits: "credits",
  alerts: "alerts",
  reports: "reports",
} as const;

export type FeatureKey = keyof typeof FEATURES;

export async function isFeatureEnabled(organizationId: string, featureKey: FeatureKey) {
  const db = getDb();
  const [row] = await db.select({ override: organizationFeatures.enabled, defaultValue: featureCatalog.enabledByDefault })
    .from(featureCatalog)
    .leftJoin(organizationFeatures, and(eq(organizationFeatures.featureKey, featureCatalog.featureKey), eq(organizationFeatures.organizationId, organizationId)))
    .where(eq(featureCatalog.featureKey, featureKey))
    .limit(1);
  return row ? (row.override ?? row.defaultValue) : false;
}

export async function requireFeature(organizationId: string, featureKey: FeatureKey) {
  if (await isFeatureEnabled(organizationId, featureKey)) return null;
  return Response.json({ error: "Este módulo não está habilitado para sua organização.", feature: featureKey }, { status: 403 });
}
