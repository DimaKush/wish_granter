import { Context as TelegrafContext } from 'telegraf';
import { ChatMessage } from '../utils/chat';

/**
 * Custom session interface for the bot
 */
export interface SessionData {
  chatHistory?: ChatMessage[];
}

/**
 * Custom context interface extending Telegraf's Context
 */
export interface Context extends TelegrafContext {
  session: SessionData;
} 