CREATE TABLE `conversations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `client_user_id` text NOT NULL,
  `supplier_id` integer NOT NULL,
  `subject` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_conversations_client_supplier` ON `conversations` (`client_user_id`,`supplier_id`);
--> statement-breakpoint
CREATE INDEX `idx_conversations_supplier_updated` ON `conversations` (`supplier_id`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `conversation_id` integer NOT NULL,
  `sender_user_id` text NOT NULL,
  `body` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `read_at` text,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `conversation_messages` (`conversation_id`,`created_at`);
