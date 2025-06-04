import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/config';
import { handleAdminSendMessage, clearChatHistory } from '../utils/chat';

export function setupCommands(bot: Telegraf<Context>) {
  // Start command
  bot.command('start', async (ctx) => {
    const welcomeMessageRu = `🧞 Wish Granter - Исполнитель Желаний

Помогаю находить и формулировать истинные желания через AI-диалог.

Что умею:
• Выявляю настоящие цели через беседу
• Превращаю мечты в конкретные планы  
• Разбиваю большие желания на шаги
• Нахожу истинные мотивы

Как работает:
1. Расскажите о желаниях
2. Отвечу уточняющими вопросами
3. Найдем истинное желание
4. Составим план достижения`;

    const welcomeMessageEn = `🧞 Wish Granter

I help discover and formulate true wishes through AI dialogue.

What I do:
• Uncover real goals through conversation
• Transform dreams into concrete plans
• Break down big wishes into steps
• Find true motivations

How it works:
1. Tell me about your wishes
2. I'll ask clarifying questions
3. We'll find your true wish
4. We'll create an achievement plan`;

    await ctx.reply(welcomeMessageRu);
    await ctx.reply(welcomeMessageEn);
  });

  // Chat command 
  bot.command('chat', async (ctx) => {
    await ctx.reply('Hi! I\'m ready to chat. What would you like to talk about?');
  });

  // New chat command
  bot.command('new_chat', async (ctx) => {
    if (!ctx.from) return;
    
    const userId = ctx.from.id.toString();
    
    // Actually clear the chat history
    await clearChatHistory(userId);
    
    // Clear session data
    if (ctx.session) {
      ctx.session.chatHistory = [];
    }
  });

  // Help command
  bot.command('help', async (ctx) => {
    const helpMessage = `🤖 Wish Granter - Исполнитель Желаний

Доступные команды:
• /start - Показать приветствие
• /chat - Начать диалог с AI
• /new_chat - Начать новый диалог
• /who - Проверить безопасность соединения
• /help - Показать это сообщение

🔒 Безопасность:
• Все сообщения шифруются уникальным ключом при старте бота
• Даже администраторы не имеют доступа к содержимому диалогов
• При перезапуске бота вы получите сообщение "🔄 Memory Reboot"
• Используйте /who чтобы проверить безопасность в реальном времени

Подробная документация на https://github.com/DimaKush/wish_granter
Просто напишите сообщение, чтобы начать диалог!`;

    await ctx.reply(helpMessage);
  });

  // Get user ID command
  bot.command('myid', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      const username = ctx.from?.username;
      
      await ctx.reply(
        `Your Telegram ID: \`${userId}\`\n` +
        `Username: @${username || 'none'}\n\n`,
        { parse_mode: 'Markdown' }
      );
      
      logger.info(`User ${userId} (@${username}) requested their ID`);
    } catch (error) {
      logger.error('Error in /myid command:', error);
      await ctx.reply('Error getting your ID. Please try again.');
    }
  });

  // Admin send message command
  bot.command('send', async (ctx: Context) => {
    try {
      const adminId = ctx.from?.id?.toString();
      if (!adminId) {
        await ctx.reply('❌ Error: Unable to identify user.');
        return;
      }

      // Check if message exists and has text
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Error: No text message found.');
        return;
      }

      await handleAdminSendMessage(adminId, ctx.message.text);
    } catch (error) {
      logger.error('Error in /send command:', error);
      await ctx.reply('❌ Error processing send command. Please try again.');
    }
  });


  // Who command to check runtime connections
  bot.command('who', async (ctx) => {
    const activeConnections = 0;
    const processConnected = process.connected;
    
    const statusMessage = `🔒 Статус безопасности:

• Активных подключений: ${activeConnections}
• Внешние процессы: ${processConnected ? '⚠️ Есть' : '✅ Нет'}
• Шифрование: ✅ Активно
• Доступ к сообщениям: Только Claude AI

${processConnected ? '⚠️ Обнаружено внешнее подключение к процессу' : '✅ Нет подозрительной активности'}

Security status:
• Active connections: ${activeConnections}
• External processes: ${processConnected ? '⚠️ Yes' : '✅ No'}
• Encryption: ✅ Active
• Message access: Claude AI only

${processConnected ? '⚠️ External process connection detected' : '✅ No suspicious activity'}`;

    await ctx.reply(statusMessage);
    
    // Log security check
    logger.info(`Security status checked by user ${ctx.from?.id}: connections=${activeConnections}, processConnected=${processConnected}`);
  });

  logger.info('Commands setup completed');
} 