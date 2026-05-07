const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const getUploadedFilenames = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) return files.map((file) => file.filename);
  return Object.values(files).flat().map((file) => file.filename);
};

const parsePrice = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return parseFloat(value);
};

exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, size, trending } = req.query;

  console.log('🔍 Received query params:', {
    search,
    category,
    minPrice,
    maxPrice,
    size,
    trending,
  });

  const where = {};

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (category) {
    const normalizedCategory = String(category).trim().toLowerCase();
    console.log('✅ Applying category filter:', normalizedCategory);
    where.category = {
      equals: normalizedCategory,
      mode: 'insensitive',
    };
  }

  // Only apply price filter if values are provided
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && minPrice !== '') {
      where.price.gte = parseFloat(minPrice);
      console.log('✅ Applied minPrice filter:', parseFloat(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      where.price.lte = parseFloat(maxPrice);
      console.log('✅ Applied maxPrice filter:', parseFloat(maxPrice));
    }
  }

  if (size) {
    where.sizes = {
      has: size,
    };
  }

  if (trending !== undefined && trending !== '') {
    const isTrending = String(trending).toLowerCase() === 'true';
    where.isTrending = isTrending;
    console.log('✅ Applying trending filter:', isTrending);
  }

  console.log('📋 Final where filters:', JSON.stringify(where, null, 2));

  const products = await prisma.product.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📦 Found ${products.length} products`);
  res.json(products);
});

exports.getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

exports.createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, mrp, offerPrice, category, sizes, stock, isTrending } = req.body;
  const images = getUploadedFilenames(req.files);
  const trendingValue = String(isTrending).toLowerCase() === 'true';
  const parsedMrp = parsePrice(mrp, parsePrice(price));
  const parsedOfferPrice = parsePrice(offerPrice, parsePrice(price));

  if (!name || !category || parsedOfferPrice === undefined || isNaN(parsedOfferPrice)) {
    res.status(400);
    throw new Error('Name, offer price, and category are required.');
  }

  if (images.length > 4) {
    res.status(400);
    throw new Error('You can upload up to 4 product images.');
  }

  if (parsedOfferPrice < 0 || (parsedMrp !== undefined && (isNaN(parsedMrp) || parsedMrp < 0))) {
    res.status(400);
    throw new Error('Invalid product price values.');
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price: parsedOfferPrice,
      mrp: parsedMrp,
      offerPrice: parsedOfferPrice,
      category: String(category).trim().toLowerCase(),
      sizes: sizes ? sizes.split(',').map((s) => s.trim()) : [],
      stock: parseInt(stock, 10) || 0,
      isTrending: trendingValue,
      images,
    },
  });

  res.status(201).json(product);
});

// Placeholder for update and delete
exports.updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Product not found');
  }

  const { name, description, price, mrp, offerPrice, category, sizes, stock, isTrending } = req.body;
  const uploadedImages = getUploadedFilenames(req.files);
  const trendingValue = isTrending === undefined
    ? existing.isTrending
    : String(isTrending).toLowerCase() === 'true';

  if (uploadedImages.length > 4) {
    res.status(400);
    throw new Error('You can upload up to 4 product images.');
  }

  console.log('🔄 Updating product:', req.params.id);
  console.log('📝 Form data:', { name, description, price, mrp, offerPrice, category, sizes, stock, isTrending });

  // Parse and validate price and stock
  const parsedOfferPrice = parsePrice(offerPrice, parsePrice(price, existing.offerPrice ?? existing.price));
  const parsedMrp = parsePrice(mrp, existing.mrp);
  const parsedPrice = parsedOfferPrice;
  const parsedStock = stock ? parseInt(stock, 10) : existing.stock;

  if (isNaN(parsedPrice) || parsedPrice < 0) {
    res.status(400);
    throw new Error('Invalid offer price value');
  }

  if (parsedMrp !== undefined && parsedMrp !== null && (isNaN(parsedMrp) || parsedMrp < 0)) {
    res.status(400);
    throw new Error('Invalid MRP value');
  }

  if (isNaN(parsedStock) || parsedStock < 0) {
    res.status(400);
    throw new Error('Invalid stock value');
  }

  // Parse sizes
  let parsedSizes = existing.sizes;
  if (sizes && String(sizes).trim()) {
    parsedSizes = String(sizes).split(',').map((s) => s.trim()).filter(Boolean);
  }

  console.log('✅ Parsed data:', { parsedPrice, parsedMrp, parsedOfferPrice, parsedStock, parsedSizes, trendingValue, uploadedImages });

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name: name || existing.name,
      description: description || existing.description,
      price: parsedPrice,
      mrp: parsedMrp,
      offerPrice: parsedOfferPrice,
      category: category ? String(category).trim().toLowerCase() : existing.category,
      sizes: parsedSizes,
      stock: parsedStock,
      isTrending: trendingValue,
      images: uploadedImages.length > 0 ? uploadedImages : existing.images,
    },
  });

  console.log('✅ Product updated successfully:', product.id);
  res.json(product);
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Product not found');
  }

  await prisma.product.delete({ where: { id: req.params.id } });
  res.json({ message: 'Product deleted' });
});
