# Simple Telegram AI Bot

A simple Telegram bot with AI chat capabilities powered by Anthropic Claude.

## Features

- AI-powered conversations using Anthropic Claude
- Session-based chat history
- Rate limiting to prevent spam
- Simple command interface
- Basic security features

## Security & Privacy

### Message Security
- Messages are secured using Telegram's built-in MTProto protocol
- Chat history is stored locally in session memory
- Basic logging of technical events (no message content)
- `/who` command available to check connection status

### Access Control
- Messages are processed through Claude AI
- Basic admin commands are logged
- Chat history is session-based per user

### Data Storage
- Chat history stored temporarily in session memory
- Technical logs stored in `/app/logs`
- Local storage only, no cloud services used
- No persistent user data beyond session

## Commands

- `/start` - Welcome message and bot introduction
- `/chat` - Start chatting with the AI
- `/new_chat` - Start a fresh conversation (clears history)
- `/help` - Show help information
- `/who` - Check connection status

You can also just send any text message to start chatting directly!

## Setup

1. **Clone and install dependencies:**
```bash
cd simple_telegram_bot
npm install
```

2. **Environment Configuration:**
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `BOT_TOKEN` - Get from [@BotFather](https://t.me/BotFather) on Telegram
- `ANTHROPIC_API_KEY` - Get from [Anthropic Console](https://console.anthropic.com/)

3. **Build and run:**
```bash
npm run build
npm start
```

Or for development:
```bash
npm run dev
```

## Project Structure

```
src/
├── index.ts          # Main bot entry point
├── bot/
│   ├── commands.ts   # Bot command handlers
│   ├── handlers.ts   # Message handlers
│   └── middlewares.ts # Rate limiting and session management
├── utils/
│   ├── config.ts     # Configuration and logging
│   └── chat.ts       # Anthropic AI integration
└── types/
    └── index.ts      # TypeScript type definitions
```

## Features

### AI Chat
- Powered by Anthropic Claude
- Maintains conversation history within session
- Typing indicators for better UX
- Error handling for API failures

### Rate Limiting
- 10 messages per minute per user
- Prevents spam and API abuse
- Graceful throttling messages

### Session Management
- In-memory session storage
- Temporary chat history during bot runtime
- Easy session reset with `/new_chat`

### Basic Security
- Telegram's MTProto protocol for message transport
- Session-based message history
- Connection status monitoring via `/who`
- Technical event logging

## License

MIT 