import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  consentAt: text("consent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
});

export const supplierRatings = sqliteTable("supplier_ratings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierName: text("supplier_name").notNull(),
  stars: integer("stars").notNull(),
  raterUserId: text("rater_user_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({ uniqueRating: uniqueIndex("idx_ratings_supplier_rater").on(table.supplierName, table.raterUserId) }));
