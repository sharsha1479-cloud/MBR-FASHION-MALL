const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.route('/').get(getCategories).post(protect, admin, upload.single('image'), createCategory);
router.route('/:id').put(protect, admin, upload.single('image'), updateCategory).delete(protect, admin, deleteCategory);

module.exports = router;
