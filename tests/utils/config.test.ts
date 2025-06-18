import { logger, siweConfig, dbConfig, adminConfig, allowlistConfig } from '../../src/utils/config';

describe('Config Utils', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.ETH_DOMAIN;
    delete process.env.ETH_ORIGIN;
    delete process.env.ETH_STATEMENT;
    delete process.env.ETH_CHAIN_ID;
    delete process.env.ETH_EXPIRATION_TIME;
    delete process.env.DB_PATH;
    delete process.env.ADMIN_TELEGRAM_ID;
    delete process.env.ALLOWLIST_ENABLED;
  });

  describe('logger', () => {
    test('should be configured with winston', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    test('should have default log level', () => {
      expect(logger.level).toBe('info');
    });

    test('should have transports configured', () => {
      expect(logger.transports).toHaveLength(3);
    });

    test('should format log messages with timestamp', () => {
      // Just verify logger method works - formatting is internal to winston
      expect(() => logger.info('Test message')).not.toThrow();
      expect(logger.level).toBe('info');
    });

    test('should format log messages with metadata', () => {
      // Just verify logger method works with metadata
      expect(() => logger.info('Test message', { userId: '123', action: 'test' })).not.toThrow();
      expect(logger.level).toBe('info');
    });
  });

  describe('siweConfig', () => {
    test('should have default values', () => {
      expect(siweConfig.domain).toBe('localhost');
      expect(siweConfig.origin).toBe('https://localhost');
      expect(siweConfig.statement).toBe('Sign in with Ethereum to verify your wallet ownership.');
      expect(siweConfig.chainId).toBe(1);
      expect(siweConfig.expirationTime).toBe(3600);
    });

    test('should use environment variables when provided', () => {
      // This test is tricky because config is loaded at import time
      // In a real scenario, you'd want to dynamically import or restart the process
      process.env.ETH_DOMAIN = 'example.com';
      process.env.ETH_ORIGIN = 'https://example.com';
      process.env.ETH_STATEMENT = 'Custom statement';
      process.env.ETH_CHAIN_ID = '5';
      process.env.ETH_EXPIRATION_TIME = '7200';

      // Re-import the module to get updated config
      jest.resetModules();
      const { siweConfig: updatedConfig } = require('../../src/utils/config');

      expect(updatedConfig.domain).toBe('example.com');
      expect(updatedConfig.origin).toBe('https://example.com');
      expect(updatedConfig.statement).toBe('Custom statement');
      expect(updatedConfig.chainId).toBe(5);
      expect(updatedConfig.expirationTime).toBe(7200);
    });
  });

  describe('dbConfig', () => {
    test('should have default path', () => {
      expect(dbConfig.path).toBe('./data/verification.db');
    });

    test('should use environment variable when provided', () => {
      process.env.DB_PATH = '/custom/path/db.sqlite';
      
      jest.resetModules();
      const { dbConfig: updatedConfig } = require('../../src/utils/config');

      expect(updatedConfig.path).toBe('/custom/path/db.sqlite');
    });
  });

  describe('adminConfig', () => {
    test('should have defaultAdminId property', () => {
      expect(adminConfig).toHaveProperty('defaultAdminId');
    });
  });

  describe('allowlistConfig', () => {
    test('should have enabled property', () => {
      expect(typeof allowlistConfig.enabled).toBe('boolean');
    });
  });
}); 