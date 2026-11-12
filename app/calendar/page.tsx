import { redirect } from 'next/navigation';
import { EventManagement } from '@/components/event-management';
import { AppShell } from '@/components/app-shell';
import { PageHeading } from '@/components/ui/page-heading';
import { validCalendarDate } from '@/lib/calendar-occurrences';
import { loadClubEvents } from '@/lib/event-data';
import { loadCurrentProfile } from '@/lib/profile-data';

export default async function CalendarPage({ searchParams }: { searchParams?: Promise<{ date?: string }> }) {
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
  const initialDate = validCalendarDate((await searchParams)?.date);

  return (
    <AppShell sampleData={profileData.source === 'mock'} profile={profileData.profile} title="캘린더">
      {eventResult.ok ? (
        <EventManagement key={initialDate ?? 'calendar'} events={eventResult.events} canManage={canManage} initialDate={initialDate} />
      ) : (
        <section>
          <PageHeading title="캘린더" />
          <p role="alert" className="text-sm font-medium text-rose-700">일정 목록을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-slate-600">{eventResult.message}</p>
        </section>
      )}
    </AppShell>
  );
}
