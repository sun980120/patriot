'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Bell, Check, ChevronRight, Download, Search } from 'lucide-react';
import { dashboardMonth, formatRecordedDate, overviewDuesRows, recentTransactions, upcomingOccurrences } from '@/lib/dashboard-overview';
import { DUES_STATUS_LABELS, duesAmount } from '@/lib/dues';
import { formatOccurrenceTime, parseDateInput } from '@/lib/calendar-occurrences';
import { formatCurrency } from '@/lib/utils';
import type { ChargeGroup, ClubEvent, DashboardBundle, FiscalYear, ParticipantCharge, Profile } from '@/lib/types';

type Assignment = { charge: ParticipantCharge; group: ChargeGroup };
type Props = {
  data: DashboardBundle;
  year: FiscalYear;
  members: Profile[];
  admin: boolean;
  today: Date | null;
  summary: { totalIncome: number; totalExpense: number; cumulativeBalance: number };
  events: ClubEvent[] | null;
  source: 'spring' | 'mock';
  pendingCount: number;
  additionalUnpaidCount: number;
  assignments: Assignment[];
  memberNotice: { amount: number; months: { year: number; month: number }[] } | null;
  onYearChange: (id: string) => void;
  onOpenPayment: (member: Profile, month: number) => void;
  onOpenGuide: (name: string, amount: number, label: string) => void;
  onOpenReminders: () => void;
  onRefresh: () => void;
};

const linkClass = 'inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900';
const smallButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';

