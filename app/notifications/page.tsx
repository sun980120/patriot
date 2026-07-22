import { redirect } from 'next/navigation';
import { NotificationsList } from '@/components/notifications-list';
import { SiteNav } from '@/components/site-nav';
import { loadNotifications } from '@/lib/notifications-data';
import { loadCurrentProfile } from '@/lib/profile-data';

export default async function NotificationsPage() {
  const [profileData, notificationData] = await Promise.all([
    loadCurrentProfile(),
    loadNotifications(),
  ]);

  if (profileData.mode === 'guest') {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav
        showLogout
        profile={profileData.profile}
        initialNotificationUnreadCount={notificationData.unreadCount}
      />
      <section className="glass-panel rounded-[32px] border border-white/70 p-6 shadow-soft sm:rounded-[40px] sm:p-8">
        <div className="border-b border-slate-200/80 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Notifications</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">알림 센터</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              회비, 추가 비용, 관리자 안내를 한 곳에서 확인합니다.
            </p>
          </div>
        </div>

        <NotificationsList
          key={`${notificationData.unreadCount}-${notificationData.notifications.length}-${notificationData.notifications[0]?.id ?? 'empty'}`}
          notifications={notificationData.notifications}
        />
      </section>
    </main>
  );
}
