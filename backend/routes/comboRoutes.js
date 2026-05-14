const express = require('express');
const { getCombos, getComboById, createCombo, updateCombo, deleteCombo } = require('../controllers/comboController');
const { protect, admin } = require('../middleware/authMiddleware');
const { compressedAny } = require('../middleware/compressedUpload');
const { cachePublic } = require('../middleware/cacheMiddleware');
const router = express.Router();

router.route('/').get(cachePublic('combos', 90), getCombos).post(protect, admin, compressedAny, createCombo);
router.route('/:id').get(cachePublic('combos', 120), getComboById).put(protect, admin, compressedAny, updateCombo).delete(protect, admin, deleteCombo);

module.exports = router;