export function DashboardOverview(props: Props) {
  const { data, year, members, admin, today, summary } = props;
  const [filter, setFilter] = useState<'all' | 'due'>('due');
  const [query, setQuery] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [chargeTab, setChargeTab] = useState<'unpaid' | 'paid'>('unpaid');
  const month = dashboardMonth(year, today);
  const duesRows = useMemo(() => overviewDuesRows(members, year, data.fiscalYears, data.payments, today), [members, year, data.fiscalYears, data.payments, today]);
  const dueRows = duesRows.filter((row) => row.status === 'due');
  const dueAmount = dueRows.reduce((sum, row) => sum + row.dueAmount, 0);
  const paidCount = duesRows.filter((row) => row.status === 'paid').length;
  const targetCount = duesRows.filter((row) => row.status === 'due' || row.status === 'paid' || row.status === 'future').length;
  const visibleRows = duesRows.filter((row) => (filter === 'all' || row.status === 'due') && row.member.full_name.toLocaleLowerCase('ko-KR').includes(query.trim().toLocaleLowerCase('ko-KR')));
  const tableRows = visibleRows.slice(0, 6);
  const transactions = useMemo(() => recentTransactions(data, year.id, admin), [data, year.id, admin]);
  const agenda = useMemo(() => props.events && today ? upcomingOccurrences(props.events, today) : [], [props.events, today]);
  const duesHref = { pathname: '/dashboard', query: { view: 'dues', year: year.id, month: String(month), status: 'due' } };
  const displayedCharges = props.assignments.filter(({ charge }) => chargeTab === 'unpaid' ? charge.status === 'UNPAID' : charge.status === 'PAID');
  const currentMember = data.profile;
  const ownRow = duesRows.find((row) => row.member.id === currentMember?.id);
  const openCurrent = (member: Profile) => {
    if (admin) props.onOpenPayment(member, month);
    else props.onOpenGuide(member.full_name, duesAmount(member), `${year.year}년 ${month}월 회비`);
  };

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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">대시보드</h1><p className="mt-1 text-xs text-slate-500">{admin ? '클럽 운영 현황' : `${currentMember?.full_name ?? '회원'} 님 · ${currentMember?.member_grade ?? ''}`}</p></div>
      <div className="flex items-center gap-2"><select value={year.id} onChange={(event) => props.onYearChange(event.target.value)} aria-label="대시보드 연도 선택" className="min-h-9 rounded-md border border-slate-200 bg-white px-2 text-xs">{data.fiscalYears.map((item) => <option key={item.id} value={item.id}>{item.year}년</option>)}</select>{admin ? <Link href={{ pathname: '/admin/finance', query: { year: year.id } }} className={smallButton}><Download className="h-4 w-4" />리포트</Link> : null}</div>
    </div>

    {!admin && currentMember ? <section aria-label="나의 회비 납부" className="mb-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-5">
      <div><div className="flex items-center gap-2"><h2 className="text-base font-semibold">{props.memberNotice ? '납부할 회비' : `${month}월 회비`}</h2><span className={`rounded px-2 py-0.5 text-xs ${props.memberNotice || ownRow?.status === 'due' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{props.memberNotice ? '미납' : ownRow ? DUES_STATUS_LABELS[ownRow.status] : '확인 중'}</span></div><p className="mt-2 text-3xl font-semibold tabular-nums">{formatCurrency(props.memberNotice?.amount ?? (ownRow?.status === 'paid' ? ownRow.cells.find((cell) => cell.month === month)?.payment?.charged_amount ?? 0 : duesAmount(currentMember)))}</p><p className="mt-2 text-xs text-slate-500">{props.memberNotice ? props.memberNotice.months.map((period) => `${period.year}년 ${period.month}월`).join(', ') : `${year.year}년 ${month}월 · ${currentMember.member_grade}`}</p></div>
      {props.memberNotice ? <button type="button" onClick={() => props.onOpenGuide(currentMember.full_name, props.memberNotice!.amount, props.memberNotice!.months.map((period) => `${period.year}년 ${period.month}월`).join(', ') + ' 회비')} className={`${smallButton} !border-emerald-700 !bg-emerald-700 !text-white`}><ArrowUpRight className="h-4 w-4" />납부하기</button> : ownRow?.status === 'due' ? <button type="button" onClick={() => openCurrent(currentMember)} className={`${smallButton} !bg-emerald-700 !text-white`}>납부하기</button> : <Link href="/dashboard?view=dues" className={linkClass}>납부 내역 <ChevronRight className="h-4 w-4" /></Link>}
    </section> : null}

    <section aria-label="재정 요약" className={`mb-6 grid gap-x-4 gap-y-5 border-y border-slate-200 py-5 ${admin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      <div><p className="text-xs text-slate-500">누적 잔액</p><p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums min-[1200px]:text-2xl">{formatCurrency(summary.cumulativeBalance)}</p><p className="mt-1 text-[11px] text-slate-500">전체 기간 누적</p></div>
      <div><p className="text-xs text-slate-500">{year.year}년 세입</p><p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums min-[1200px]:text-2xl">{formatCurrency(summary.totalIncome)}</p><p className="mt-1 text-[11px] text-slate-500">회비 · 추가 비용 · 기타</p></div>
      <div><p className="text-xs text-slate-500">{year.year}년 지출</p><p className="mt-2 whitespace-nowrap text-xl font-semibold tabular-nums min-[1200px]:text-2xl">{formatCurrency(summary.totalExpense)}</p><p className="mt-1 text-[11px] text-slate-500">선택 연도 합계</p></div>
      {admin ? <div><p className="text-xs text-slate-500">{month}월 미납액</p><p className={`mt-2 whitespace-nowrap text-xl font-semibold tabular-nums min-[1200px]:text-2xl ${dueAmount ? 'text-rose-700' : ''}`}>{today ? formatCurrency(dueAmount) : '—'}</p><p className="mt-1 text-[11px] text-slate-500">{dueRows.length}명 · 납부율 {targetCount ? (paidCount / targetCount * 100).toFixed(1) : '0'}%</p></div> : null}
    </section>

    <div className="grid min-w-0 gap-7 md:grid-cols-[minmax(0,1fr)_200px] min-[1200px]:grid-cols-[minmax(0,1fr)_240px]">
      <section aria-label="회비 납부 현황" className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{admin ? '회비 납부 현황' : '나의 납부 내역'}</h2><Link href={{ pathname: '/dashboard', query: { view: 'dues', year: year.id } }} title="전체 회비 내역 보기" className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">{year.year}년 <ChevronRight className="inline h-3 w-3" /></Link></div>
        {admin ? <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label="대시보드 납부 상태 필터" className="flex gap-4 border-b border-slate-200 text-xs">{(['all', 'due'] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-10 border-b-2 py-2 ${filter === value ? 'border-emerald-700 font-semibold text-slate-900' : 'border-transparent text-slate-500'}`}>{value === 'all' ? `전체 ${duesRows.length}` : `미납 ${dueRows.length}`}</button>)}</div><label className="flex min-h-9 w-36 items-center gap-2 border-b border-slate-200 text-slate-400"><Search className="h-4 w-4 shrink-0" /><input aria-label="대시보드 회원 이름 검색" placeholder="회원 이름" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent py-1 text-base text-slate-900 outline-none sm:text-xs" /></label></div> : null}
        <div className="hidden min-[640px]:block"><table className="w-full table-fixed border-collapse text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="w-[92px] px-2 py-2.5 text-left font-medium">회원</th>{duesRows[0]?.cells.map((cell) => <th key={cell.month} className="px-1 py-2.5 text-center font-medium">{cell.month}월</th>)}<th className="w-[72px] py-2.5 text-right font-medium">{month}월 미납액</th><th className="w-8 text-center font-medium">상세</th></tr></thead><tbody>{(admin ? tableRows : duesRows).map((row) => <tr key={row.member.id}><td className="border-b border-slate-200 px-2 py-4"><span className="block break-words text-xs font-semibold">{row.member.full_name}</span><span className="mt-1 block text-[11px] text-slate-500">{row.member.member_grade}</span></td>{row.cells.map((cell) => <td key={cell.month} className="border-b border-slate-200 px-1 py-3 text-center"><button type="button" disabled={cell.status === 'before' || cell.status === 'future' || row.member.member_grade === '간사' || (!admin && cell.status !== 'due')} aria-label={`${row.member.full_name} ${cell.month}월 ${DUES_STATUS_LABELS[cell.status]} 관리`} title={`${cell.month}월 ${DUES_STATUS_LABELS[cell.status]}`} onClick={() => admin ? props.onOpenPayment(row.member, cell.month) : props.onOpenGuide(row.member.full_name, duesAmount(row.member), `${year.year}년 ${cell.month}월 회비`)} className="inline-flex min-h-10 w-full items-center justify-center rounded hover:bg-slate-50 disabled:cursor-default"><DuesIndicator status={cell.status} /></button></td>)}<td className="border-b border-slate-200 py-3 text-right tabular-nums">{row.dueAmount.toLocaleString('ko-KR')}</td><td className="border-b border-slate-200 py-3 text-center">{row.member.member_grade !== '간사' && (admin ? row.status === 'paid' || row.status === 'due' || row.status === 'exempt' : row.status === 'due') ? <button type="button" aria-label={`${row.member.full_name} ${month}월 회비 상세`} title={`${row.member.full_name} 회비 상세`} onClick={() => openCurrent(row.member)} className="inline-flex h-9 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button> : <span className="text-slate-300">—</span>}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-200 min-[640px]:hidden">{(admin ? tableRows : duesRows).map((row) => <button key={row.member.id} type="button" disabled={row.member.member_grade === '간사' || row.status === 'before' || row.status === 'future' || (!admin && row.status !== 'due')} aria-label={`${row.member.full_name} ${month}월 회비 상세`} onClick={() => openCurrent(row.member)} className="flex min-h-20 w-full items-center justify-between gap-3 py-3 text-left disabled:cursor-default"><span className="min-w-0"><strong className="block break-words text-sm font-semibold">{row.member.full_name}</strong><span className="mt-1 block text-xs text-slate-500">{row.member.member_grade}</span></span><span className="grid shrink-0 justify-items-end gap-1"><DuesIndicator status={row.status} /><span className="text-xs tabular-nums text-slate-600">{row.status === 'due' ? formatCurrency(row.dueAmount) : row.status === 'paid' ? formatCurrency(row.cells.find((cell) => cell.month === month)?.payment?.charged_amount ?? 0) : '—'}</span></span></button>)}</div>
        {!(admin ? tableRows : duesRows).length ? <p className="border-b border-slate-200 py-8 text-center text-sm text-slate-500">{query ? '검색된 회원이 없습니다.' : '해당 월의 미납 회원이 없습니다.'}</p> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500"><span>{admin ? Math.min(visibleRows.length, 6) : duesRows.length}명 표시 · 단위: 원</span><Link href={{ pathname: '/dashboard', query: { view: 'dues', year: year.id } }} className={linkClass}>{admin ? '전체 회비 관리' : '전체 납부 내역'} <ArrowUpRight className="h-3 w-3" /></Link></div>
        {admin ? <p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><Check className="h-4 w-4 text-emerald-600" />납부 완료 {paidCount}명 · 미납 {dueRows.length}명 · 면제 별도</p> : null}
      </section>
      <aside className="min-w-0 space-y-6">
        {admin ? <section aria-label="처리할 일"><div className="flex items-center justify-between gap-2"><h2 className="text-base font-semibold">처리할 일</h2><span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700">{dueRows.length + props.pendingCount + props.additionalUnpaidCount}건</span></div>
          <TaskLink title={`${month}월 미납 ${dueRows.length}명`} description={today ? `${month}월 납부 대상 회비` : '납부 현황 확인 중'} href={duesHref} />
          <TaskLink title={`가입 승인 ${props.pendingCount}명`} description="새로운 가입 신청" href="/admin/members" />
          {props.additionalUnpaidCount ? <TaskLink title={`추가 비용 미납 ${props.additionalUnpaidCount}건`} description="대회비 · 회식비 · 기타" href="/admin/finance" /> : null}
          <button type="button" onClick={props.onOpenReminders} className={`${linkClass} mt-2`}><Bell className="h-3.5 w-3.5" />미납 알림 보내기</button>
        </section> : null}
        <div className={admin ? 'border-t border-slate-200 pt-5' : ''}>{upcoming}</div>
      </aside>
    </div>

    {(!admin || props.assignments.length > 0) ? <section aria-label="추가 비용 안내" className="mt-7 border-t border-slate-200 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">추가 비용</h2><div role="group" aria-label="추가 비용 납부 상태" className="flex gap-4 text-xs">{(['unpaid', 'paid'] as const).map((value) => <button key={value} type="button" aria-pressed={chargeTab === value} onClick={() => setChargeTab(value)} className={`min-h-9 border-b-2 ${chargeTab === value ? 'border-emerald-700 font-semibold' : 'border-transparent text-slate-500'}`}>{value === 'unpaid' ? '미납' : '납부 완료'}</button>)}</div></div>{displayedCharges.length ? <ul className="divide-y divide-slate-100">{displayedCharges.map(({ charge, group }) => <li key={charge.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{group.title}</h3><p className="mt-1 text-xs text-slate-500">마감 {group.event_date ?? '미정'}</p></div><div className="flex items-center gap-3"><strong className="text-sm font-semibold tabular-nums">{formatCurrency(charge.amount)}</strong>{charge.status === 'UNPAID' ? <button type="button" onClick={() => props.onOpenGuide(currentMember?.full_name ?? charge.member_name, charge.amount, group.title)} className={smallButton}>납부하기</button> : <span className="text-xs text-emerald-700">납부 완료</span>}</div></li>)}</ul> : <p className="py-4 text-sm text-slate-500">{chargeTab === 'unpaid' ? '미납된 추가 비용이 없습니다.' : '납부 완료된 추가 비용이 없습니다.'}</p>}</section> : null}

    <section aria-label="최근 세입 지출" className="mt-7 border-t border-slate-200 pt-5">
      <div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-base font-semibold">최근 세입 · 지출</h2>{admin ? <Link href={{ pathname: '/admin/finance', query: { year: year.id } }} className={linkClass}>전체 내역 <ArrowUpRight className="h-3 w-3" /></Link> : <button type="button" onClick={() => setShowAllTransactions((value) => !value)} aria-expanded={showAllTransactions} className={linkClass}>{showAllTransactions ? '접기' : '전체 내역'}</button>}</div>
      {transactions.length ? <ul className="divide-y divide-slate-200">{transactions.slice(0, showAllTransactions ? 30 : 3).map((item) => <li key={item.id} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-sm sm:grid-cols-[48px_minmax(0,1fr)_auto]"><time className="text-xs tabular-nums text-slate-500" title={item.recordedAt ?? '기록일 정보 없음'}>{formatRecordedDate(item.recordedAt)}</time><span className="min-w-0"><span className="block break-words text-sm">{item.title}</span><span className="mt-1 block break-words text-xs text-slate-500">{item.description}</span></span><strong className={`text-right text-xs font-semibold tabular-nums sm:text-sm ${item.direction === 'income' ? 'text-emerald-700' : 'text-slate-800'}`}>{item.direction === 'income' ? '+' : '−'}{item.amount.toLocaleString('ko-KR')}원</strong></li>)}</ul> : <p className="py-5 text-sm text-slate-500">해당 연도의 세입·지출 내역이 없습니다.</p>}
    </section>
    {props.source === 'mock' ? <p className="mt-5 text-[11px] text-slate-400">샘플 데이터 · 실제 납부 및 알림 발송 없음</p> : null}
  </div>;
}

function DuesIndicator({ status }: { status: ReturnType<typeof overviewDuesRows>[number]['status'] }) {
  return <span className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${status === 'paid' ? 'text-emerald-700' : status === 'due' ? 'bg-rose-50 text-rose-700' : 'text-slate-500'}`}>{status === 'paid' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}{status === 'paid' ? '완료' : DUES_STATUS_LABELS[status]}</span>;
}

function TaskLink({ title, description, href }: { title: string; description: string; href: React.ComponentProps<typeof Link>['href'] }) {
  return <Link href={href} className="flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 py-3 hover:bg-slate-50"><span className="min-w-0"><strong className="block break-words text-sm font-semibold">{title}</strong><span className="mt-1 block text-xs text-slate-500">{description}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500" /></Link>;
}
