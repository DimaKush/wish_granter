import { setupHandlers } from '../../src/bot/handlers';
import { sendMessageToAnthropic } from '../../src/utils/chat';

// Mock dependencies
jest.mock('../../src/utils/chat');
jest.mock('../../src/utils/config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

const mockSendMessageToAnthropic = sendMessageToAnthropic as jest.MockedFunction<typeof sendMessageToAnthropic>;

describe('Bot Handlers', () => {
  let mockBot: any;
  let mockCtx: any;

  beforeEach(() => {
    mockBot = {
      on: jest.fn()
    };

    mockCtx = {
      from: { id: 123456, username: 'testuser' },
      message: { text: 'Hello bot' },
      session: { chatHistory: [] },
      reply: jest.fn(),
      sendChatAction: jest.fn()
    };

    jest.clearAllMocks();
  });

  test('should setup text message handler', () => {
    setupHandlers(mockBot);
    
    expect(mockBot.on).toHaveBeenCalledWith('text', expect.any(Function));
  });

  describe('Text Message Handler', () => {
    test('should process text message successfully', async () => {
      mockSendMessageToAnthropic.mockResolvedValue('AI response');
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockCtx.sendChatAction).toHaveBeenCalledWith('typing');
      expect(mockSendMessageToAnthropic).toHaveBeenCalledWith('123456', 'Hello bot');
      expect(mockCtx.reply).toHaveBeenCalledWith('AI response');
    });

    test('should initialize session if not exists', async () => {
      mockCtx.session = undefined;
      mockSendMessageToAnthropic.mockResolvedValue('AI response');
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockCtx.session).toEqual({ chatHistory: [] });
      expect(mockSendMessageToAnthropic).toHaveBeenCalled();
    });

    test('should initialize chatHistory if not exists', async () => {
      mockCtx.session = {};
      mockSendMessageToAnthropic.mockResolvedValue('AI response');
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockCtx.session.chatHistory).toEqual([]);
      expect(mockSendMessageToAnthropic).toHaveBeenCalled();
    });

    test('should handle empty AI response', async () => {
      mockSendMessageToAnthropic.mockResolvedValue('');
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('Sorry, I had trouble processing your message. Please try again.');
    });

    test('should handle null AI response', async () => {
      mockSendMessageToAnthropic.mockResolvedValue(null as any);
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('Sorry, I had trouble processing your message. Please try again.');
    });

    test('should handle AI service errors', async () => {
      const { logger } = require('../../src/utils/config');
      mockSendMessageToAnthropic.mockRejectedValue(new Error('API Error'));
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(logger.error).toHaveBeenCalledWith('Error handling text message:', expect.any(Error));
      expect(mockCtx.reply).toHaveBeenCalledWith('Something went wrong. Please try again later.');
    });

    test('should handle missing message', async () => {
      mockCtx.message = undefined;
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockSendMessageToAnthropic).not.toHaveBeenCalled();
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('should handle non-text message', async () => {
      mockCtx.message = { photo: [] };
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockSendMessageToAnthropic).not.toHaveBeenCalled();
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('should handle missing user info', async () => {
      mockCtx.from = undefined;
      
      setupHandlers(mockBot);
      const textHandler = mockBot.on.mock.calls.find((call: any[]) => call[0] === 'text')[1];
      
      await textHandler(mockCtx);

      expect(mockSendMessageToAnthropic).not.toHaveBeenCalled();
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });
  });
}); 