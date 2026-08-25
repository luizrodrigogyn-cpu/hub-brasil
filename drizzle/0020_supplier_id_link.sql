-- Liga produtos, avaliações e eventos ao ID do fornecedor (leads.id) em vez de casar por
-- texto (nome/empresa). Hoje, quando a gestão renomeia uma empresa (ação "Editar" no painel
-- admin), produtos, avaliações e eventos publicados antes ficam órfãos: deixam de aparecer nas
-- contagens, médias e no catálogo do próprio fornecedor, porque o casamento era feito
-- comparando `supplier_name` (texto) com `leads.company`/`leads.name` atuais. Também deixava
-- rastro em exclusões de fornecedor (LGPD): avaliações sob um nome antigo não eram apagadas.
ALTER TABLE `products` ADD `supplier_id` integer REFERENCES `leads`(`id`);--> statement-breakpoint
ALTER TABLE `supplier_ratings` ADD `supplier_id` integer REFERENCES `leads`(`id`);--> statement-breakpoint

-- Backfill por melhor esforço: casa registros existentes pelo nome/empresa atual do fornecedor.
-- Linhas cujo fornecedor foi removido, ou cujo nome não bate com nenhum fornecedor atual,
-- continuam com supplier_id NULL — igual ao comportamento anterior (não casavam mesmo).
UPDATE `products` SET `supplier_id` = (
  SELECT `id` FROM `leads`
  WHERE `leads`.`role` = 'supplier' AND (`leads`.`company` = `products`.`supplier_name` OR `leads`.`name` = `products`.`supplier_name`)
  LIMIT 1
) WHERE `supplier_id` IS NULL;--> statement-breakpoint

UPDATE `supplier_ratings` SET `supplier_id` = (
  SELECT `id` FROM `leads`
  WHERE `leads`.`role` = 'supplier' AND (`leads`.`company` = `supplier_ratings`.`supplier_name` OR `leads`.`name` = `supplier_ratings`.`supplier_name`)
  LIMIT 1
) WHERE `supplier_id` IS NULL;--> statement-breakpoint

UPDATE `supplier_events` SET `supplier_id` = (
  SELECT `id` FROM `leads`
  WHERE `leads`.`role` = 'supplier' AND (`leads`.`company` = `supplier_events`.`supplier_name` OR `leads`.`name` = `supplier_events`.`supplier_name`)
  LIMIT 1
) WHERE `supplier_id` IS NULL AND `supplier_name` IS NOT NULL;--> statement-breakpoint

-- Antes de trocar a chave de unicidade de avaliação para (supplier_id, rater_user_id), remove
-- duplicatas que só existiam porque o mesmo cliente avaliou a mesma empresa sob dois nomes
-- diferentes (antes e depois de uma renomeação) — mantém a avaliação mais recente de cada par.
DELETE FROM `supplier_ratings`
WHERE `supplier_id` IS NOT NULL
  AND `id` NOT IN (
    SELECT MAX(`id`) FROM `supplier_ratings`
    WHERE `supplier_id` IS NOT NULL
    GROUP BY `supplier_id`, `rater_user_id`
  );--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `idx_products_supplier` ON `products` (`supplier_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ratings_supplier` ON `supplier_ratings` (`supplier_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_events_supplier` ON `supplier_events` (`supplier_id`);--> statement-breakpoint

DROP INDEX IF EXISTS `idx_ratings_supplier_rater`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ratings_supplier_rater` ON `supplier_ratings` (`supplier_id`, `rater_user_id`);--> statement-breakpoint
