const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');
const cache = require('../utils/cache');

const getUploadedFilenames = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) {
    return files
      .filter((file) => ['image', 'images', 'images[]'].includes(file.fieldname))
      .map((file) => file.filename);
  }
  return Object.values(files).flat().map((file) => file.filename);
};

const parsePrice = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return parseFloat(value);
};

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    // Admin forms may send comma-separated sizes/images.
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
};

const parseSizeStocks = (value, fallbackSizes = [], fallbackStock = 0) => {
  let rows = [];
  if (Array.isArray(value)) {
    rows = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) rows = parsed;
    } catch {
      rows = [];
    }
  }

  const normalized = rows
    .map((item) => ({
      size: String(item.size ?? item.value ?? item.name ?? '').trim(),
      stock: Math.max(0, parseInt(item.stock ?? item.quantity ?? 0, 10) || 0),
    }))
    .filter((item) => item.size);

  if (normalized.length > 0) return normalized;

  return fallbackSizes.map((size, index) => ({
    size: String(size).trim(),
    stock: index === 0 ? Math.max(0, parseInt(fallbackStock, 10) || 0) : 0,
  })).filter((item) => item.size);
};

const getVariantSizeStocks = (variant) => {
  const existing = parseSizeStocks(variant.sizeStocks);
  if (existing.length > 0) return existing;
  return (variant.sizes || []).map((size) => ({
    size: String(size).trim(),
    stock: Math.max(0, parseInt(variant.stock, 10) || 0),
  })).filter((item) => item.size);
};

const getVariantSizes = (variant) => getVariantSizeStocks(variant).map((item) => item.size);

const getVariantTotalStock = (variant) => getVariantSizeStocks(variant).reduce((sum, item) => sum + Number(item.stock || 0), 0);

const normalizeVariant = (variant) => {
  const sizeStocks = getVariantSizeStocks(variant);
  return {
    ...variant,
    sizeStocks,
    sizes: sizeStocks.map((item) => item.size),
    stock: Array.isArray(variant.sizeStocks) && variant.sizeStocks.length > 0
      ? sizeStocks.reduce((sum, item) => sum + Number(item.stock || 0), 0)
      : Number(variant.stock || 0),
  };
};

const normalizeProduct = (product) => {
  if (!product) return product;
  const variants = Array.isArray(product.variants) ? product.variants.map(normalizeVariant) : [];
  const defaultVariant = variants[0];
  if (!defaultVariant) return { ...product, variants };

  return {
    ...product,
    images: defaultVariant.images || product.images || [],
    price: defaultVariant.price ?? product.price,
    mrp: defaultVariant.mrp ?? product.mrp,
    offerPrice: defaultVariant.offerPrice ?? product.offerPrice,
    sizes: defaultVariant.sizes || product.sizes || [],
    stock: defaultVariant.stock ?? product.stock,
    variants,
  };
};

const parseVariants = (body, files, existingProduct) => {
  let variants = [];
  if (body.variants) {
    try {
      variants = JSON.parse(body.variants);
    } catch {
      variants = [];
    }
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    variants = [{
      id: body.variantId,
      colorName: body.colorName || 'Default',
      colorCode: body.colorCode || '#94a3b8',
      images: body.existingImages ? parseList(body.existingImages) : (existingProduct?.images || []),
      price: parsePrice(body.price, parsePrice(body.offerPrice, existingProduct?.price)),
      mrp: parsePrice(body.mrp, existingProduct?.mrp),
      offerPrice: parsePrice(body.offerPrice, parsePrice(body.price, existingProduct?.offerPrice ?? existingProduct?.price)),
      sizeStocks: parseSizeStocks(body.sizeStocks, parseList(body.sizes).length > 0 ? parseList(body.sizes) : (existingProduct?.sizes || []), existingProduct?.stock || 0),
      sizes: parseList(body.sizes).length > 0 ? parseList(body.sizes) : (existingProduct?.sizes || []),
      stock: body.stock !== undefined && body.stock !== '' ? parseInt(body.stock, 10) : (existingProduct?.stock || 0),
      uploadedImages: getUploadedFilenames(files),
    }];
  }

  return variants.map((variant, index) => {
    const uploadedImages = Array.isArray(files)
      ? files.filter((file) => file.fieldname === `variantImages_${index}`).map((file) => file.filename)
      : [];
    const legacyUploads = Array.isArray(variant.uploadedImages) ? variant.uploadedImages : [];
    const existingImages = parseList(variant.existingImages || variant.images);
    const images = [...existingImages, ...legacyUploads, ...uploadedImages];
    const offerPrice = parsePrice(variant.offerPrice, parsePrice(variant.price));
    const price = parsePrice(variant.price, offerPrice);
    const mrp = parsePrice(variant.mrp, price);
    const sizeStocks = parseSizeStocks(variant.sizeStocks, parseList(variant.sizes), variant.stock);
    const sizes = sizeStocks.map((item) => item.size);
    const stock = sizeStocks.reduce((sum, item) => sum + item.stock, 0);

    return {
      id: variant.id || undefined,
      colorName: String(variant.colorName || 'Default').trim(),
      colorCode: variant.colorCode ? String(variant.colorCode).trim() : '#94a3b8',
      images,
      price,
      mrp,
      offerPrice,
      sizes,
      sizeStocks,
      stock,
    };
  });
};

