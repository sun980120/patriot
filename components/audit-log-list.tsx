import type { AuditLog, AuditLogActor } from '@/lib/types';

export const ACTION_LABELS: Record<string, string> = {
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

export const TARGET_TYPE_LABELS: Record<string, string> = {
  MEMBER: '회원',
  MEMBERSHIP_PAYMENT: '월회비',
  CHARGE_GROUP: '추가 비용 이벤트',
  MEMBER_CHARGE: '참가자 추가 비용',
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

type AuditLogListProps = {
  logs: AuditLog[];
  filters: {
    action?: string;
    actorId?: string;
    targetType?: string;
    targetKeyword?: string;
    fromDate?: string;
    toDate?: string;
    limit?: string;
  };
  actors: AuditLogActor[];
  exportHref: string;
};

export function AuditLogList({ logs, filters, actors, exportHref }: AuditLogListProps) {
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

      <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <label className="grid gap-1 text-xs font-black text-slate-500">
          작업 유형
          <select
            name="action"
            defaultValue={filters.action ?? ''}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          >
            <option value="">전체</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          대상 유형
          <select
            name="targetType"
            defaultValue={filters.targetType ?? ''}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          >
            <option value="">전체</option>
            {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          처리자
          <select
            name="actorId"
            defaultValue={filters.actorId ?? ''}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          >
            <option value="">전체</option>
            {actors.map((actor) => (
              <option key={actor.actor_id} value={actor.actor_id}>
                {actor.actor_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          대상/내용 검색
          <input
            name="targetKeyword"
            defaultValue={filters.targetKeyword ?? ''}
            placeholder="회원명, 대상 ID, 상세 내용"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          시작일
          <input
            type="date"
            name="fromDate"
            defaultValue={filters.fromDate ?? ''}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          종료일
          <input
            type="date"
            name="toDate"
            defaultValue={filters.toDate ?? ''}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-slate-500">
          표시 개수
          <select
            name="limit"
            defaultValue={filters.limit ?? '100'}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
          >
            <option value="50">50건</option>
            <option value="100">100건</option>
            <option value="200">200건</option>
            <option value="300">300건</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800"
          >
            조회
          </button>
          <a
            href={exportHref}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            CSV
          </a>
        </div>
      </form>

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
                  <p className="font-bold text-slate-800">{log.target_name ?? TARGET_TYPE_LABELS[log.target_type] ?? log.target_type}</p>
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
