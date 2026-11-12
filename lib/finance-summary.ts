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
