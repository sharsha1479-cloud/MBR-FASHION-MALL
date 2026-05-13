const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const prisma = require('../utils/prisma');

const hasWishlistClient = Boolean(prisma.wishlist && prisma.wishlistItem);

const ensureWishlistTables = async () => {
  if (hasWishlistClient) return;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Wishlist" (
      id TEXT PRIMARY KEY,
      "userId" TEXT UNIQUE NOT NULL,
      CONSTRAINT fk_wishlist_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
    )
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "WishlistItem" (
      id TEXT PRIMARY KEY,
      "wishlistId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      CONSTRAINT fk_wishlistitem_wishlist FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"(id) ON DELETE CASCADE,
      CONSTRAINT fk_wishlistitem_product FOREIGN KEY ("productId") REFERENCES "Product"(id) ON DELETE CASCADE,
      CONSTRAINT wishlistitem_unique UNIQUE ("wishlistId", "productId")
    )
  `;
};

const getOrCreateWishlist = async (userId) => {
  await ensureWishlistTables();

  if (hasWishlistClient) {
    const existing = await prisma.wishlist.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.wishlist.create({ data: { userId } });
  }

  const [existing] = await prisma.$queryRaw`
    SELECT id, "userId"
    FROM "Wishlist"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  if (existing) return existing;

  const wishlistId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "Wishlist" (id, "userId") VALUES (${wishlistId}, ${userId})
  `;

  return { id: wishlistId, userId };
};

const mapWishlistItems = (rows) => rows.map((row) => ({
  id: row.id,
  product: {
    id: row.product_id,
    name: row.product_name,
    description: row.product_description,
    price: Number(row.product_price),
    mrp: row.product_mrp === null ? null : Number(row.product_mrp),
    offerPrice: row.product_offer_price === null ? null : Number(row.product_offer_price),
    images: row.product_images,
    category: row.product_category,
    sizes: row.product_sizes,
    stock: Number(row.product_stock),
  },
}));

exports.getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);

  if (hasWishlistClient) {
    const items = await prisma.wishlistItem.findMany({
      where: { wishlistId: wishlist.id },
      include: { product: { include: { variants: true } }, variant: true },
      orderBy: { id: 'asc' },
    });
    res.json({ id: wishlist.id, items });
    return;
  }

  const rows = await prisma.$queryRaw`
    SELECT wi.id,
           p.id AS product_id,
           p.name AS product_name,
           p.description AS product_description,
           p.price AS product_price,
           p.mrp AS product_mrp,
           p."offerPrice" AS product_offer_price,
           p.images AS product_images,
           p.category AS product_category,
           p.sizes AS product_sizes,
           p.stock AS product_stock
    FROM "WishlistItem" wi
    JOIN "Product" p ON p.id = wi."productId"
    WHERE wi."wishlistId" = ${wishlist.id}
    ORDER BY wi.id ASC
  `;

  res.json({ id: wishlist.id, items: mapWishlistItems(rows) });
});

exports.addToWishlist = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.body;
  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const wishlist = await getOrCreateWishlist(req.user.id);
  const selectedVariant = variantId
    ? product.variants.find((variant) => variant.id === variantId)
    : product.variants[0];

  if (hasWishlistClient) {
    let item = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId,
        variantId: selectedVariant?.id || null,
      },
      include: { product: { include: { variants: true } }, variant: true },
    });

    if (!item) {
      item = await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
          variantId: selectedVariant?.id || null,
        },
        include: { product: { include: { variants: true } }, variant: true },
      });
    }

    res.status(201).json(item);
    return;
  }

  const [existing] = await prisma.$queryRaw`
    SELECT id
    FROM "WishlistItem"
    WHERE "wishlistId" = ${wishlist.id}
      AND "productId" = ${productId}
    LIMIT 1
  `;

  if (existing) {
    res.status(201).json({ id: existing.id, product });
    return;
  }

  const wishlistItemId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "WishlistItem" (id, "wishlistId", "productId")
    VALUES (${wishlistItemId}, ${wishlist.id}, ${productId})
  `;

  res.status(201).json({ id: wishlistItemId, product });
});

exports.removeWishlistItem = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user.id);

  if (hasWishlistClient) {
    const item = await prisma.wishlistItem.findFirst({
      where: { id: req.params.id, wishlistId: wishlist.id },
    });

    if (!item) {
      res.status(404);
      throw new Error('Wishlist item not found');
    }

    await prisma.wishlistItem.delete({ where: { id: item.id } });
    res.json({ message: 'Wishlist item removed' });
    return;
  }

  const result = await prisma.$executeRaw`
    DELETE FROM "WishlistItem"
    WHERE id = ${req.params.id}
      AND "wishlistId" = ${wishlist.id}
  `;

  res.json({ message: 'Wishlist item removed' });
});
