const asyncHandler = require('express-async-handler');
const Razorpay = require('razorpay');

const getRazorpayClient = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

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

exports.createOrder = asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;
  const numericAmount = Number(amount);

  if (!hasConfiguredRazorpayKeys()) {
    res.status(503);
    throw new Error('Razorpay test keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env, then restart the backend.');
  }

  if (!numericAmount || numericAmount <= 0) {
    res.status(400);
    throw new Error('A valid payment amount is required');
  }

  const razorpay = getRazorpayClient();

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(numericAmount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.status(201).json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('[Razorpay] createOrder failed', error?.message || error, { body: req.body });
    res.status(502);
    throw new Error(error?.error?.description || error?.message || 'Razorpay order creation failed');
  }
});
