ALTER TABLE `moderation_audit` ADD `metadata` text;--> statement-breakpoint

CREATE TABLE `founder_member_slots` (
  `slot_number` integer PRIMARY KEY NOT NULL,
  `supplier_id` integer,
  `claimed_at` text,
  FOREIGN KEY (`supplier_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_founder_member_slots_supplier` ON `founder_member_slots` (`supplier_id`);--> statement-breakpoint

INSERT INTO `founder_member_slots` (`slot_number`) VALUES
  (1), (2), (3), (4), (5),
  (6), (7), (8), (9), (10),
  (11), (12), (13), (14), (15);--> statement-breakpoint

-- The program is limited to the first 15 approved founder records. This is a
-- no-op for the current empty supplier base and keeps the rule deterministic
-- if a prior test database contains more than 15 records.
UPDATE `leads`
SET `founder_member_at` = NULL
WHERE `id` IN (
  SELECT `id` FROM (
    SELECT `id`, ROW_NUMBER() OVER (ORDER BY `founder_member_at` ASC, `id` ASC) AS `position`
    FROM `leads`
    WHERE `founder_member_at` IS NOT NULL
  )
  WHERE `position` > 15
);--> statement-breakpoint

INSERT INTO `founder_member_slots` (`slot_number`, `supplier_id`, `claimed_at`)
SELECT `position`, `id`, `founder_member_at`
FROM (
  SELECT `id`, `founder_member_at`, ROW_NUMBER() OVER (ORDER BY `founder_member_at` ASC, `id` ASC) AS `position`
  FROM `leads`
  WHERE `founder_member_at` IS NOT NULL
)
WHERE `position` <= 15
ON CONFLICT(`slot_number`) DO UPDATE SET
  `supplier_id` = excluded.`supplier_id`,
  `claimed_at` = excluded.`claimed_at`;--> statement-breakpoint

INSERT INTO `hub_settings` (`setting_key`, `value`) VALUES ('founder_member_limit', '15')
ON CONFLICT(`setting_key`) DO UPDATE SET
  `value` = excluded.`value`,
  `updated_at` = CURRENT_TIMESTAMP;
