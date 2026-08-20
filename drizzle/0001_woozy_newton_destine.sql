CREATE TABLE `supplier_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer,
	`name` text NOT NULL,
	`venue` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`event_date` text NOT NULL,
	`registration_url` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
