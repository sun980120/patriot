import { redirect } from 'next/navigation';
import { AccountSettingsCard } from '@/components/account-settings-card';
import { SiteNav } from '@/components/site-nav';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function AccountPage() {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={data.bundle.profile} />
      {data.bundle.profile ? <AccountSettingsCard profile={data.bundle.profile} /> : null}
    </main>
  );
}
