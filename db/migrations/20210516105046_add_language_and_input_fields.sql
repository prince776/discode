-- migrate:up
ALTER TABLE `rooms` ADD COLUMN `input` varchar(1000);
ALTER TABLE `rooms` ADD COLUMN `language` varchar(30);

-- migrate:down
ALTER TABLE `rooms` DROP `input`;
ALTER TABLE `rooms` DROP `language`;
