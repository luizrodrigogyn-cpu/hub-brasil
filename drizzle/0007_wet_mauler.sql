CREATE TABLE `activity_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text,
	`supplier_id` integer,
	`product_id` integer,
	`event_id` integer,
	`kind` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_supplier_kind_created` ON `activity_events` (`supplier_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_actor_created` ON `activity_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `alert_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`categories` text,
	`states` text,
	`content_types` text,
	`frequency` text DEFAULT 'weekly' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`unsubscribe_token` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_alert_preferences_user` ON `alert_preferences` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_alert_preferences_token` ON `alert_preferences` (`unsubscribe_token`);--> statement-breakpoint
CREATE TABLE `content_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reporter_user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_status_created` ON `content_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_favorites_user_entity` ON `favorites` (`user_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_entity` ON `favorites` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `quote_recipients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quote_id` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`responded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quote_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quote_recipients_quote_supplier` ON `quote_recipients` (`quote_id`,`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_quote_recipients_supplier_status` ON `quote_recipients` (`supplier_id`,`status`);--> statement-breakpoint
CREATE TABLE `quote_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`protocol` text NOT NULL,
	`client_user_id` text NOT NULL,
	`category` text NOT NULL,
	`application` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`deadline` text,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`consent_snapshot` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quote_requests_protocol` ON `quote_requests` (`protocol`);--> statement-breakpoint
CREATE INDEX `idx_quote_requests_client_created` ON `quote_requests` (`client_user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `leads` ADD `consent_version` text DEFAULT '2026-08-14' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `contact_consent` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `verified_at` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `verification_status` text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `service_states` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `services` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `service_mode` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `serves_nationwide` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `leads` SET `updated_at` = COALESCE(`created_at`, CURRENT_TIMESTAMP) WHERE `updated_at` = '';--> statement-breakpoint
CREATE TRIGGER `set_leads_updated_at_on_insert`
AFTER INSERT ON `leads`
FOR EACH ROW
WHEN NEW.`updated_at` = ''
BEGIN
	UPDATE `leads` SET `updated_at` = CURRENT_TIMESTAMP WHERE `id` = NEW.`id`;
END;
