const express = require('express');
const router = express.Router();
const { signup, login, changePassword, forgotPassword, resetPasswordWithOtp, refreshToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/securityMiddleware');

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.',
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please try again later.',
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordWithOtp);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.put('/password', protect, changePassword);

module.exports = router;
