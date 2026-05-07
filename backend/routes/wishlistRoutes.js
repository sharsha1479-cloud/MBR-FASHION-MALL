const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getWishlist, addToWishlist, removeWishlistItem } = require('../controllers/wishlistController');

const router = express.Router();

router.route('/').get(protect, getWishlist).post(protect, addToWishlist);
router.route('/:id').delete(protect, removeWishlistItem);

module.exports = router;
