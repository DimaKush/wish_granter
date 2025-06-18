import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/config';
import { clearChatHistory } from '../utils/chat';

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

  // Reset chat command
  bot.command('reset', async (ctx) => {
    if (!ctx.from) return;
    
    const userId = ctx.from.id.toString();
    
    // Actually clear the chat history
    await clearChatHistory(userId);
    
    // Clear session data
    if (ctx.session) {
      ctx.session.chatHistory = [];
    }

    await ctx.reply('🔄 Диалог сброшен. Можете начать новую беседу! / Chat reset. You can start a new conversation!');
  });

  // Help command
  bot.command('help', async (ctx) => {
    const helpMessage = `🤖 Wish Granter - Исполнитель Желаний

Доступные команды:
• /start - Показать приветствие
• /reset - Сбросить диалог и начать новый
• /who - Проверить безопасность соединения
• /help - Показать это сообщение

🔒 Безопасность:
• Все сообщения шифруются уникальным ключом при старте бота
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

  // Who command to check runtime connections
  bot.command('who', async (ctx) => {
    try {
      const processAny = process as any;
      const connections = processAny._getActiveHandles ? processAny._getActiveHandles().length : 'N/A';
      const uptime = Math.floor(process.uptime());
      const memUsage = process.memoryUsage();
      
      const statusMessage = `🔒 Статус процесса:
• Время работы: ${uptime}с
• Активных хэндлов: ${connections}
• Память: ${Math.round(memUsage.rss / 1024 / 1024)}MB

Process Status:
• Uptime: ${uptime}s
• Active handles: ${connections}
• Memory: ${Math.round(memUsage.rss / 1024 / 1024)}MB`;
      
      await ctx.reply(statusMessage);
      
      // Log security check
      logger.info(`Process status checked by user ${ctx.from?.id}: connections=${connections}, uptime=${uptime}, memory=${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    } catch (error) {
      logger.error('Error in /who command:', error);
      await ctx.reply('❌ Error getting process status.');
    }
  });

  logger.info('Commands setup completed');
} 