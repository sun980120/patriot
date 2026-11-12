import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { SignupCard } from '@/components/signup-card';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function SignupPage() {
  const data = await loadDashboardData();

  if (data.mode === 'app') {
    redirect('/dashboard');
  }

  return (
    <AuthShell mode="signup">
      <SignupCard />
    </AuthShell>
  );
}
