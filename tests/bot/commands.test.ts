import { setupCommands } from '../../src/bot/commands';
import { clearChatHistory } from '../../src/utils/chat';

// Mock dependencies
jest.mock('../../src/utils/chat');
jest.mock('../../src/utils/config', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

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
    expect(mockBot.command).toHaveBeenCalledWith('reset', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('help', expect.any(Function));
    expect(mockBot.command).toHaveBeenCalledWith('myid', expect.any(Function));
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

  describe('/reset command', () => {
    test('should clear chat history', async () => {
      mockClearChatHistory.mockResolvedValue();
      
      setupCommands(mockBot);
      const resetHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'reset')[1];
      
      await resetHandler(mockCtx);

      expect(mockClearChatHistory).toHaveBeenCalledWith('123456');
      expect(mockCtx.session.chatHistory).toEqual([]);
    });

    test('should handle missing user info gracefully', async () => {
      const ctxNoFrom = { ...mockCtx, from: undefined };
      
      setupCommands(mockBot);
      const resetHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'reset')[1];
      
      await resetHandler(ctxNoFrom);

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

    test('should handle errors in myid command', async () => {
      // Mock ctx.reply to succeed but make first call fail internally
      const errorCtx = {
        ...mockCtx,
        reply: jest.fn().mockImplementationOnce(() => {
          throw new Error('Reply failed');
        }).mockResolvedValueOnce({})
      };
      
      setupCommands(mockBot);
      const myidHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'myid')[1];
      
      await myidHandler(errorCtx);

      expect(errorCtx.reply).toHaveBeenCalledWith('Error getting your ID. Please try again.');
    });
  });

  describe('/who command', () => {
    test('should show security status', async () => {
      setupCommands(mockBot);
      const whoHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'who')[1];
      
      await whoHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Статус процесса'));
    });

    test('should handle errors in who command', async () => {
      // Mock process.uptime to throw error instead
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Uptime failed');
      });
      
      setupCommands(mockBot);
      const whoHandler = mockBot.command.mock.calls.find((call: any[]) => call[0] === 'who')[1];
      
      await whoHandler(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Error getting process status.');
      
      // Restore original function
      process.uptime = originalUptime;
    });
  });
}); 