import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  instagram: text("instagram"),
  role: text("role").notNull().default("client"),
  authUserId: text("auth_user_id"),
  email: text("email"),
  status: text("status").notNull().default("pending"),
  phoneVerifiedAt: text("phone_verified_at"),
  category: text("category"),
  city: text("city"),
  state: text("state"),
  description: text("description"),
  consentAt: text("consent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  consentVersion: text("consent_version").notNull().default("2026-08-14"),
  contactConsent: integer("contact_consent", { mode: "boolean" }).notNull().default(true),
  verifiedAt: text("verified_at"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  serviceStates: text("service_states"),
  services: text("services"),
  serviceMode: text("service_mode"),
  servesNationwide: integer("serves_nationwide", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ authUserIdIdx: uniqueIndex("idx_leads_auth_user_id").on(table.authUserId) }));

export const leadEvents = sqliteTable("lead_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").references(() => leads.id),
  supplierId: integer("supplier_id"),
  productId: integer("product_id"),
  eventType: text("event_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supplierEvents = sqliteTable("supplier_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id"),
  name: text("name").notNull(),
  venue: text("venue").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  eventDate: text("event_date").notNull(),
  registrationUrl: text("registration_url").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  ownerUserId: text("owner_user_id"),
  supplierName: text("supplier_name"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ statusIdx: index("idx_events_status").on(table.status) }));

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierName: text("supplier_name").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  technicalDetails: text("technical_details").notNull(),
  averagePrice: text("average_price"),
  imageKey: text("image_key"),
  status: text("status").notNull().default("pending"),
  ownerUserId: text("owner_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ statusIdx: index("idx_products_status").on(table.status) }));

export const supplierRatings = sqliteTable("supplier_ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierName: text("supplier_name").notNull(),
  stars: integer("stars").notNull(),
  raterUserId: text("rater_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ uniqueRating: uniqueIndex("idx_ratings_supplier_rater").on(table.supplierName, table.raterUserId) }));

export const moderationAudit = sqliteTable("moderation_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminEmail: text("admin_email").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ createdIdx: index("idx_audit_created_at").on(table.createdAt) }));

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueFavorite: uniqueIndex("idx_favorites_user_entity").on(table.userId, table.entityType, table.entityId),
  entityIdx: index("idx_favorites_entity").on(table.entityType, table.entityId),
}));

export const activityEvents = sqliteTable("activity_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: text("actor_user_id"),
  supplierId: integer("supplier_id"),
  productId: integer("product_id"),
  eventId: integer("event_id"),
  kind: text("kind").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  supplierKindCreatedIdx: index("idx_activity_supplier_kind_created").on(table.supplierId, table.kind, table.createdAt),
  actorCreatedIdx: index("idx_activity_actor_created").on(table.actorUserId, table.createdAt),
}));

export const alertPreferences = sqliteTable("alert_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  categories: text("categories"),
  states: text("states"),
  contentTypes: text("content_types"),
  frequency: text("frequency").notNull().default("weekly"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  unsubscribeToken: text("unsubscribe_token").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdx: uniqueIndex("idx_alert_preferences_user").on(table.userId),
  tokenIdx: uniqueIndex("idx_alert_preferences_token").on(table.unsubscribeToken),
}));

export const quoteRequests = sqliteTable("quote_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  protocol: text("protocol").notNull(),
  clientUserId: text("client_user_id").notNull(),
  category: text("category").notNull(),
  application: text("application").notNull(),
  quantity: integer("quantity").notNull().default(1),
  city: text("city").notNull(),
  state: text("state").notNull(),
  deadline: text("deadline"),
  notes: text("notes"),
  status: text("status").notNull().default("open"),
  consentSnapshot: text("consent_snapshot").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  closedAt: text("closed_at"),
}, (table) => ({
  protocolIdx: uniqueIndex("idx_quote_requests_protocol").on(table.protocol),
  clientCreatedIdx: index("idx_quote_requests_client_created").on(table.clientUserId, table.createdAt),
}));

export const quoteRecipients = sqliteTable("quote_recipients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quoteId: integer("quote_id").notNull().references(() => quoteRequests.id),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  status: text("status").notNull().default("sent"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueRecipient: uniqueIndex("idx_quote_recipients_quote_supplier").on(table.quoteId, table.supplierId),
  supplierStatusIdx: index("idx_quote_recipients_supplier_status").on(table.supplierId, table.status),
}));

export const contentReports = sqliteTable("content_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterUserId: text("reporter_user_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ statusCreatedIdx: index("idx_reports_status_created").on(table.status, table.createdAt) }));

export const marketNeeds = sqliteTable("market_needs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientUserId: text("client_user_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  deadline: text("deadline"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
}, (table) => ({
  statusExpiryIdx: index("idx_market_needs_status_expiry").on(table.status, table.expiresAt),
  clientCreatedIdx: index("idx_market_needs_client_created").on(table.clientUserId, table.createdAt),
}));

export const needInterests = sqliteTable("need_interests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  needId: integer("need_id").notNull().references(() => marketNeeds.id),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  message: text("message"),
  status: text("status").notNull().default("interested"),
  contactSharedAt: text("contact_shared_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueInterest: uniqueIndex("idx_need_interests_need_supplier").on(table.needId, table.supplierId),
  supplierIdx: index("idx_need_interests_supplier").on(table.supplierId),
}));

export const supplierUpdates = sqliteTable("supplier_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  link: text("link"),
  status: text("status").notNull().default("pending"),
  publishedAt: text("published_at"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ statusExpiryIdx: index("idx_supplier_updates_status_expiry").on(table.status, table.expiresAt) }));

export const eventInterests = sqliteTable("event_interests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull().references(() => supplierEvents.id),
  userId: text("user_id").notNull(),
  reminderEnabled: integer("reminder_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ uniqueInterest: uniqueIndex("idx_event_interests_event_user").on(table.eventId, table.userId) }));

export const technicalArticles = sqliteTable("technical_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  author: text("author").notNull(),
  sourceType: text("source_type").notNull().default("editorial"),
  status: text("status").notNull().default("draft"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ slugIdx: uniqueIndex("idx_technical_articles_slug").on(table.slug), statusIdx: index("idx_technical_articles_status").on(table.status) }));

export const sectorNews = sqliteTable("sector_news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  imageUrl: text("image_url"),
  publishedAt: text("published_at").notNull(),
  status: text("status").notNull().default("pending"),
  origin: text("origin").notNull().default("manual"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusPublishedIdx: index("idx_sector_news_status_published").on(table.status, table.publishedAt),
  sourceUrlIdx: uniqueIndex("idx_sector_news_source_url").on(table.sourceUrl),
}));

export const deletionRequests = sqliteTable("deletion_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => ({ statusRequestedIdx: index("idx_deletion_requests_status_requested").on(table.status, table.requestedAt) }));
