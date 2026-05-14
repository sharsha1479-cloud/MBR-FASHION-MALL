const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');
const prisma = require('../utils/prisma');
const { getCouponDiscount } = require('./couponController');

const getRazorpayClient = () => new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const hasConfiguredRazorpayKeys = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  return Boolean(
    keyId &&
    keySecret &&
    keyId !== 'your_razorpay_key_id' &&
    keySecret !== 'your_razorpay_key_secret'
  );
};

const assertQuantity = (quantity) => {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value <= 0 || value > 99) {
    throw new Error('Invalid item quantity');
  }
  return value;
};

const getEffectiveProductPrice = (productOrVariant) => Number(
  productOrVariant.offerPrice ?? productOrVariant.price ?? 0
);

const getEffectiveComboPrice = (comboOrVariant) => Number(comboOrVariant.offerPrice ?? 0);

const calculateServerAmount = async (orderItems, couponCode, userId) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error('No order items provided');
  }

  let subtotal = 0;

  for (const item of orderItems) {
    const quantity = assertQuantity(item.quantity);
    const productId = item.product || item.productId || null;
    const variantId = item.variant || item.variantId || null;
    const comboProductId = item.comboProduct || item.comboProductId || null;
    const comboVariantId = item.comboVariant || item.comboVariantId || null;

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
      subtotal += getEffectiveProductPrice(selectedVariant) * quantity;
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
      subtotal += getEffectiveComboPrice(selectedVariant) * quantity;
      continue;
    }

    throw new Error('Order item must include a product or combo');
  }

  let discountAmount = 0;
  if (couponCode) {
    const couponResult = await getCouponDiscount(couponCode, subtotal, userId);
    discountAmount = couponResult.discountAmount;
  }

  return Math.max(subtotal - discountAmount, 0);
};

exports.createOrder = asyncHandler(async (req, res) => {
  const { currency = 'INR', receipt, orderItems, couponCode } = req.body;

  if (!hasConfiguredRazorpayKeys()) {
    res.status(503);
    throw new Error('Razorpay keys are not configured.');
  }

  let amount;
  try {
    amount = await calculateServerAmount(orderItems, couponCode, req.user.id);
  } catch (error) {
    res.status(400);
    throw error;
  }

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('A valid payment amount is required');
  }

  const razorpay = getRazorpayClient();

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.status(201).json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('[Razorpay] createOrder failed', error?.message || 'Unknown Razorpay error');
    res.status(502);
    throw new Error('Payment provider is temporarily unavailable. Please try again later.');
  }
});
