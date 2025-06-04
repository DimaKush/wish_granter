import { Telegraf } from 'telegraf';
import { setupCommands } from '../../src/bot/commands';
import { setupHandlers } from '../../src/bot/handlers';
import { setupMiddlewares } from '../../src/bot/middlewares';
import { Context } from '../../src/types';

// Mock all external dependencies
jest.mock('../../src/utils/chat');
jest.mock('../../src/services/anthropic');
jest.mock('../../src/db/repository');
jest.mock('../../src/index', () => ({
  bot: {
    telegram: {
      sendMessage: jest.fn(),
      deleteMessage: jest.fn(),
      setMyCommands: jest.fn(),
      getMe: jest.fn()
    }
  }
}));
jest.mock('../../src/utils/config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Bot Integration Tests', () => {
  let bot: Telegraf<Context>;
  let mockCtx: any;

  beforeEach(() => {
    // Create a real Telegraf instance for testing
    bot = new Telegraf<Context>('fake-token');
    
    mockCtx = {
      from: { id: 123456, username: 'testuser' },
      message: { text: 'Hello' },
      session: { chatHistory: [] },
      reply: jest.fn(),
      sendChatAction: jest.fn()
    };

    jest.clearAllMocks();
  });

  test('should setup complete bot with all components', () => {
    // This tests that all components can be set up together without conflicts
    expect(() => {
      setupMiddlewares(bot);
      setupCommands(bot);
      setupHandlers(bot);
    }).not.toThrow();
  });

  test('should register all commands and handlers', () => {
    const commandSpy = jest.spyOn(bot, 'command');
    const onSpy = jest.spyOn(bot, 'on');
    const useSpy = jest.spyOn(bot, 'use');

    setupMiddlewares(bot);
    setupCommands(bot);
    setupHandlers(bot);

    // Check that commands were registered
    expect(commandSpy).toHaveBeenCalledWith('start', expect.any(Function));
    expect(commandSpy).toHaveBeenCalledWith('chat', expect.any(Function));
    expect(commandSpy).toHaveBeenCalledWith('new_chat', expect.any(Function));
    expect(commandSpy).toHaveBeenCalledWith('help', expect.any(Function));
    expect(commandSpy).toHaveBeenCalledWith('myid', expect.any(Function));
    expect(commandSpy).toHaveBeenCalledWith('send', expect.any(Function));
    expect(commandSpy).toHaveBeenCalledWith('who', expect.any(Function));

    // Check that text handler was registered
    expect(onSpy).toHaveBeenCalledWith('text', expect.any(Function));

    // Check that middlewares were registered
    expect(useSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  test('should handle middleware setup without errors', async () => {
    const useSpy = jest.spyOn(bot, 'use');
    
    setupMiddlewares(bot);

    // Verify middlewares were registered
    expect(useSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  test('should handle commands setup without errors', async () => {
    const commandSpy = jest.spyOn(bot, 'command');
    
    setupCommands(bot);

    // Verify commands were registered
    expect(commandSpy).toHaveBeenCalledTimes(7); // 7 commands total
  });

  test('should handle handlers setup without errors', async () => {
    const onSpy = jest.spyOn(bot, 'on');
    
    setupHandlers(bot);

    // Verify text handler was registered
    expect(onSpy).toHaveBeenCalledWith('text', expect.any(Function));
  });

  test('should create bot instance successfully', () => {
    expect(bot).toBeInstanceOf(Telegraf);
    expect(typeof bot.launch).toBe('function');
    expect(typeof bot.stop).toBe('function');
  });

  test('should handle multiple setup calls without conflicts', () => {
    // Should be safe to call setup functions multiple times
    expect(() => {
      setupMiddlewares(bot);
      setupCommands(bot);
      setupHandlers(bot);
      
      // Call again
      setupMiddlewares(bot);
      setupCommands(bot);
      setupHandlers(bot);
    }).not.toThrow();
  });

  test('should have proper method signatures', () => {
    setupMiddlewares(bot);
    setupCommands(bot);
    setupHandlers(bot);

    // Test that bot has expected methods
    expect(typeof bot.command).toBe('function');
    expect(typeof bot.on).toBe('function');
    expect(typeof bot.use).toBe('function');
    expect(typeof bot.launch).toBe('function');
    expect(typeof bot.stop).toBe('function');
  });

  test('should handle error during setup gracefully', () => {
    // Mock a setup function to throw an error
    const originalCommand = bot.command;
    bot.command = jest.fn().mockImplementation(() => {
      throw new Error('Setup error');
    });

    expect(() => {
      setupCommands(bot);
    }).toThrow('Setup error');

    // Restore original method
    bot.command = originalCommand;
  });
}); 