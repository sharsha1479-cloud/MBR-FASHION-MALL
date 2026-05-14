const Redis = require('ioredis');
const logger = require('./logger');

const memoryCache = new Map();
let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });

  redis.on('error', (error) => {
    logger.warn('Redis cache unavailable, using local memory fallback', { error: error.message });
  });
}

const getMemory = (key) => {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};

const setMemory = (key, value, ttlSeconds) => {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const get = async (key) => {
  if (redis?.status === 'ready') {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  return getMemory(key);
};

const set = async (key, value, ttlSeconds = 60) => {
  if (redis?.status === 'ready') {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }
  setMemory(key, value, ttlSeconds);
};

const delByPrefix = async (prefix) => {
  if (redis?.status === 'ready') {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) await redis.del(keys);
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
};

module.exports = {
  get,
  set,
  delByPrefix,
};
