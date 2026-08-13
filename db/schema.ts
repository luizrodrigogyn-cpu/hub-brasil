import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  company: text("company"),
  instagram: text("instagram"),
  consentAt: text("consent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
