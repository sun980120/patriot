import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth-card';
import { SiteNav } from '@/components/site-nav';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function LoginPage() {
  const data = await loadDashboardData();

  if (data.mode === 'app') {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav profile={null} />
      <AuthCard />
    </main>
  );
}
