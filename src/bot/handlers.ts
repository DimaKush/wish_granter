import { Telegraf } from 'telegraf';
import { Context } from '../types';
import { logger } from '../utils/config';
import { sendMessageToAnthropic, clearChatHistory, ChatMessage } from '../utils/chat';

export function setupHandlers(bot: Telegraf<Context>) {
  // Handle regular text messages for chat
  bot.on('text', async (ctx: Context) => {
    try {
      // Type guard checks
      if (!ctx.message || !('text' in ctx.message) || !ctx.from) {
        return;
      }

      const message = ctx.message.text;
      const userId = ctx.from.id.toString();

      // Initialize session if needed
      if (!ctx.session) {
        ctx.session = { chatHistory: [] };
      }

      if (!ctx.session.chatHistory) {
        ctx.session.chatHistory = [];
      }

      // Send typing indicator
      await ctx.sendChatAction('typing');

      // Get AI response (the function now handles chat history internally)
      const response = await sendMessageToAnthropic(userId, message);
      
      if (response) {
        // Send response to user
        await ctx.reply(response);
      } else {
        await ctx.reply('Sorry, I had trouble processing your message. Please try again.');
      }

    } catch (error) {
      logger.error('Error handling text message:', error);
      await ctx.reply('Something went wrong. Please try again later.');
    }
  });

  logger.info('Handlers setup completed');
} 