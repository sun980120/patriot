import { redirect } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { SignupCard } from '@/components/signup-card';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function SignupPage() {
  const data = await loadDashboardData();

  if (data.mode === 'app') {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav profile={null} />
      <SignupCard />
    </main>
  );
}
