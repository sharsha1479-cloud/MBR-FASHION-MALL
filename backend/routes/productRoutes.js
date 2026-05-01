const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
const productImages = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 6 },
]);
const router = express.Router();

router.route('/').get(getProducts).post(protect, admin, productImages, createProduct);
router.route('/:id').get(getProductById).put(protect, admin, productImages, updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;
