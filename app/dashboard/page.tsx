import { redirect } from 'next/navigation';
import { ClubDashboard } from '@/components/club-dashboard';
import { SiteNav } from '@/components/site-nav';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function DashboardPage() {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={data.bundle.profile} />
      <ClubDashboard initialData={data.bundle} source={data.source} />
    </main>
  );
}