const validateVariants = (variants) => {
  if (!variants.length) throw new Error('At least one product variant is required.');

  variants.forEach((variant) => {
    if (!variant.colorName) throw new Error('Variant color name is required.');
    if (!Array.isArray(variant.images) || variant.images.length === 0) throw new Error(`Images are required for ${variant.colorName}.`);
    if (variant.images.length > 4) throw new Error(`You can upload up to 4 images for ${variant.colorName}.`);
    if (isNaN(variant.price) || variant.price < 0 || isNaN(variant.offerPrice) || variant.offerPrice < 0) throw new Error(`Invalid price for ${variant.colorName}.`);
    if (variant.mrp !== undefined && variant.mrp !== null && (isNaN(variant.mrp) || variant.mrp < 0)) throw new Error(`Invalid MRP for ${variant.colorName}.`);
    if (!Array.isArray(variant.sizeStocks) || variant.sizeStocks.length === 0) throw new Error(`Add at least one size for ${variant.colorName}.`);
    variant.sizeStocks.forEach((item) => {
      if (!item.size) throw new Error(`Every size for ${variant.colorName} needs a name.`);
      if (isNaN(item.stock) || item.stock < 0) throw new Error(`Invalid size stock for ${variant.colorName}.`);
    });
  });
};

const syncProductDefaults = (variant) => ({
  price: variant.offerPrice ?? variant.price,
  mrp: variant.mrp,
  offerPrice: variant.offerPrice ?? variant.price,
  images: variant.images,
  sizes: variant.sizes,
  stock: variant.stock,
});

exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, minPrice, maxPrice, size, trending, page, limit } = req.query;
  const where = {};
  const normalizedSearch = search ? String(search).trim() : '';
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 0));
  const usePagination = page !== undefined || limit !== undefined;

  if (normalizedSearch) {
    const matchingCategories = await prisma.category.findMany({
      where: {
        OR: [
          { label: { contains: normalizedSearch } },
          { value: { contains: normalizedSearch } },
        ],
      },
      select: { value: true },
    });
    const matchingCategoryValues = [...new Set(matchingCategories.map((item) => item.value))];

    where.OR = [
      { name: { contains: normalizedSearch } },
      { description: { contains: normalizedSearch } },
      { category: { contains: normalizedSearch } },
      ...(matchingCategoryValues.length > 0 ? [{ category: { in: matchingCategoryValues } }] : []),
    ];
  }

  if (category) {
    where.category = { equals: String(category).trim().toLowerCase() };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined && minPrice !== '') where.price.gte = parseFloat(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') where.price.lte = parseFloat(maxPrice);
  }

  if (trending !== undefined && trending !== '') {
    where.isTrending = String(trending).toLowerCase() === 'true';
  }

  const queryOptions = {
    where,
    include: { variants: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    ...(usePagination ? { skip: (pageNumber - 1) * (pageSize || 24), take: pageSize || 24 } : {}),
  };

  const [rows, total] = usePagination
    ? await Promise.all([
        prisma.product.findMany(queryOptions),
        prisma.product.count({ where }),
      ])
    : [await prisma.product.findMany(queryOptions), null];

  let products = rows;

  products = products.map(normalizeProduct);

  if (size) {
    const normalizedSize = String(size).trim();
    products = products.filter((product) => (
      Array.isArray(product.sizes) && product.sizes.includes(normalizedSize)
    ));
  }

  if (usePagination) {
    res.json({
      products,
      pagination: {
        page: pageNumber,
        limit: pageSize || 24,
        total,
        totalPages: Math.max(1, Math.ceil(total / (pageSize || 24))),
      },
    });
    return;
  }

  res.json(products);
});

