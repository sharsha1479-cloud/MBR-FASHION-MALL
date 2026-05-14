const cache = require('../utils/cache');

const buildCacheKey = (prefix, req) => `${prefix}:${req.originalUrl}`;

const cachePublic = (prefix, ttlSeconds = 60) => async (req, res, next) => {
  if (req.method !== 'GET' || req.user) {
    next();
    return;
  }

  const key = buildCacheKey(prefix, req);
  try {
    const cached = await cache.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=30, s-maxage=${ttlSeconds}, stale-while-revalidate=120`);
      res.json(cached);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttlSeconds).catch(() => undefined);
        res.set('X-Cache', 'MISS');
        res.set('Cache-Control', `public, max-age=30, s-maxage=${ttlSeconds}, stale-while-revalidate=120`);
      }
      return originalJson(body);
    };
  } catch {
    res.set('X-Cache', 'BYPASS');
  }

  next();
};

module.exports = {
  cachePublic,
};
