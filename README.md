# Wish Granter - AI Telegram Bot

An AI-powered Telegram bot that helps users discover and formulate their true wishes through conversational dialogue with Anthropic Claude.

## Core Features

- AI-powered conversations using Anthropic Claude
- Session-based chat history
- Rate limiting to prevent spam
- Simple command interface
- Basic security features

## Security & Privacy

### Security & Privacy
- **AES-256-CBC encryption** for all stored conversations
- **Session-based storage** - history cleared on bot restart
- **Local-only data** - no cloud services used
- **Connection monitoring** via `/who` command
- Users notified on memory reboot

## Commands

- `/start` - Welcome message and bot introduction
- `/reset` - Start a fresh conversation (clears history)
- `/help` - Show help information
- `/who` - Check connection status
- `/myid` - Get your Telegram ID

You can also just send any text message to start chatting directly!

## Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd wish_granter
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
├── db/
│   └── repository.ts # Admin management
└── types/
    └── index.ts      # TypeScript type definitions
```

## Features

### AI Chat
- Powered by Anthropic Claude
- Maintains conversation history within session

### Rate Limiting
- 10 messages per minute per user
- Prevents spam and API abuse
- Graceful throttling messages

### Session Management
- In-memory session storage
- Temporary chat history during bot runtime
- Easy session reset with `/reset`

### Basic Security
- Telegram's MTProto protocol for message transport
- Session-based message history
- Connection status monitoring via `/who`
- Technical event logging

## Testing

Проект покрыт комплексными тестами с использованием Jest:

### Структура тестов
```
tests/
├── setup.ts              # Глобальная конфигурация тестов
├── bot/
│   ├── commands.test.ts   # Тесты команд бота
│   ├── handlers.test.ts   # Тесты обработчиков сообщений
│   └── middlewares.test.ts # Тесты middleware (лимиты, сессии)
├── utils/
│   ├── chat.test.ts       # Тесты AI интеграции и шифрования
│   └── config.test.ts     # Тесты конфигурации
├── services/
│   └── anthropic.test.ts  # Тесты Anthropic API
├── db/
│   └── repository.test.ts # Тесты базы данных
└── integration/
    └── bot.test.ts        # Интеграционные тесты

```

### Команды тестирования
```bash
# Запуск всех тестов
npm run test

# Запуск с отслеживанием изменений
npm run test:watch

# Генерация отчета по покрытию
npm run test:coverage

# CI режим (без watch)
npm run test:ci
```

### Покрытие
- **Команды бота** - полное покрытие всех команд `/start`, `/reset`, `/help`, etc.
- **Обработчики сообщений** - тестирование AI интеграции и обработки ошибок
- **Middleware** - rate limiting, session management, logging
- **Шифрование** - AES-256-CBC для истории сообщений
- **API интеграция** - Anthropic Claude взаимодействие
- **База данных** - управление админами

### Конфигурация Jest
- TypeScript support через `ts-jest`
- Автоматические моки для внешних API
- Покрытие кода с HTML отчетами в `coverage/`
- Timeout 10 секунд для сетевых операций

## License

MIT 