'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Bell, Check, ChevronLeft, ChevronRight, Download, Plus, Search, X } from 'lucide-react';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DUES_STATUS_LABELS, duesAmount, getDuesExemption, getDuesStatus, koreanYearMonth, type DuesExemption, type DuesStatus } from '@/lib/dues';
import { DuesExemptionNote } from '@/components/dues-exemption-note';
import { formatCurrency } from '@/lib/utils';
import { overviewDuesRows } from '@/lib/dashboard-overview';
import type { FiscalYear, PaymentRecord, Profile } from '@/lib/types';

type Filter = 'all' | 'due' | 'paid' | 'exempt';
type Cell = { month: number; status: DuesStatus; payment?: PaymentRecord; exemption: DuesExemption | null };
type DuesRow = { member: Profile; cells: Cell[]; paidTotal: number; dueTotal: number; paidMonths: number };
type Props = {
  year: FiscalYear;
  fiscalYears: FiscalYear[];
  members: Profile[];
  payments: PaymentRecord[];
  today: Date | null;
  onYearChange: (id: string) => void;
  onOpenPayment: (member: Profile, month: number) => void;
  onBulkPaid: (memberIds: string[], month: number) => Promise<{ ok: boolean; message?: string }>;
  newYearInput: string;
  onNewYearInputChange: (value: string) => void;
  onCreateYear: () => void;
  initialMonth?: number;
  initialFilter?: Filter;
  initialMemberId?: string;
  initialArrears?: boolean;
  onOpenReminders: () => void;
};

const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
const primaryClass = `${buttonClass} !border-emerald-700 !bg-emerald-700 !text-white hover:!bg-emerald-800`;
const statusClass: Record<DuesStatus, string> = {
  paid: 'text-emerald-700', due: 'bg-rose-50 text-rose-700', exempt: 'text-slate-500',
  future: 'text-slate-400', before: 'text-slate-400',
};

