ALTER TABLE "Product" ADD COLUMN "mrp" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "offerPrice" DOUBLE PRECISION;

UPDATE "Product"
SET "offerPrice" = "price"
WHERE "offerPrice" IS NULL;
