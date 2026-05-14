const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const hidePaymentSignature = (order) => {
  if (Array.isArray(order)) return order.map(hidePaymentSignature);
  if (!order || typeof order !== 'object') return order;
  const { paymentSignature, ...safeOrder } = order;
  return safeOrder;
};

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users);
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('Role must be either user or admin');
  }

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      role,
      isAdmin: role === 'admin',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  res.json(updatedUser);
});

exports.getAdminOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true, comboProduct: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(hidePaymentSignature(orders));
});

exports.getAdminOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { product: true, comboProduct: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json(hidePaymentSignature(order));
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const { status, cancellationReason } = req.body;
  const validStatuses = ['placed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid order status');
  }

  const reason = typeof cancellationReason === 'string' ? cancellationReason.trim() : '';
  if (status === 'cancelled' && !reason) {
    res.status(400);
    throw new Error('Cancellation reason is required');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status,
      cancellationReason: status === 'cancelled' ? reason : null,
    },
    include: {
      items: { include: { product: true, comboProduct: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(hidePaymentSignature(updatedOrder));
});
