const express = require('express');
const router = express.Router();
const { signup, login, changePassword, forgotPassword, resetPasswordWithOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);
router.put('/password', protect, changePassword);

module.exports = router;