exports.getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json(normalizeProduct(product));
});

exports.createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, isTrending } = req.body;
  const variants = parseVariants(req.body, req.files);

  if (!name || !category) {
    res.status(400);
    throw new Error('Name and category are required.');
  }

  try {
    validateVariants(variants);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const defaultVariant = variants[0];
  const product = await prisma.product.create({
    data: {
      name,
      description,
      category: String(category).trim().toLowerCase(),
      isTrending: String(isTrending).toLowerCase() === 'true',
      ...syncProductDefaults(defaultVariant),
      variants: {
        create: variants.map((variant) => ({
          colorName: variant.colorName,
          colorCode: variant.colorCode,
          images: variant.images,
          price: variant.price,
          mrp: variant.mrp,
          offerPrice: variant.offerPrice,
          sizes: variant.sizes,
          sizeStocks: variant.sizeStocks,
          stock: variant.stock,
        })),
      },
    },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });

  await cache.delByPrefix('products:');
  res.status(201).json(normalizeProduct(product));
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });

  if (!existing) {
    res.status(404);
    throw new Error('Product not found');
  }

  const { name, description, category, isTrending } = req.body;
  const variants = parseVariants(req.body, req.files, existing);

  try {
    validateVariants(variants);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const defaultVariant = variants[0];
  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: req.params.id },
      data: {
        name: name || existing.name,
        description: description ?? existing.description,
        category: category ? String(category).trim().toLowerCase() : existing.category,
        isTrending: isTrending === undefined ? existing.isTrending : String(isTrending).toLowerCase() === 'true',
        ...syncProductDefaults(defaultVariant),
      },
    });

    const nextVariantIds = variants.map((variant) => variant.id).filter(Boolean);
    await tx.productVariant.deleteMany({
      where: {
        productId: req.params.id,
        ...(nextVariantIds.length > 0 ? { id: { notIn: nextVariantIds } } : {}),
      },
    });

    for (const variant of variants) {
      const data = {
        colorName: variant.colorName,
        colorCode: variant.colorCode,
        images: variant.images,
        price: variant.price,
        mrp: variant.mrp,
        offerPrice: variant.offerPrice,
        sizes: variant.sizes,
        sizeStocks: variant.sizeStocks,
        stock: variant.stock,
      };

      if (variant.id) {
        await tx.productVariant.update({ where: { id: variant.id }, data });
      } else {
        await tx.productVariant.create({ data: { ...data, productId: req.params.id } });
      }
    }

    return tx.product.findUnique({
      where: { id: updated.id },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
  });

  await cache.delByPrefix('products:');
  res.json(normalizeProduct(product));
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404);
    throw new Error('Product not found');
  }

  await prisma.product.delete({ where: { id: req.params.id } });
  await cache.delByPrefix('products:');
  res.json({ message: 'Product deleted' });
});

exports.deleteVariant = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (product.variants.length <= 1) {
    res.status(400);
    throw new Error('A product must have at least one variant.');
  }

  const variant = product.variants.find((item) => item.id === req.params.variantId);
  if (!variant) {
    res.status(404);
    throw new Error('Variant not found');
  }

  await prisma.productVariant.delete({ where: { id: variant.id } });
  const nextDefault = product.variants.find((item) => item.id !== variant.id);
  await prisma.product.update({
    where: { id: product.id },
    data: syncProductDefaults(nextDefault),
  });

  await cache.delByPrefix('products:');
  res.json({ message: 'Variant deleted' });
});
