CREATE TABLE `event_interests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`reminder_enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `supplier_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_event_interests_event_user` ON `event_interests` (`event_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `market_needs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_user_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`deadline` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_market_needs_status_expiry` ON `market_needs` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_market_needs_client_created` ON `market_needs` (`client_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `need_interests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`need_id` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`message` text,
	`status` text DEFAULT 'interested' NOT NULL,
	`contact_shared_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`need_id`) REFERENCES `market_needs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_need_interests_need_supplier` ON `need_interests` (`need_id`,`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_need_interests_supplier` ON `need_interests` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `supplier_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`link` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`published_at` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_supplier_updates_status_expiry` ON `supplier_updates` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `technical_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`author` text NOT NULL,
	`source_type` text DEFAULT 'editorial' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_technical_articles_slug` ON `technical_articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_technical_articles_status` ON `technical_articles` (`status`);