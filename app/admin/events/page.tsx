import { redirect } from 'next/navigation';
import { AccessDenied } from '@/components/access-denied';
import { EventManagement } from '@/components/event-management';
import { SiteNav } from '@/components/site-nav';
import { loadDashboardData } from '@/lib/dashboard-data';
import { loadClubEvents } from '@/lib/event-data';

export default async function AdminEventsPage() {
  const [data, eventResult] = await Promise.all([
    loadDashboardData(),
    loadClubEvents(),
  ]);

  if (data.mode === 'guest') {
    redirect('/login');
  }

  const adminMode = ['admin', 'super_admin'].includes(data.bundle.profile?.app_role ?? '');

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={data.bundle.profile} />
      {!adminMode ? (
        <AccessDenied />
      ) : eventResult.ok ? (
        <EventManagement
          events={eventResult.events}
          profiles={data.bundle.profiles}
          fiscalYears={data.bundle.fiscalYears}
          selectedFiscalYearId={data.bundle.selectedYear?.id ?? null}
        />
      ) : (
        <section className="rounded-[28px] border border-rose-200 bg-white/90 p-6 shadow-soft">
          <p className="text-sm font-black text-rose-600">이벤트 목록을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-slate-600">{eventResult.message}</p>
        </section>
      )}
    </main>
  );
}
