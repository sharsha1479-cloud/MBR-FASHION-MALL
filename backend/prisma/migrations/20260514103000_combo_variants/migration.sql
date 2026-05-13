CREATE TABLE `ComboVariant` (
    `id` VARCHAR(191) NOT NULL,
    `comboProductId` VARCHAR(191) NOT NULL,
    `colorName` VARCHAR(191) NOT NULL,
    `colorCode` VARCHAR(191) NULL,
    `images` JSON NOT NULL,
    `mrp` DOUBLE NULL,
    `offerPrice` DOUBLE NOT NULL,
    `sizes` JSON NOT NULL,
    `sizeStocks` JSON NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ComboVariant_comboProductId_idx` ON `ComboVariant`(`comboProductId`);

INSERT INTO `ComboVariant` (
    `id`,
    `comboProductId`,
    `colorName`,
    `colorCode`,
    `images`,
    `mrp`,
    `offerPrice`,
    `sizes`,
    `sizeStocks`,
    `stock`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    `id`,
    'Default',
    '#94a3b8',
    JSON_ARRAY(`image`),
    `mrp`,
    `offerPrice`,
    `sizes`,
    JSON_ARRAYAGG(JSON_OBJECT('size', size_table.size_value, 'stock', CASE WHEN size_table.size_index = 1 THEN `ComboProduct`.`stock` ELSE 0 END)),
    `stock`,
    `createdAt`,
    `updatedAt`
FROM `ComboProduct`
JOIN JSON_TABLE(
    CASE
        WHEN JSON_LENGTH(`ComboProduct`.`sizes`) > 0 THEN `ComboProduct`.`sizes`
        ELSE JSON_ARRAY('Default')
    END,
    '$[*]' COLUMNS (
        size_index FOR ORDINALITY,
        size_value VARCHAR(191) PATH '$'
    )
) AS size_table
WHERE NOT EXISTS (
    SELECT 1 FROM `ComboVariant` WHERE `ComboVariant`.`comboProductId` = `ComboProduct`.`id`
)
GROUP BY `ComboProduct`.`id`;

ALTER TABLE `CartItem`
    ADD COLUMN `comboVariantId` VARCHAR(191) NULL;

ALTER TABLE `OrderItem`
    ADD COLUMN `comboVariantId` VARCHAR(191) NULL;

UPDATE `CartItem` ci
JOIN `ComboVariant` cv ON cv.`comboProductId` = ci.`comboProductId`
SET ci.`comboVariantId` = cv.`id`,
    ci.`colorName` = cv.`colorName`,
    ci.`image` = JSON_UNQUOTE(JSON_EXTRACT(cv.`images`, '$[0]')),
    ci.`price` = cv.`offerPrice`
WHERE ci.`comboProductId` IS NOT NULL AND ci.`comboVariantId` IS NULL;

UPDATE `OrderItem` oi
JOIN `ComboVariant` cv ON cv.`comboProductId` = oi.`comboProductId`
SET oi.`comboVariantId` = cv.`id`,
    oi.`colorName` = cv.`colorName`,
    oi.`image` = JSON_UNQUOTE(JSON_EXTRACT(cv.`images`, '$[0]'))
WHERE oi.`comboProductId` IS NOT NULL AND oi.`comboVariantId` IS NULL;

CREATE INDEX `CartItem_comboVariantId_idx` ON `CartItem`(`comboVariantId`);
CREATE INDEX `OrderItem_comboVariantId_idx` ON `OrderItem`(`comboVariantId`);

DROP INDEX `CartItem_cartId_comboProductId_size_key` ON `CartItem`;
CREATE UNIQUE INDEX `CartItem_cartId_comboProductId_comboVariantId_size_key` ON `CartItem`(`cartId`, `comboProductId`, `comboVariantId`, `size`);

ALTER TABLE `ComboVariant` ADD CONSTRAINT `ComboVariant_comboProductId_fkey` FOREIGN KEY (`comboProductId`) REFERENCES `ComboProduct`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_comboVariantId_fkey` FOREIGN KEY (`comboVariantId`) REFERENCES `ComboVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_comboVariantId_fkey` FOREIGN KEY (`comboVariantId`) REFERENCES `ComboVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
