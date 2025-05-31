import { Telegraf, session } from 'telegraf';
import { setupCommands } from './bot/commands';
import { setupHandlers } from './bot/handlers';
import { setupMiddlewares } from './bot/middlewares';
import { logger } from './utils/config';
import { Context } from './types';
import * as dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
  logger.error(`Error loading .env file: ${result.error.message}`);
  process.exit(1);
}

logger.info('Application starting...');

const token = process.env.BOT_TOKEN;
if (!token) {
  logger.error('BOT_TOKEN is required');
  process.exit(1);
}

export const bot: Telegraf<Context> = new Telegraf(token);
logger.info('Bot instance created');

bot.use(session());
logger.info('Session middleware configured');

setupMiddlewares(bot);
logger.info('Custom middlewares configured');

const setupBotCommands = async () => {
  try {
    const userCommands = [
      { command: 'start', description: 'Запустить бота' },
      { command: 'chat', description: 'Начать диалог с AI' },
      { command: 'new_chat', description: 'Начать новый диалог' },
      { command: 'who', description: 'Проверить безопасность соединения' },
      { command: 'myid', description: 'Получить ваш Telegram ID' },
      { command: 'help', description: 'Показать справку' }
    ];

    await bot.telegram.setMyCommands(userCommands);
    logger.info('User commands registered in bot menu');

    // Setup admin commands if admin ID is configured
    if (process.env.ADMIN_TELEGRAM_ID) {
      const adminCommands = [
        { command: 'start', description: 'Запустить бота' },
        { command: 'chat', description: 'Начать диалог с AI' },
        { command: 'new_chat', description: 'Начать новый диалог' },
        { command: 'myid', description: 'Получить ваш Telegram ID' },
        { command: 'send', description: 'Отправить сообщение пользователю' },
        { command: 'help', description: 'Показать справку' }
      ];

      await bot.telegram.setMyCommands(adminCommands, {
        scope: { type: 'chat', chat_id: process.env.ADMIN_TELEGRAM_ID }
      });
      logger.info('Admin commands registered for admin user');
    }
  } catch (error) {
    logger.error('Error setting up commands:', error);
  }
};

const startBot = async () => {
  try {
    logger.info('Setting up bot commands...');
    await setupBotCommands();
    
    logger.info('Setting up bot handlers...');
    setupCommands(bot);
    setupHandlers(bot);

    logger.info('Launching bot...');
    await bot.launch();
    
    const me = await bot.telegram.getMe();
    logger.info(`Bot launched successfully! Bot name: ${me.username}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to start bot: ${errorMessage}`);
  }
};

startBot();

process.once('SIGINT', () => {
  logger.info('SIGINT received, shutting down bot gracefully');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down bot gracefully');
  bot.stop('SIGTERM');
}); 