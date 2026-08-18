CREATE TABLE `sector_news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`category` text NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text NOT NULL,
	`image_url` text,
	`published_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`origin` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sector_news_status_published` ON `sector_news` (`status`,`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sector_news_source_url` ON `sector_news` (`source_url`);