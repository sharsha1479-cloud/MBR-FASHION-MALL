const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const getUploadedFilenames = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) return files.map((file) => file.filename);
  return Object.values(files).flat().map((file) => file.filename);
};

exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice = 0, maxPrice = 100000, size } = req.query;

  const where = {
    price: {
      gte: parseFloat(minPrice),
      lte: parseFloat(maxPrice),
    },
  };

  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    };
  }

  if (category) {
    where.category = category;
  }

  if (size) {
    where.sizes = {
      has: size,
    };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });

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
  const { name, description, price, category, sizes, stock } = req.body;
  const images = getUploadedFilenames(req.files);

  if (!name || !price || !category) {
    res.status(400);
    throw new Error('Name, price, and category are required.');
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price: parseFloat(price),
      category,
      sizes: sizes ? sizes.split(',').map((s) => s.trim()) : [],
      stock: parseInt(stock, 10) || 0,
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

  const { name, description, price, category, sizes, stock } = req.body;
  const uploadedImages = getUploadedFilenames(req.files);

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name,
      description,
      price: parseFloat(price),
      category,
      sizes: sizes ? sizes.split(',').map((s) => s.trim()).filter(Boolean) : [],
      stock: parseInt(stock, 10) || 0,
      images: uploadedImages.length > 0 ? uploadedImages : existing.images,
    },
  });

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
