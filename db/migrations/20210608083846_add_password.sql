-- migrate:up
ALTER TABLE `rooms` ADD COLUMN `password` varchar(100) NOT NULL DEFAULT '$2a$10$e3Svp08PbztZ3qdiYE78OujiU1DjKI3IBtz9TAXa8.ewUSstt/Ovm';

-- migrate:down
ALTER TABLE `rooms` DROP COLUMN `password`;
