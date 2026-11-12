'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { clubLedgerEntries, type FinanceSummary } from '@/lib/finance-summary';
import { formatRecordedDate } from '@/lib/dashboard-overview';
import { formatCurrency } from '@/lib/utils';
import type { DashboardBundle, FiscalYear } from '@/lib/types';

export function ClubFinanceOverview({ bundle, year, summary, showSummary = true }: {
  bundle: DashboardBundle; year: FiscalYear; summary: FinanceSummary; showSummary?: boolean;
}) {
  const id = useId();
  const [kind, setKind] = useState<'incomes' | 'expenses'>('incomes');
  const [expanded, setExpanded] = useState(false);
  const ledger = useMemo(() => clubLedgerEntries(bundle, year.id), [bundle, year.id]);
  const items = ledger[kind];
  const select = (value: typeof kind) => { setKind(value); setExpanded(false); };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'incomes' : event.key === 'End' ? 'expenses' : kind === 'incomes' ? 'expenses' : 'incomes';
    select(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-kind="${next}"]`)?.focus();
  };
  return <section aria-label="클럽 재정" className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">{showSummary ? '클럽 재정' : '세입·세출 내역'}</h2><span className="text-xs text-slate-500">{year.year}년 · 읽기 전용</span></div>
    {showSummary ? <div className="mb-5 grid grid-cols-2 gap-4 border-y border-slate-200 py-4 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-1"><p className="text-xs text-slate-500">누적 잔액 · 전체 기간</p><p className={`mt-1 break-words text-2xl font-semibold tabular-nums ${summary.cumulative.balance < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatCurrency(summary.cumulative.balance)}</p></div>
      <div><p className="text-xs text-slate-500">{year.year}년 세입</p><p className="mt-1 break-words text-lg font-semibold tabular-nums">{formatCurrency(summary.annual.totalIncome)}</p></div>
      <div><p className="text-xs text-slate-500">{year.year}년 세출</p><p className="mt-1 break-words text-lg font-semibold tabular-nums">{formatCurrency(summary.annual.totalExpense)}</p></div>
    </div> : null}
    <div role="tablist" aria-label="클럽 세입 세출" onKeyDown={handleKey} className="mb-3 flex gap-5 border-b border-slate-200">
      {(['incomes', 'expenses'] as const).map(value => <button key={value} type="button" role="tab" data-kind={value} id={`${id}-${value}`} aria-controls={`${id}-panel`} aria-selected={kind === value} onClick={() => select(value)} className={`min-h-11 border-b-2 py-2 text-sm ${kind === value ? 'border-emerald-700 font-semibold text-emerald-800' : 'border-transparent text-slate-500'}`}>{value === 'incomes' ? '세입' : '세출'} <span className="text-xs tabular-nums">{ledger[value].length}</span></button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${kind}`}>
      <p className="mb-2 text-right text-xs text-slate-500">합계 <strong className="ml-1 text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(kind === 'incomes' ? summary.annual.totalIncome : summary.annual.totalExpense)}</strong></p>
      <ul className="divide-y divide-slate-100">{items.slice(0, expanded ? undefined : 5).map(item => <li key={item.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-3">
        <time className="text-xs tabular-nums text-slate-500" title={item.recordedAt ?? '기록일 정보 없음'}>{formatRecordedDate(item.recordedAt)}</time>
        <div className="min-w-0"><p className="break-words text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.description}</p></div>
        <strong className={`text-right text-xs font-semibold tabular-nums sm:text-sm ${kind === 'incomes' ? 'text-emerald-700' : 'text-slate-800'}`}>{kind === 'incomes' ? '+' : '−'}{formatCurrency(item.amount)}</strong>
      </li>)}</ul>
      {!items.length ? <p className="py-6 text-sm text-slate-500">해당 연도의 {kind === 'incomes' ? '세입' : '세출'} 내역이 없습니다.</p> : null}
      {items.length > 5 ? <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-emerald-700">{expanded ? '접기' : `전체 ${items.length}건 보기`}<ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button> : null}
    </div>
  </section>;
}
