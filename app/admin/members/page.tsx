import { redirect } from 'next/navigation';
import { AccessDenied } from '@/components/access-denied';
import { MemberManagement } from '@/components/member-management';
import { SiteNav } from '@/components/site-nav';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function AdminMembersPage() {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={data.bundle.profile} />
      {!['admin', 'super_admin'].includes(data.bundle.profile?.app_role ?? '') ? <AccessDenied /> : <MemberManagement bundle={data.bundle} source={data.source} />}
    </main>
  );
}
