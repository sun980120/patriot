import { addDays, expandOccurrences, parseDateInput, type CalendarOccurrence } from '@/lib/calendar-occurrences';
import { duesAmount, getDuesExemption, getDuesStatus, koreanYearMonth, type DuesExemption, type DuesStatus } from '@/lib/dues';
import type { ClubEvent, DashboardBundle, FiscalYear, PaymentRecord, Profile } from '@/lib/types';

export type DuesPeriod = {
  fiscalYearId: string; year: number; month: number; status: DuesStatus;
  amount: number; exemption: DuesExemption | null;
};

export function overviewDuesRows(members: Profile[], years: FiscalYear[], payments: PaymentRecord[], today: Date | null) {
  const current = today ? koreanYearMonth(today) : null;
  const periods = [...years].sort((a, b) => a.year - b.year).flatMap((year) =>
    [...year.visible_months].sort((a, b) => a - b).map((month) => ({ year, month }))
      .filter(({ month }) => current && year.year * 12 + month <= current.year * 12 + current.month));
  return members.map((member) => {
    const history = payments.filter((payment) => payment.member_id === member.id);
    const cells: DuesPeriod[] = periods.map(({ year, month }) => {
      const payment = history.find((item) => item.fiscal_year_id === year.id && item.month === month);
      const status = getDuesStatus(member, year, month, payment, years, history, today);
      return { fiscalYearId: year.id, year: year.year, month, status, amount: status === 'due' ? duesAmount(member) : payment?.paid ? payment.charged_amount : 0, exemption: getDuesExemption(member, payment, status) };
    });
    const unpaid = cells.filter((cell) => cell.status === 'due');
    const exemptions = cells.filter((cell) => cell.status === 'exempt');
    return { member, cells, unpaid, exemptions, dueAmount: unpaid.reduce((sum, cell) => sum + cell.amount, 0) };
  });
}

export function formatDuesPeriods(periods: { year: number; month: number }[]) {
  const grouped = new Map<number, Set<number>>();
  periods.forEach(({ year, month }) => {
    if (!grouped.has(year)) grouped.set(year, new Set());
    grouped.get(year)!.add(month);
  });
  return [...grouped].sort(([a], [b]) => a - b)
    .map(([year, months]) => `${year}년 ${[...months].sort((a, b) => a - b).join('·')}월`).join(' / ');
}

export function groupExemptions(periods: DuesPeriod[]) {
  const groups = new Map<string, { detail: DuesExemption; periods: DuesPeriod[] }>();
  for (const period of periods) {
    if (!period.exemption) continue;
    const key = `${period.exemption.kind}:${period.exemption.reason}`;
    if (!groups.has(key)) groups.set(key, { detail: period.exemption, periods: [] });
    groups.get(key)!.periods.push(period);
  }
  return [...groups.values()];
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
