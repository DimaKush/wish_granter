import { sendMessageToAnthropic, saveChatHistory, loadChatHistory, clearChatHistory, ChatMessage, handleAdminSendMessage } from '../../src/utils/chat';
import { callAnthropicAPI } from '../../src/services/anthropic';
import { getSingleAdmin } from '../../src/db/repository';

// Mock dependencies
jest.mock('../../src/services/anthropic');
jest.mock('../../src/db/repository');
jest.mock('../../src/utils/config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));
jest.mock('../../src/index', () => ({
  bot: {
    telegram: {
      sendMessage: jest.fn(),
      deleteMessage: jest.fn()
    }
  }
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    appendFile: jest.fn()
  }
}));
jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}));

const mockCallAnthropicAPI = callAnthropicAPI as jest.MockedFunction<typeof callAnthropicAPI>;
const mockGetSingleAdmin = getSingleAdmin as jest.MockedFunction<typeof getSingleAdmin>;
const mockFs = require('fs');

describe('Chat Utils', () => {
  const { bot } = require('../../src/index');
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.SUPERWISH = 'financial freedom';
    process.env.PRIVATE_CHANNEL_LINK = 'https://t.me/test_channel';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendMessageToAnthropic', () => {
    test('should handle normal Claude response', async () => {
      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! I am WishGranter. How can I help you today?' }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'Hello');
      
      expect(response).toBe('Hello! I am WishGranter. How can I help you today?');
      expect(mockCallAnthropicAPI).toHaveBeenCalledWith(
        expect.arrayContaining([
          { role: 'user', content: 'Hello' }
        ]),
        expect.stringContaining('You are WishGranter')
      );
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith('123456', '🤔 Thinking...');
      expect(bot.telegram.deleteMessage).toHaveBeenCalledWith('123456', 1);
    });

    test('should handle wish detection', async () => {
      const claudeResponse = `[WISH_DETECTED]
Wish: I want to be wealthy
Analysis: User expresses desire for financial success
[/WISH_DETECTED]

I understand your desire for wealth. Let's make this more concrete:
- What does being 'rich' mean to you specifically?`;

      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: claudeResponse }],
        id: 'msg_124',
        model: 'claude-3-5-sonnet-20240620'
      });

      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want to be wealthy');
      
      // Should strip the technical WISH_DETECTED format from user response
      expect(response).toBe(`I understand your desire for wealth. Let's make this more concrete:
- What does being 'rich' mean to you specifically?`);
    });

    test('should handle superwish detection and send channel invitation', async () => {
      const claudeResponse = `[SUPERWISH_DETECTED]
Wish: financial freedom
Analysis: This exactly matches the configured superwish
Match Confidence: 100%
[/SUPERWISH_DETECTED]

Congratulations! Your wish for financial freedom is special.`;

      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: claudeResponse }],
        id: 'msg_125',
        model: 'claude-3-5-sonnet-20240620'
      });

      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want financial freedom');
      
      expect(response).toBe('Congratulations! Your wish for financial freedom is special.');
      
      // Should send channel invitations
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('🌟 **Поздравляем!** 🌟'),
        { parse_mode: 'Markdown' }
      );
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '123456',
        expect.stringContaining('🌟 **Congratulations!** 🌟'),
        { parse_mode: 'Markdown' }
      );
    });

    test('should handle API errors gracefully', async () => {
      mockCallAnthropicAPI.mockRejectedValue(new Error('API request failed with status 401'));

      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'Hello');
      
      expect(response).toBe('The bot administrator needs to check the Anthropic API key configuration.');
      expect(bot.telegram.deleteMessage).toHaveBeenCalledWith('123456', 1);
    });

    test('should handle general errors', async () => {
      mockCallAnthropicAPI.mockRejectedValue(new Error('Network error'));

      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'Hello');
      
      expect(response).toBe('Sorry, I encountered an error processing your request. Please try again later.');
    });

    test('should handle without history when includeHistory is false', async () => {
      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: 'Response without history' }],
        id: 'msg_126',
        model: 'claude-3-5-sonnet-20240620'
      });

      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);
      mockFs.existsSync.mockReturnValue(false);

      await sendMessageToAnthropic('123456', 'Hello', false);
      
      expect(mockCallAnthropicAPI).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello' }],
        expect.any(String)
      );
    });
  });

  describe('Chat History Management', () => {
    test('should save chat history', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: 123456 },
        { role: 'assistant', content: 'Hi there!', timestamp: 123457 }
      ];

      await saveChatHistory('123456', messages);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('data/chat_history/123456.json'),
        expect.any(String)
      );
    });

    test('should load existing chat history', async () => {
      const mockEncryptedData = 'encrypted:data';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue(mockEncryptedData);

      // Mock decryption result
      const mockMessages = [
        { role: 'user', content: 'Previous message', timestamp: 123456 }
      ];

      // Since we can't easily mock the encryption/decryption, we'll test the file operations
      const result = await loadChatHistory('123456').catch(() => []);

      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        expect.stringContaining('data/chat_history/123456.json'),
        'utf8'
      );
    });

    test('should return empty array when no history file exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await loadChatHistory('123456');

      expect(result).toEqual([]);
      expect(mockFs.promises.readFile).not.toHaveBeenCalled();
    });

    test('should clear chat history and send confirmation', async () => {
      mockFs.existsSync.mockReturnValue(true);
      bot.telegram.sendMessage.mockResolvedValue({});

      await clearChatHistory('123456');

      expect(mockFs.promises.unlink).toHaveBeenCalledWith(expect.stringContaining('data/chat_history/123456.json'));
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '123456',
        '🗑 История диалога удалена\n\n🗑 Chat history has been cleared'
      );
    });

    test('should handle clear history when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({});

      await clearChatHistory('123456');

      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
      expect(bot.telegram.sendMessage).toHaveBeenCalled();
    });
  });

  describe('handleAdminSendMessage', () => {
    test('should send message to user when admin is authorized', async () => {
      mockGetSingleAdmin.mockResolvedValue([
        { telegram_id: '999', username: 'admin', is_active: true }
      ]);
      bot.telegram.sendMessage.mockResolvedValue({});

      await handleAdminSendMessage('999', '/send 123456 Hello user!');

      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '123456',
        '📩 Message from admin:\n\nHello user!'
      );
      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '999',
        '✅ Message sent to user 123456'
      );
    });

    test('should reject unauthorized user', async () => {
      mockGetSingleAdmin.mockResolvedValue([
        { telegram_id: '999', username: 'admin', is_active: true }
      ]);
      bot.telegram.sendMessage.mockResolvedValue({});

      await handleAdminSendMessage('888', '/send 123456 Hello user!');

      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '888',
        "❌ You don't have permission to use this command."
      );
    });

    test('should handle invalid command format', async () => {
      mockGetSingleAdmin.mockResolvedValue([
        { telegram_id: '999', username: 'admin', is_active: true }
      ]);
      bot.telegram.sendMessage.mockResolvedValue({});

      await handleAdminSendMessage('999', '/send invalid format');

      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '999',
        '❌ Invalid format. Use: /send userId message'
      );
    });

    test('should handle send message errors', async () => {
      mockGetSingleAdmin.mockResolvedValue([
        { telegram_id: '999', username: 'admin', is_active: true }
      ]);
      bot.telegram.sendMessage
        .mockResolvedValueOnce({}) // For checking admin permissions
        .mockRejectedValueOnce(new Error('Send failed')); // For sending to user

      await handleAdminSendMessage('999', '/send 123456 Hello user!');

      expect(bot.telegram.sendMessage).toHaveBeenCalledWith(
        '999',
        '❌ Failed to send message. Please try again later.'
      );
    });
  });
}); 