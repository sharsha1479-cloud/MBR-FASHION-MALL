const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../utils/prisma');
const { getCouponDiscount } = require('./couponController');

const getRazorpayClient = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const hidePaymentSignature = (order) => {
  if (Array.isArray(order)) return order.map(hidePaymentSignature);
  if (!order || typeof order !== 'object') return order;
  const { paymentSignature, ...safeOrder } = order;
  return safeOrder;
};

const verifyRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, signature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) return false;
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const generatedBuffer = Buffer.from(generated, 'hex');
  const signatureBuffer = Buffer.from(String(signature), 'hex');
  return generatedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(generatedBuffer, signatureBuffer);
};

const getVariantSizeStocks = (variant) => {
  const rows = Array.isArray(variant.sizeStocks) && variant.sizeStocks.length > 0
    ? variant.sizeStocks
    : (variant.sizes || []).map((size) => ({
        size,
        stock: Number(variant.stock || 0),
      }));

  return rows.map((item) => ({
    size: String(item.size ?? item.value ?? '').trim(),
    stock: Math.max(0, parseInt(item.stock ?? 0, 10) || 0),
  })).filter((item) => item.size);
};

const getEffectiveProductPrice = (productOrVariant) => Number(
  productOrVariant.offerPrice ?? productOrVariant.price ?? 0
);

const getEffectiveComboPrice = (comboOrVariant) => Number(comboOrVariant.offerPrice ?? 0);

const getFirstImage = (images, fallback = null) => {
  if (Array.isArray(images)) return images[0] || fallback;
  if (typeof images === 'string') return images || fallback;
  return fallback;
};

const assertQuantity = (quantity) => {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value <= 0 || value > 99) {
    throw new Error('Invalid item quantity');
  }
  return value;
};

const buildOrderItems = async (orderItems) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error('No order items provided');
  }

  const preparedItems = [];

  for (const item of orderItems) {
    const quantity = assertQuantity(item.quantity);
    const productId = item.product || item.productId || null;
    const variantId = item.variant || item.variantId || null;
    const comboProductId = item.comboProduct || item.comboProductId || null;
    const comboVariantId = item.comboVariant || item.comboVariantId || null;
    const size = item.size ? String(item.size).trim() : null;

    if ((productId || variantId) && (comboProductId || comboVariantId)) {
      throw new Error('Order item cannot be both product and combo');
    }

    if (variantId || productId) {
      const product = productId
        ? await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } })
        : null;
      const variant = variantId
        ? await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } })
        : null;
      const selectedProduct = product || variant?.product;
      const selectedVariant = variant || product?.variants?.[0] || null;

      if (!selectedProduct || !selectedVariant || selectedVariant.productId !== selectedProduct.id) {
        throw new Error('Selected product is not available');
      }

      const sizeStocks = getVariantSizeStocks(selectedVariant);
      const sizeStock = size ? sizeStocks.find((row) => row.size === size) : null;
      if (sizeStocks.length > 0 && !sizeStock) {
        throw new Error('Selected size is not available');
      }
      if (sizeStock && sizeStock.stock < quantity) {
        throw new Error(`Only ${sizeStock.stock} left in stock for size ${size}.`);
      }
      if (sizeStocks.length === 0 && Number(selectedProduct.stock || 0) < quantity) {
        throw new Error(`Only ${selectedProduct.stock} left in stock.`);
      }

      preparedItems.push({
        productId: selectedProduct.id,
        variantId: selectedVariant.id,
        comboProductId: null,
        comboVariantId: null,
        quantity,
        price: getEffectiveProductPrice(selectedVariant),
        size,
        colorName: selectedVariant.colorName || null,
        image: getFirstImage(selectedVariant.images, getFirstImage(selectedProduct.images)),
      });
      continue;
    }

    if (comboVariantId || comboProductId) {
      const comboProduct = comboProductId
        ? await prisma.comboProduct.findUnique({ where: { id: comboProductId }, include: { variants: true } })
        : null;
      const comboVariant = comboVariantId
        ? await prisma.comboVariant.findUnique({ where: { id: comboVariantId }, include: { comboProduct: true } })
        : null;
      const selectedCombo = comboProduct || comboVariant?.comboProduct;
      const selectedVariant = comboVariant || comboProduct?.variants?.[0] || null;

      if (!selectedCombo || !selectedCombo.isActive || !selectedVariant || selectedVariant.comboProductId !== selectedCombo.id) {
        throw new Error('Selected combo is not available');
      }

      const sizeStocks = getVariantSizeStocks(selectedVariant);
      const sizeStock = size ? sizeStocks.find((row) => row.size === size) : null;
      if (sizeStocks.length > 0 && !sizeStock) {
        throw new Error('Selected combo size is not available');
      }
      if (sizeStock && sizeStock.stock < quantity) {
        throw new Error(`Only ${sizeStock.stock} left in stock for size ${size}.`);
      }
      if (sizeStocks.length === 0 && Number(selectedCombo.stock || 0) < quantity) {
        throw new Error(`Only ${selectedCombo.stock} left in stock.`);
      }

      preparedItems.push({
        productId: null,
        variantId: null,
        comboProductId: selectedCombo.id,
        comboVariantId: selectedVariant.id,
        quantity,
        price: getEffectiveComboPrice(selectedVariant),
        size,
        colorName: selectedVariant.colorName || null,
        image: getFirstImage(selectedVariant.images, selectedCombo.image),
      });
      continue;
    }

    throw new Error('Order item must include a product or combo');
  }

  return preparedItems;
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

