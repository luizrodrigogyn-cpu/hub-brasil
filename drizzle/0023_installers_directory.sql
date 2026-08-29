CREATE TABLE `installers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `organization_id` text REFERENCES `organizations`(`id`),
  `owner_user_id` text NOT NULL,
  `name` text NOT NULL,
  `phone` text DEFAULT '[encrypted]' NOT NULL,
  `phone_encrypted` text NOT NULL,
  `city` text NOT NULL,
  `state` text NOT NULL,
  `service_states` text DEFAULT '[]' NOT NULL,
  `specialties` text DEFAULT '[]' NOT NULL,
  `description` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `phone_verified_at` text,
  `contact_consent` integer DEFAULT true NOT NULL,
  `consent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_installers_owner` ON `installers` (`owner_user_id`);
--> statement-breakpoint
CREATE INDEX `idx_installers_status_location` ON `installers` (`status`,`state`,`city`);
--> statement-breakpoint
CREATE INDEX `idx_installers_organization` ON `installers` (`organization_id`);
--> statement-breakpoint
CREATE TABLE `installer_contact_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `installer_id` integer NOT NULL REFERENCES `installers`(`id`),
  `actor_user_id` text NOT NULL,
  `kind` text DEFAULT 'whatsapp_revealed' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_installer_contacts_installer_created` ON `installer_contact_events` (`installer_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_installer_contacts_actor_created` ON `installer_contact_events` (`actor_user_id`,`created_at`);
