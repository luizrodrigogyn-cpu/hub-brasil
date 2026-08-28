import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  kind: text("kind").notNull().default("client"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ slugIdx: uniqueIndex("idx_organizations_slug").on(table.slug) }));

export const organizationMembers = sqliteTable("organization_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("owner"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  membershipIdx: uniqueIndex("idx_organization_members_org_user").on(table.organizationId, table.userId),
  userIdx: index("idx_organization_members_user").on(table.userId, table.status),
}));

export const featureCatalog = sqliteTable("feature_catalog", {
  featureKey: text("feature_key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  enabledByDefault: integer("enabled_by_default", { mode: "boolean" }).notNull().default(true),
  audience: text("audience").notNull().default("all"),
  dependencies: text("dependencies"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const organizationFeatures = sqliteTable("organization_features", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  featureKey: text("feature_key").notNull().references(() => featureCatalog.featureKey),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  configuration: text("configuration"),
  changedBy: text("changed_by"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ flagIdx: uniqueIndex("idx_organization_features_org_key").on(table.organizationId, table.featureKey) }));

export const errorIncidents = sqliteTable("error_incidents", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").references(() => organizations.id),
  actorUserId: text("actor_user_id"),
  source: text("source").notNull(),
  severity: text("severity").notNull().default("error"),
  message: text("message").notNull(),
  details: text("details"),
  stack: text("stack"),
  path: text("path"),
  userAgent: text("user_agent"),
  requestId: text("request_id"),
  deployVersion: text("deploy_version"),
  status: text("status").notNull().default("open"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusCreatedIdx: index("idx_error_incidents_status_created").on(table.status, table.createdAt),
  organizationCreatedIdx: index("idx_error_incidents_org_created").on(table.organizationId, table.createdAt),
}));

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  instagram: text("instagram"),
  website: text("website"),
  role: text("role").notNull().default("client"),
  authUserId: text("auth_user_id"),
  email: text("email"),
  address: text("address"),
  profileImageKey: text("profile_image_key"),
  status: text("status").notNull().default("pending"),
  phoneVerifiedAt: text("phone_verified_at"),
  category: text("category"),
  categories: text("categories"),
  city: text("city"),
  state: text("state"),
  description: text("description"),
  logoKey: text("logo_key"),
  logoConsentAt: text("logo_consent_at"),
  cnpj: text("cnpj"),
  cnpjNormalized: text("cnpj_normalized"),
  cnpjValidationStatus: text("cnpj_validation_status").notNull().default("not_informed"),
  hubScore: integer("hub_score").notNull().default(0),
  hubScoreUpdatedAt: text("hub_score_updated_at"),
  founderMemberAt: text("founder_member_at"),
  referralCode: text("referral_code"),
  programStatus: text("program_status").notNull().default("eligible"),
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
}, (table) => ({
  authUserIdIdx: uniqueIndex("idx_leads_auth_user_id").on(table.authUserId),
  cnpjIdx: uniqueIndex("idx_leads_cnpj_normalized").on(table.cnpjNormalized),
  referralCodeIdx: uniqueIndex("idx_leads_referral_code").on(table.referralCode),
  supplierStateIdx: index("idx_leads_supplier_state").on(table.role, table.status, table.state),
  organizationIdx: index("idx_leads_organization").on(table.organizationId, table.role),
}));

export const hubScoreSnapshots = sqliteTable("hub_score_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  score: integer("score").notNull(),
  breakdown: text("breakdown").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ supplierCreatedIdx: index("idx_score_supplier_created").on(table.supplierId, table.createdAt) }));

