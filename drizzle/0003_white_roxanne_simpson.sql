PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_name` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`technical_details` text NOT NULL,
	`average_price` text,
	`image_key` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`owner_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "supplier_name", "name", "category", "technical_details", "average_price", "image_key", "status", "owner_user_id", "created_at") SELECT "id", "supplier_name", "name", "category", "technical_details", "average_price", "image_key", "status", "owner_user_id", "created_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `leads` ADD `auth_user_id` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `email` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `phone_verified_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_auth_user_id` ON `leads` (`auth_user_id`);--> statement-breakpoint
ALTER TABLE `supplier_events` ADD `owner_user_id` text;--> statement-breakpoint
ALTER TABLE `supplier_ratings` ADD `rater_user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ratings_supplier_rater` ON `supplier_ratings` (`supplier_name`,`rater_user_id`);