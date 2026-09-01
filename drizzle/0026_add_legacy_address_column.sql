-- Mantém o schema do D1 compatível com o modelo da aplicação.
-- Dados de endereço continuam sendo gravados somente em address_encrypted;
-- esta coluna legada permanece nula e existe para compatibilidade do ORM.
ALTER TABLE `leads` ADD `address` text;
