import { callAnthropicAPI, AnthropicMessage } from '../../src/services/anthropic';

// Mock fetch globally
global.fetch = jest.fn();

describe('Anthropic Service', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockMessages: AnthropicMessage[] = [
    { role: 'user', content: 'Hello, how are you?' }
  ];

  const systemPrompt = 'You are a helpful assistant.';

  describe('callAnthropicAPI', () => {
    test('should make successful API call', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Hello! I am doing well, thank you.' }],
        id: 'msg_123',
        model: 'claude-3-5-sonnet-20240620'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await callAnthropicAPI(mockMessages, systemPrompt);

      expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1000,
          messages: mockMessages,
          system: systemPrompt
        })
      });

      expect(result).toEqual(mockResponse);
    });

    test('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      } as Response);

      await expect(callAnthropicAPI(mockMessages, systemPrompt))
        .rejects.toThrow('API request failed with status 401: Unauthorized');
    });

    test('should handle API error with JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error": {"message": "Invalid request"}}'
      } as Response);

      await expect(callAnthropicAPI(mockMessages, systemPrompt))
        .rejects.toThrow('API request failed with status 400: {"error": {"message": "Invalid request"}}');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(callAnthropicAPI(mockMessages, systemPrompt))
        .rejects.toThrow('Network error');
    });

    test('should use empty API key when not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: [], id: 'test', model: 'test' })
      } as Response);

      await callAnthropicAPI(mockMessages, systemPrompt);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': ''
          })
        })
      );
    });

    test('should send correct request body structure', async () => {
      const complexMessages: AnthropicMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: [], id: 'test', model: 'test' })
      } as Response);

      await callAnthropicAPI(complexMessages, 'Complex system prompt');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      
      expect(requestBody).toEqual({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1000,
        messages: complexMessages,
        system: 'Complex system prompt'
      });
    });

    test('should handle empty messages array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ content: [], id: 'test', model: 'test' })
      } as Response);

      await callAnthropicAPI([], systemPrompt);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.messages).toEqual([]);
    });

    test('should handle response with no content', async () => {
      const mockResponse = {
        content: [],
        id: 'msg_empty',
        model: 'claude-3-5-sonnet-20240620'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await callAnthropicAPI(mockMessages, systemPrompt);
      expect(result.content).toEqual([]);
    });

    test('should handle response with multiple content items', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: 'Second part' }
        ],
        id: 'msg_multi',
        model: 'claude-3-5-sonnet-20240620'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await callAnthropicAPI(mockMessages, systemPrompt);
      expect(result.content).toHaveLength(2);
    });
  });
}); 