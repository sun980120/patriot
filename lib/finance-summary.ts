import type { DashboardBundle } from '@/lib/types';

export function summarizeFinance(bundle: DashboardBundle, fiscalYearId: string) {
  const calculate = (yearId?: string) => {
    const matches = (id: string) => yearId === undefined || id === yearId;
    const membershipIncome = bundle.payments
      .filter((payment) => matches(payment.fiscal_year_id) && payment.paid)
      .reduce((sum, payment) => sum + payment.charged_amount, 0);
    const additionalIncome = bundle.chargeGroups
      .filter((group) => matches(group.fiscal_year_id))
      .reduce((sum, group) => sum + group.participant_paid_total, 0);
    // Settlement surplus entries are already represented by participant receipts minus expenses.
    const otherIncome = bundle.incomes
      .filter((income) => matches(income.fiscal_year_id) && !income.charge_group_id)
      .reduce((sum, income) => sum + income.amount, 0);
    const totalExpense = bundle.expenses
      .filter((expense) => matches(expense.fiscal_year_id))
      .reduce((sum, expense) => sum + expense.amount, 0);
    const totalIncome = membershipIncome + additionalIncome + otherIncome;
    return { membershipIncome, additionalIncome, otherIncome, totalIncome, totalExpense, balance: totalIncome - totalExpense };
  };
  return { cumulative: calculate(), annual: calculate(fiscalYearId) };
}

export type FinanceSummary = ReturnType<typeof summarizeFinance>;

export type ClubLedgerEntry = {
  id: string; label: string; amount: number; description: string; recordedAt: string | null;
};

function ledgerTimestamp(value: string | null) {
  if (!value) return 0;
  const date = Date.parse(/(?:Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}+09:00`);
  return Number.isFinite(date) ? date : 0;
}

export function clubLedgerEntries(bundle: DashboardBundle, fiscalYearId: string) {
  const incomes: ClubLedgerEntry[] = [];
  const months = new Map<number, { amount: number; count: number; recordedAt: string | null }>();
  for (const payment of bundle.payments) {
    if (payment.fiscal_year_id !== fiscalYearId || !payment.paid) continue;
    const month = months.get(payment.month) ?? { amount: 0, count: 0, recordedAt: null };
    month.amount += payment.charged_amount;
    month.count++;
    if (ledgerTimestamp(payment.updated_at ?? null) > ledgerTimestamp(month.recordedAt)) month.recordedAt = payment.updated_at ?? null;
    months.set(payment.month, month);
  }
  for (const [month, total] of months) {
    incomes.push({ id: `dues-${month}`, label: `${month}월 회비 수납`, amount: total.amount, description: `월회비 · ${total.count}건 합계`, recordedAt: total.recordedAt });
  }
  for (const group of bundle.chargeGroups) {
    if (group.fiscal_year_id !== fiscalYearId || group.participant_paid_total === 0) continue;
    const dates = group.participant_charges.filter(charge => charge.status === 'PAID').map(charge => charge.paid_at).sort((a, b) => ledgerTimestamp(b) - ledgerTimestamp(a));
    incomes.push({ id: `charge-${group.id}`, label: group.title, amount: group.participant_paid_total, description: '추가 비용 수납 합계', recordedAt: dates[0] ?? null });
  }
  incomes.push(...bundle.incomes.filter(entry => entry.fiscal_year_id === fiscalYearId && !entry.charge_group_id).map(entry => ({ id: `income-${entry.id}`, label: entry.label, amount: entry.amount, description: '기타 세입', recordedAt: entry.created_at ?? null })));
  const expenses: ClubLedgerEntry[] = bundle.expenses.filter(entry => entry.fiscal_year_id === fiscalYearId).map(entry => ({ id: `expense-${entry.id}`, label: entry.label, amount: entry.amount, description: entry.charge_group_id ? '추가 비용 정산 지출' : '세출', recordedAt: entry.created_at ?? null }));
  const compare = (a: ClubLedgerEntry, b: ClubLedgerEntry) => ledgerTimestamp(b.recordedAt) - ledgerTimestamp(a.recordedAt) || a.id.localeCompare(b.id);
  return { incomes: incomes.sort(compare), expenses: expenses.sort(compare) };
}
