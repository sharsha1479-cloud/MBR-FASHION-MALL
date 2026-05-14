const logger = require('../utils/logger');

const sensitiveKeys = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_SECRET',
  'SMTP_PASS',
  'CLOUDINARY_API_SECRET',
  'MYSQL_PASSWORD',
];

const redactSensitiveText = (value = '') => {
  let text = String(value);
  for (const key of sensitiveKeys) {
    const secret = process.env[key];
    if (secret) text = text.split(secret).join('[REDACTED]');
  }
  return text
    .replace(/mysql:\/\/[^@\s]+@/gi, 'mysql://[REDACTED]@')
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgresql://[REDACTED]@')
    .replace(/(password|secret|token|signature|authorization)=([^&\s]+)/gi, '$1=[REDACTED]');
};

exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isServerError = statusCode >= 500;

  logger.error('request_error', {
    message: redactSensitiveText(err.message),
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack ? redactSensitiveText(err.stack) : undefined,
  });

  res.status(statusCode).json({
    message: isServerError
      ? 'Something went wrong. Please try again later.'
      : redactSensitiveText(err.message),
  });
};
