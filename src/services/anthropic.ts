export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicResponse {
  content: Array<{type: string, text: string}>;
  id: string;
  model: string;
}

export async function callAnthropicAPI(messages: AnthropicMessage[], systemPrompt: string): Promise<AnthropicResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      messages: messages,
      system: systemPrompt
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorData}`);
  }

  return response.json() as Promise<AnthropicResponse>;
} 