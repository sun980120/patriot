import { addDays, expandOccurrences, parseDateInput, type CalendarOccurrence } from '@/lib/calendar-occurrences';
import { duesAmount, getDuesStatus, koreanYearMonth } from '@/lib/dues';
import type { ClubEvent, DashboardBundle, FiscalYear, PaymentRecord, Profile } from '@/lib/types';

export function dashboardMonth(year: FiscalYear, today: Date | null) {
  const months = [...year.visible_months].sort((a, b) => a - b);
  if (!today) return months.at(-1) ?? 1;
  const current = koreanYearMonth(today);
  if (year.year < current.year) return months.at(-1) ?? 12;
  if (year.year > current.year) return months[0] ?? 1;
  return months.filter((month) => month <= current.month).at(-1) ?? months[0] ?? 1;
}

export function overviewDuesRows(members: Profile[], year: FiscalYear, years: FiscalYear[], payments: PaymentRecord[], today: Date | null) {
  const month = dashboardMonth(year, today);
  const recentMonths = [...year.visible_months].sort((a, b) => a - b).filter((value) => value <= month).slice(-3);
  return members.map((member) => {
    const history = payments.filter((payment) => payment.member_id === member.id);
    const cells = recentMonths.map((value) => {
      const payment = history.find((item) => item.fiscal_year_id === year.id && item.month === value);
      return { month: value, payment, status: getDuesStatus(member, year, value, payment, years, history, today) };
    });
    const current = cells.find((cell) => cell.month === month);
    return { member, cells, status: current?.status ?? 'future', dueAmount: current?.status === 'due' ? duesAmount(member) : 0 };
  });
}

export type RecentTransaction = { id: string; title: string; description: string; amount: number; direction: 'income' | 'expense'; recordedAt: string | null };

function recordedTimestamp(value: string | null) {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}+09:00`;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

export function formatRecordedDate(value: string | null) {
  const time = recordedTimestamp(value);
  if (time === null) return '—';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' }).formatToParts(new Date(time));
  return `${parts.find((part) => part.type === 'month')!.value}.${parts.find((part) => part.type === 'day')!.value}`;
}

export function recentTransactions(bundle: DashboardBundle, fiscalYearId: string, admin: boolean): RecentTransaction[] {
  const rows: RecentTransaction[] = [];
  const names = new Map(bundle.profiles.map((profile) => [profile.id, profile.full_name]));
  for (const payment of bundle.payments) {
    if (payment.fiscal_year_id !== fiscalYearId || !payment.paid || payment.charged_amount <= 0) continue;
    if (!admin && payment.member_id !== bundle.profile?.id) continue;
    rows.push({ id: `payment-${payment.id}`, title: `${payment.month}월 회비`, description: `${names.get(payment.member_id) ?? '회원'} · 납부 처리`, amount: payment.charged_amount, direction: 'income', recordedAt: payment.updated_at ?? null });
  }
  for (const income of bundle.incomes) {
    if (income.fiscal_year_id !== fiscalYearId || income.charge_group_id) continue;
    rows.push({ id: `income-${income.id}`, title: income.label, description: '기타 세입', amount: income.amount, direction: 'income', recordedAt: income.created_at ?? null });
  }
  for (const expense of bundle.expenses) {
    if (expense.fiscal_year_id !== fiscalYearId) continue;
    rows.push({ id: `expense-${expense.id}`, title: expense.label, description: '지출', amount: expense.amount, direction: 'expense', recordedAt: expense.created_at ?? null });
  }
  for (const group of bundle.chargeGroups) {
    if (group.fiscal_year_id !== fiscalYearId) continue;
    for (const charge of group.participant_charges) {
      if (charge.status !== 'PAID' || (!admin && charge.member_id !== bundle.profile?.id)) continue;
      rows.push({ id: `charge-${charge.id}`, title: group.title, description: `${charge.member_name} · 추가 비용`, amount: charge.amount, direction: 'income', recordedAt: charge.paid_at });
    }
  }
  return rows.sort((a, b) => (recordedTimestamp(b.recordedAt) ?? 0) - (recordedTimestamp(a.recordedAt) ?? 0) || a.id.localeCompare(b.id));
}

export function upcomingOccurrences(events: ClubEvent[], today: Date, limit = 2): CalendarOccurrence[] {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(today);
  const occurrences = expandOccurrences(events.filter((event) => event.status === 'PLANNED'), parseDateInput(day), parseDateInput(addDays(day, 60)));
  const unique = new Map<string, CalendarOccurrence>();
  for (const occurrence of occurrences) {
    if (occurrence.endDate === day && occurrence.endTime && occurrence.endTime.slice(0, 5) < time) continue;
    const key = `${occurrence.event.id}:${occurrence.startDate}`;
    if (!unique.has(key)) unique.set(key, occurrence);
  }
  return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.event.title.localeCompare(b.event.title)).slice(0, limit);
}
