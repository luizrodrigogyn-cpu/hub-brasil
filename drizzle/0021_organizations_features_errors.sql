-- Multi-tenancy lógico do Hub Brasil.
-- O catálogo aprovado permanece compartilhado; dados privados passam a carregar o ID
-- da organização dona ou das duas organizações participantes de um fluxo bilateral.
PRAGMA foreign_keys = ON;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `organizations` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `slug` text NOT NULL,
  `kind` text DEFAULT 'client' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_organizations_slug` ON `organizations` (`slug`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `organization_members` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`),
  `user_id` text NOT NULL,
  `role` text DEFAULT 'owner' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_organization_members_org_user` ON `organization_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_organization_members_user` ON `organization_members` (`user_id`,`status`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `feature_catalog` (
  `feature_key` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `enabled_by_default` integer DEFAULT 1 NOT NULL,
  `audience` text DEFAULT 'all' NOT NULL,
  `dependencies` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `organization_features` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`),
  `feature_key` text NOT NULL REFERENCES `feature_catalog`(`feature_key`),
  `enabled` integer NOT NULL,
  `configuration` text,
  `changed_by` text,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_organization_features_org_key` ON `organization_features` (`organization_id`,`feature_key`);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `error_incidents` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text REFERENCES `organizations`(`id`),
  `actor_user_id` text,
  `source` text NOT NULL,
  `severity` text DEFAULT 'error' NOT NULL,
  `message` text NOT NULL,
  `details` text,
  `stack` text,
  `path` text,
  `user_agent` text,
  `request_id` text,
  `deploy_version` text,
  `status` text DEFAULT 'open' NOT NULL,
  `occurred_at` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_error_incidents_status_created` ON `error_incidents` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_error_incidents_org_created` ON `error_incidents` (`organization_id`,`created_at`);--> statement-breakpoint

INSERT OR IGNORE INTO `feature_catalog` (`feature_key`,`name`,`description`,`enabled_by_default`,`audience`,`dependencies`) VALUES
('directory','Diretório','Busca, mapa e perfil público de fornecedores',1,'all',NULL),
('quotes','Cotações','Solicitação, resposta e acompanhamento de cotações',1,'all','["directory"]'),
('messages','Mensagens','Conversas privadas entre clientes e fornecedores',1,'all','["directory"]'),
('ratings','Avaliações','Avaliações vinculadas a interações elegíveis',1,'client','["directory"]'),
('community','Comunidade','Demandas, interesses e atualizações do setor',1,'all',NULL),
('events','Eventos','Cadastro, aprovação e descoberta de eventos',1,'supplier',NULL),
('credits','Hub Créditos','Créditos, score, indicações e destaques',1,'supplier',NULL),
('alerts','Alertas','Preferências e avisos de novas oportunidades',1,'all',NULL),
('reports','Relatórios','KPIs e relatórios de gestão',1,'admin',NULL);--> statement-breakpoint

ALTER TABLE `leads` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `supplier_events` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `products` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `supplier_ratings` ADD `rater_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `supplier_ratings` ADD `supplier_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `favorites` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `activity_events` ADD `actor_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `activity_events` ADD `supplier_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `client_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `supplier_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD `sender_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `alert_preferences` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `quote_requests` ADD `client_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `quote_recipients` ADD `supplier_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `content_reports` ADD `reporter_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `market_needs` ADD `client_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `need_interests` ADD `supplier_organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `supplier_updates` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `event_interests` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint
ALTER TABLE `deletion_requests` ADD `organization_id` text REFERENCES `organizations`(`id`);--> statement-breakpoint

INSERT OR IGNORE INTO `organizations` (`id`,`name`,`slug`,`kind`,`status`,`created_at`,`updated_at`)
SELECT 'org-' || `id`, COALESCE(NULLIF(`company`,''),`name`), 'org-' || `id`, `role`, 'active', `created_at`, `updated_at`
FROM `leads`;--> statement-breakpoint
UPDATE `leads` SET `organization_id` = 'org-' || `id` WHERE `organization_id` IS NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `organization_members` (`organization_id`,`user_id`,`role`,`status`)
SELECT `organization_id`,`auth_user_id`,'owner','active' FROM `leads` WHERE `auth_user_id` IS NOT NULL;--> statement-breakpoint

UPDATE `products` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`products`.`supplier_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint
UPDATE `supplier_events` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`supplier_events`.`supplier_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint
UPDATE `supplier_ratings` SET `supplier_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`supplier_ratings`.`supplier_id`) WHERE `supplier_organization_id` IS NULL;--> statement-breakpoint
UPDATE `supplier_ratings` SET `rater_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`supplier_ratings`.`rater_user_id`) WHERE `rater_organization_id` IS NULL;--> statement-breakpoint
UPDATE `favorites` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`favorites`.`user_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint
UPDATE `activity_events` SET `actor_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`activity_events`.`actor_user_id`) WHERE `actor_organization_id` IS NULL;--> statement-breakpoint
UPDATE `activity_events` SET `supplier_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`activity_events`.`supplier_id`) WHERE `supplier_organization_id` IS NULL;--> statement-breakpoint
UPDATE `conversations` SET `client_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`conversations`.`client_user_id`) WHERE `client_organization_id` IS NULL;--> statement-breakpoint
UPDATE `conversations` SET `supplier_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`conversations`.`supplier_id`) WHERE `supplier_organization_id` IS NULL;--> statement-breakpoint
UPDATE `conversation_messages` SET `sender_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`conversation_messages`.`sender_user_id`) WHERE `sender_organization_id` IS NULL;--> statement-breakpoint
UPDATE `alert_preferences` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`alert_preferences`.`user_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint
UPDATE `quote_requests` SET `client_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`quote_requests`.`client_user_id`) WHERE `client_organization_id` IS NULL;--> statement-breakpoint
UPDATE `quote_recipients` SET `supplier_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`quote_recipients`.`supplier_id`) WHERE `supplier_organization_id` IS NULL;--> statement-breakpoint
UPDATE `content_reports` SET `reporter_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`content_reports`.`reporter_user_id`) WHERE `reporter_organization_id` IS NULL;--> statement-breakpoint
UPDATE `market_needs` SET `client_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`market_needs`.`client_user_id`) WHERE `client_organization_id` IS NULL;--> statement-breakpoint
UPDATE `need_interests` SET `supplier_organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`need_interests`.`supplier_id`) WHERE `supplier_organization_id` IS NULL;--> statement-breakpoint
UPDATE `supplier_updates` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`id`=`supplier_updates`.`supplier_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint
UPDATE `event_interests` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`event_interests`.`user_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint
UPDATE `deletion_requests` SET `organization_id`=(SELECT `organization_id` FROM `leads` WHERE `leads`.`auth_user_id`=`deletion_requests`.`user_id`) WHERE `organization_id` IS NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_leads_organization` ON `leads` (`organization_id`,`role`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_products_organization` ON `products` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_events_organization` ON `supplier_events` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_conversations_client_org` ON `conversations` (`client_organization_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_conversations_supplier_org` ON `conversations` (`supplier_organization_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_quotes_client_org` ON `quote_requests` (`client_organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_recipients_supplier_org` ON `quote_recipients` (`supplier_organization_id`,`status`);--> statement-breakpoint
