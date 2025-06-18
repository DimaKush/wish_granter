import { sendMessageToAnthropic, saveChatHistory, loadChatHistory, clearChatHistory, ChatMessage } from '../../src/utils/chat';
import { callAnthropicAPI } from '../../src/services/anthropic';

// Mock dependencies
jest.mock('../../src/services/anthropic');
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
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mockiv123456789', 'hex')),
  createCipheriv: jest.fn(() => ({
    update: jest.fn(() => 'encrypted'),
    final: jest.fn(() => 'data')
  })),
  createDecipheriv: jest.fn(() => ({
    update: jest.fn(() => 'decrypted'),
    final: jest.fn(() => 'data')
  })),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => ({
      slice: jest.fn(() => 'mockkey123456789012345678901234567890')
    }))
  }))
}));

const mockCallAnthropicAPI = callAnthropicAPI as jest.MockedFunction<typeof callAnthropicAPI>;
const mockFs = require('fs');

describe('Chat Utils', () => {
  const { bot } = require('../../src/index');
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.SUPERWISH = 'financial freedom';
    process.env.PRIVATE_CHANNEL_LINK = 'https://t.me/test_channel';
    
    // Reset all mocks to default behavior
    bot.telegram.sendMessage.mockResolvedValue({});
    bot.telegram.deleteMessage.mockResolvedValue(true);
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.promises.writeFile.mockResolvedValue();
    mockFs.promises.readFile.mockResolvedValue('');
    mockFs.promises.unlink.mockResolvedValue();
    mockFs.promises.appendFile.mockResolvedValue();
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

    test('should handle clear history when file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({});

      await clearChatHistory('123456');

      expect(mockFs.promises.unlink).not.toHaveBeenCalled();
      expect(bot.telegram.sendMessage).toHaveBeenCalled();
    });

    test('should handle errors in clearChatHistory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.unlink.mockRejectedValue(new Error('Delete failed'));

      await clearChatHistory('123456');

      // Should not throw, just log error
      expect(mockFs.promises.unlink).toHaveBeenCalled();
    });

    test('should handle errors in processSuperwish', async () => {
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
      bot.telegram.sendMessage
        .mockResolvedValueOnce({ message_id: 1 }) // thinking message
        .mockRejectedValueOnce(new Error('Send failed')) // first superwish message fails
        .mockResolvedValueOnce({}) // second message succeeds
        .mockResolvedValue(true); // delete message
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want financial freedom');
      
      expect(response).toBe('Congratulations! Your wish for financial freedom is special.');
    });

    test('should handle errors in logMessageMetadata', async () => {
      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! I am WishGranter.' }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      mockFs.existsSync.mockReturnValue(false);
      mockFs.promises.appendFile.mockRejectedValue(new Error('Log failed'));
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'Hello');
      
      // Should still work even if logging fails
      expect(response).toBe('Hello! I am WishGranter.');
      expect(mockFs.promises.appendFile).toHaveBeenCalled();
    });

    test('should handle outer catch block in sendMessageToAnthropic', async () => {
      // Mock the thinking message to fail
      bot.telegram.sendMessage.mockRejectedValue(new Error('Telegram API failed'));

      const response = await sendMessageToAnthropic('123456', 'Hello');
      
      expect(response).toBe('Sorry, I encountered an error processing your request. Please try again later.');
    });

    test('should handle regex error in processSuperwish', async () => {
      // Test processSuperwish outer catch by making the entire function throw
      const claudeResponse = `[SUPERWISH_DETECTED]wish[/SUPERWISH_DETECTED]`;

      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: claudeResponse }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      // Make process.env.PRIVATE_CHANNEL_LINK undefined to trigger error
      delete process.env.PRIVATE_CHANNEL_LINK;
      
      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want financial freedom');
      
      expect(response).toBe('');
    });

    test('should handle processSuperwish catch block', async () => {
      const claudeResponse = `[SUPERWISH_DETECTED]wish[/SUPERWISH_DETECTED]`;

      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: claudeResponse }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage
        .mockResolvedValueOnce({ message_id: 1 }) // thinking message
        .mockImplementationOnce(() => {
          throw new Error('String template error');
        });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want financial freedom');
      
      expect(response).toBe('');
    });

    test('should handle deleteMessage error in outer catch', async () => {
      bot.telegram.sendMessage.mockRejectedValue(new Error('Telegram failed'));
      bot.telegram.deleteMessage.mockRejectedValue(new Error('Delete failed'));

      const response = await sendMessageToAnthropic('123456', 'Hello');
      
      expect(response).toBe('Sorry, I encountered an error processing your request. Please try again later.');
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

    test('should handle errors in clearChatHistory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.unlink.mockRejectedValue(new Error('Delete failed'));

      await clearChatHistory('123456');

      // Should not throw, just log error
      expect(mockFs.promises.unlink).toHaveBeenCalled();
    });

    test('should handle decryption errors in loadChatHistory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue('invalid:encrypted:data');

      const result = await loadChatHistory('123456');

      expect(result).toEqual([]);
    });

    test('should handle save errors in saveChatHistory', async () => {
      mockFs.promises.writeFile.mockRejectedValue(new Error('Write failed'));

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: 123456 }
      ];

      // Should not throw, just log error
      await saveChatHistory('123456', messages);
      
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });

    test('should create log directory when it does not exist', async () => {
      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! I am WishGranter.' }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      // Mock directory creation scenario
      mockFs.existsSync
        .mockReturnValueOnce(false) // chat history doesn't exist
        .mockReturnValueOnce(false); // log directory doesn't exist
      mockFs.mkdirSync.mockReturnValue(undefined);
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      await sendMessageToAnthropic('123456', 'Hello');
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('data/message_logs'),
        { recursive: true }
      );
    });

    test('should handle processSuperwish general error', async () => {
      const claudeResponse = `[SUPERWISH_DETECTED]
Wish: financial freedom
[/SUPERWISH_DETECTED]`;

      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: claudeResponse }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage
        .mockResolvedValueOnce({ message_id: 1 }) // thinking message
        .mockImplementationOnce(() => {
          throw new Error('Regex error');
        });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want financial freedom');
      
      expect(response).toBe('');
    });

    test('should handle encryption errors during save', async () => {
      // This will test decryptMessage error handling through loadChatHistory
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue('invalid_format_no_colon');

      const result = await loadChatHistory('123456');

      expect(result).toEqual([]);
    });

    test('should handle crypto decryption errors', async () => {
      const crypto = require('crypto');
      
      // Mock crypto to throw error during decryption
      crypto.createDecipheriv.mockImplementationOnce(() => {
        throw new Error('Crypto decryption failed');
      });
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue('validiv:encrypteddata');

      const result = await loadChatHistory('123456');

      expect(result).toEqual([]);
    });

    test('should handle regex error in processSuperwish', async () => {
      // Test processSuperwish outer catch by making the entire function throw
      const claudeResponse = `[SUPERWISH_DETECTED]wish[/SUPERWISH_DETECTED]`;

      mockCallAnthropicAPI.mockResolvedValue({
        content: [{ type: 'text', text: claudeResponse }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      });

      // Make process.env.PRIVATE_CHANNEL_LINK undefined to trigger error
      delete process.env.PRIVATE_CHANNEL_LINK;
      
      mockFs.existsSync.mockReturnValue(false);
      bot.telegram.sendMessage.mockResolvedValue({ message_id: 1 });
      bot.telegram.deleteMessage.mockResolvedValue(true);

      const response = await sendMessageToAnthropic('123456', 'I want financial freedom');
      
      expect(response).toBe('');
    });
  });
}); 