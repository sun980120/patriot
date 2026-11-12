'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, CheckCircle2, ChevronDown, Download, ReceiptText, Search, ShieldCheck, Wallet } from 'lucide-react';
import { dashboardSnapshot, formatDuesPeriods, formatRecordedDate, groupExemptions, recentTransactions, upcomingOccurrences, type DuesPeriod } from '@/lib/dashboard-overview';
import { formatOccurrenceTime, parseDateInput } from '@/lib/calendar-occurrences';
import { formatCurrency } from '@/lib/utils';
import { ClubFinanceOverview } from '@/components/club-finance-overview';
import type { FinanceSummary } from '@/lib/finance-summary';
import type { ClubEvent, DashboardBundle, FiscalYear, Profile } from '@/lib/types';

type Props = {
  data: DashboardBundle; year: FiscalYear; members: Profile[]; admin: boolean; today: Date | null;
  summary: FinanceSummary; events: ClubEvent[] | null; source: 'spring' | 'mock'; pendingCount: number;
  onYearChange: (id: string) => void; onRefresh: () => void;
};
type DuesRow = ReturnType<typeof dashboardSnapshot>['rows'][number];
type Href = React.ComponentProps<typeof Link>['href'];
const linkClass = 'inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';

function managementLink(memberId: string, period: DuesPeriod, status?: 'due' | 'exempt'): Href {
  return { pathname: '/dashboard', query: { view: 'dues', year: period.fiscalYearId, month: String(period.month), member: memberId, ...(status ? { status } : {}) } };
}

