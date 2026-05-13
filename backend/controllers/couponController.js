const asyncHandler = require('express-async-handler');
const prisma = require('../utils/prisma');

const normalizeCode = (code = '') => code.trim().toUpperCase();

const calculateDiscount = (coupon, subtotal) => {
  const amount = Number(subtotal || 0);
  const value = Number(coupon.discountValue || 0);

  if (coupon.discountType === 'fixed') {
    return Math.min(value, amount);
  }

  return Math.min((amount * value) / 100, amount);
};

exports.getCoupons = asyncHandler(async (req, res) => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(coupons);
});

exports.createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, isActive = true } = req.body;
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode || !['percentage', 'fixed'].includes(discountType) || Number(discountValue) <= 0) {
    res.status(400);
    throw new Error('Valid code, discount type, and discount value are required');
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount === '' || minOrderAmount == null ? null : Number(minOrderAmount),
      isActive: Boolean(isActive),
    },
  });

  res.status(201).json(coupon);
});

exports.updateCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, isActive } = req.body;
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode || !['percentage', 'fixed'].includes(discountType) || Number(discountValue) <= 0) {
    res.status(400);
    throw new Error('Valid code, discount type, and discount value are required');
  }

  const coupon = await prisma.coupon.update({
    where: { id: req.params.id },
    data: {
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: minOrderAmount === '' || minOrderAmount == null ? null : Number(minOrderAmount),
      isActive: Boolean(isActive),
    },
  });

  res.json(coupon);
});

exports.deleteCoupon = asyncHandler(async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } });
  res.json({ message: 'Coupon deleted' });
});

exports.validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const normalizedCode = normalizeCode(code);
  const amount = Number(subtotal || 0);

  const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  if (!coupon || !coupon.isActive) {
    res.status(404);
    throw new Error('Invalid coupon code');
  }

  if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
    res.status(400);
    throw new Error(`Minimum order amount is Rs. ${coupon.minOrderAmount.toFixed(0)}`);
  }

  const existingRedemption = await prisma.couponRedemption.findUnique({
    where: {
      couponId_userId: {
        couponId: coupon.id,
        userId: req.user.id,
      },
    },
  });
  if (existingRedemption) {
    res.status(400);
    throw new Error('You have already used this coupon');
  }

  const discountAmount = calculateDiscount(coupon, amount);
  res.json({
    coupon,
    discountAmount,
    totalAmount: Math.max(amount - discountAmount, 0),
  });
});

exports.getCouponDiscount = async (code, subtotal, userId) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return { coupon: null, discountAmount: 0 };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  if (!coupon || !coupon.isActive) {
    throw new Error('Invalid coupon code');
  }

  if (coupon.minOrderAmount && Number(subtotal) < coupon.minOrderAmount) {
    throw new Error(`Minimum order amount is Rs. ${coupon.minOrderAmount.toFixed(0)}`);
  }

  if (userId) {
    const existingRedemption = await prisma.couponRedemption.findUnique({
      where: {
        couponId_userId: {
          couponId: coupon.id,
          userId,
        },
      },
    });
    if (existingRedemption) {
      throw new Error('You have already used this coupon');
    }
  }

  return {
    coupon,
    discountAmount: calculateDiscount(coupon, subtotal),
  };
};
