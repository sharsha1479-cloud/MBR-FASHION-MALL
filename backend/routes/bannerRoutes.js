const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { compressedSingle } = require('../middleware/compressedUpload');
const { getBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/bannerController');

const router = express.Router();

router.route('/').get(getBanners).post(protect, admin, compressedSingle('image'), createBanner);
router.route('/:id').put(protect, admin, compressedSingle('image'), updateBanner).delete(protect, admin, deleteBanner);

module.exports = router;
