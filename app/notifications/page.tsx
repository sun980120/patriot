import { redirect } from 'next/navigation';
import { markAllNotificationsReadAction } from '@/app/actions';
import { NotificationsList } from '@/components/notifications-list';
import { SiteNav } from '@/components/site-nav';
import { loadDashboardData } from '@/lib/dashboard-data';
import { loadNotifications } from '@/lib/notifications-data';

export default async function NotificationsPage() {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }

  const notificationData = await loadNotifications();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={data.bundle.profile} />
      <section className="glass-panel rounded-[32px] border border-white/70 p-6 shadow-soft sm:rounded-[40px] sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Notifications</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">알림 센터</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              회비, 추가 비용, 관리자 안내를 한 곳에서 확인합니다.
            </p>
          </div>
          <form action={async () => {
            'use server';
            await markAllNotificationsReadAction();
          }}>
            <button
              type="submit"
              disabled={notificationData.unreadCount === 0}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              모두 읽음 처리
            </button>
          </form>
        </div>

        <NotificationsList notifications={notificationData.notifications} unreadCount={notificationData.unreadCount} />
      </section>
    </main>
  );
}
