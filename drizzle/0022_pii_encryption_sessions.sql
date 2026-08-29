ALTER TABLE `leads` ADD `phone_encrypted` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `instagram_encrypted` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `email_encrypted` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `address_encrypted` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `cnpj_encrypted` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `cnpj_blind_index` text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_leads_cnpj_blind_index` ON `leads` (`cnpj_blind_index`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `login_sessions` (
  `session_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `email_hash` text,
  `first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `revoked_at` text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_login_sessions_user_seen` ON `login_sessions` (`user_id`,`last_seen_at`);--> statement-breakpoint
