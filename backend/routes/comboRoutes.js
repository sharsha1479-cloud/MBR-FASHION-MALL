const express = require('express');
const { getCombos, getComboById, createCombo, updateCombo, deleteCombo } = require('../controllers/comboController');
const { protect, admin } = require('../middleware/authMiddleware');
const { compressedAny } = require('../middleware/compressedUpload');
const router = express.Router();

router.route('/').get(getCombos).post(protect, admin, compressedAny, createCombo);
router.route('/:id').get(getComboById).put(protect, admin, compressedAny, updateCombo).delete(protect, admin, deleteCombo);

module.exports = router;
