import { redirect } from 'next/navigation';
import { ClubDashboard } from '@/components/club-dashboard';
import { AppShell } from '@/components/app-shell';
import { loadDashboardData } from '@/lib/dashboard-data';
import { loadClubEvents } from '@/lib/event-data';

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const [data, events, params] = await Promise.all([loadDashboardData(), loadClubEvents(), searchParams]);

  if (data.mode === 'guest') {
    redirect('/login');
  }

  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const view = first(params?.view) === 'dues' ? 'dues' : 'overview';
  const requestedYear = first(params?.year);
  const yearId = data.bundle.fiscalYears.find((year) => year.id === requestedYear)?.id;
  const month = Number(first(params?.month));
  const arrears = first(params?.status) === 'arrears';
  const filter = first(params?.status) === 'due' ? 'due' : arrears ? 'all' : undefined;
  const exemptionFilter = first(params?.status) === 'exempt';
  const memberId = first(params?.member);
  return <AppShell sampleData={data.source === 'mock'} profile={data.bundle.profile} title={view === 'dues' ? '회비 관리' : '대시보드'}>
    <ClubDashboard initialData={data.bundle} source={data.source} events={events.ok ? events.events : null} view={view} initialYearId={yearId} initialDuesMonth={month >= 1 && month <= 12 ? month : undefined} initialDuesFilter={exemptionFilter ? 'exempt' : filter} initialMemberId={memberId} initialArrears={arrears} />
  </AppShell>;
}
