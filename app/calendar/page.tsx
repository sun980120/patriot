import { redirect } from 'next/navigation';
import { EventManagement } from '@/components/event-management';
import { SiteNav } from '@/components/site-nav';
import { loadClubEvents } from '@/lib/event-data';
import { loadCurrentProfile } from '@/lib/profile-data';

export default async function CalendarPage() {
  const [profileData, eventResult] = await Promise.all([
    loadCurrentProfile(),
    loadClubEvents(),
  ]);

  if (profileData.mode === 'guest') {
    redirect('/login');
  }

  const canManage =
    ['admin', 'super_admin'].includes(profileData.profile.app_role) ||
    profileData.profile.member_grade === '간사';

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={profileData.profile} />
      {eventResult.ok ? (
        <EventManagement events={eventResult.events} canManage={canManage} />
      ) : (
        <section className="rounded-[28px] border border-rose-200 bg-white/90 p-6 shadow-soft">
          <p className="text-sm font-black text-rose-600">일정 목록을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-slate-600">{eventResult.message}</p>
        </section>
      )}
    </main>
  );
}
