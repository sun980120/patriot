'use client';

import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { DUES_STATUS_LABELS, duesAmount, getDuesExemption, getDuesStatus } from '@/lib/dues';
import { DuesExemptionNote } from '@/components/dues-exemption-note';
import { formatCurrency } from '@/lib/utils';
import type { FiscalYear, PaymentRecord, Profile } from '@/lib/types';

export function MemberDuesHistory({ member, year, years, payments, today, onYearChange, onPay }: {
  member?: Profile; year: FiscalYear; years: FiscalYear[]; payments: PaymentRecord[]; today: Date | null;
  onYearChange: (id: string) => void; onPay: (member: Profile, month: number) => void;
}) {
  const cells = member ? [...year.visible_months].sort((a, b) => a - b).map((month) => {
    const payment = payments.find((item) => item.fiscal_year_id === year.id && item.member_id === member.id && item.month === month);
    const status = getDuesStatus(member, year, month, payment, years, payments, today);
    return { month, payment, status, exemption: getDuesExemption(member, payment, status) };
  }) : [];
  return <section aria-label="나의 연간 회비 내역">
    <Link href="/dashboard" className="mb-5 inline-flex min-h-9 items-center gap-1 text-xs text-slate-500 hover:text-emerald-800"><ChevronLeft className="h-4 w-4" />대시보드</Link>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">나의 회비 내역</h1><select aria-label="회비 조회 연도" value={year.id} onChange={(event) => onYearChange(event.target.value)} className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">{years.map((value) => <option key={value.id} value={value.id}>{value.year}년</option>)}</select></div>
    <div className="grid grid-cols-2 gap-4 border-y border-slate-200 py-5"><div><p className="text-xs text-slate-500">연간 납부액</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatCurrency(cells.reduce((sum, cell) => sum + (cell.payment?.paid ? cell.payment.charged_amount : 0), 0))}</p></div><div><p className="text-xs text-slate-500">미납액</p><p className="mt-2 text-xl font-semibold tabular-nums text-rose-700">{formatCurrency(cells.filter((cell) => cell.status === 'due').length * (member ? duesAmount(member) : 0))}</p></div></div>
    <ul className="divide-y divide-slate-200">{cells.map((cell) => <li key={cell.month} className="flex min-h-[76px] items-center justify-between gap-3 py-3"><span><strong className="text-sm font-semibold">{cell.month}월 회비</strong><span className={`mt-1 flex items-center gap-1 text-xs ${cell.status === 'paid' ? 'text-emerald-700' : cell.status === 'due' ? 'text-rose-700' : 'text-slate-500'}`}>{cell.status === 'paid' ? <Check className="h-3 w-3" /> : null}{DUES_STATUS_LABELS[cell.status]}</span><DuesExemptionNote detail={cell.exemption} /></span><span className="flex items-center gap-3"><span className="text-sm tabular-nums">{cell.status === 'paid' ? formatCurrency(cell.payment?.charged_amount ?? 0) : cell.status === 'due' && member ? formatCurrency(duesAmount(member)) : '—'}</span>{cell.status === 'due' && member ? <button type="button" onClick={() => onPay(member, cell.month)} className="inline-flex min-h-10 items-center gap-1 rounded-md border border-slate-200 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">납부하기<ChevronRight className="h-4 w-4" /></button> : null}</span></li>)}</ul>
    {!cells.length ? <p className="py-8 text-sm text-slate-500">납부 내역이 없습니다.</p> : null}
  </section>;
}
