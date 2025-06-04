import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './config';
import { getSingleAdmin } from '../db/repository';
import { bot } from '../index';

const ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

const CHAT_HISTORY_DIR = path.join(process.cwd(), 'data', 'chat_history');

if (!fs.existsSync(CHAT_HISTORY_DIR)) {
  fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function encryptMessage(message: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').slice(0, 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptMessage(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').slice(0, 32);
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
  try {
    const userChatFile = path.join(CHAT_HISTORY_DIR, `${userId}.json`);
    const encryptedData = encryptMessage(JSON.stringify(messages));
    await fs.promises.writeFile(userChatFile, encryptedData);
    logger.info(`Chat history saved for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to save chat history for user ${userId}:`, error);
  }
}

export async function loadChatHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const userChatFile = path.join(CHAT_HISTORY_DIR, `${userId}.json`);
    
    if (!fs.existsSync(userChatFile)) {
      return [];
    }
    
    const encryptedData = await fs.promises.readFile(userChatFile, 'utf8');
    const decryptedData = decryptMessage(encryptedData);
    return JSON.parse(decryptedData) as ChatMessage[];
  } catch (error) {
    logger.error(`Failed to load chat history for user ${userId}:`, error);
    return [];
  }
}

export async function clearChatHistory(userId: string): Promise<void> {
  try {
    const userChatFile = path.join(CHAT_HISTORY_DIR, `${userId}.json`);
    
    if (fs.existsSync(userChatFile)) {
      await fs.promises.unlink(userChatFile);
      logger.info(`Chat history deleted for user ${userId}`);
    }
    
    // Send confirmation message via bot
    await bot.telegram.sendMessage(userId, '🗑 История диалога удалена\n\n🗑 Chat history has been cleared');
  } catch (error) {
    logger.error(`Failed to clear chat history for user ${userId}:`, error);
  }
}

async function processSuperwish(userId: string, message: string) {
  try {
    const superWishMatch = message.match(/\[SUPERWISH_DETECTED\]([\s\S]*?)\[\/SUPERWISH_DETECTED\]/);

    if (superWishMatch) {
      const privateChannelLink = process.env.PRIVATE_CHANNEL_LINK || 'https://t.me/your_private_channel';
      const userMessageRu = `🌟 **Поздравляем!** 🌟

Ваше желание особенное! Приглашаем вас в наш эксклюзивный канал, где вы найдете дополнительные возможности и поддержку для достижения ваших целей.

👇 **Присоединяйтесь к нашему приватному каналу:**
${privateChannelLink}

💫 Здесь вас ждут эксклюзивные материалы и персональная поддержка!`;

      const userMessageEn = `🌟 **Congratulations!** 🌟

Your wish is special! We invite you to our exclusive channel where you will find additional opportunities and support to achieve your goals.

👇 **Join our private channel:**
${privateChannelLink} 

💫 Here you will find exclusive materials and personal support!`;

      try {
        await bot.telegram.sendMessage(userId, userMessageRu, { parse_mode: 'Markdown' });
        await bot.telegram.sendMessage(userId, userMessageEn, { parse_mode: 'Markdown' });
        logger.info(`SUPERWISH channel invitation sent to user ${userId}`);
      } catch (error) {
        logger.error(`Failed to send SUPERWISH channel invitation to user ${userId}:`, error);
      }
    }
  } catch (error) {
    logger.warn('Error processing wishes (non-critical):', error);
  }
}

