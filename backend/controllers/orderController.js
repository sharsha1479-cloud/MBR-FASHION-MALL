const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { getCouponDiscount } = require('./couponController');

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, signature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !signature) return false;
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const generated = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return generated === signature;
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

const decrementVariantSizeStock = async (tx, variantId, size, quantity) => {
  const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error('Selected product variant was not found.');

  const selectedSize = String(size || '').trim();
  const sizeStocks = getVariantSizeStocks(variant);
  const sizeIndex = sizeStocks.findIndex((item) => item.size === selectedSize);
  if (sizeStocks.length > 0 && sizeIndex === -1) {
    throw new Error('Selected size is not available for this variant.');
  }

  if (sizeIndex !== -1) {
    if (sizeStocks[sizeIndex].stock < quantity) {
      throw new Error(`Only ${sizeStocks[sizeIndex].stock} left in stock for size ${selectedSize}.`);
    }
    sizeStocks[sizeIndex] = {
      ...sizeStocks[sizeIndex],
      stock: sizeStocks[sizeIndex].stock - quantity,
    };
  }

  const nextStock = sizeStocks.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  await tx.productVariant.update({
    where: { id: variant.id },
    data: {
      sizeStocks,
      sizes: sizeStocks.map((item) => item.size),
      stock: nextStock,
    },
  });

  await tx.product.update({
    where: { id: variant.productId },
    data: { stock: { decrement: quantity } },
  });
};

const decrementComboVariantSizeStock = async (tx, variantId, size, quantity) => {
  const variant = await tx.comboVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new Error('Selected combo variant was not found.');

  const selectedSize = String(size || '').trim();
  const sizeStocks = getVariantSizeStocks(variant);
  const sizeIndex = sizeStocks.findIndex((item) => item.size === selectedSize);
  if (sizeStocks.length > 0 && sizeIndex === -1) {
    throw new Error('Selected size is not available for this combo.');
  }

  if (sizeIndex !== -1) {
    if (sizeStocks[sizeIndex].stock < quantity) {
      throw new Error(`Only ${sizeStocks[sizeIndex].stock} left in stock for size ${selectedSize}.`);
    }
    sizeStocks[sizeIndex] = {
      ...sizeStocks[sizeIndex],
      stock: sizeStocks[sizeIndex].stock - quantity,
    };
  }

  const nextStock = sizeStocks.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  await tx.comboVariant.update({
    where: { id: variant.id },
    data: {
      sizeStocks,
      sizes: sizeStocks.map((item) => item.size),
      stock: nextStock,
    },
  });

  await tx.comboProduct.update({
    where: { id: variant.comboProductId },
    data: { stock: { decrement: quantity } },
  });
};

exports.createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    totalAmount,
    totalPrice,
    subtotalAmount,
    couponCode,
    razorpayOrderId,
    razorpayPaymentId,
    paymentSignature,
    paymentStatus = 'paid',
    status = 'placed',
  } = req.body;

  const amountValue = Number(totalAmount ?? totalPrice ?? 0);
  const subtotalValue = Number(subtotalAmount ?? totalAmount ?? totalPrice ?? 0);
  let discountAmount = 0;
  let appliedCouponCode = null;
  let appliedCouponId = null;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items provided');
  }

  if (!amountValue || amountValue <= 0) {
    res.status(400);
    throw new Error('Total amount must be greater than zero');
  }

  if (couponCode) {
    try {
      const couponResult = await getCouponDiscount(couponCode, subtotalValue, req.user.id);
      discountAmount = couponResult.discountAmount;
      appliedCouponCode = couponResult.coupon.code;
      appliedCouponId = couponResult.coupon.id;
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }

  const finalAmount = Math.max(subtotalValue - discountAmount, 0);

  let createdOrder;
  try {
    createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          totalAmount: finalAmount,
          subtotalAmount: subtotalValue,
          discountAmount,
          couponCode: appliedCouponCode,
          status,
          paymentStatus,
          razorpayOrderId,
          razorpayPaymentId,
          paymentSignature,
          items: {
            create: orderItems.map((item) => ({
              productId: item.product || item.productId || null,
              variantId: item.variant || item.variantId || null,
              comboProductId: item.comboProduct || item.comboProductId || null,
              comboVariantId: item.comboVariant || item.comboVariantId || null,
              quantity: Number(item.quantity),
              price: Number(item.price),
              size: item.size || null,
              colorName: item.colorName || null,
              image: item.image || null,
            })),
          },
        },
        include: {
          items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (appliedCouponId) {
        await tx.couponRedemption.create({
          data: {
            couponId: appliedCouponId,
            couponCode: appliedCouponCode,
            userId: req.user.id,
            orderId: order.id,
          },
        });
      }

      for (const item of orderItems) {
        if (item.variant || item.variantId) {
          await decrementVariantSizeStock(tx, item.variant || item.variantId, item.size, Number(item.quantity));
        } else if (item.product || item.productId) {
          await tx.product.update({
            where: { id: item.product || item.productId },
            data: { stock: { decrement: Number(item.quantity) } },
          });
        } else if (item.comboVariant || item.comboVariantId) {
          await decrementComboVariantSizeStock(tx, item.comboVariant || item.comboVariantId, item.size, Number(item.quantity));
        } else if (item.comboProduct || item.comboProductId) {
          await tx.comboProduct.update({
            where: { id: item.comboProduct || item.comboProductId },
            data: { stock: { decrement: Number(item.quantity) } },
          });
        }
      }

      return order;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400);
      throw new Error('You have already used this coupon');
    }
    throw error;
  }

  res.status(201).json(createdOrder);
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

exports.updateOrderPayment = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const {
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    razorpay_signature: paymentSignature,
    paymentStatus,
    status,
  } = req.body;

  if (paymentSignature && razorpayOrderId && razorpayPaymentId) {
    const validSignature = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: paymentSignature,
    });
    if (!validSignature) {
      res.status(400);
      throw new Error('Razorpay payment signature verification failed');
    }
  }

  const updatedOrder = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      paymentStatus: paymentStatus || (razorpayPaymentId ? 'paid' : order.paymentStatus),
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
      paymentSignature: paymentSignature || order.paymentSignature,
      status: status || order.status,
    },
    include: {
      items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(updatedOrder);
});

exports.getUserOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});

exports.getOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders);
});
