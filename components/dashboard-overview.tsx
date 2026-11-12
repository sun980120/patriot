'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Download, Search } from 'lucide-react';
import { formatDuesPeriods, formatRecordedDate, groupExemptions, overviewDuesRows, recentTransactions, upcomingOccurrences, type DuesPeriod } from '@/lib/dashboard-overview';
import { formatOccurrenceTime, parseDateInput } from '@/lib/calendar-occurrences';
import { formatCurrency } from '@/lib/utils';
import type { FinanceSummary } from '@/lib/finance-summary';
import type { ClubEvent, DashboardBundle, FiscalYear, Profile } from '@/lib/types';

type Props = {
  data: DashboardBundle; year: FiscalYear; members: Profile[]; admin: boolean; today: Date | null;
  summary: FinanceSummary; events: ClubEvent[] | null; source: 'spring' | 'mock'; pendingCount: number;
  onYearChange: (id: string) => void; onRefresh: () => void;
};
type DuesRow = ReturnType<typeof overviewDuesRows>[number];
const linkClass = 'inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900';

function managementLink(memberId: string, period: DuesPeriod, status?: 'due' | 'exempt') {
  return { pathname: '/dashboard', query: { view: 'dues', year: period.fiscalYearId, month: String(period.month), member: memberId, ...(status ? { status } : {}) } };
}

