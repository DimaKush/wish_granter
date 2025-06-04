import { getSingleAdmin } from '../../src/db/repository';

describe('Database Repository', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Mock console.log to avoid spam in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('getSingleAdmin', () => {
    test('should return admin when ADMIN_TELEGRAM_ID is set', async () => {
      process.env.ADMIN_TELEGRAM_ID = '123456789';
      
      const admins = await getSingleAdmin();
      
      expect(admins).toEqual([
        {
          telegram_id: '123456789',
          username: 'admin',
          is_active: true
        }
      ]);
      expect(console.log).toHaveBeenCalledWith('✅ Admin configuration loaded');
    });

    test('should return empty array when ADMIN_TELEGRAM_ID is not set', async () => {
      delete process.env.ADMIN_TELEGRAM_ID;
      
      const admins = await getSingleAdmin();
      
      expect(admins).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('❌ ADMIN_TELEGRAM_ID not set in environment');
    });

    test('should return empty array when ADMIN_TELEGRAM_ID is empty string', async () => {
      process.env.ADMIN_TELEGRAM_ID = '';
      
      const admins = await getSingleAdmin();
      
      expect(admins).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('❌ ADMIN_TELEGRAM_ID not set in environment');
    });

    test('should handle numeric admin ID', async () => {
      process.env.ADMIN_TELEGRAM_ID = '987654321';
      
      const admins = await getSingleAdmin();
      
      expect(admins[0].telegram_id).toBe('987654321');
      expect(typeof admins[0].telegram_id).toBe('string');
    });

    test('should always return admin with fixed properties', async () => {
      process.env.ADMIN_TELEGRAM_ID = 'any_id';
      
      const admins = await getSingleAdmin();
      
      expect(admins[0]).toHaveProperty('username', 'admin');
      expect(admins[0]).toHaveProperty('is_active', true);
    });
  });
}); 