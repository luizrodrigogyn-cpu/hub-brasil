ALTER TABLE `leads` ADD `category` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `city` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `state` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `description` text;--> statement-breakpoint
ALTER TABLE `supplier_events` ADD `supplier_name` text;--> statement-breakpoint
CREATE INDEX `idx_events_status` ON `supplier_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_products_status` ON `products` (`status`);