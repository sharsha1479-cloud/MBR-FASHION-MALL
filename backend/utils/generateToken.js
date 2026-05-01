const jwt = require('jsonwebtoken');

const generateToken = (userId, role = 'user') => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET || 'fashion-secret', {
    expiresIn: '7d',
  });
};

module.exports = generateToken;
