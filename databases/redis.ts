import Redis from 'ioredis';
import connectRedis from 'connect-redis';
import { EventEmitter } from 'events';
import { RedisOptions } from 'ioredis';
import { Store } from 'express-session';

interface CacheOperationResult {
  success: boolean;
  error?: Error;
  data?: string | null;
}

let redisClient: Redis | null = null;
let redisStore: Store | null = null;
let USE_MYSQL_SESSION_STORE = false;

try {
  // Create Redis client for both sessions and caching
  const redisOptions: RedisOptions = {
    host: process.env.REDISHOST || '127.0.0.1',
    port: parseInt(process.env.REDISPORT || '6379'),
    username: process.env.REDISUSER,
    password: process.env.REDISPASSWORD,
    family: 0,
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number): number | null => {
      if (times > 3) {
        USE_MYSQL_SESSION_STORE = true;
        return null; // Stop retrying
      }
      return Math.min(times * 200, 1000); // Exponential backoff
    }
  };

  redisClient = new Redis(redisOptions);

  // Increase max listeners to prevent warnings
  redisClient.setMaxListeners(20);

  // Set up error handler
  redisClient.on('error', (err: Error): void => {
    console.log("Redis client error:", err);
    USE_MYSQL_SESSION_STORE = true;
    redisClient = null;
  });

  // Set up session store
  const RedisStore = connectRedis(require('express-session'));
  redisStore = new RedisStore({
    client: redisClient,
    disableTouch: false,
    prefix: 'sess:',
  });
  
  // Increase max listeners for the store
  if (redisStore instanceof EventEmitter) {
    redisStore.setMaxListeners(20);
  }
  
  console.log("Redis store connected");

} catch (err) {
  console.log("Redis installation not found, using SQL session store instead:", err);
  USE_MYSQL_SESSION_STORE = true;
}

// Graceful shutdown handler
async function handleShutdown(): Promise<void> {
  if (redisClient?.quit) {
    return new Promise((resolve) => {
      redisClient?.quit(() => {
        console.log('Redis client closed.');
        resolve();
      });
    });
  }
  return Promise.resolve();
}

// Cache operations
async function getCache(key: string): Promise<CacheOperationResult> {
  if (!redisClient) {
    return { success: false, data: null };
  }

  try {
    const data = await redisClient.get(key);
    return { success: true, data };
  } catch (error) {
    console.error('Redis get error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      data: null 
    };
  }
}

async function setCache(key: string, value: string, ttl: number): Promise<CacheOperationResult> {
  if (!redisClient) {
    return { success: false };
  }

  try {
    await redisClient.set(key, value, 'EX', ttl);
    return { success: true };
  } catch (error) {
    console.error('Redis set error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

export {
  redisClient,
  redisStore,
  USE_MYSQL_SESSION_STORE,
  handleShutdown,
  getCache,
  setCache,
  CacheOperationResult
}; 