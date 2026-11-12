import { redirect } from 'next/navigation';
import { AccessDenied } from '@/components/access-denied';
import { FinanceManagement } from '@/components/finance-management';
import { AppShell } from '@/components/app-shell';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function AdminFinancePage({ searchParams }: { searchParams?: Promise<{ year?: string; tab?: string }> }) {
  const data = await loadDashboardData();

  if (data.mode === 'guest') {
    redirect('/login');
  }
  const params = await searchParams;
  const requestedYear = params?.year;
  const initialView = params?.tab === 'income' || params?.tab === 'expense' ? params.tab : 'charges';
  const bundle = { ...data.bundle, selectedYear: data.bundle.fiscalYears.find((year) => year.id === requestedYear) ?? data.bundle.selectedYear };

  return (
    <AppShell sampleData={data.source === 'mock'} profile={data.bundle.profile} title="재정 관리">
      {!['admin', 'super_admin'].includes(data.bundle.profile?.app_role ?? '') ? <AccessDenied /> : <FinanceManagement key={`${bundle.selectedYear?.id}:${initialView}`} bundle={bundle} source={data.source} initialView={initialView} />}
    </AppShell>
  );
}