const verifyCapturedPayment = async ({ razorpayOrderId, razorpayPaymentId, expectedAmount }) => {
  const payment = await getRazorpayClient().payments.fetch(razorpayPaymentId);
  const amountInPaise = Math.round(expectedAmount * 100);

  if (
    payment.order_id !== razorpayOrderId ||
    Number(payment.amount) !== amountInPaise ||
    payment.currency !== 'INR' ||
    payment.status !== 'captured'
  ) {
    throw new Error('Razorpay payment verification failed');
  }
};

exports.createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    couponCode,
    razorpayOrderId,
    razorpayPaymentId,
    paymentSignature,
  } = req.body;

  if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, signature: paymentSignature })) {
    res.status(400);
    throw new Error('Razorpay payment signature verification failed');
  }

  const existingPayment = await prisma.order.findFirst({ where: { razorpayPaymentId } });
  if (existingPayment) {
    res.status(400);
    throw new Error('This payment has already been used for an order');
  }

  let preparedItems;
  try {
    preparedItems = await buildOrderItems(orderItems);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const subtotalValue = preparedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discountAmount = 0;
  let appliedCouponCode = null;
  let appliedCouponId = null;

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
  if (finalAmount <= 0) {
    res.status(400);
    throw new Error('Total amount must be greater than zero');
  }

  try {
    await verifyCapturedPayment({ razorpayOrderId, razorpayPaymentId, expectedAmount: finalAmount });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Razorpay payment verification failed');
  }

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
          status: 'placed',
          paymentStatus: 'paid',
          razorpayOrderId,
          razorpayPaymentId,
          paymentSignature,
          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              comboProductId: item.comboProductId,
              comboVariantId: item.comboVariantId,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              colorName: item.colorName,
              image: item.image,
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

      for (const item of preparedItems) {
        if (item.variantId) {
          await decrementVariantSizeStock(tx, item.variantId, item.size, item.quantity);
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        } else if (item.comboVariantId) {
          await decrementComboVariantSizeStock(tx, item.comboVariantId, item.size, item.quantity);
        } else if (item.comboProductId) {
          await tx.comboProduct.update({
            where: { id: item.comboProductId },
            data: { stock: { decrement: item.quantity } },
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

  res.status(201).json(hidePaymentSignature(createdOrder));
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const where = req.user.role === 'admin'
    ? { id: req.params.id }
    : { id: req.params.id, userId: req.user.id };

  const order = await prisma.order.findFirst({
    where,
    include: {
      items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (order) {
    res.json(hidePaymentSignature(order));
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

exports.updateOrderPayment = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const {
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    razorpay_signature: paymentSignature,
  } = req.body;

  if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, signature: paymentSignature })) {
    res.status(400);
    throw new Error('Razorpay payment signature verification failed');
  }

  await verifyCapturedPayment({
    razorpayOrderId,
    razorpayPaymentId,
    expectedAmount: order.totalAmount,
  });

  const existingPayment = await prisma.order.findFirst({
    where: { razorpayPaymentId, id: { not: order.id } },
  });
  if (existingPayment) {
    res.status(400);
    throw new Error('This payment has already been used for an order');
  }

  const updatedOrder = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      paymentStatus: 'paid',
      razorpayOrderId,
      razorpayPaymentId,
      paymentSignature,
    },
    include: {
      items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  res.json(hidePaymentSignature(updatedOrder));
});

exports.getUserOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(hidePaymentSignature(orders));
});

exports.getOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true, variant: true, comboProduct: true, comboVariant: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(hidePaymentSignature(orders));
});
