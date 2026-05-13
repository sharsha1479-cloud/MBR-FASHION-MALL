ALTER TABLE "ComboProduct" ADD COLUMN IF NOT EXISTS "sizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "CartItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "comboProductId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "size" TEXT;

ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "comboProductId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "size" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CartItem_comboProductId_fkey'
  ) THEN
    ALTER TABLE "CartItem"
      ADD CONSTRAINT "CartItem_comboProductId_fkey"
      FOREIGN KEY ("comboProductId") REFERENCES "ComboProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_comboProductId_fkey'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_comboProductId_fkey"
      FOREIGN KEY ("comboProductId") REFERENCES "ComboProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'CartItem_cartId_comboProductId_size_key'
  ) THEN
    CREATE UNIQUE INDEX "CartItem_cartId_comboProductId_size_key"
      ON "CartItem"("cartId", "comboProductId", "size");
  END IF;
END $$;
