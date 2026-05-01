const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const generateToken = require('../utils/generateToken');

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
    const isAdmin = user.role === 'admin';
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin,
      token: generateToken(user.id, user.role),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.password))) {
    const isAdmin = user.role === 'admin';
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin,
      token: generateToken(user.id, user.role),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});
