import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `[${level.toUpperCase()}] ${timestamp} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

export const siweConfig = {
  domain: process.env.ETH_DOMAIN || 'localhost',
  origin: process.env.ETH_ORIGIN || 'https://localhost',
  statement: process.env.ETH_STATEMENT || 'Sign in with Ethereum to verify your wallet ownership.',
  chainId: Number(process.env.ETH_CHAIN_ID || 1),
  expirationTime: Number(process.env.ETH_EXPIRATION_TIME || 3600)
};

export const dbConfig = {
  path: process.env.DB_PATH || './data/verification.db'
};

export const adminConfig = {
  defaultAdminId: process.env.ADMIN_TELEGRAM_ID
};

export const allowlistConfig = {
  enabled: process.env.ALLOWLIST_ENABLED?.toLowerCase() === 'true'
};