CREATE TABLE `credit_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`direction` text NOT NULL,
	`rule_key` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` integer,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reversed_at` text,
	`reversed_by` text,
	`reversal_reason` text,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_ledger_idempotency` ON `credit_ledger` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_credit_ledger_supplier_created` ON `credit_ledger` (`supplier_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `credit_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rule_key` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`kind` text DEFAULT 'earn' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_rules_key` ON `credit_rules` (`rule_key`);--> statement-breakpoint
CREATE TABLE `credit_wallets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`available_balance` integer DEFAULT 0 NOT NULL,
	`total_earned` integer DEFAULT 0 NOT NULL,
	`total_used` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_credit_wallets_supplier` ON `credit_wallets` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `highlight_activations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`product_id` integer,
	`placement` text NOT NULL,
	`state` text,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`credit_cost` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`cancelled_at` text,
	`cancelled_by` text,
	`cancel_reason` text,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_highlights_supplier_status_ends` ON `highlight_activations` (`supplier_id`,`status`,`ends_at`);--> statement-breakpoint
CREATE INDEX `idx_highlights_placement_status` ON `highlight_activations` (`placement`,`status`,`ends_at`);--> statement-breakpoint
CREATE TABLE `hub_score_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`score` integer NOT NULL,
	`breakdown` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_score_supplier_created` ON `hub_score_snapshots` (`supplier_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `hub_settings` (
	`setting_key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`referrer_supplier_id` integer NOT NULL,
	`referred_supplier_id` integer NOT NULL,
	`referral_code` text NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`first_useful_action_at` text,
	`qualified_at` text,
	`reviewed_at` text,
	`review_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`referrer_supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referred_supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_referrals_referred_supplier` ON `referrals` (`referred_supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer_status` ON `referrals` (`referrer_supplier_id`,`status`);--> statement-breakpoint
ALTER TABLE `leads` ADD `cnpj` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `cnpj_normalized` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `cnpj_validation_status` text DEFAULT 'not_informed' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `hub_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `hub_score_updated_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `founder_member_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `referral_code` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `program_status` text DEFAULT 'eligible' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_cnpj_normalized` ON `leads` (`cnpj_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_referral_code` ON `leads` (`referral_code`);--> statement-breakpoint
CREATE INDEX `idx_leads_supplier_state` ON `leads` (`role`,`status`,`state`);