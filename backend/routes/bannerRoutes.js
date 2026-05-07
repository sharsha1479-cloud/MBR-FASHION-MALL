const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');
const { getBanners, createBanner, updateBanner, deleteBanner } = require('../controllers/bannerController');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.route('/').get(getBanners).post(protect, admin, upload.single('image'), createBanner);
router.route('/:id').put(protect, admin, upload.single('image'), updateBanner).delete(protect, admin, deleteBanner);

module.exports = router;
