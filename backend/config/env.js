const requiredInProduction = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];

const weakSecrets = new Set([
  'fashion-secret',
  'supersecretjwtkey',
  'your-secret-key-here',
]);

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const getJwtSecret = () => {
  const secret = getRequiredEnv('JWT_SECRET');
  if (process.env.NODE_ENV === 'production' && weakSecrets.has(secret)) {
    throw new Error('JWT_SECRET must be a strong unique secret in production');
  }
  return secret;
};

const getRefreshTokenSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret();
  if (process.env.NODE_ENV === 'production' && weakSecrets.has(secret)) {
    throw new Error('JWT_REFRESH_SECRET must be a strong unique secret in production');
  }
  return secret;
};

const validateProductionEnv = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = requiredInProduction.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }

  getJwtSecret();
  getRefreshTokenSecret();
};

module.exports = {
  getJwtSecret,
  getRefreshTokenSecret,
  validateProductionEnv,
};