export function DashboardOverview(props: Props) {
  const { data, year, members, admin, today, summary } = props;
  const [query, setQuery] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const rows = useMemo(() => overviewDuesRows(members, data.fiscalYears, data.payments, today), [members, data.fiscalYears, data.payments, today]);
  const debtors = rows.filter((row) => row.unpaid.length > 0);
  const unpaidAmount = debtors.reduce((sum, row) => sum + row.dueAmount, 0);
  const unpaidMonths = debtors.reduce((sum, row) => sum + row.unpaid.length, 0);
  const visibleDebtors = debtors.filter((row) => row.member.full_name.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')));
  const annualPeriods = rows.flatMap((row) => row.cells.filter((cell) => cell.fiscalYearId === year.id));
  const annualPaid = annualPeriods.filter((cell) => cell.status === 'paid').length;
  const annualDue = annualPeriods.filter((cell) => cell.status === 'due').length;
  const annualExempt = annualPeriods.filter((cell) => cell.status === 'exempt').length;
  const collectionRate = annualPaid + annualDue ? annualPaid / (annualPaid + annualDue) * 100 : null;
  const transactions = useMemo(() => recentTransactions(data, year.id, admin), [data, year.id, admin]);
  const agenda = useMemo(() => props.events && today ? upcomingOccurrences(props.events, today) : [], [props.events, today]);
  const visibleIds = new Set(members.map((member) => member.id));
  const additionalUnpaid = data.chargeGroups.flatMap((group) => group.participant_charges
    .filter((charge) => charge.status === 'UNPAID' && (admin ? visibleIds.has(charge.member_id) : charge.member_id === data.profile?.id))
    .map((charge) => ({ charge, group })));
  const firstDue = debtors.flatMap((row) => row.unpaid).sort((a, b) => a.year - b.year || a.month - b.month)[0];
  const arrearsHref = firstDue ? { pathname: '/dashboard', query: { view: 'dues', year: firstDue.fiscalYearId, month: String(firstDue.month), status: 'arrears' } } : '/dashboard?view=dues';
  const ownRow = rows.find((row) => row.member.id === data.profile?.id);
  const ownPeriod = ownRow?.unpaid[0] ?? ownRow?.cells[0];
  const ownHref = ownRow && ownPeriod ? managementLink(ownRow.member.id, ownPeriod) : '/dashboard?view=dues';

  const upcoming = <section aria-label="다가오는 일정">
    <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">다가오는 일정</h2><Link href="/calendar" aria-label="캘린더 보기" title="캘린더 보기" className="flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-50"><ArrowUpRight className="h-4 w-4" /></Link></div>
    {props.events === null ? <div className="py-4 text-xs text-slate-500"><p>일정을 불러오지 못했습니다.</p><button type="button" onClick={props.onRefresh} className={`${linkClass} mt-1`}>다시 불러오기</button></div> : !today ? <p className="py-4 text-sm text-slate-400">일정 확인 중…</p> : agenda.length ? <div className="space-y-5 py-3">{agenda.map((occurrence) => {
      const date = parseDateInput(occurrence.date);
      const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
      return <Link key={`${occurrence.event.id}-${occurrence.startDate}`} href={{ pathname: '/calendar', query: { date: occurrence.date } }} className="flex gap-3 rounded-sm hover:bg-slate-50">
        <span className={`flex w-9 shrink-0 flex-col items-center border-l-2 ${occurrence.event.type === 'TOURNAMENT' ? 'border-blue-500' : 'border-emerald-600'}`}><span className={`text-[11px] ${weekday === '일' ? 'text-rose-600' : weekday === '토' ? 'text-blue-600' : 'text-slate-500'}`}>{weekday}</span><strong className="text-xl font-semibold tabular-nums">{date.getDate()}</strong></span>
        <span className="min-w-0"><strong className="block break-words text-sm font-semibold">{occurrence.event.title}</strong><span className="mt-1 block text-xs text-slate-500">{occurrence.startDate !== occurrence.endDate ? `${occurrence.startDate.slice(5).replace('-', '.')}–${occurrence.endDate.slice(5).replace('-', '.')}` : formatOccurrenceTime(occurrence)}</span><span className="mt-1 block break-words text-xs text-slate-500">{occurrence.event.location ?? '장소 미정'}</span></span>
      </Link>;
    })}</div> : <p className="py-4 text-sm text-slate-500">예정된 일정이 없습니다.</p>}
  </section>;

  return <div className="min-w-0">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">대시보드</h1><p className="mt-1 text-xs text-slate-500">{admin ? '클럽 운영 현황' : `${data.profile?.full_name ?? '회원'} 님 · ${data.profile?.member_grade ?? ''}`}</p></div>
      {admin ? <Link href={{ pathname: '/admin/finance', query: { year: year.id } }} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />리포트</Link> : null}
    </header>
    {!admin ? <section aria-label="나의 회비 요약" className="mb-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-5">
      <div><h2 className="text-base font-semibold">나의 미납 회비</h2><p className="mt-2 text-3xl font-semibold tabular-nums">{today ? formatCurrency(ownRow?.dueAmount ?? 0) : '—'}</p><p className="mt-2 break-words text-xs text-slate-500">{!today ? '납부 현황 확인 중…' : ownRow?.unpaid.length ? formatDuesPeriods(ownRow.unpaid) : '미납된 회비가 없습니다.'}</p></div>
      <Link href={ownHref} className={linkClass}>회비 내역 확인 <ArrowUpRight className="h-4 w-4" /></Link>
    </section> : null}

    <section aria-label="전체 기간 재정 요약" className="mb-6 border-y border-slate-200 py-5">
      <p className="mb-4 text-xs font-medium text-slate-500">전체 기간 · 모든 회계연도</p>
      <div className={`grid gap-x-4 gap-y-5 ${admin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <Metric label="누적 잔액" value={summary.cumulative.balance} />
        <Metric label="누적 세입" value={summary.cumulative.totalIncome} />
        <Metric label="누적 지출" value={summary.cumulative.totalExpense} />
        {admin ? <Metric label="전체 미납액" value={today ? unpaidAmount : null} alert note={`${debtors.length}명 · ${unpaidMonths}개월분`} /> : null}
      </div>
      <p className="mt-4 break-words text-xs tabular-nums text-slate-500">누적 세입 {formatCurrency(summary.cumulative.totalIncome)} − 누적 지출 {formatCurrency(summary.cumulative.totalExpense)} = 누적 잔액 {formatCurrency(summary.cumulative.balance)}</p>
      <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer py-1">세입 집계 내역</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3"><MiniMetric label="월회비 납부" value={summary.cumulative.membershipIncome} /><MiniMetric label="추가 비용 납부" value={summary.cumulative.additionalIncome} /><MiniMetric label="기타 세입" value={summary.cumulative.otherIncome} /></div>
      </details>
    </section>

    <section aria-label="연도별 운영 요약" className="mb-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">{year.year}년 요약</h2><select value={year.id} onChange={(event) => props.onYearChange(event.target.value)} aria-label="연도별 요약 선택" className="min-h-9 rounded-md border border-slate-200 bg-white px-2 text-xs">{data.fiscalYears.map((value) => <option key={value.id} value={value.id}>{value.year}년</option>)}</select></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><MiniMetric label="연도 세입" value={summary.annual.totalIncome} /><MiniMetric label="연도 지출" value={summary.annual.totalExpense} /><MiniMetric label="연도 증감 · 세입 − 지출" value={summary.annual.balance} /></div>
      <div className="mt-4 border-b border-slate-200 pb-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>현재 월까지 회비 납부율 · 대상 월 기준</span><strong className="font-semibold tabular-nums text-slate-800">{today && collectionRate !== null ? `${collectionRate.toFixed(1)}%` : '—'}</strong></div>
        <div role="progressbar" aria-label={`${year.year}년 회비 납부율`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={collectionRate ?? 0} className="h-1.5 overflow-hidden bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${collectionRate ?? 0}%` }} /></div>
        <p className="mt-2 text-xs text-slate-500">납부 {annualPaid}개월분 · 미납 {annualDue}개월분 · 면제 {annualExempt}개월분</p>
      </div>
    </section>

    <div className="grid min-w-0 gap-7 md:grid-cols-[minmax(0,1fr)_200px] min-[1200px]:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0 space-y-7">
        <section aria-label="전체 미납 현황" aria-busy={!today}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{admin ? '전체 미납 현황' : '나의 미납 내역'}</h2><span className="text-xs text-slate-500">{debtors.length}명 · {unpaidMonths}개월분</span></div>
          <p className="mb-3 text-xs text-slate-500">모든 회계연도 · 현재 월까지 · 면제 및 가입 전 기간 제외</p>
          {admin ? <label className="mb-3 flex min-h-10 max-w-56 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400"><Search className="h-4 w-4 shrink-0" /><input aria-label="미납 회원 검색" placeholder="회원 이름" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent py-2 text-base text-slate-900 outline-none sm:text-xs" /></label> : null}
          <ul className="divide-y divide-slate-200">{visibleDebtors.map((row) => <li key={row.member.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="break-words text-sm font-semibold">{row.member.full_name}</strong><span className="text-[11px] text-slate-500">{row.member.member_grade} · {row.unpaid.length}개월분</span></div><p className="mt-1 break-words text-xs leading-5 text-slate-600">{formatDuesPeriods(row.unpaid)}</p></div>
              <div className="flex shrink-0 items-center gap-1"><strong className="text-sm font-semibold tabular-nums text-rose-700">{formatCurrency(row.dueAmount)}</strong><Link href={managementLink(row.member.id, row.unpaid[0])} aria-label={`${row.member.full_name} 회비 관리에서 확인`} title={`${row.member.full_name} 회비 관리에서 확인`} className="flex h-10 w-8 items-center justify-center rounded text-emerald-700 hover:bg-emerald-50"><ArrowUpRight className="h-4 w-4" /></Link></div>
            </div>
          </li>)}</ul>
          {!today ? <p className="py-5 text-sm text-slate-400">납부 현황 확인 중…</p> : !visibleDebtors.length ? <p className="py-5 text-sm text-slate-500">{query ? '검색된 미납 회원이 없습니다.' : '미납된 회비가 없습니다.'}</p> : null}
          {query ? <p className="mt-2 text-xs text-slate-500">검색 결과 {visibleDebtors.length}명 / 전체 미납 {debtors.length}명</p> : null}
        </section>
        <ExemptionSummary rows={rows} admin={admin} today={today} />
      </div>
      <aside className="min-w-0 space-y-6">
        {admin ? <section aria-label="처리할 일"><div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">처리할 일</h2><span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700">{debtors.length + props.pendingCount + additionalUnpaid.length}건</span></div><TaskLink title={`회비 미납 ${debtors.length}명`} description={`${unpaidMonths}개월분 · ${formatCurrency(unpaidAmount)}`} href={arrearsHref} /><TaskLink title={`가입 승인 ${props.pendingCount}명`} description="새로운 가입 신청" href="/admin/members" /><TaskLink title={`추가 비용 미납 ${additionalUnpaid.length}건`} description="대회비 · 회식비 · 기타" href={{ pathname: '/admin/finance', query: { year: additionalUnpaid[0]?.group.fiscal_year_id ?? year.id } }} /></section> : <section aria-label="추가 비용 요약"><h2 className="text-base font-semibold">추가 비용</h2><p className="mt-3 text-xl font-semibold tabular-nums">{formatCurrency(additionalUnpaid.reduce((sum, { charge }) => sum + charge.amount, 0))}</p><p className="mt-1 text-xs text-slate-500">미납 {additionalUnpaid.length}건</p><Link href="/dashboard?view=dues#additional-charges" className={`${linkClass} mt-2`}>납부 내역 확인 <ArrowUpRight className="h-3 w-3" /></Link></section>}
        <div className="border-t border-slate-200 pt-5">{upcoming}</div>
      </aside>
    </div>

    <section aria-label="최근 세입 지출" className="mt-7 border-t border-slate-200 pt-5">
      <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-base font-semibold">최근 세입 · 지출 <span className="text-xs font-normal text-slate-500">{year.year}년</span></h2>{admin ? <Link href={{ pathname: '/admin/finance', query: { year: year.id } }} className={linkClass}>전체 내역 <ArrowUpRight className="h-3 w-3" /></Link> : <button type="button" onClick={() => setShowAllTransactions((value) => !value)} aria-expanded={showAllTransactions} className={linkClass}>{showAllTransactions ? '접기' : '전체 내역'}</button>}</div>
      {transactions.length ? <ul className="divide-y divide-slate-200">{transactions.slice(0, showAllTransactions ? 30 : 3).map((item) => <li key={item.id} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm sm:grid-cols-[48px_minmax(0,1fr)_auto]"><time className="text-xs tabular-nums text-slate-500" title={item.recordedAt ?? '기록일 정보 없음'}>{formatRecordedDate(item.recordedAt)}</time><span className="min-w-0"><span className="block break-words text-sm">{item.title}</span><span className="mt-1 block break-words text-xs text-slate-500">{item.description}</span></span><strong className={`text-right text-xs font-semibold tabular-nums sm:text-sm ${item.direction === 'income' ? 'text-emerald-700' : 'text-slate-800'}`}>{item.direction === 'income' ? '+' : '−'}{item.amount.toLocaleString('ko-KR')}원</strong></li>)}</ul> : <p className="py-5 text-sm text-slate-500">해당 연도의 세입·지출 내역이 없습니다.</p>}
    </section>
    {props.source === 'mock' ? <p className="mt-5 text-[11px] text-slate-400">샘플 데이터 · 실제 납부 및 알림 발송 없음</p> : null}
  </div>;
}

function ExemptionSummary({ rows, admin, today }: { rows: DuesRow[]; admin: boolean; today: Date | null }) {
  const exempt = rows.filter((row) => row.exemptions.length > 0);
  return <section aria-label="면제 현황" className="border-t border-slate-200 pt-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">{admin ? '면제 현황' : '나의 면제 내역'}</h2><span className="text-xs text-slate-500">{exempt.length}명</span></div>
    <p className="mt-2 text-xs text-slate-500">모든 회계연도 · 현재 월까지 적용된 면제</p>
    <ul className="divide-y divide-slate-100">{exempt.map((row) => <li key={row.member.id} className="py-4"><strong className="text-sm font-semibold">{row.member.full_name}</strong><div className="mt-2 space-y-3">{groupExemptions(row.exemptions).map(({ detail, periods }) => <div key={`${detail.kind}:${detail.reason}`}><p className="break-words text-xs text-slate-700"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium">{detail.label}</span>{detail.reason}</p><p className="mt-1 break-words text-xs leading-5 text-slate-500">{formatDuesPeriods(periods)}</p></div>)}</div>{admin && row.exemptions[0] ? <Link href={managementLink(row.member.id, row.exemptions[0], 'exempt')} className={`${linkClass} mt-1`}>면제 상세 확인 <ArrowUpRight className="h-3 w-3" /></Link> : null}</li>)}</ul>
    {!today ? <p className="py-5 text-sm text-slate-400">면제 내역 확인 중…</p> : !exempt.length ? <p className="py-5 text-sm text-slate-500">적용된 면제 내역이 없습니다.</p> : null}
  </section>;
}

function Metric({ label, value, note, alert = false }: { label: string; value: number | null; note?: string; alert?: boolean }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 break-words text-xl font-semibold tabular-nums ${alert && value ? 'text-rose-700' : 'text-slate-900'}`}>{value === null ? '—' : formatCurrency(value)}</p>{note ? <p className="mt-1 text-[11px] text-slate-500">{note}</p> : null}</div>;
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3 sm:block"><p className="text-xs text-slate-500">{label}</p><p className="text-base font-semibold tabular-nums sm:mt-1">{formatCurrency(value)}</p></div>;
}
function TaskLink({ title, description, href }: { title: string; description: string; href: React.ComponentProps<typeof Link>['href'] }) {
  return <Link href={href} className="flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 py-3 hover:bg-slate-50"><span className="min-w-0"><strong className="block break-words text-sm font-semibold">{title}</strong><span className="mt-1 block text-xs text-slate-500">{description}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" /></Link>;
}
