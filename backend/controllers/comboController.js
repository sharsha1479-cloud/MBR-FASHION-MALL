const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const getUploadedFilename = (file) => {
  if (!file) return '';
  return file.filename;
};

const parsePrice = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return parseFloat(value);
};

exports.getCombos = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === 'true';

  if (!prisma.comboProduct) {
    return res.json([]);
  }

  let combos = [];
  try {
    combos = await prisma.comboProduct.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    if (error.code === 'P2021' || error.code === 'P2022') {
      return res.json([]);
    }
    throw error;
  }

  res.json(combos);
});

exports.getComboById = asyncHandler(async (req, res) => {
  if (!prisma.comboProduct) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  const combo = await prisma.comboProduct.findUnique({
    where: { id: req.params.id },
  });

  if (!combo || !combo.isActive) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  res.json(combo);
});

exports.createCombo = asyncHandler(async (req, res) => {
  const { name, description, mrp, offerPrice, stock, sizes, isActive } = req.body;
  const image = getUploadedFilename(req.file);
  const parsedOfferPrice = parsePrice(offerPrice);
  const parsedMrp = parsePrice(mrp);
  const parsedStock = stock ? parseInt(stock, 10) : 0;

  if (!name || parsedOfferPrice === undefined || isNaN(parsedOfferPrice) || !image) {
    res.status(400);
    throw new Error('Combo name, offer price, and image are required.');
  }

  if (parsedOfferPrice < 0 || (parsedMrp !== undefined && (isNaN(parsedMrp) || parsedMrp < 0))) {
    res.status(400);
    throw new Error('Invalid combo price values.');
  }

  if (isNaN(parsedStock) || parsedStock < 0) {
    res.status(400);
    throw new Error('Invalid combo stock value.');
  }

  const combo = await prisma.comboProduct.create({
    data: {
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      mrp: parsedMrp,
      offerPrice: parsedOfferPrice,
      image,
      stock: parsedStock,
      sizes: sizes ? String(sizes).split(',').map((size) => size.trim()).filter(Boolean) : [],
      isActive: isActive === undefined ? true : String(isActive).toLowerCase() === 'true',
    },
  });

  res.status(201).json(combo);
});

exports.updateCombo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, mrp, offerPrice, stock, sizes, isActive } = req.body;
  const image = getUploadedFilename(req.file);

  const existing = await prisma.comboProduct.findUnique({ where: { id } });
  if (!existing) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  const parsedOfferPrice = parsePrice(offerPrice, existing.offerPrice);
  const parsedMrp = parsePrice(mrp, existing.mrp);
  const parsedStock = stock !== undefined && stock !== '' ? parseInt(stock, 10) : existing.stock;

  if (isNaN(parsedOfferPrice) || parsedOfferPrice < 0) {
    res.status(400);
    throw new Error('Invalid combo offer price.');
  }

  if (parsedMrp !== undefined && parsedMrp !== null && (isNaN(parsedMrp) || parsedMrp < 0)) {
    res.status(400);
    throw new Error('Invalid combo MRP.');
  }

  if (isNaN(parsedStock) || parsedStock < 0) {
    res.status(400);
    throw new Error('Invalid combo stock value.');
  }

  const combo = await prisma.comboProduct.update({
    where: { id },
    data: {
      name: name ? String(name).trim() : existing.name,
      description: description !== undefined ? String(description).trim() || null : existing.description,
      mrp: parsedMrp,
      offerPrice: parsedOfferPrice,
      image: image || existing.image,
      stock: parsedStock,
      sizes: sizes !== undefined ? String(sizes).split(',').map((size) => size.trim()).filter(Boolean) : existing.sizes,
      isActive: isActive === undefined ? existing.isActive : String(isActive).toLowerCase() === 'true',
    },
  });

  res.json(combo);
});

exports.deleteCombo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.comboProduct.findUnique({ where: { id } });
  if (!existing) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  await prisma.comboProduct.delete({ where: { id } });
  res.json({ message: 'Combo product deleted successfully.' });
});
