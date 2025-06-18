import { setupMiddlewares } from '../../src/bot/middlewares';
import { Context } from '../../src/types';

// Mock dependencies
jest.mock('../../src/utils/config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Bot Middlewares', () => {
  let mockBot: any;
  let mockCtx: any;
  let mockNext: jest.MockedFunction<() => Promise<void>>;

  beforeEach(() => {
    mockBot = {
      use: jest.fn()
    };

    mockCtx = {
      from: { id: 123456, username: 'testuser' },
      session: undefined,
      reply: jest.fn(),
      message: { text: 'test message' }
    };

    mockNext = jest.fn().mockResolvedValue(undefined);
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should setup all middlewares', () => {
    setupMiddlewares(mockBot);
    
    expect(mockBot.use).toHaveBeenCalledTimes(3);
    expect(mockBot.use).toHaveBeenNthCalledWith(1, expect.any(Function)); // sessionInit
    expect(mockBot.use).toHaveBeenNthCalledWith(2, expect.any(Function)); // logging
    expect(mockBot.use).toHaveBeenNthCalledWith(3, expect.any(Function)); // throttle
  });

  describe('Session Initialization Middleware', () => {
    test('should initialize session if not exists', async () => {
      setupMiddlewares(mockBot);
      const sessionMiddleware = mockBot.use.mock.calls[0][0];
      
      await sessionMiddleware(mockCtx, mockNext);

      expect(mockCtx.session).toEqual({ chatHistory: [] });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should ensure chatHistory exists in existing session', async () => {
      mockCtx.session = {};
      
      setupMiddlewares(mockBot);
      const sessionMiddleware = mockBot.use.mock.calls[0][0];
      
      await sessionMiddleware(mockCtx, mockNext);

      expect(mockCtx.session.chatHistory).toEqual([]);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should not overwrite existing chatHistory', async () => {
      const existingHistory = [{ role: 'user', content: 'test', timestamp: 123 }];
      mockCtx.session = { chatHistory: existingHistory };
      
      setupMiddlewares(mockBot);
      const sessionMiddleware = mockBot.use.mock.calls[0][0];
      
      await sessionMiddleware(mockCtx, mockNext);

      expect(mockCtx.session.chatHistory).toBe(existingHistory);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Logging Middleware', () => {
    test('should log user message info', async () => {
      const { logger } = require('../../src/utils/config');
      
      setupMiddlewares(mockBot);
      const loggingMiddleware = mockBot.use.mock.calls[1][0];
      
      await loggingMiddleware(mockCtx, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Message from user 123456 (@testuser): text');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle missing user info', async () => {
      const { logger } = require('../../src/utils/config');
      mockCtx.from = undefined;
      
      setupMiddlewares(mockBot);
      const loggingMiddleware = mockBot.use.mock.calls[1][0];
      
      await loggingMiddleware(mockCtx, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Message from user undefined (@undefined): text');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should detect non-text message types', async () => {
      const { logger } = require('../../src/utils/config');
      mockCtx.message = { photo: [] };
      
      setupMiddlewares(mockBot);
      const loggingMiddleware = mockBot.use.mock.calls[1][0];
      
      await loggingMiddleware(mockCtx, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Message from user 123456 (@testuser): other');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should handle unknown message type when no message', async () => {
      const { logger } = require('../../src/utils/config');
      mockCtx.message = undefined;
      
      setupMiddlewares(mockBot);
      const loggingMiddleware = mockBot.use.mock.calls[1][0];
      
      await loggingMiddleware(mockCtx, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Message from user 123456 (@testuser): unknown');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Throttle Middleware', () => {
    test('should allow requests within limit', async () => {
      setupMiddlewares(mockBot);
      const throttleMiddleware = mockBot.use.mock.calls[2][0];
      
      // Send multiple requests within limit
      for (let i = 0; i < 5; i++) {
        await throttleMiddleware(mockCtx, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('should block requests exceeding limit', async () => {
      const { logger } = require('../../src/utils/config');
      
      setupMiddlewares(mockBot);
      const throttleMiddleware = mockBot.use.mock.calls[2][0];
      
      // Send requests up to limit (10)
      for (let i = 0; i < 10; i++) {
        await throttleMiddleware(mockCtx, mockNext);
      }
      
      jest.clearAllMocks();
      
      // 11th request should be blocked
      await throttleMiddleware(mockCtx, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(
        "⚠️ You're sending too many requests. Please wait a moment before trying again."
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'User 123456 exceeded rate limit: 10 requests per 60s'
      );
    });

    test('should reset after time window', async () => {
      setupMiddlewares(mockBot);
      const throttleMiddleware = mockBot.use.mock.calls[2][0];
      
      // Fill up the limit
      for (let i = 0; i < 10; i++) {
        await throttleMiddleware(mockCtx, mockNext);
      }
      
      // Advance time by more than window (60 seconds)
      jest.advanceTimersByTime(61000);
      jest.clearAllMocks();
      
      // Should allow requests again
      await throttleMiddleware(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('should handle missing user ID', async () => {
      mockCtx.from = undefined;
      
      setupMiddlewares(mockBot);
      const throttleMiddleware = mockBot.use.mock.calls[2][0];
      
      await throttleMiddleware(mockCtx, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should track different users separately', async () => {
      const mockCtx2 = { ...mockCtx, from: { id: 789, username: 'user2' }, reply: jest.fn() };
      
      setupMiddlewares(mockBot);
      const throttleMiddleware = mockBot.use.mock.calls[2][0];
      
      // Fill limit for first user
      for (let i = 0; i < 10; i++) {
        await throttleMiddleware(mockCtx, mockNext);
      }
      
      jest.clearAllMocks();
      
      // Second user should still be able to send requests
      await throttleMiddleware(mockCtx2, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockCtx2.reply).not.toHaveBeenCalled();
    });
  });
}); 