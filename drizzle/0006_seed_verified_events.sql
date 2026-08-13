INSERT INTO `supplier_events` (`name`,`venue`,`city`,`state`,`event_date`,`registration_url`,`description`,`status`,`supplier_name`)
SELECT 'EXPOSEC 2027','São Paulo Expo','São Paulo','SP','2027-06-08','https://exposec.tmp.br/credenciamento/','28ª Feira Internacional de Tecnologia em Segurança, realizada pela ABESE e organizada pela Fiera Milano Brasil. Evento de 08 a 10 de junho de 2027.','pending','EXPOSEC / ABESE'
WHERE NOT EXISTS (SELECT 1 FROM `supplier_events` WHERE `name` = 'EXPOSEC 2027' AND `event_date` = '2027-06-08');
--> statement-breakpoint
INSERT INTO `supplier_events` (`name`,`venue`,`city`,`state`,`event_date`,`registration_url`,`description`,`status`,`supplier_name`)
SELECT 'Futurecom 2026','São Paulo Expo','São Paulo','SP','2026-10-06','https://www.futurecom.com.br/quero-visitar/','Fórum de tecnologia, telecomunicações, conectividade, IoT, inteligência artificial, nuvem e cibersegurança. Evento de 06 a 08 de outubro de 2026.','pending','Futurecom'
WHERE NOT EXISTS (SELECT 1 FROM `supplier_events` WHERE `name` = 'Futurecom 2026' AND `event_date` = '2026-10-06');
--> statement-breakpoint
INSERT INTO `supplier_events` (`name`,`venue`,`city`,`state`,`event_date`,`registration_url`,`description`,`status`,`supplier_name`)
SELECT 'FENATRAN 2026','São Paulo Expo','São Paulo','SP','2026-11-09','https://www.fenatran.com.br/pt-br/visitar.html','25º Salão Internacional do Transporte Rodoviário de Carga, com soluções para gestão, rastreamento, manutenção, implementos e serviços. Evento de 09 a 13 de novembro de 2026.','pending','FENATRAN'
WHERE NOT EXISTS (SELECT 1 FROM `supplier_events` WHERE `name` = 'FENATRAN 2026' AND `event_date` = '2026-11-09');
--> statement-breakpoint
PRAGMA optimize;
