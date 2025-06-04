interface Admin {
  telegram_id: string;
  username?: string;
  is_active: boolean;
}

export async function getSingleAdmin(): Promise<Admin[]> {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  
  if (!adminId) {
    console.log('❌ ADMIN_TELEGRAM_ID not set in environment');
    return [];
  }

  console.log('✅ Admin configuration loaded');

  return [
    {
      telegram_id: adminId,
      username: 'admin',
      is_active: true
    }
  ];
}