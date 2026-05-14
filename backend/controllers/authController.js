const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const generateToken = require('../utils/generateToken');
const { getRefreshTokenSecret } = require('../config/env');
const { sendPasswordResetOtp } = require('../utils/mailer');

const passwordResetOtps = new Map();

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const refreshCookieName = 'mbr_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const buildAuthPayload = (user) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isAdmin: user.role === 'admin',
  token: generateToken(user.id, user.role),
});

const issueRefreshCookie = (res, user) => {
  const refreshToken = jwt.sign(
    { userId: user.id, role: user.role, type: 'refresh' },
    getRefreshTokenSecret(),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  res.cookie(refreshCookieName, refreshToken, cookieOptions);
};

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'user' }
  });
  if (user) {
    issueRefreshCookie(res, user);
    res.status(201).json(buildAuthPayload(user));
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.password))) {
    issueRefreshCookie(res, user);
    res.json(buildAuthPayload(user));
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[refreshCookieName];
  if (!refreshToken) {
    res.status(401);
    throw new Error('Refresh token missing');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, getRefreshTokenSecret());
  } catch {
    res.clearCookie(refreshCookieName, cookieOptions);
    res.status(401);
    throw new Error('Refresh token is invalid');
  }

  if (decoded.type !== 'refresh') {
    res.status(401);
    throw new Error('Refresh token is invalid');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  issueRefreshCookie(res, user);
  res.json(buildAuthPayload(user));
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie(refreshCookieName, cookieOptions);
  res.json({ message: 'Logged out' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  res.json({ message: 'Password updated successfully' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email');
  }

  const otp = createOtp();
  passwordResetOtps.set(email, {
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });

  await sendPasswordResetOtp(email, otp);

  res.json({ message: 'OTP sent to registered email' });
});

exports.resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new Error('Email, OTP, and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  const resetRequest = passwordResetOtps.get(email);
  if (!resetRequest || resetRequest.expiresAt < Date.now()) {
    passwordResetOtps.delete(email);
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  if (resetRequest.attempts >= 5 || resetRequest.otpHash !== hashOtp(otp)) {
    resetRequest.attempts += 1;
    if (resetRequest.attempts >= 5) passwordResetOtps.delete(email);
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404);
    throw new Error('No account found with this email');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  passwordResetOtps.delete(email);

  res.json({ message: 'Password reset successfully' });
});