export function DashboardOverview(props: Props) {
  const { data, year, members, admin, today, summary } = props;
  const [query, setQuery] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const snapshot = useMemo(() => dashboardSnapshot(data, year, members, admin, today), [data, year, members, admin, today]);
  const { rows, debtors, firstDue, lastDue, unpaidAmount, unpaidMonths, monthly, additional, additionalAmount, readyGroups, ownRow } = snapshot;
  const transactions = useMemo(() => recentTransactions(data, year.id, admin, !admin), [data, year.id, admin]);
  const agenda = useMemo(() => props.events && today ? upcomingOccurrences(props.events, today) : [], [props.events, today]);
  const arrearsHref: Href = firstDue ? { pathname: '/dashboard', query: { view: 'dues', year: firstDue.fiscalYearId, month: String(firstDue.month), status: 'arrears' } } : '/dashboard?view=dues';
  const ownPeriod = ownRow?.unpaid[0] ?? ownRow?.cells[0];
  const ownHref: Href = ownPeriod && data.profile ? managementLink(data.profile.id, ownPeriod) : '/dashboard?view=dues';
  const financeHref: Href = { pathname: '/admin/finance', query: { year: year.id } };
  const taskCount = debtors.length + props.pendingCount + additional.length + readyGroups.length;
  const exemptRows = rows.filter(row => row.exemptions.length > 0);
  const visibleDebtors = debtors.filter(row => row.member.full_name.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')));
  const periodLabel = firstDue && lastDue ? firstDue.year === lastDue.year
    ? `${firstDue.year}년 ${firstDue.month}월–${lastDue.month}월`
    : `${firstDue.year}년 ${firstDue.month}월–${lastDue.year}년 ${lastDue.month}월` : '전체 기간';

  const upcoming = <section aria-label="다가오는 일정">
    <SectionHeading title="다가오는 일정"><TextLink href="/calendar">캘린더</TextLink></SectionHeading>
    {props.events === null ? <div className="py-4 text-sm text-slate-500"><p>일정을 불러오지 못했습니다.</p><button type="button" onClick={props.onRefresh} className={`${linkClass} mt-1`}>다시 불러오기</button></div> : !today ? <Empty>일정 확인 중...</Empty> : agenda.length ? <div className="space-y-5 py-2">{agenda.map(occurrence => {
      const date = parseDateInput(occurrence.date);
      const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
      return <Link key={`${occurrence.event.id}-${occurrence.startDate}`} href={{ pathname: '/calendar', query: { date: occurrence.date } }} className="flex min-h-16 gap-3 rounded-sm py-1 hover:bg-slate-50">
        <span className={`flex w-10 shrink-0 flex-col items-center border-l-2 ${occurrence.event.type === 'TOURNAMENT' ? 'border-blue-500' : 'border-emerald-600'}`}><span className={`text-xs ${weekday === '일' ? 'text-rose-600' : weekday === '토' ? 'text-blue-600' : 'text-slate-500'}`}>{weekday}</span><strong className="text-xl font-semibold tabular-nums">{date.getDate()}</strong></span>
        <span className="min-w-0"><strong className="block break-words text-sm font-semibold">{occurrence.event.title}</strong><span className="mt-1 block text-xs text-slate-500">{occurrence.startDate !== occurrence.endDate ? `${occurrence.startDate.slice(5).replace('-', '.')}–${occurrence.endDate.slice(5).replace('-', '.')}` : formatOccurrenceTime(occurrence)}</span><span className="mt-1 block break-words text-xs text-slate-500">{occurrence.event.location ?? '장소 미정'}</span></span>
      </Link>;
    })}</div> : <Empty>예정된 일정이 없습니다.</Empty>}
  </section>;
  const reconciliation = <div className="space-y-3 text-sm"><FinanceLine label={`${year.year}년 세입`} value={summary.annual.totalIncome} /><FinanceLine label={`${year.year}년 지출`} value={summary.annual.totalExpense} /><FinanceLine label="연도 증감" value={summary.annual.balance} emphasized /></div>;

  return <div className="min-w-0 space-y-6" aria-label={admin ? '관리자 대시보드' : '회원 대시보드'}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">{admin ? '대시보드' : '나의 대시보드'}</h1><p className="mt-1 text-xs text-slate-500">{admin ? '클럽 운영 현황' : `${data.profile?.full_name ?? '회원'} 님 · ${data.profile?.member_grade ?? ''}`}</p></div>
      <div className="flex items-center gap-2"><select value={year.id} onChange={event => props.onYearChange(event.target.value)} aria-label="대시보드 조회 연도" className="min-h-10 rounded-md border border-slate-200 bg-white px-2 text-sm">{data.fiscalYears.map(value => <option key={value.id} value={value.id}>{value.year}년</option>)}</select>{admin ? <Link href={financeHref} className={buttonClass}><Download className="h-4 w-4" />리포트</Link> : <Link href={ownHref} className={buttonClass}>나의 회비<ArrowUpRight className="h-4 w-4" /></Link>}</div>
    </header>
    {admin ? <>
      <section aria-label="주요 운영 지표" className="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-slate-200 py-5 lg:grid-cols-4">
        <Metric label="누적 잔액" value={summary.cumulative.balance} note="전체 기간" /><Metric label={`${year.year}년 세입`} value={summary.annual.totalIncome} note="실제 수납 기준" /><Metric label={`${year.year}년 지출`} value={summary.annual.totalExpense} note="실제 사용 기준" /><Metric label="전체 미납액" value={today ? unpaidAmount : null} alert note={today ? `${debtors.length}명 · ${unpaidMonths}개월분` : '납부 현황 확인 중'} />
      </section>
      <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section aria-label="처리할 일"><SectionHeading title="확인이 필요한 일"><span className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{today ? `${taskCount}건` : '확인 중'}</span></SectionHeading>
            <TaskLink title={`회비 미납 ${today ? debtors.length : '—'}명`} description={today ? `${periodLabel} · ${unpaidMonths}개월분` : '납부 현황 확인 중'} amount={today ? unpaidAmount : null} href={arrearsHref} />
            <TaskLink title={`가입 승인 대기 ${props.pendingCount}명`} description="새 가입 신청" href="/admin/members" />
            {additional.length > 0 ? <TaskLink title={`추가 비용 미납 ${additional.length}건`} description="대회비 · 회식비 · 기타" amount={additionalAmount} href={{ pathname: '/admin/finance', query: { year: additional[0]?.group.fiscal_year_id, tab: 'charges' } }} /> : null}
            <TaskLink title={`추가 비용 정산 ${readyGroups.length}건`} description={readyGroups.length ? '전원 납부 완료 · 정산 대기' : '정산 가능한 항목 없음'} href={{ pathname: '/admin/finance', query: { year: readyGroups[0]?.fiscal_year_id ?? year.id, tab: 'charges' } }} />
          </section>
          <details className="group border-b border-slate-200 pb-4" aria-label="전체 미납 상세">
            <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm font-semibold"><span>전체 미납 현황 <span className="ml-1 text-xs font-normal text-slate-500">{today ? `${debtors.length}명 · ${unpaidMonths}개월분` : '확인 중'}</span></span><ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" /></summary>
            <label className="mt-3 flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400"><Search className="h-4 w-4 shrink-0" /><input aria-label="미납 회원 검색" placeholder="회원 이름" type="search" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent py-2 text-base text-slate-900 sm:text-sm" /></label>
            <ul className="mt-2 divide-y divide-slate-100">{visibleDebtors.map(row => <li key={row.member.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><strong className="break-words text-sm font-semibold">{row.member.full_name}</strong><span className="ml-2 text-xs text-slate-500">{row.member.member_grade}</span><p className="mt-1 break-words text-xs leading-5 text-slate-500">{formatDuesPeriods(row.unpaid)}</p></div><Link href={managementLink(row.member.id, row.unpaid[0])} aria-label={`${row.member.full_name} 회비 관리에서 확인`} className="flex min-h-10 shrink-0 items-center gap-2 text-sm font-semibold tabular-nums text-rose-700">{formatCurrency(row.dueAmount)}<ArrowUpRight className="h-4 w-4" /></Link></li>)}</ul>
            {!today || !visibleDebtors.length ? <Empty>{!today ? '납부 현황 확인 중...' : query ? '검색된 미납 회원이 없습니다.' : '미납된 회비가 없습니다.'}</Empty> : null}
          </details>
        </div>
        <div className="min-w-0 space-y-6">
          <section aria-label="월별 납부 현황"><SectionHeading title={`${year.year}년 ${snapshot.month}월 ${monthly.future ? '선납' : '납부'} 현황`}><Link href={{ pathname: '/dashboard', query: { view: 'dues', year: year.id, month: snapshot.month } }} className={linkClass}>회비 관리<ArrowUpRight className="h-3 w-3" /></Link></SectionHeading>
            <div className="flex flex-wrap items-end justify-between gap-2"><p className="text-3xl font-semibold tabular-nums">{today && monthly.rate !== null ? `${monthly.rate.toFixed(1)}%` : '—'}</p><span className="text-xs text-slate-500">{today ? `대상 ${monthly.target}명 중 ${monthly.paid}명 완료` : '확인 중'}</span></div>
            <div role="progressbar" aria-label={`${year.year}년 ${snapshot.month}월 납부율`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={today ? monthly.rate ?? 0 : 0} className="my-3 h-2 overflow-hidden rounded-sm bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${today ? monthly.rate ?? 0 : 0}%` }} /></div>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>완료 {today ? monthly.paid : '—'}명</span><span className={monthly.due ? 'text-rose-700' : ''}>{monthly.future ? `예정 ${monthly.future}명` : `미납 ${today ? monthly.due : '—'}명 · ${today ? formatCurrency(monthly.dueAmount) : '—'}`}</span></div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />{snapshot.month}월 면제 {today ? monthly.exemptions.length : '—'}명</p>
          </section>{upcoming}
        </div>
      </div>
    </> : <>
      {!today ? <Empty>납부 현황 확인 중...</Empty> : null}
      {snapshot.hasOutstanding ? <section aria-label="확인할 납부 내역" className="space-y-4">
        <div className="border-l-[3px] border-rose-600 py-1 pl-4"><h2 className="text-sm font-normal text-slate-500">확인할 납부 내역</h2><p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(unpaidAmount + additionalAmount)}</p><p className="mt-2 text-xs text-slate-500">미납 회비 {formatCurrency(unpaidAmount)} + 추가 비용 {formatCurrency(additionalAmount)}</p></div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {ownRow?.unpaid.length ? <PaymentSummary icon={<Wallet className="h-5 w-5" />} title={`미납 회비 · ${ownRow.unpaid.length}개월`} description={formatDuesPeriods(ownRow.unpaid)} value={unpaidAmount} href={ownHref} alert /> : null}
          {additional.length ? <PaymentSummary icon={<ReceiptText className="h-5 w-5" />} title={`추가 비용 · ${additional.length}건`} description={additional.map(item => item.group.title).join(' · ')} value={additionalAmount} href="/dashboard?view=dues#additional-charges" /> : null}
        </div>
      </section> : null}
      <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ClubFinanceOverview key={year.id} bundle={data} year={year} summary={summary} />
        <div className="min-w-0 space-y-6">{upcoming}<section aria-label="올해 나의 회비"><SectionHeading title={`${year.year}년 나의 회비`} /><FinanceLine label={`납부 완료 · ${snapshot.ownPaidCount}개월`} value={snapshot.ownPaidAmount} /><div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-700" />{data.profile?.member_grade} · 실제 납부 기록 기준</div></section></div>
      </div>
    </>}
    {admin ? <div className="border-t border-slate-200 pt-5"><ClubFinanceOverview key={year.id} bundle={data} year={year} summary={summary} showSummary={false} /></div> : null}
    <div className="grid min-w-0 gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
      {admin ? <details className="group min-w-0"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">재정 집계 내역<ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" /></summary><div className="space-y-3 py-3"><FinanceLine label="누적 세입 · 전체 기간" value={summary.cumulative.totalIncome} /><FinanceLine label="누적 지출 · 전체 기간" value={summary.cumulative.totalExpense} /><FinanceLine label="누적 잔액 · 세입 − 지출" value={summary.cumulative.balance} emphasized /><div className="border-t border-slate-100 pt-3">{reconciliation}</div></div></details> : null}
      <details className="group min-w-0" aria-label={admin ? '면제 현황' : '나의 면제 내역'}><summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm font-semibold"><span>{admin ? `면제 현황 · ${exemptRows.length}명` : '나의 면제 내역'}<span className="ml-2 text-xs font-normal text-slate-500">전체 기간</span></span><ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" /></summary><ExemptionDetails rows={exemptRows} admin={admin} today={today} /></details>
    </div>
    <section aria-label={admin ? '최근 세입 지출' : '나의 최근 납부'} className="border-t border-slate-200 pt-5"><SectionHeading title={admin ? '최근 세입·지출' : '나의 최근 납부'}><div className="flex items-center gap-3"><span className="text-xs text-slate-500">{year.year}년</span>{admin ? <TextLink href={financeHref}>재정 관리</TextLink> : <button type="button" onClick={() => setShowAllTransactions(value => !value)} aria-expanded={showAllTransactions} className={linkClass}>{showAllTransactions ? '접기' : '전체 내역'}</button>}</div></SectionHeading>
      {transactions.length ? <ul className="divide-y divide-slate-100">{transactions.slice(0, showAllTransactions ? 30 : 3).map(item => <li key={item.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm sm:grid-cols-[48px_minmax(0,1fr)_auto]"><time className="text-xs tabular-nums text-slate-500" title={item.recordedAt ?? '기록일 정보 없음'}>{formatRecordedDate(item.recordedAt)}</time><span className="min-w-0"><span className="block break-words text-sm font-medium">{item.title}</span><span className="mt-1 block break-words text-xs text-slate-500">{item.description}</span></span><strong className={`text-right text-xs font-semibold tabular-nums sm:text-sm ${item.direction === 'income' ? 'text-emerald-700' : 'text-slate-800'}`}>{item.direction === 'income' ? '+' : '−'}{item.amount.toLocaleString('ko-KR')}원</strong></li>)}</ul> : <Empty>{admin ? '해당 연도의 세입·지출 내역이 없습니다.' : '해당 연도의 납부 기록이 없습니다.'}</Empty>}
    </section>{props.source === 'mock' ? <p className="text-xs text-slate-400">샘플 데이터 · 실제 납부 및 알림 발송 없음</p> : null}
  </div>;
}

function SectionHeading({ title, children }: { title: string; children?: ReactNode }) { return <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{title}</h2>{children}</div>; }
function TextLink({ href, children }: { href: Href; children: ReactNode }) { return <Link href={href} className={linkClass}>{children}<ArrowUpRight className="h-3 w-3" /></Link>; }
function Empty({ children }: { children: ReactNode }) { return <p className="py-4 text-sm text-slate-500">{children}</p>; }
function Metric({ label, value, note, alert = false }: { label: string; value: number | null; note: string; alert?: boolean }) { return <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 break-words text-xl font-semibold tabular-nums xl:text-2xl ${(alert && value) || (value !== null && value < 0) ? 'text-rose-700' : 'text-slate-900'}`}>{value === null ? '—' : formatCurrency(value)}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>; }
function FinanceLine({ label, value, emphasized = false }: { label: string; value: number; emphasized?: boolean }) { return <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-xs text-slate-500">{label}</span><strong className={`font-semibold tabular-nums ${emphasized ? value < 0 ? 'text-rose-700' : 'text-emerald-700' : 'text-slate-900'}`}>{formatCurrency(value)}</strong></div>; }
function TaskLink({ title, description, amount, href }: { title: string; description: string; amount?: number | null; href: Href }) { return <Link href={href} className="flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-100 py-3 hover:bg-slate-50"><span className="min-w-0"><strong className="block break-words text-sm font-semibold">{title}</strong><span className="mt-1 block break-words text-xs text-slate-500">{description}</span></span><span className="flex shrink-0 items-center gap-2">{amount !== undefined && amount !== null ? <strong className="text-sm font-semibold tabular-nums">{formatCurrency(amount)}</strong> : null}<ArrowUpRight className="h-4 w-4 text-slate-400" /></span></Link>; }
function PaymentSummary({ icon, title, description, value, href, alert = false }: { icon: ReactNode; title: string; description: string; value: number | null; href: Href; alert?: boolean }) { return <article className="flex min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${alert ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>{icon}</span><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 break-words text-xs leading-5 text-slate-500">{description}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><strong className={`text-xl font-semibold tabular-nums ${alert ? 'text-rose-700' : 'text-slate-900'}`}>{value === null ? '—' : formatCurrency(value)}</strong><TextLink href={href}>내역 확인</TextLink></div></div></article>; }
function ExemptionDetails({ rows, admin, today }: { rows: DuesRow[]; admin: boolean; today: Date | null }) { return <div>{!today ? <Empty>면제 내역 확인 중...</Empty> : !rows.length ? <Empty>적용된 면제 내역이 없습니다.</Empty> : <ul className="divide-y divide-slate-100">{rows.map(row => <li key={row.member.id} className="py-4"><strong className="text-sm font-semibold">{row.member.full_name}</strong><div className="mt-2 space-y-3">{groupExemptions(row.exemptions).map(({ detail, periods }) => <div key={`${detail.kind}:${detail.reason}`}><p className="break-words text-xs text-slate-700"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium">{detail.label}</span>{detail.reason}</p><p className="mt-1 break-words text-xs leading-5 text-slate-500">{formatDuesPeriods(periods)}</p></div>)}</div>{admin && row.exemptions[0] ? <TextLink href={managementLink(row.member.id, row.exemptions[0], 'exempt')}>회비 관리에서 확인</TextLink> : null}</li>)}</ul>}</div>; }
