// Global test setup
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.SUPERWISH = 'financial freedom';
process.env.PRIVATE_CHANNEL_LINK = 'https://t.me/test_channel';

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up any timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

afterAll(async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Wait a bit to ensure cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Increase timeout for cleanup
jest.setTimeout(30000); 