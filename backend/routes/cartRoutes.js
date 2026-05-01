const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} = require('../controllers/cartController');

const router = express.Router();

router.route('/').get(protect, getCart).post(protect, addToCart).delete(protect, clearCart);
router.route('/:id').put(protect, updateCartItem).delete(protect, removeCartItem);

module.exports = router;
