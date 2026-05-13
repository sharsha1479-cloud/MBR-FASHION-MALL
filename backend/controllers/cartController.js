const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const getOrCreateCart = async (userId) => {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.cart.create({ data: { userId } });
};

const getVariantSizeStocks = (variant) => {
  const rows = Array.isArray(variant.sizeStocks) && variant.sizeStocks.length > 0
    ? variant.sizeStocks
    : (variant.sizes || []).map((size, index) => ({
        size,
        stock: Number(variant.stock || 0),
      }));

  return rows.map((item) => ({
    size: String(item.size ?? item.value ?? '').trim(),
    stock: Math.max(0, parseInt(item.stock ?? 0, 10) || 0),
  })).filter((item) => item.size);
};

const getSizeStock = (variant, size) => {
  const selectedSize = String(size || '').trim();
  return getVariantSizeStocks(variant).find((item) => item.size === selectedSize);
};

exports.getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: { variants: true } }, variant: true, comboProduct: { include: { variants: true } }, comboVariant: true },
    orderBy: { id: 'asc' },
  });

  res.json({ id: cart.id, items });
});

exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId, comboProductId, comboVariantId, quantity = 1, size } = req.body;

  if (!productId && !comboProductId) {
    res.status(400);
    throw new Error('Product or combo product ID is required');
  }

  const cart = await getOrCreateCart(req.user.id);

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const selectedVariant = variantId
      ? product.variants.find((variant) => variant.id === variantId)
      : product.variants[0];

    if (!selectedVariant) {
      res.status(400);
      throw new Error('Please choose an available product color.');
    }

    const selectedSize = String(size || '').trim();
    const sizeStocks = getVariantSizeStocks(selectedVariant);
    if (sizeStocks.length > 0 && !selectedSize) {
      res.status(400);
      throw new Error('Please choose a size.');
    }
    const selectedSizeStock = selectedSize ? getSizeStock(selectedVariant, selectedSize) : null;
    if (selectedSize && sizeStocks.length > 0 && !selectedSizeStock) {
      res.status(400);
      throw new Error('Please choose an available size.');
    }
    if (selectedSizeStock && selectedSizeStock.stock <= 0) {
      res.status(400);
      throw new Error('Selected size is out of stock.');
    }

    const requestedQuantity = Number(quantity) || 1;
    const existingProductItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: selectedVariant.id, size: selectedSize || null },
    });

    if (selectedSizeStock && (existingProductItem?.quantity || 0) + requestedQuantity > selectedSizeStock.stock) {
      res.status(400);
      throw new Error(`Only ${selectedSizeStock.stock} left in stock for size ${selectedSize}.`);
    }

    const snapshot = {
      colorName: selectedVariant.colorName,
      image: Array.isArray(selectedVariant.images) ? selectedVariant.images[0] || null : null,
      price: Number(selectedVariant.offerPrice ?? selectedVariant.price),
    };

    const item = existingProductItem
      ? await prisma.cartItem.update({
          where: { id: existingProductItem.id },
          data: { quantity: { increment: requestedQuantity }, ...snapshot },
          include: { product: { include: { variants: true } }, variant: true, comboProduct: { include: { variants: true } }, comboVariant: true },
        })
      : await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            variantId: selectedVariant.id,
            size: selectedSize || null,
            quantity: requestedQuantity,
            ...snapshot,
          },
          include: { product: { include: { variants: true } }, variant: true, comboProduct: { include: { variants: true } }, comboVariant: true },
        });

    res.status(201).json(item);
    return;
  }

  const comboProduct = await prisma.comboProduct.findUnique({
    where: { id: comboProductId },
    include: { variants: { orderBy: { createdAt: 'asc' } } },
  });
  if (!comboProduct || !comboProduct.isActive) {
    res.status(404);
    throw new Error('Combo product not found');
  }

  const selectedVariant = comboVariantId
    ? comboProduct.variants.find((variant) => variant.id === comboVariantId)
    : comboProduct.variants[0];

  if (!selectedVariant) {
    res.status(400);
    throw new Error('Please choose an available combo color.');
  }

  const selectedSize = String(size || '').trim();
  const sizeStocks = getVariantSizeStocks(selectedVariant);
  if (sizeStocks.length > 0 && !selectedSize) {
    res.status(400);
    throw new Error('Please choose a combo size.');
  }
  const selectedSizeStock = selectedSize ? getSizeStock(selectedVariant, selectedSize) : null;
  if (selectedSize && sizeStocks.length > 0 && !selectedSizeStock) {
    res.status(400);
    throw new Error('Please choose an available combo size.');
  }
  if (selectedSizeStock && selectedSizeStock.stock <= 0) {
    res.status(400);
    throw new Error('Selected combo size is out of stock.');
  }

  const requestedQuantity = Number(quantity) || 1;

  const existingComboItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, comboProductId, comboVariantId: selectedVariant.id, size: selectedSize || null },
  });

  if (selectedSizeStock && (existingComboItem?.quantity || 0) + requestedQuantity > selectedSizeStock.stock) {
    res.status(400);
    throw new Error(`Only ${selectedSizeStock.stock} left in stock for size ${selectedSize}.`);
  }

  const snapshot = {
    colorName: selectedVariant.colorName,
    image: Array.isArray(selectedVariant.images) ? selectedVariant.images[0] || null : null,
    price: Number(selectedVariant.offerPrice),
  };

  const item = existingComboItem
    ? await prisma.cartItem.update({
      where: { id: existingComboItem.id },
      data: { quantity: { increment: requestedQuantity }, ...snapshot },
      include: { product: true, variant: true, comboProduct: { include: { variants: true } }, comboVariant: true },
    })
    : await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          comboProductId,
          comboVariantId: selectedVariant.id,
          size: selectedSize || null,
          quantity: requestedQuantity,
          ...snapshot,
        },
        include: { product: true, variant: true, comboProduct: { include: { variants: true } }, comboVariant: true },
      });

  res.status(201).json(item);
});

exports.updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req.user.id);

  const item = await prisma.cartItem.findFirst({
    where: { id: req.params.id, cartId: cart.id },
  });

  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  if (Number(quantity) <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    res.json({ message: 'Cart item removed' });
    return;
  }

  if (item.variantId && item.size) {
    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    const selectedSizeStock = variant ? getSizeStock(variant, item.size) : null;
    if (selectedSizeStock && Number(quantity) > selectedSizeStock.stock) {
      res.status(400);
      throw new Error(`Only ${selectedSizeStock.stock} left in stock for size ${item.size}.`);
    }
  }

  if (item.comboVariantId && item.size) {
    const variant = await prisma.comboVariant.findUnique({ where: { id: item.comboVariantId } });
    const selectedSizeStock = variant ? getSizeStock(variant, item.size) : null;
    if (selectedSizeStock && Number(quantity) > selectedSizeStock.stock) {
      res.status(400);
      throw new Error(`Only ${selectedSizeStock.stock} left in stock for size ${item.size}.`);
    }
  }

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: Number(quantity) },
    include: { product: { include: { variants: true } }, variant: true, comboProduct: { include: { variants: true } }, comboVariant: true },
  });

  res.json(updated);
});

exports.removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const item = await prisma.cartItem.findFirst({
    where: { id: req.params.id, cartId: cart.id },
  });

  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  res.json({ message: 'Cart item removed' });
});

exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  res.json({ message: 'Cart cleared' });
});
