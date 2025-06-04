import { setupCommands } from '../../src/bot/commands';
import { handleAdminSendMessage, clearChatHistory } from '../../src/utils/chat';

// Mock dependencies
jest.mock('../../src/utils/chat');
jest.mock('../../src/utils/config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

const mockHandleAdminSendMessage = handleAdminSendMessage as jest.MockedFunction<typeof handleAdminSendMessage>;
const mockClearChatHistory = clearChatHistory as jest.MockedFunction<typeof clearChatHistory>;

describe('Bot Commands', () => {
  let mockBot: any;
  let mockCtx: any;

  beforeEach(() => {
    mockBot = {
      command: jest.fn()
    };

    mockCtx = {
      from: { id: 123456, username: 'testuser' },
      session: { chatHistory: [] },
      reply: jest.fn(),
      message: { text: '/start' }
    };

    jest.clearAllMocks();
  });

  test('should setup all commands', () => {
    setupCommands(mockBot);
    
    expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('chat', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('new_chat', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('help', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('myid', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('send', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('who', expect.any(Function));
  });

  describe('/start command', () => {
    test('should send welcome messages', async () => {
      setupCommands(mockBot);
      const startHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'start')[1];
      
      await startHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledTimes(2);
      expect(mockCtx.reply).toHaveBeenNthCalledWith(1, expect.stringContaining('🧞 Wish Granter'));
      expect(mockCtx.reply).toHaveBeenNthCalledWith(2, expect.stringContaining('🧞 Wish Granter'));
    });
  });

  describe('/chat command', () => {
    test('should send chat ready message', async () => {
      setupCommands(mockBot);
      const chatHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'chat')[1];
      
      await chatHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('Hi! I\'m ready to chat. What would you like to talk about?');
    });
  });

  describe('/new_chat command', () => {
    test('should clear chat history', async () => {
      mockClearChatHistory.mockResolvedValue();
      
      setupCommands(mockBot);
      const newChatHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'new_chat')[1];
      
      await newChatHandler(mockCtx);

      expect(mockClearChatHistory).toHaveBeenCalledWith('123456');
      expect(mockCtx.session.chatHistory).toEqual([]);
    });

    test('should handle missing user info gracefully', async () => {
      const ctxNoFrom = { ...mockCtx, from: undefined };
      
      setupCommands(mockBot);
      const newChatHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'new_chat')[1];
      
      await newChatHandler(ctxNoFrom);

      expect(mockClearChatHistory).not.toHaveBeenCalled();
    });
  });

  describe('/help command', () => {
    test('should send help message', async () => {
      setupCommands(mockBot);
      const helpHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'help')[1];
      
      await helpHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('🤖 Wish Granter'));
    });
  });

  describe('/myid command', () => {
    test('should return user ID and username', async () => {
      setupCommands(mockBot);
      const myidHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'myid')[1];
      
      await myidHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your Telegram ID: `123456`'),
        { parse_mode: 'Markdown' }
      );
    });

    test('should handle user without username', async () => {
      const ctxNoUsername = { ...mockCtx, from: { id: 123456 } };
      
      setupCommands(mockBot);
      const myidHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'myid')[1];
      
      await myidHandler(ctxNoUsername);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Username: @none'),
        { parse_mode: 'Markdown' }
      );
    });
  });

  describe('/send command', () => {
    test('should call handleAdminSendMessage', async () => {
      mockCtx.message = { text: '/send 123 Hello' };
      mockHandleAdminSendMessage.mockResolvedValue();
      
      setupCommands(mockBot);
      const sendHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'send')[1];
      
      await sendHandler(mockCtx);

      expect(mockHandleAdminSendMessage).toHaveBeenCalledWith('123456', '/send 123 Hello');
    });

    test('should handle missing message', async () => {
      const ctxNoMessage = { ...mockCtx, message: undefined };
      
      setupCommands(mockBot);
      const sendHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'send')[1];
      
      await sendHandler(ctxNoMessage);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Error: No text message found.');
    });

    test('should handle missing user info', async () => {
      const ctxNoFrom = { ...mockCtx, from: undefined };
      
      setupCommands(mockBot);
      const sendHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'send')[1];
      
      await sendHandler(ctxNoFrom);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Error: Unable to identify user.');
    });
  });

  describe('/who command', () => {
    test('should show security status', async () => {
      setupCommands(mockBot);
      const whoHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'who')[1];
      
      await whoHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Security status'));
    });
  });
}); 