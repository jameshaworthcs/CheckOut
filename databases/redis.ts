const Redis = require('ioredis');
import session from "express-session"
import {RedisStore} from "connect-redis"
import {createClient} from "redis"
const EventEmitter = require('events');

let redisClient = null;
let redisStore = null;
let USE_MYSQL_SESSION_STORE = false;

try {
  // Create Redis client for both sessions and caching
  redisClient = new Redis({
    host: process.env.REDISHOST || '127.0.0.1',
    port: parseInt(process.env.REDISPORT || '6379'),
    username: process.env.REDISUSER,
    password: process.env.REDISPASSWORD,
    family: 0,
    maxRetriesPerRequest: 1
  });

  // Increase max listeners to prevent warnings
  redisClient.setMaxListeners(30);

  // Set up error handler
  redisClient.on('error', (err) => {
    console.log("Redis client error:", err);
    USE_MYSQL_SESSION_STORE = true;
    redisClient = null;
  });

  // Create Redis store
  redisStore = new RedisStore({
    client: redisClient,
  });
  
  // Increase max listeners for the store
  if (redisStore instanceof EventEmitter) {
    redisStore.setMaxListeners(30);
  }
  
  console.log("Redis store connected");

} catch (err) {
  console.log("Redis installation not found, using SQL session store instead:", err);
  USE_MYSQL_SESSION_STORE = true;
}

// Graceful shutdown handler
function handleShutdown(): Promise<void> {
  if (redisClient?.quit) {
    return new Promise((resolve) => {
      redisClient.quit(() => {
        console.log('Redis client closed.');
        resolve();
      });
    });
  }
  return Promise.resolve();
}

// Cache operations
async function getCache(key: string): Promise<string | null> {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error('Redis get error:', err);
    return null;
  }
}

async function setCache(key: string, value: string, ttl: number): Promise<boolean> {
  if (!redisClient) return false;
  try {
    await redisClient.set(key, value, 'EX', ttl);
    return true;
  } catch (err) {
    console.error('Redis set error:', err);
    return false;
  }
}

module.exports = {
  redisClient,
  redisStore,
  USE_MYSQL_SESSION_STORE,
  handleShutdown,
  getCache,
  setCache
}; 