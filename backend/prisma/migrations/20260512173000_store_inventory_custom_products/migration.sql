-- Rename seeded/default stores to real store names
UPDATE "Store" SET "name" = 'Anakapalle Store', "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = 'Store 1' OR "id" = 'store_1';
UPDATE "Store" SET "name" = 'Gajuwaka Store', "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = 'Store 2' OR "id" = 'store_2';
UPDATE "Store" SET "name" = 'Atchuthapuram Store', "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = 'Store 3' OR "id" = 'store_3';
UPDATE "Store" SET "name" = 'Chodavaram Store', "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = 'Store 4' OR "id" = 'store_4';

-- Allow offline-only inventory products
ALTER TABLE "StoreInventory" ADD COLUMN "customName" TEXT;
ALTER TABLE "StoreInventory" ADD COLUMN "customCategory" TEXT;
ALTER TABLE "StoreInventory" ADD COLUMN "customPrice" DOUBLE PRECISION;
ALTER TABLE "StoreInventory" ALTER COLUMN "productId" DROP NOT NULL;
