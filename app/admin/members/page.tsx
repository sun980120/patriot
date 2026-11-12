import { redirect } from 'next/navigation';
import { AccessDenied } from '@/components/access-denied';
import { MemberManagement } from '@/components/member-management';
import { AppShell } from '@/components/app-shell';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function AdminMembersPage() {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }

  return (
    <AppShell sampleData={data.source === 'mock'} profile={data.bundle.profile} title="회원 관리">
      {!['admin', 'super_admin'].includes(data.bundle.profile?.app_role ?? '') ? <AccessDenied /> : <MemberManagement bundle={data.bundle} source={data.source} />}
    </AppShell>
  );
}
