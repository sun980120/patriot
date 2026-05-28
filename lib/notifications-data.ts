import { serverApiFetch } from '@/lib/backend-api';

export type AppNotification = {
  id: string;
  type: 'MONTHLY_DUES' | 'ADDITIONAL_CHARGE' | 'ADMIN_NOTICE' | 'PAYMENT_CONFIRMED' | 'EXEMPTION_CHANGED';
  title: string;
  message: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string | null;
  readAt: string | null;
};

export type NotificationList = {
  unreadCount: number;
  notifications: AppNotification[];
};

export async function loadNotifications(): Promise<NotificationList> {
  const result = await serverApiFetch<NotificationList>('/api/app-notifications');
  if (!result.ok || !result.data) {
    return { unreadCount: 0, notifications: [] };
  }
  return result.data;
}