// Add message logging function
async function logMessageMetadata(userId: string) {
  try {
    const logDir = path.join(process.cwd(), 'data', 'message_logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'message_timestamps.log');
    const timestamp = new Date().toISOString();
    const logEntry = `${userId},${timestamp}\n`;
    
    await fs.promises.appendFile(logFile, logEntry);
  } catch (error) {
    logger.error(`Failed to log message metadata for user ${userId}:`, error);
  }
}

// Modify sendMessageToAnthropic to include logging
export async function sendMessageToAnthropic(
  userId: string, 
  message: string, 
  includeHistory = true
): Promise<string> {
  // Log message metadata at the start
  await logMessageMetadata(userId);
  
  let thinkingMessage: any = null;
  try {
    let messages: ChatMessage[] = [];
    
    if (includeHistory) {
      messages = await loadChatHistory(userId);
    }
    
    messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Send thinking message
    thinkingMessage = await bot.telegram.sendMessage(userId, "🤔 Thinking...");

    try {
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
          messages: formattedMessages,
          system: `You are WishGranter. Key guidelines:

1. Always introduce yourself as WishGranter
2. Your main task is to identify and understand users' ultimate wishes
3. When you detect a wish, respond with:
   [WISH_DETECTED]
   Wish: {wish_text}
   Analysis: {your brief analysis of the wish}
   [/WISH_DETECTED]

4. SPECIAL SUPERWISH: If the user's wish matches or is very similar to "${process.env.SUPERWISH || 'financial freedom'}", use this format instead:
   [SUPERWISH_DETECTED]
   Wish: {wish_text}
   Analysis: {your analysis of why this matches the superwish}
   Match Confidence: {percentage}
   [/SUPERWISH_DETECTED]

5. After detecting a reasonable wish (not harmful/impossible), guide the user through these questions:
   - What steps have they already taken towards this wish?
   - Do they have a concrete plan?
   - What's their next immediate action?
   - Do they understand what it takes to achieve this?

6. If the wish seems vague or unrealistic, keep asking follow-up questions to:
   - Make it more specific and actionable
   - Break it down into smaller, achievable goals
   - Help them focus on what they can control

7. Remember that any wish is someone's injected idea from the past
8. Keep digging until you find the REAL wish behind their initial statement

Remember: Users have already verified their Ethereum addresses, so you can assume they have basic blockchain knowledge.

Example flow:
User: "I wish to be rich"
You: *send admin notification first, then respond to user*
"I understand your desire for wealth. Let's make this more concrete:
- What does being 'rich' mean to you specifically?
- Have you taken any steps towards financial growth already?
- Do you have a plan for wealth building?
- What would be your next immediate step?"`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorData}`);
      }
      
      interface AnthropicResponse {
        content: Array<{type: string, text: string}>;
        id: string;
        model: string;
      }
      
      const data = await response.json() as AnthropicResponse;
      const assistantMessage = data.content[0].text;
      
      // Separate admin notification from user response
      const wishMatch = assistantMessage.match(/\[WISH_DETECTED\]([\s\S]*?)\[\/WISH_DETECTED\]/);
      const superWishMatch = assistantMessage.match(/\[SUPERWISH_DETECTED\]([\s\S]*?)\[\/SUPERWISH_DETECTED\]/);
      let userMessage = assistantMessage;

      if (wishMatch || superWishMatch) {
        // Process superwish and send channel invitation if applicable
        await processSuperwish(userId, assistantMessage);
        
        // Remove technical format from user message
        userMessage = assistantMessage
          .replace(/\[WISH_DETECTED\][\s\S]*?\[\/WISH_DETECTED\]\n?/g, '')
          .replace(/\[SUPERWISH_DETECTED\][\s\S]*?\[\/SUPERWISH_DETECTED\]\n?/g, '')
          .trim();
      }

      messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now()
      });
      
      await saveChatHistory(userId, messages);
      
      // Delete thinking message
      await bot.telegram.deleteMessage(userId, thinkingMessage.message_id);
      
      return userMessage;
    } catch (error) {
      logger.error(`API call to Anthropic failed for user ${userId}:`, error);
      
      if (error instanceof Error && error.message.includes('401')) {
        // Delete thinking message on error
        await bot.telegram.deleteMessage(userId, thinkingMessage.message_id);
        return "The bot administrator needs to check the Anthropic API key configuration.";
      }
      
      // Delete thinking message on error
      await bot.telegram.deleteMessage(userId, thinkingMessage.message_id);
      return "Sorry, I encountered an error processing your request. Please try again later.";
    }
  } catch (error) {
    logger.error(`Error sending message to Anthropic for user ${userId}:`, error);
    // Delete thinking message on error
    if (thinkingMessage) {
      await bot.telegram.deleteMessage(userId, thinkingMessage.message_id).catch(() => {});
    }
    return "Sorry, I encountered an error processing your request. Please try again later.";
  }
}

export async function handleAdminSendMessage(adminId: string, text: string): Promise<void> {
  try {
    // Check if user is admin
    const admins = await getSingleAdmin();
    if (!admins.some(admin => admin.telegram_id === adminId)) {
      await bot.telegram.sendMessage(adminId, "❌ You don't have permission to use this command.");
      return;
    }

    // Parse command: /send userId message
    const match = text.match(/^\/send\s+(\d+)\s+(.+)$/s);
    if (!match) {
      await bot.telegram.sendMessage(adminId, "❌ Invalid format. Use: /send userId message");
      return;
    }

    const [, targetUserId, message] = match;

    // Send message to target user
    await bot.telegram.sendMessage(targetUserId, `📩 Message from admin:\n\n${message}`);
    
    // Confirm to admin
    await bot.telegram.sendMessage(adminId, `✅ Message sent to user ${targetUserId}`);
    
    logger.info(`Admin ${adminId} sent message to user ${targetUserId}`);
  } catch (error) {
    logger.error('Error handling admin send message:', error);
    await bot.telegram.sendMessage(adminId, "❌ Failed to send message. Please try again later.");
  }
}

// Add reboot notification function
async function notifyUsersAboutReboot() {
  try {
    const files = await fs.promises.readdir(CHAT_HISTORY_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const userId = file.replace('.json', '');
        try {
          await bot.telegram.sendMessage(userId, '🔄 Memory Reboot: Предыдущий контекст разговора сброшен для обеспечения безопасности.');
        } catch (error) {
          logger.warn(`Failed to send reboot notification to user ${userId}:`, error);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to notify users about reboot:', error);
  }
}

// Call notification on startup
notifyUsersAboutReboot(); 