export const creditRules = sqliteTable("credit_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleKey: text("rule_key").notNull(),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  kind: text("kind").notNull().default("earn"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ ruleKeyIdx: uniqueIndex("idx_credit_rules_key").on(table.ruleKey) }));

export const hubSettings = sqliteTable("hub_settings", {
  settingKey: text("setting_key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Fifteen fixed, auditable slots for the Membro Fundador program. A supplier
 * can occupy only one slot and a slot can belong to only one supplier.
 */
export const founderMemberSlots = sqliteTable("founder_member_slots", {
  slotNumber: integer("slot_number").primaryKey(),
  supplierId: integer("supplier_id").references(() => leads.id).unique(),
  claimedAt: text("claimed_at"),
});

export const creditWallets = sqliteTable("credit_wallets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  availableBalance: integer("available_balance").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalUsed: integer("total_used").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ supplierIdx: uniqueIndex("idx_credit_wallets_supplier").on(table.supplierId) }));

export const creditLedger = sqliteTable("credit_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  amount: integer("amount").notNull(),
  direction: text("direction").notNull(),
  ruleKey: text("rule_key").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("available"),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reversedAt: text("reversed_at"),
  reversedBy: text("reversed_by"),
  reversalReason: text("reversal_reason"),
}, (table) => ({
  idempotencyIdx: uniqueIndex("idx_credit_ledger_idempotency").on(table.idempotencyKey),
  supplierCreatedIdx: index("idx_credit_ledger_supplier_created").on(table.supplierId, table.createdAt),
}));

export const referrals = sqliteTable("referrals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referrerSupplierId: integer("referrer_supplier_id").notNull().references(() => leads.id),
  referredSupplierId: integer("referred_supplier_id").notNull().references(() => leads.id),
  referralCode: text("referral_code").notNull(),
  status: text("status").notNull().default("registered"),
  firstUsefulActionAt: text("first_useful_action_at"),
  qualifiedAt: text("qualified_at"),
  reviewedAt: text("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  referredIdx: uniqueIndex("idx_referrals_referred_supplier").on(table.referredSupplierId),
  referrerStatusIdx: index("idx_referrals_referrer_status").on(table.referrerSupplierId, table.status),
}));

export const highlightActivations = sqliteTable("highlight_activations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  productId: integer("product_id"),
  placement: text("placement").notNull(),
  state: text("state"),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  creditCost: integer("credit_cost").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  cancelledAt: text("cancelled_at"),
  cancelledBy: text("cancelled_by"),
  cancelReason: text("cancel_reason"),
}, (table) => ({
  supplierStatusEndsIdx: index("idx_highlights_supplier_status_ends").on(table.supplierId, table.status, table.endsAt),
  placementStatusIdx: index("idx_highlights_placement_status").on(table.placement, table.status, table.endsAt),
}));

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
  organizationId: text("organization_id").references(() => organizations.id),
  // Vínculo estável com o fornecedor (leads.id). `supplierName` abaixo é só um cache de exibição
  // preenchido no momento do cadastro — se a gestão renomear a empresa depois, esse texto fica
  // desatualizado, mas o vínculo por ID continua correto. Ver migração 0020.
  supplierId: integer("supplier_id").references(() => leads.id),
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
}, (table) => ({
  statusIdx: index("idx_events_status").on(table.status),
  supplierIdx: index("idx_events_supplier").on(table.supplierId),
}));

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").references(() => organizations.id),
  // Vínculo estável com o fornecedor (leads.id). `supplierName` abaixo é só um cache de exibição
  // preenchido no momento do cadastro — se a gestão renomear a empresa depois, esse texto fica
  // desatualizado, mas o vínculo por ID continua correto. Ver migração 0020.
  supplierId: integer("supplier_id").references(() => leads.id),
  supplierName: text("supplier_name").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  technicalDetails: text("technical_details").notNull(),
  averagePrice: text("average_price"),
  imageKey: text("image_key"),
  specs: text("specs"),
  manualUrl: text("manual_url"),
  status: text("status").notNull().default("pending"),
  ownerUserId: text("owner_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusIdx: index("idx_products_status").on(table.status),
  supplierIdx: index("idx_products_supplier").on(table.supplierId),
}));

export const supplierRatings = sqliteTable("supplier_ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  raterOrganizationId: text("rater_organization_id").references(() => organizations.id),
  supplierOrganizationId: text("supplier_organization_id").references(() => organizations.id),
  // Vínculo estável com o fornecedor (leads.id) — a chave de unicidade real da avaliação passou a
  // ser (supplierId, raterUserId): imune a renomeação de empresa. `supplierName` continua só como
  // registro do texto usado no momento da avaliação. Ver migração 0020.
  supplierId: integer("supplier_id").references(() => leads.id),
  supplierName: text("supplier_name").notNull(),
  stars: integer("stars").notNull(),
  raterUserId: text("rater_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ uniqueRating: uniqueIndex("idx_ratings_supplier_rater").on(table.supplierId, table.raterUserId) }));

export const moderationAudit = sqliteTable("moderation_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminEmail: text("admin_email").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ createdIdx: index("idx_audit_created_at").on(table.createdAt) }));

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").references(() => organizations.id),
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
  actorOrganizationId: text("actor_organization_id").references(() => organizations.id),
  supplierOrganizationId: text("supplier_organization_id").references(() => organizations.id),
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

// Conversas são privadas: somente o cliente e o fornecedor vinculados podem
// consultar ou responder. Nenhum telefone é exposto por esta estrutura.
export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientOrganizationId: text("client_organization_id").references(() => organizations.id),
  supplierOrganizationId: text("supplier_organization_id").references(() => organizations.id),
  clientUserId: text("client_user_id").notNull(),
  supplierId: integer("supplier_id").notNull().references(() => leads.id),
  subject: text("subject").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  participantIdx: uniqueIndex("idx_conversations_client_supplier").on(table.clientUserId, table.supplierId),
  supplierUpdatedIdx: index("idx_conversations_supplier_updated").on(table.supplierId, table.updatedAt),
}));

export const conversationMessages = sqliteTable("conversation_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderOrganizationId: text("sender_organization_id").references(() => organizations.id),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderUserId: text("sender_user_id").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  readAt: text("read_at"),
}, (table) => ({
  conversationCreatedIdx: index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
}));

export const alertPreferences = sqliteTable("alert_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").references(() => organizations.id),
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
  clientOrganizationId: text("client_organization_id").references(() => organizations.id),
  protocol: text("protocol").notNull(),
  clientUserId: text("client_user_id").notNull(),
  category: text("category").notNull(),
  application: text("application").notNull(),
  quantity: integer("quantity").notNull().default(1),
  city: text("city").notNull(),
  state: text("state").notNull(),
  deadline: text("deadline"),
  notes: text("notes"),
  budget: text("budget"),
  urgency: text("urgency"),
  integration: text("integration"),
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
  supplierOrganizationId: text("supplier_organization_id").references(() => organizations.id),
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
  reporterOrganizationId: text("reporter_organization_id").references(() => organizations.id),
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
  clientOrganizationId: text("client_organization_id").references(() => organizations.id),
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
  supplierOrganizationId: text("supplier_organization_id").references(() => organizations.id),
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
  organizationId: text("organization_id").references(() => organizations.id),
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
  organizationId: text("organization_id").references(() => organizations.id),
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
  organizationId: text("organization_id").references(() => organizations.id),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => ({ statusRequestedIdx: index("idx_deletion_requests_status_requested").on(table.status, table.requestedAt) }));
