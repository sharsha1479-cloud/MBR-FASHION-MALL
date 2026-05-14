const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const cache = require('../utils/cache');

const defaultCategories = [
  {
    value: 'shirts',
    label: 'Shirts',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
  },
  {
    value: 't-shirts',
    label: 'T-Shirts',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
  },
  {
    value: 'jeans',
    label: 'Jeans',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&crop=center',
  },
  {
    value: 'jackets',
    label: 'Jackets',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop&crop=center',
  },
  {
    value: 'sneakers',
    label: 'Sneakers',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center',
  },
  {
    value: 'accessories',
    label: 'Accessories',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&crop=center',
  },
];

const getUploadedFilename = (file) => {
  if (!file) return '';
  return file.filename;
};

const ensureDefaultCategories = async () => {
  const existingDefaultCategory = await prisma.category.findFirst({
    where: {
      value: { in: defaultCategories.map((category) => category.value) },
    },
  });

  if (existingDefaultCategory) return;

  await Promise.all(
    defaultCategories.map((category) =>
      prisma.category.upsert({
        where: { value: category.value },
        update: {},
        create: category,
      })
    )
  );
};

exports.getCategories = asyncHandler(async (req, res) => {
  await ensureDefaultCategories();

  const categories = await prisma.category.findMany({
    orderBy: { label: 'asc' },
  });
  res.json(categories);
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { label } = req.body;
  const image = getUploadedFilename(req.file);

  if (!label || !label.trim()) {
    res.status(400);
    throw new Error('Category name is required.');
  }

  if (!image) {
    res.status(400);
    throw new Error('Category image is required.');
  }

  const value = String(label).trim().toLowerCase().replace(/\s+/g, '-');

  const existing = await prisma.category.findUnique({ where: { value } });
  if (existing) {
    res.status(400);
    throw new Error('This category already exists.');
  }

  const category = await prisma.category.create({
    data: {
      label: String(label).trim(),
      value,
      image,
    },
  });

  await cache.delByPrefix('categories:');
  res.status(201).json(category);
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const image = getUploadedFilename(req.file);

  if (!image) {
    res.status(400);
    throw new Error('Category image is required.');
  }

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    res.status(404);
    throw new Error('Category not found.');
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: { image },
  });

  await cache.delByPrefix('categories:');
  res.json(updatedCategory);
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    res.status(404);
    throw new Error('Category not found.');
  }

  await prisma.category.delete({ where: { id } });
  await cache.delByPrefix('categories:');

  res.json({ message: 'Category deleted successfully.' });
});
