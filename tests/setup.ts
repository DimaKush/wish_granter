// Global test setup
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.SUPERWISH = 'financial freedom';
process.env.PRIVATE_CHANNEL_LINK = 'https://t.me/test_channel';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 