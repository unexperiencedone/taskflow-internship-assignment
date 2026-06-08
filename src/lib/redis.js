import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let isRedisConnected = false;

// Basic in-memory fallback cache
const memoryCache = new Map();

if (typeof window === 'undefined') {
  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries > 2) {
          // Limit retries so we don't spam errors
          return new Error('Redis connection failed permanently');
        }
        return 1000 * Math.pow(2, retries);
      }
    }
  });

  redisClient.on('error', (err) => {
    // Suppress error spam
    isRedisConnected = false;
  });

  redisClient.on('ready', () => {
    isRedisConnected = true;
  });

  // Connect asynchronously without blocking main thread
  redisClient.connect().catch((err) => {
    isRedisConnected = false;
  });
}

export async function getCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      // Fail silently and fallback
    }
  }
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  } else if (cached) {
    memoryCache.delete(key);
  }
  return null;
}

export async function setCache(key, value, ttlSeconds = 60) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds
      });
      return;
    } catch (err) {
      // Fail silently and fallback
    }
  }
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export async function deleteCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      // Fail silently and fallback
    }
  }
  memoryCache.delete(key);
}

export async function clearCachePattern(pattern) {
  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys && keys.length > 0) {
        await redisClient.del(keys);
      }
      return;
    } catch (err) {
      // Fail silently and fallback
    }
  }
  const prefix = pattern.replace('*', '');
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
