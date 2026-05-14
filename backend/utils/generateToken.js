const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');

const generateToken = (userId, role = 'user', expiresIn = process.env.JWT_EXPIRES_IN || '15m') => {
  return jwt.sign({ userId, role }, getJwtSecret(), {
    expiresIn,
  });
};

module.exports = generateToken;
