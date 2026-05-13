-- Add product variants while keeping existing product fields as compatibility defaults.
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `colorName` VARCHAR(191) NOT NULL,
    `colorCode` VARCHAR(191) NULL,
    `images` JSON NOT NULL,
    `price` DOUBLE NOT NULL,
    `mrp` DOUBLE NULL,
    `offerPrice` DOUBLE NULL,
    `sizes` JSON NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ProductVariant_productId_idx` ON `ProductVariant`(`productId`);

INSERT INTO `ProductVariant` (
    `id`,
    `productId`,
    `colorName`,
    `colorCode`,
    `images`,
    `price`,
    `mrp`,
    `offerPrice`,
    `sizes`,
    `stock`,
    `createdAt`,
    `updatedAt`
)
SELECT
    UUID(),
    `id`,
    'Default',
    '#94a3b8',
    `images`,
    `price`,
    `mrp`,
    `offerPrice`,
    `sizes`,
    `stock`,
    `createdAt`,
    `updatedAt`
FROM `Product`
WHERE NOT EXISTS (
    SELECT 1 FROM `ProductVariant` WHERE `ProductVariant`.`productId` = `Product`.`id`
);

ALTER TABLE `CartItem` ADD COLUMN `variantId` VARCHAR(191) NULL,
    ADD COLUMN `colorName` VARCHAR(191) NULL,
    ADD COLUMN `image` TEXT NULL,
    ADD COLUMN `price` DOUBLE NULL;

ALTER TABLE `OrderItem` ADD COLUMN `variantId` VARCHAR(191) NULL,
    ADD COLUMN `colorName` VARCHAR(191) NULL,
    ADD COLUMN `image` TEXT NULL;

ALTER TABLE `WishlistItem` ADD COLUMN `variantId` VARCHAR(191) NULL;

UPDATE `CartItem` ci
JOIN `ProductVariant` pv ON pv.`productId` = ci.`productId`
SET ci.`variantId` = pv.`id`,
    ci.`colorName` = pv.`colorName`,
    ci.`image` = JSON_UNQUOTE(JSON_EXTRACT(pv.`images`, '$[0]')),
    ci.`price` = COALESCE(pv.`offerPrice`, pv.`price`)
WHERE ci.`productId` IS NOT NULL AND ci.`variantId` IS NULL;

UPDATE `OrderItem` oi
JOIN `ProductVariant` pv ON pv.`productId` = oi.`productId`
SET oi.`variantId` = pv.`id`,
    oi.`colorName` = pv.`colorName`,
    oi.`image` = JSON_UNQUOTE(JSON_EXTRACT(pv.`images`, '$[0]'))
WHERE oi.`productId` IS NOT NULL AND oi.`variantId` IS NULL;

UPDATE `WishlistItem` wi
JOIN `ProductVariant` pv ON pv.`productId` = wi.`productId`
SET wi.`variantId` = pv.`id`
WHERE wi.`variantId` IS NULL;

CREATE INDEX `CartItem_cartId_idx` ON `CartItem`(`cartId`);
CREATE INDEX `CartItem_productId_idx` ON `CartItem`(`productId`);
CREATE INDEX `CartItem_variantId_idx` ON `CartItem`(`variantId`);
CREATE INDEX `OrderItem_variantId_idx` ON `OrderItem`(`variantId`);
CREATE INDEX `WishlistItem_wishlistId_idx` ON `WishlistItem`(`wishlistId`);
CREATE INDEX `WishlistItem_productId_idx` ON `WishlistItem`(`productId`);
CREATE INDEX `WishlistItem_variantId_idx` ON `WishlistItem`(`variantId`);

DROP INDEX `CartItem_cartId_productId_key` ON `CartItem`;
DROP INDEX `WishlistItem_wishlistId_productId_key` ON `WishlistItem`;

CREATE UNIQUE INDEX `WishlistItem_wishlistId_productId_variantId_key` ON `WishlistItem`(`wishlistId`, `productId`, `variantId`);

ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
