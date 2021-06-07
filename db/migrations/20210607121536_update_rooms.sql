-- migrate:up
ALTER TABLE `rooms` MODIFY COLUMN `body` mediumtext;
ALTER TABLE `rooms` MODIFY COLUMN `input` mediumtext;
ALTER TABLE `rooms` MODIFY COLUMN `id` varchar(36) NOT NULL;

-- migrate:down
ALTER TABLE `rooms` MODIFY COLUMN `body` varchar(5000);
ALTER TABLE `rooms` MODIFY COLUMN `input` varchar(1000);
ALTER TABLE `rooms` MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT;
