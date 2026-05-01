const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const getOrCreateCart = async (userId) => {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.cart.create({ data: { userId } });
};

exports.getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
    orderBy: { id: 'asc' },
  });

  res.json({ id: cart.id, items });
});

exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error('Product ID is required');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const cart = await getOrCreateCart(req.user.id);
  const item = await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    update: {
      quantity: { increment: Number(quantity) || 1 },
    },
    create: {
      cartId: cart.id,
      productId,
      quantity: Number(quantity) || 1,
    },
    include: { product: true },
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

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: Number(quantity) },
    include: { product: true },
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
