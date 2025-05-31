interface Admin {
  telegram_id: string;
  username?: string;
  is_active: boolean;
}

export async function getAllAdmins(): Promise<Admin[]> {
  // Читаем переменную окружения КАЖДЫЙ РАЗ при вызове функции!
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  
  console.log('🔍 Reading ADMIN_TELEGRAM_ID from env:', adminId);
  
  if (!adminId || adminId === '123456789') {
    console.log('❌ ADMIN_TELEGRAM_ID not properly set in environment');
    return [];
  }

  console.log('✅ Found admin ID:', adminId);

  return [
    {
      telegram_id: adminId,
      username: 'admin',
      is_active: true
    }
  ];
}

export async function addAdmin(telegramId: string, username?: string): Promise<void> {
  // В реальной реализации тут была бы база данных
  console.log(`Would add admin: ${telegramId}`);
}

export async function removeAdmin(telegramId: string): Promise<void> {
  // В реальной реализации тут была бы база данных
  console.log(`Would remove admin: ${telegramId}`);
} 