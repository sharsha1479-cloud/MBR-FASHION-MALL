const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const DEFAULT_STORES = ['Anakapalle Store', 'Gajuwaka Store', 'Atchuthapuram Store', 'Chodavaram Store'];
const STORE_RENAMES = {
  'Store 1': 'Anakapalle Store',
  'Store 2': 'Gajuwaka Store',
  'Store 3': 'Atchuthapuram Store',
  'Store 4': 'Chodavaram Store',
};

const ensureStores = async () => {
  await Promise.all(
    Object.entries(STORE_RENAMES).map(([oldName, newName]) =>
      prisma.store.updateMany({
        where: { name: oldName },
        data: { name: newName },
      })
    )
  );

  await Promise.all(
    DEFAULT_STORES.map((name) =>
      prisma.store.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const stores = await prisma.store.findMany({
    include: {
      inventory: {
        include: { product: true },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  return stores.sort((a, b) => DEFAULT_STORES.indexOf(a.name) - DEFAULT_STORES.indexOf(b.name));
};

const parseStockValue = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const error = new Error(`${fieldName} must be a non-negative whole number.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const normalizeSize = (size) => {
  const normalized = String(size || '').trim();
  return normalized || 'Default';
};

exports.getStores = asyncHandler(async (req, res) => {
  const stores = await ensureStores();
  res.json(stores);
});

exports.createInventoryRecord = asyncHandler(async (req, res) => {
  const { storeId, storeName, productId, size, customName, customCategory } = req.body;
  const availableStock = parseStockValue(req.body.availableStock, 'Available stock');
  const soldCount = parseStockValue(req.body.soldCount ?? 0, 'Sold count');
  const customPrice = req.body.customPrice === undefined || req.body.customPrice === ''
    ? null
    : Number(req.body.customPrice);

  if (customPrice !== null && (!Number.isFinite(customPrice) || customPrice < 0)) {
    res.status(400);
    throw new Error('Custom product price must be a valid non-negative number.');
  }

  let product = null;
  if (productId) {
    product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404);
      throw new Error('Product not found.');
    }
  } else if (!String(customName || '').trim()) {
    res.status(400);
    throw new Error('Choose an online product or enter an offline product name.');
  }

  const store = storeId
    ? await prisma.store.findUnique({ where: { id: storeId } })
    : await prisma.store.findUnique({ where: { name: storeName } });

  if (!store) {
    res.status(404);
    throw new Error('Store not found.');
  }

  const inventory = await prisma.storeInventory.create({
    data: {
      storeId: store.id,
      productId: product?.id || null,
      customName: product ? null : String(customName).trim(),
      customCategory: product ? null : String(customCategory || 'Offline').trim(),
      customPrice: product ? null : customPrice,
      size: normalizeSize(size),
      availableStock,
      soldCount,
      remainingStock: Math.max(availableStock - soldCount, 0),
    },
    include: {
      store: true,
      product: true,
    },
  });

  res.status(201).json(inventory);
});

exports.updateInventoryRecord = asyncHandler(async (req, res) => {
  const existing = await prisma.storeInventory.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404);
    throw new Error('Inventory record not found.');
  }

  const availableStock = req.body.availableStock === undefined
    ? existing.availableStock
    : parseStockValue(req.body.availableStock, 'Available stock');
  const soldCount = req.body.soldCount === undefined
    ? existing.soldCount
    : parseStockValue(req.body.soldCount, 'Sold count');

  const inventory = await prisma.storeInventory.update({
    where: { id: req.params.id },
    data: {
      availableStock,
      soldCount,
      remainingStock: Math.max(availableStock - soldCount, 0),
    },
    include: {
      store: true,
      product: true,
    },
  });

  res.json(inventory);
});

exports.deleteInventoryRecord = asyncHandler(async (req, res) => {
  const existing = await prisma.storeInventory.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    res.status(404);
    throw new Error('Inventory record not found.');
  }

  await prisma.storeInventory.delete({ where: { id: req.params.id } });
  res.json({ message: 'Inventory record deleted.' });
});
