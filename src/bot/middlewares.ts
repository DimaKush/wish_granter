import { Telegraf, Middleware } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/config';

interface ThrottleConfig {
  window: number;   // Time window in ms
  limit: number;    // Max requests in window
}

interface UserThrottleData {
  timestamps: number[];
}

const throttleStore: Map<number, UserThrottleData> = new Map();

const defaultThrottleConfig: ThrottleConfig = {
  window: 60000,  // 1 minute
  limit: 10       // 10 requests per minute (more generous for public bot)
};

/**
 * Create throttling middleware
 */
function throttle(config: ThrottleConfig = defaultThrottleConfig): Middleware<Context> {
  return async (ctx: Context, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    
    if (!userId) {
      return next();
    }
    
    let userData = throttleStore.get(userId);
    if (!userData) {
      userData = { timestamps: [] };
      throttleStore.set(userId, userData);
    }
    
    const now = Date.now();
    userData.timestamps = userData.timestamps.filter(
      time => now - time < config.window
    );
    
    if (userData.timestamps.length >= config.limit) {
      logger.warn(`User ${userId} exceeded rate limit: ${config.limit} requests per ${config.window/1000}s`);
      await ctx.reply(`⚠️ You're sending too many requests. Please wait a moment before trying again.`);
      return;
    }
    
    userData.timestamps.push(now);
    return next();
  };
}

/**
 * Session initialization middleware
 */
function sessionInit(): Middleware<Context> {
  return async (ctx: Context, next: () => Promise<void>) => {
    // Initialize session if it doesn't exist
    if (!ctx.session) {
      ctx.session = {
        chatHistory: []
      };
    }
    
    // Ensure chatHistory exists
    if (!ctx.session.chatHistory) {
      ctx.session.chatHistory = [];
    }
    
    return next();
  };
}

/**
 * Logging middleware
 */
function loggingMiddleware(): Middleware<Context> {
  return async (ctx: Context, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const messageType = ctx.message ? 
      ('text' in ctx.message ? 'text' : 'other') : 
      'unknown';
    
    logger.info(`Message from user ${userId} (@${username}): ${messageType}`);
    
    return next();
  };
}

/**
 * Setup all middlewares
 */
export function setupMiddlewares(bot: Telegraf<Context>) {
  // Session initialization (before everything else)
  bot.use(sessionInit());
  
  // Logging
  bot.use(loggingMiddleware());
  
  // Rate limiting
  bot.use(throttle());
  
  logger.info('Middlewares setup completed');
} 