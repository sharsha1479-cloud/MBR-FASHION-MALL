const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createOrder } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', protect, createOrder);

module.exports = router;
