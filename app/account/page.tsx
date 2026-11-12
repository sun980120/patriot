import { redirect } from 'next/navigation';
import { AccountSettingsCard } from '@/components/account-settings-card';
import { AppShell } from '@/components/app-shell';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function AccountPage() {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }

  return (
    <AppShell sampleData={data.source === 'mock'} profile={data.bundle.profile} title="내 정보">
      {data.bundle.profile ? <AccountSettingsCard profile={data.bundle.profile} /> : null}
    </AppShell>
  );
}