function Status({ status, compact = false }: { status: DuesStatus; compact?: boolean }) {
  return <span className={`inline-flex min-h-6 items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs ${statusClass[status]}`}>
    {status === 'paid' ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
    {status === 'paid' && compact ? <span className="sr-only">납부 완료</span> : DUES_STATUS_LABELS[status]}
  </span>;
}

function exportCsv(rows: DuesRow[], year: FiscalYear) {
  const escape = (value: string | number) => {
    const text = String(value);
    return `"${(/^[\s]*[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  const data = [
    ['이름', '등급', ...year.visible_months.map((month) => `${month}월`), '연간 납부액', '누적 미납액'],
    ...rows.map((row) => [row.member.full_name, row.member.member_grade, ...row.cells.map((cell) =>
      cell.status === 'paid' ? `납부 완료 (${cell.payment?.charged_amount ?? 0}원)` : cell.exemption ? `${cell.exemption.label} · ${cell.exemption.reason}` : DUES_STATUS_LABELS[cell.status]), row.paidTotal, row.dueTotal]),
  ];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + data.map((row) => row.map(escape).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `patriot-dues-${year.year}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminDuesManagement(props: Props) {
  const { year, fiscalYears, members, payments, today, onYearChange, onOpenPayment, onBulkPaid } = props;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(props.initialMonth ?? null);
  const [search, setSearch] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(props.initialMemberId ?? null);
  const [arrearsOnly, setArrearsOnly] = useState(props.initialArrears ?? false);
  const [filter, setFilter] = useState<Filter>(props.initialFilter ?? 'all');
  const [mobileFilter, setMobileFilter] = useState<Filter>(props.initialFilter ?? 'due');
  const [view, setView] = useState<'monthly' | 'annual'>('monthly');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [annualMemberId, setAnnualMemberId] = useState<string | null>(null);
  const [showNewYear, setShowNewYear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const months = useMemo(() => [...year.visible_months].sort((a, b) => a - b), [year.visible_months]);
  const current = today ? koreanYearMonth(today) : null;
  const preferredMonth = current && year.year === current.year ? current.month : current && year.year > current.year ? months[0] : months.at(-1);
  const defaultMonth = months.includes(preferredMonth ?? 0) ? preferredMonth! : months.filter((value) => value <= (preferredMonth ?? 0)).at(-1) ?? months[0];
  const month = selectedMonth !== null && months.includes(selectedMonth) ? selectedMonth : defaultMonth;
  const rows = useMemo<DuesRow[]>(() => members.map((member) => {
    const history = payments.filter((payment) => payment.member_id === member.id);
    const cells = months.map((value) => {
      const payment = history.find((item) => item.fiscal_year_id === year.id && item.month === value);
      const status = getDuesStatus(member, year, value, payment, fiscalYears, history, today);
      return { month: value, payment, status, exemption: getDuesExemption(member, payment, status) };
    });
    return {
      member, cells,
      paidTotal: cells.reduce((sum, cell) => sum + (cell.payment?.paid ? cell.payment.charged_amount : 0), 0),
      dueTotal: cells.filter((cell) => cell.status === 'due').length * duesAmount(member),
      paidMonths: cells.filter((cell) => cell.status === 'paid').length,
    };
  }), [members, payments, months, year, fiscalYears, today]);
  const monthlyCell = (row: DuesRow) => row.cells.find((cell) => cell.month === month);
  const allPeriodDebts = useMemo(() => new Map(overviewDuesRows(members, fiscalYears, payments, today).map((row) => [row.member.id, row.dueAmount])), [members, fiscalYears, payments, today]);
  const focusedMember = members.find((member) => member.id === focusedId);
  const scopedRows = rows.filter((row) => (!focusedMember || row.member.id === focusedMember.id) && (!arrearsOnly || (allPeriodDebts.get(row.member.id) ?? 0) > 0));
  const counts = { all: scopedRows.length, due: 0, paid: 0, exempt: 0, target: 0, dueAmount: 0 };
  for (const row of scopedRows) {
    const status = monthlyCell(row)?.status;
    if (status === 'paid' || status === 'due' || status === 'exempt') counts[status]++;
    if (status === 'due' || status === 'paid' || status === 'future') counts.target++;
    if (status === 'due') counts.dueAmount += duesAmount(row.member);
  }
  const keyword = search.trim().toLocaleLowerCase('ko-KR');
  const filterRows = (value: Filter) => scopedRows.filter((row) => row.member.full_name.toLocaleLowerCase('ko-KR').includes(keyword) && (value === 'all' || monthlyCell(row)?.status === value));
  const desktopRows = filterRows(filter);
  const mobileRows = filterRows(mobileFilter);
  const eligibleIds = desktopRows.filter((row) => monthlyCell(row)?.status === 'due').map((row) => row.member.id);
  // Revalidation can change eligibility while a selection or confirmation is open.
  const eligibleSelected = selectedIds.filter((id) => eligibleIds.includes(id));
  const confirmedRows = (confirmIds ?? []).flatMap((id) => rows.filter((row) => row.member.id === id));
  const confirmationValid = confirmedRows.length === confirmIds?.length && confirmedRows.every((row) => monthlyCell(row)?.status === 'due');
  const annualRow = rows.find((row) => row.member.id === annualMemberId);

  const changeMonth = (value: number) => { setSelectedMonth(value); setSelectedIds([]); setError(''); };
  const openCell = (row: DuesRow, cell: Cell) => {
    if (cell.status === 'before' || cell.status === 'future' || row.member.member_grade === '간사') return;
    setAnnualMemberId(null);
    onOpenPayment(row.member, cell.month);
  };
  const filterTabs = (value: Filter, update: (next: Filter) => void) => <div role="group" aria-label={`${month}월 납부 상태 필터`} className="flex justify-between gap-4 border-b border-slate-200 text-sm sm:justify-start">
    {(['all', 'due', 'paid', 'exempt'] as const).map((key) => <button key={key} type="button" aria-pressed={value === key} onClick={() => { update(key); setSelectedIds([]); }} className={`min-h-11 whitespace-nowrap border-b-2 py-2 ${value === key ? 'border-emerald-700 font-semibold text-slate-900' : 'border-transparent text-slate-500'}`}>
      {{ all: '전체', due: '미납', paid: '완료', exempt: '면제' }[key]} <span className="tabular-nums">{counts[key]}</span>
    </button>)}
  </div>;
  const submitBulk = async () => {
    if (submitting.current || !confirmationValid || !confirmIds?.length) return;
    submitting.current = true;
    setSaving(true); setError('');
    try {
      const result = await onBulkPaid(confirmIds, month);
      if (!result.ok) { setError(result.message ?? '일괄 처리에 실패했습니다.'); return; }
      setConfirmIds(null); setSelectedIds([]);
    } catch { setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { submitting.current = false; setSaving(false); }
  };
  const createYear = (event: FormEvent) => { event.preventDefault(); props.onCreateYear(); };

  return <section aria-label="관리자 회비 관리" className="min-w-0 border-b border-slate-200 bg-white px-0 pb-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold text-slate-900">회비 관리</h2><p className="mt-1 text-xs text-slate-500">{year.year}년 · {months.map((value) => `${value}월`).join(' / ')}</p></div>
      <div className="flex items-center gap-2">
        <select value={year.id} onChange={(event) => onYearChange(event.target.value)} aria-label="회비 관리 연도 선택" className="min-h-10 rounded-md border border-slate-200 bg-white px-2 text-sm">
          {fiscalYears.map((item) => <option key={item.id} value={item.id}>{item.year}년</option>)}
        </select>
        <button type="button" onClick={() => exportCsv(rows, year)} className={buttonClass} aria-label="회비 내역 CSV 내보내기" title="회비 내역 CSV 내보내기"><Download className="h-4 w-4" /><span className="hidden sm:inline">내보내기</span></button>
        <button type="button" onClick={props.onOpenReminders} className={buttonClass} aria-label="미납 알림 관리" title="미납 알림 관리"><Bell className="h-4 w-4" /><span className="hidden xl:inline">알림</span></button>
        <button type="button" onClick={() => setShowNewYear((value) => !value)} aria-label="새 연도 개설" aria-expanded={showNewYear} title="새 연도 개설" className={buttonClass}><Plus className="h-4 w-4" /><span className="hidden sm:inline">연도 개설</span></button>
      </div>
    </div>
    {focusedMember ? <div className="mt-3 flex items-center gap-2 text-sm text-slate-600"><span>선택 회원: {focusedMember.full_name}</span><button type="button" aria-label="선택 회원 해제" title="선택 회원 해제" onClick={() => { setFocusedId(null); setSelectedIds([]); }} className="flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100"><X className="h-4 w-4" /></button></div> : null}
    {arrearsOnly ? <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600"><span>전체 기간 미납 회원 · {scopedRows.length}명</span><button type="button" aria-label="전체 기간 미납 범위 해제" title="전체 기간 미납 범위 해제" onClick={() => { setArrearsOnly(false); setSelectedIds([]); }} className="flex h-9 w-9 items-center justify-center rounded hover:bg-slate-100"><X className="h-4 w-4" /></button></div> : null}
    {showNewYear ? <form onSubmit={createYear} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
      <label className="grid gap-1 text-xs text-slate-500">새 회비 관리 연도<input type="number" required min={2026} max={9999} value={props.newYearInput} onChange={(event) => props.onNewYearInputChange(event.target.value)} className="min-h-10 w-36 rounded-md border border-slate-200 px-3 text-base" /></label>
      <button className={primaryClass} type="submit">개설</button>
    </form> : null}

    <div className="mt-5 lg:hidden">
      <div role="group" aria-label="모바일 회비 보기" className="flex gap-5 border-b border-slate-200">
        {(['monthly', 'annual'] as const).map((value) => <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); setMobileFilter(value === 'annual' ? 'all' : 'due'); }} className={`min-h-11 border-b-2 text-sm ${view === value ? 'border-emerald-700 font-semibold text-slate-900' : 'border-transparent text-slate-500'}`}>{value === 'monthly' ? '월별 관리' : '연간 요약'}</button>)}
      </div>
      <div className="my-3 flex items-center justify-between">
        <button type="button" aria-label="이전 달" title="이전 달" disabled={months.indexOf(month) <= 0} onClick={() => changeMonth(months[months.indexOf(month) - 1])} className={`${buttonClass} !border-0`}><ChevronLeft className="h-4 w-4" /></button>
        <strong className="text-lg font-semibold">{year.year}년 {month}월</strong>
        <button type="button" aria-label="다음 달" title="다음 달" disabled={months.indexOf(month) >= months.length - 1} onClick={() => changeMonth(months[months.indexOf(month) + 1])} className={`${buttonClass} !border-0`}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3 border-y border-slate-200 py-4 lg:grid-cols-4" aria-label={`${month}월 납부 요약`} aria-busy={!today}>
      {[['대상', counts.target], ['납부 완료', counts.paid], ['미납', counts.due]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{month}월 {label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{today ? value : '—'}<span className="ml-1 text-xs font-normal text-slate-500">명</span></p></div>)}
      <div className="col-span-3 flex items-center justify-between border-t border-slate-100 pt-3 lg:col-span-1 lg:block lg:border-0 lg:pt-0"><p className="text-xs text-slate-500">{month}월 미납액</p><p className="text-xl font-semibold tabular-nums text-rose-700 lg:mt-1 lg:text-2xl">{today ? formatCurrency(counts.dueAmount) : '—'}</p></div>
    </div>
    <div className="my-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="hidden lg:block">{filterTabs(filter, setFilter)}</div>
      <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400 lg:order-last lg:w-52"><Search className="h-4 w-4" /><input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedIds([]); }} type="search" placeholder="회원 이름 검색" aria-label="회원 이름 검색" className="min-w-0 flex-1 bg-transparent py-2 text-base text-slate-900 outline-none sm:text-sm" /></label>
      <div className="lg:hidden">{filterTabs(mobileFilter, setMobileFilter)}</div>
    </div>

    <p className="mb-3 hidden text-xs text-slate-500 lg:block">{month}월 기준 · 연간 합계와 누적 미납액은 전체 표시 월 기준</p>
    {eligibleSelected.length ? <div className="mb-3 hidden flex-wrap items-center justify-between gap-3 bg-emerald-50 p-3 text-sm text-emerald-900 lg:flex">
      <span>{month}월 미납 {eligibleSelected.length}명 선택</span><div className="flex gap-2"><button type="button" className={buttonClass} onClick={() => setSelectedIds([])}>해제</button><button type="button" className={primaryClass} onClick={() => { setError(''); setConfirmIds(eligibleSelected); }}><Check className="h-4 w-4" />납부 처리</button></div>
    </div> : null}

    <div className="hidden overflow-x-auto border-b border-slate-200 lg:block">
      <table className="w-full table-fixed border-separate border-spacing-0 text-xs" style={{ minWidth: 150 + months.length * 64 + 180 }}>
        <thead><tr className="text-slate-500">
          <th className="sticky left-0 z-20 w-[150px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-left font-medium"><label className="flex items-center gap-2"><input type="checkbox" aria-label="조회된 미납 회원 최대 200명 선택" disabled={!eligibleIds.length} checked={eligibleIds.length > 0 && eligibleIds.every((id) => eligibleSelected.includes(id))} ref={(node) => { if (node) node.indeterminate = eligibleSelected.length > 0 && !eligibleIds.every((id) => eligibleSelected.includes(id)); }} onChange={(event) => setSelectedIds(event.target.checked ? eligibleIds.slice(0, 200) : [])} className="h-4 w-4 accent-emerald-700" />회원</label></th>
          {months.map((value) => <th key={value} className={`border-b border-slate-200 bg-slate-50 text-center font-medium ${value === month ? 'text-emerald-700' : ''}`}><button type="button" aria-label={`${value}월 조회 기준 선택`} aria-pressed={value === month} onClick={() => changeMonth(value)} className="min-h-12 w-full px-1 py-2 hover:bg-emerald-50">{value}월{value === month ? <span className="block text-[10px]">선택 월</span> : null}</button></th>)}
          <th className="w-[90px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-right font-medium">연간 납부액</th><th className="w-[90px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-right font-medium">누적 미납액</th>
        </tr></thead>
        <tbody>{desktopRows.map((row) => <tr key={row.member.id}>
          <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-2"><label className="flex min-h-9 items-center gap-2"><input type="checkbox" aria-label={`${row.member.full_name} ${month}월 납부 처리 선택`} disabled={monthlyCell(row)?.status !== 'due' || (eligibleSelected.length >= 200 && !eligibleSelected.includes(row.member.id))} checked={eligibleSelected.includes(row.member.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, row.member.id] : ids.filter((id) => id !== row.member.id))} className="h-4 w-4 accent-emerald-700 disabled:opacity-30" /><span className="min-w-0"><span className="block break-words text-sm font-semibold text-slate-900">{row.member.full_name}</span><span className="text-[11px] font-normal text-slate-500">{row.member.member_grade}</span>{(allPeriodDebts.get(row.member.id) ?? 0) > row.dueTotal ? <span className="mt-1 block break-words text-[11px] text-amber-700">다른 연도 미납 {formatCurrency((allPeriodDebts.get(row.member.id) ?? 0) - row.dueTotal)}</span> : null}</span></label></td>
          {row.cells.map((cell) => <td key={cell.month} className={`border-b border-slate-100 p-1 text-center ${cell.month === month ? 'bg-emerald-50/60' : 'bg-white'}`}><button type="button" disabled={cell.status === 'future' || cell.status === 'before' || row.member.member_grade === '간사'} onClick={() => openCell(row, cell)} aria-label={`${row.member.full_name} ${cell.month}월 ${DUES_STATUS_LABELS[cell.status]} 관리`} aria-description={cell.exemption ? `${cell.exemption.label} · ${cell.exemption.reason}` : undefined} title={`${cell.month}월 ${DUES_STATUS_LABELS[cell.status]}${cell.exemption ? ` · ${cell.exemption.label} · ${cell.exemption.reason}` : ''}`} className="flex min-h-10 w-full items-center justify-center rounded hover:bg-slate-100 disabled:cursor-default"><span className="block"><Status status={cell.status} compact /><DuesExemptionNote detail={cell.exemption} compact /></span></button></td>)}
          <td className="border-b border-slate-100 px-2 py-2 text-right tabular-nums text-slate-900">{row.paidTotal.toLocaleString('ko-KR')}</td><td className={`border-b border-slate-100 px-2 py-2 text-right tabular-nums ${row.dueTotal ? 'text-rose-700' : 'text-slate-400'}`}>{row.dueTotal.toLocaleString('ko-KR')}</td>
        </tr>)}{!desktopRows.length ? <tr><td colSpan={months.length + 3} className="py-10 text-center text-sm text-slate-500">{search ? '검색된 회원이 없습니다.' : '해당 상태의 회원이 없습니다.'}</td></tr> : null}</tbody>
      </table>
    </div>
    <div className="hidden flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-500 lg:flex"><span>{desktopRows.length}명 표시 · 단위: 원</span><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-700" />완료</span><span>미납</span><span>면제</span><span>예정</span><span>가입 전</span></div></div>

    <div className="divide-y divide-slate-100 lg:hidden">
      {mobileRows.map((row) => {
        const cell = monthlyCell(row);
        if (!cell) return null;
        const readOnly = view === 'monthly' && (cell.status === 'future' || cell.status === 'before' || row.member.member_grade === '간사');
        return <button key={row.member.id} type="button" aria-label={view === 'annual' ? `${row.member.full_name} 연간 납부 내역` : `${row.member.full_name} ${month}월 ${DUES_STATUS_LABELS[cell.status]} 관리`} disabled={readOnly} onClick={() => view === 'annual' ? setAnnualMemberId(row.member.id) : openCell(row, cell)} className="flex min-h-[76px] w-full items-center justify-between gap-3 py-3 text-left disabled:cursor-default">
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs text-slate-500" aria-hidden="true">{row.member.full_name.slice(0, 1)}</span><span className="min-w-0"><span className="block break-words text-sm font-semibold text-slate-900">{row.member.full_name}</span><span className="mt-0.5 block text-xs text-slate-500">{row.member.member_grade}{view === 'annual' ? ` · 납부 ${row.paidMonths}개월` : ''}</span><DuesExemptionNote detail={view === 'monthly' ? cell.exemption : null} />{(allPeriodDebts.get(row.member.id) ?? 0) > row.dueTotal ? <span className="mt-1 block break-words text-[11px] text-amber-700">다른 연도 미납 {formatCurrency((allPeriodDebts.get(row.member.id) ?? 0) - row.dueTotal)}</span> : null}</span></span>
          <span className="flex shrink-0 items-center gap-2"><span className="grid justify-items-end gap-1">{view === 'monthly' ? <><Status status={cell.status} /><span className="text-sm font-semibold tabular-nums text-slate-800">{cell.status === 'paid' ? formatCurrency(cell.payment?.charged_amount ?? 0) : cell.status === 'due' ? formatCurrency(duesAmount(row.member)) : cell.status === 'exempt' ? '회비 면제' : '—'}</span></> : <><span className="text-sm font-semibold tabular-nums">{formatCurrency(row.paidTotal)}</span><span className="text-xs text-slate-500">누적 미납 {formatCurrency(row.dueTotal)}</span></>}</span>{!readOnly ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}</span>
        </button>;
      })}
      {!mobileRows.length ? <p className="py-8 text-center text-sm text-slate-500">{search ? '검색된 회원이 없습니다.' : mobileFilter === 'due' ? '해당 월의 미납 회원이 없습니다.' : '해당 상태의 회원이 없습니다.'}</p> : null}
    </div>

    {annualRow ? <ResponsiveDialog title={`${annualRow.member.full_name} · 연간 내역`} onClose={() => setAnnualMemberId(null)}>
      <p className="text-sm text-slate-500">{year.year}년 · {annualRow.member.member_grade}</p><p className="mt-3 text-2xl font-semibold tabular-nums">{formatCurrency(annualRow.paidTotal)}</p><p className="mt-2 text-sm text-slate-500">누적 미납 {formatCurrency(annualRow.dueTotal)}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">{annualRow.cells.map((cell) => <button key={cell.month} type="button" disabled={cell.status === 'before' || cell.status === 'future' || annualRow.member.member_grade === '간사'} onClick={() => openCell(annualRow, cell)} className="grid min-h-20 justify-items-center gap-2 rounded-md border border-slate-200 p-2 text-sm hover:bg-slate-50 disabled:cursor-default"><span>{cell.month}월</span><Status status={cell.status} /><DuesExemptionNote detail={cell.exemption} /></button>)}</div>
    </ResponsiveDialog> : null}
    {confirmIds ? <ResponsiveDialog title="선택 회원 납부 처리" busy={saving} onClose={() => setConfirmIds(null)}>
      <p className="text-sm text-slate-500">{year.year}년 {month}월 · {confirmedRows.length}명</p><p className="my-4 text-2xl font-semibold tabular-nums">{formatCurrency(confirmedRows.reduce((sum, row) => sum + duesAmount(row.member), 0))}</p>
      <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto">{confirmedRows.map((row) => <li key={row.member.id} className="flex justify-between gap-3 py-2 text-sm"><span>{row.member.full_name}</span><span className="tabular-nums">{formatCurrency(duesAmount(row.member))}</span></li>)}</ul>
      <p className="my-4 text-xs leading-5 text-slate-500">실제 계좌의 입금 내역을 확인한 뒤 처리해 주세요.</p>
      {!confirmationValid ? <p role="alert" className="mb-3 text-sm text-rose-700">선택 회원의 납부 상태가 변경되었습니다. 닫은 뒤 다시 선택해 주세요.</p> : null}
      {error ? <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p> : null}
      <button type="button" disabled={saving || !confirmationValid} onClick={submitBulk} className={`${primaryClass} w-full`}><Check className="h-4 w-4" />{saving ? '처리 중…' : '입금 확인 · 납부 완료'}</button>
    </ResponsiveDialog> : null}
  </section>;
}
