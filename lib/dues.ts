import { ROLE_META } from '@/lib/constants';
import type { FiscalYear, PaymentRecord, Profile } from '@/lib/types';

export type DuesStatus = 'paid' | 'due' | 'exempt' | 'future' | 'before';
export const DUES_STATUS_LABELS: Record<DuesStatus, string> = {
  paid: '납부 완료', due: '미납', exempt: '면제', future: '예정', before: '가입 전',
};

export function koreanYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric' }).formatToParts(date);
  return { year: Number(parts.find((part) => part.type === 'year')!.value), month: Number(parts.find((part) => part.type === 'month')!.value) };
}

export function isFeeExempt(member: Profile, fiscalYears: FiscalYear[], payments: PaymentRecord[], year: number, month: number) {
  if (member.member_grade === '간사' || member.fee_exemption_months <= 0 || !member.fee_exemption_start_date) return false;
  const start = Number(member.fee_exemption_start_date.slice(0, 4)) * 12 + Number(member.fee_exemption_start_date.slice(5, 7));
  let remaining = member.fee_exemption_months;
  for (const fiscalYear of [...fiscalYears].sort((a, b) => a.year - b.year)) {
    for (const visibleMonth of [...fiscalYear.visible_months].sort((a, b) => a - b)) {
      if (fiscalYear.year * 12 + visibleMonth < start) continue;
      const payment = payments.find((item) => item.fiscal_year_id === fiscalYear.id && item.member_id === member.id && item.month === visibleMonth);
      if (payment?.manual_exempt || payment?.paid) {
        if (fiscalYear.year === year && visibleMonth === month) return false;
        continue;
      }
      if (remaining <= 0) return false;
      if (fiscalYear.year === year && visibleMonth === month) return true;
      remaining--;
    }
  }
  return false;
}

export function getDuesStatus(member: Profile, year: FiscalYear, month: number, payment: PaymentRecord | undefined, fiscalYears: FiscalYear[], payments: PaymentRecord[], today: Date | null): DuesStatus {
  // Historical payments remain visible even if the member's grade or joining date changed.
  if (payment?.paid) return 'paid';
  if (member.member_grade === '간사' || payment?.manual_exempt) return 'exempt';
  const period = year.year * 12 + month;
  if (member.joined_at) {
    const joined = /^\d{4}-\d{2}/.exec(member.joined_at)?.[0];
    if (joined && period < Number(joined.slice(0, 4)) * 12 + Number(joined.slice(5, 7))) return 'before';
  }
  if (isFeeExempt(member, fiscalYears, payments, year.year, month)) return 'exempt';
  if (!today) return 'future';
  const current = koreanYearMonth(today);
  return period > current.year * 12 + current.month ? 'future' : 'due';
}

export function duesAmount(member: Profile) { return ROLE_META[member.member_grade].fee; }
