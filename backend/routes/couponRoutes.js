const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
  validateCoupon,
} = require('../controllers/couponController');

const router = express.Router();

router.post('/validate', protect, validateCoupon);
router.route('/').get(protect, admin, getCoupons).post(protect, admin, createCoupon);
router.route('/:id').put(protect, admin, updateCoupon).delete(protect, admin, deleteCoupon);

module.exports = router;
