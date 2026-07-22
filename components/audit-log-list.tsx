import type { AuditLog } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  MEMBER_APPROVED: '회원 승인',
  PENDING_MEMBER_DELETED: '가입 신청 삭제',
  MEMBER_DEACTIVATED: '회원 비활성화',
  MEMBER_ACTIVATED: '회원 활성화',
  MEMBER_FEE_EXEMPTION_UPDATED: '회비 면제 변경',
  MEMBER_PROMOTED_TO_ADMIN: '간사 승격',
  ADMIN_DEMOTED_TO_MEMBER: '간사 권한 제거',
  MEMBER_PASSWORD_RESET: '비밀번호 초기화',
  MONTHLY_PAYMENT_MARKED_PAID: '월회비 납부 처리',
  MONTHLY_PAYMENT_MARKED_UNPAID: '월회비 미납 처리',
  MONTHLY_PAYMENT_MANUAL_EXEMPTED: '월회비 수동 면제',
  MONTHLY_PAYMENT_MANUAL_EXEMPTION_CLEARED: '월회비 면제 해제',
  ADDITIONAL_CHARGE_GROUP_CREATED: '추가 비용 생성',
  ADDITIONAL_CHARGE_MARKED_PAID: '추가 비용 납부 처리',
  ADDITIONAL_CHARGE_MARKED_UNPAID: '추가 비용 미납 처리',
  ADDITIONAL_CHARGE_AMOUNT_UPDATED: '추가 비용 금액 변경',
  ADDITIONAL_CHARGE_SETTLED: '추가 비용 정산',
  ADDITIONAL_CHARGE_SETTLEMENT_REOPENED: '정산 재오픈',
  ADDITIONAL_CHARGE_GROUP_DELETED: '추가 비용 삭제',
};

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function AuditLogList({ logs }: { logs: AuditLog[] }) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-soft sm:rounded-[36px] sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-700">Audit Trail</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">감사 로그</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            회원, 회비, 추가 비용의 주요 관리자 변경 이력을 최신순으로 표시합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
          최근 {logs.length}건
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <div className="hidden grid-cols-[170px_150px_1fr_140px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black text-slate-500 md:grid">
          <span>일시</span>
          <span>작업</span>
          <span>대상/내용</span>
          <span>처리자</span>
        </div>

        {logs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
            아직 기록된 감사 로그가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log.id} className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[170px_150px_1fr_140px] md:gap-3">
                <time className="font-semibold text-slate-500">{formatDate(log.created_at)}</time>
                <span className="font-black text-slate-900">{ACTION_LABELS[log.action] ?? log.action}</span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{log.target_name ?? log.target_type}</p>
                  {log.detail ? <p className="mt-1 leading-6 text-slate-500">{log.detail}</p> : null}
                </div>
                <span className="font-semibold text-slate-600">{log.actor_name ?? '-'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
