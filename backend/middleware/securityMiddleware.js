const rateLimit = require('express-rate-limit');

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

const parseOrigins = (value = '') => value
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = () => {
  const allowedOrigins = parseOrigins(process.env.CORS_ORIGINS);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (!isProduction && allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
  };
};

const sanitizeString = (value) => value
  .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  .replace(/javascript:/gi, '')
  .replace(/\son\w+=/gi, '');

const sanitizeValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || forbiddenKeys.has(key)) {
        delete value[key];
        continue;
      }
      value[key] = sanitizeValue(value[key]);
    }
    return value;
  }
  if (typeof value === 'string') return sanitizeString(value.trim());
  return value;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

const createRateLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: message || 'Too many requests. Please try again later.' },
  });
};

module.exports = {
  corsOptions,
  sanitizeRequest,
  createRateLimiter,
};
