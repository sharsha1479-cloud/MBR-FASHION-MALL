const express = require('express');
const multer = require('multer');
const path = require('path');
const { getCombos, getComboById, createCombo, updateCombo, deleteCombo } = require('../controllers/comboController');
const { protect, admin } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
const router = express.Router();

router.route('/').get(getCombos).post(protect, admin, upload.single('image'), createCombo);
router.route('/:id').get(getComboById).put(protect, admin, upload.single('image'), updateCombo).delete(protect, admin, deleteCombo);

module.exports = router;
