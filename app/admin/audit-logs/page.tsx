import { redirect } from 'next/navigation';
import { AccessDenied } from '@/components/access-denied';
import { AuditLogList } from '@/components/audit-log-list';
import { AppShell } from '@/components/app-shell';
import { buildAuditLogExportPath, loadAuditLogActors, loadAuditLogsByFilters, type AuditLogFilters } from '@/lib/audit-log-data';
import { loadCurrentProfile } from '@/lib/profile-data';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters: AuditLogFilters = {
    action: first(params?.action),
    actorId: first(params?.actorId),
    targetType: first(params?.targetType),
    targetKeyword: first(params?.targetKeyword),
    fromDate: first(params?.fromDate),
    toDate: first(params?.toDate),
    limit: first(params?.limit) ?? '100',
  };

  const [profileData, auditResult, actorResult] = await Promise.all([
    loadCurrentProfile(),
    loadAuditLogsByFilters(filters),
    loadAuditLogActors(),
  ]);

  if (profileData.mode === 'guest') {
    redirect('/login');
  }

  const profile = profileData.profile;
  const adminMode = profile.app_role === 'admin' || profile.app_role === 'super_admin';

  return (
    <AppShell profile={profile} title="감사 로그">
      {!adminMode ? (
        <AccessDenied />
      ) : auditResult.ok ? (
        <AuditLogList
          logs={auditResult.logs}
          filters={filters}
          actors={actorResult.ok ? actorResult.actors : []}
          exportHref={buildAuditLogExportPath(filters)}
        />
      ) : (
        <section className="rounded-[28px] border border-rose-200 bg-white/90 p-6 shadow-soft">
          <p className="text-sm font-black text-rose-600">감사 로그를 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-slate-600">{auditResult.message}</p>
        </section>
      )}
    </AppShell>
  );
}
