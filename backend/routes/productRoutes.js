const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { compressedAny } = require('../middleware/compressedUpload');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteVariant,
} = require('../controllers/productController');

const router = express.Router();

router.route('/').get(getProducts).post(protect, admin, compressedAny, createProduct);
router.route('/:id/variants/:variantId').delete(protect, admin, deleteVariant);
router.route('/:id').get(getProductById).put(protect, admin, compressedAny, updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;
