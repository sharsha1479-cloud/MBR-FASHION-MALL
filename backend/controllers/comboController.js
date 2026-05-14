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

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    // Admin forms may send comma-separated values.
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

const normalizeCombo = (combo) => {
  if (!combo) return combo;
  const variants = Array.isArray(combo.variants) ? combo.variants.map(normalizeVariant) : [];
  const defaultVariant = variants[0];
  if (!defaultVariant) return { ...combo, variants };

  return {
    ...combo,
    image: Array.isArray(defaultVariant.images) ? defaultVariant.images[0] || combo.image : combo.image,
    mrp: defaultVariant.mrp ?? combo.mrp,
    offerPrice: defaultVariant.offerPrice ?? combo.offerPrice,
    sizes: defaultVariant.sizes || combo.sizes || [],
    stock: defaultVariant.stock ?? combo.stock,
    variants,
  };
};

const parseVariants = (body, files, existingCombo) => {
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
      images: body.existingImages ? parseList(body.existingImages) : (existingCombo?.image ? [existingCombo.image] : []),
      mrp: parsePrice(body.mrp, existingCombo?.mrp),
      offerPrice: parsePrice(body.offerPrice, existingCombo?.offerPrice),
      sizeStocks: parseSizeStocks(body.sizeStocks, parseList(body.sizes).length > 0 ? parseList(body.sizes) : (existingCombo?.sizes || []), existingCombo?.stock || 0),
      sizes: parseList(body.sizes).length > 0 ? parseList(body.sizes) : (existingCombo?.sizes || []),
      stock: body.stock !== undefined && body.stock !== '' ? parseInt(body.stock, 10) : (existingCombo?.stock || 0),
      uploadedImages: getUploadedFilenames(files).filter((_, index) => index < 4),
    }];
  }

  return variants.map((variant, index) => {
    const uploadedImages = Array.isArray(files)
      ? files.filter((file) => file.fieldname === `comboVariantImages_${index}` || file.fieldname === 'image').map((file) => file.filename)
      : [];
    const legacyUploads = Array.isArray(variant.uploadedImages) ? variant.uploadedImages : [];
    const existingImages = parseList(variant.existingImages || variant.images);
    const images = [...existingImages, ...legacyUploads, ...uploadedImages];
    const offerPrice = parsePrice(variant.offerPrice);
    const mrp = parsePrice(variant.mrp, offerPrice);
    const sizeStocks = parseSizeStocks(variant.sizeStocks, parseList(variant.sizes), variant.stock);
    const sizes = sizeStocks.map((item) => item.size);
    const stock = sizeStocks.reduce((sum, item) => sum + item.stock, 0);

    return {
      id: variant.id || undefined,
      colorName: String(variant.colorName || 'Default').trim(),
      colorCode: variant.colorCode ? String(variant.colorCode).trim() : '#94a3b8',
      images,
      mrp,
      offerPrice,
      sizes,
      sizeStocks,
      stock,
    };
  });
};

const validateVariants = (variants) => {
  if (!variants.length) throw new Error('At least one combo variant is required.');

  variants.forEach((variant) => {
    if (!variant.colorName) throw new Error('Variant color name is required.');
    if (!Array.isArray(variant.images) || variant.images.length === 0) throw new Error(`Images are required for ${variant.colorName}.`);
    if (variant.images.length > 4) throw new Error(`You can upload up to 4 images for ${variant.colorName}.`);
    if (isNaN(variant.offerPrice) || variant.offerPrice < 0) throw new Error(`Invalid offer price for ${variant.colorName}.`);
    if (variant.mrp !== undefined && variant.mrp !== null && (isNaN(variant.mrp) || variant.mrp < 0)) throw new Error(`Invalid MRP for ${variant.colorName}.`);
    if (!Array.isArray(variant.sizeStocks) || variant.sizeStocks.length === 0) throw new Error(`Add at least one size for ${variant.colorName}.`);
    variant.sizeStocks.forEach((item) => {
      if (!item.size) throw new Error(`Every size for ${variant.colorName} needs a name.`);
      if (isNaN(item.stock) || item.stock < 0) throw new Error(`Invalid size stock for ${variant.colorName}.`);
    });
  });
};

const syncComboDefaults = (variant) => ({
  mrp: variant.mrp,
  offerPrice: variant.offerPrice,
  image: variant.images[0],
  sizes: variant.sizes,
  stock: variant.stock,
});

exports.getCombos = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === 'true';

  if (!prisma.comboProduct) return res.json([]);

  let combos = [];
  try {
    combos = await prisma.comboProduct.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    if (error.code === 'P2021' || error.code === 'P2022') return res.json([]);
    throw error;
  }

  res.json(combos.map(normalizeCombo));
});

exports.getComboById = asyncHandler(async (req, res) => {
  if (!prisma.comboProduct) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  const combo = await prisma.comboProduct.findUnique({
    where: { id: req.params.id },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });

  if (!combo || !combo.isActive) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  res.json(normalizeCombo(combo));
});

exports.createCombo = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;
  const variants = parseVariants(req.body, req.files);

  if (!name) {
    res.status(400);
    throw new Error('Combo name is required.');
  }

  try {
    validateVariants(variants);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const defaultVariant = variants[0];
  const combo = await prisma.comboProduct.create({
    data: {
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      isActive: isActive === undefined ? true : String(isActive).toLowerCase() === 'true',
      ...syncComboDefaults(defaultVariant),
      variants: {
        create: variants.map((variant) => ({
          colorName: variant.colorName,
          colorCode: variant.colorCode,
          images: variant.images,
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

  res.status(201).json(normalizeCombo(combo));
});

exports.updateCombo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.comboProduct.findUnique({
    where: { id },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });

  if (!existing) {
    res.status(404);
    throw new Error('Combo product not found.');
  }

  const { name, description, isActive } = req.body;
  const variants = parseVariants(req.body, req.files, existing);

  try {
    validateVariants(variants);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const defaultVariant = variants[0];
  const combo = await prisma.$transaction(async (tx) => {
    const updated = await tx.comboProduct.update({
      where: { id },
      data: {
        name: name ? String(name).trim() : existing.name,
        description: description !== undefined ? String(description).trim() || null : existing.description,
        isActive: isActive === undefined ? existing.isActive : String(isActive).toLowerCase() === 'true',
        ...syncComboDefaults(defaultVariant),
      },
    });

    const nextVariantIds = variants.map((variant) => variant.id).filter(Boolean);
    await tx.comboVariant.deleteMany({
      where: {
        comboProductId: id,
        ...(nextVariantIds.length > 0 ? { id: { notIn: nextVariantIds } } : {}),
      },
    });

    for (const variant of variants) {
      const data = {
        colorName: variant.colorName,
        colorCode: variant.colorCode,
        images: variant.images,
        mrp: variant.mrp,
        offerPrice: variant.offerPrice,
        sizes: variant.sizes,
        sizeStocks: variant.sizeStocks,
        stock: variant.stock,
      };

      if (variant.id) {
        await tx.comboVariant.update({ where: { id: variant.id }, data });
      } else {
        await tx.comboVariant.create({ data: { ...data, comboProductId: id } });
      }
    }

    return tx.comboProduct.findUnique({
      where: { id: updated.id },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
  });

  res.json(normalizeCombo(combo));
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
