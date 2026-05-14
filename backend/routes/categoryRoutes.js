const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const { compressedSingle } = require('../middleware/compressedUpload');
const { cachePublic } = require('../middleware/cacheMiddleware');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();

router.route('/').get(cachePublic('categories', 300), getCategories).post(protect, admin, compressedSingle('image'), createCategory);
router.route('/:id').put(protect, admin, compressedSingle('image'), updateCategory).delete(protect, admin, deleteCategory);

module.exports = router;
