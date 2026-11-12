const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { summarizeFinance } = load('lib/finance-summary.ts');
const { mockBundle } = load('lib/mock-data.ts');

const empty = () => ({ payments: [], incomes: [], expenses: [], chargeGroups: [] });

test('sample discrepancy is a period mismatch, not a missing 70000 won receipt', () => {
  const result = summarizeFinance(mockBundle, 'year-2026');
  assert.equal(result.annual.totalIncome, 520_000);
  assert.equal(result.annual.totalExpense, 200_000);
  assert.equal(result.annual.balance, 320_000);
  assert.equal(result.cumulative.totalIncome, 590_000);
  assert.equal(result.cumulative.totalExpense, 200_000);
  assert.equal(result.cumulative.balance, 390_000);
  assert.equal(result.cumulative.balance - result.annual.balance, 70_000);
});
test('cumulative income minus expense always reconciles with cumulative balance', () => {
  for (const year of mockBundle.fiscalYears) {
    const result = summarizeFinance(mockBundle, year.id);
    assert.equal(result.cumulative.totalIncome - result.cumulative.totalExpense, result.cumulative.balance);
    assert.equal(result.annual.totalIncome - result.annual.totalExpense, result.annual.balance);
  }
});
test('selecting another year does not change the all-period totals', () => {
  const first = summarizeFinance(mockBundle, 'year-2026').cumulative;
  const second = summarizeFinance(mockBundle, 'year-2027').cumulative;
  assert.deepEqual(first, second);
});
test('unpaid membership fees are not included in received income', () => {
  const data = { ...empty(), payments: [{ fiscal_year_id: 'a', paid: false, charged_amount: 20000 }, { fiscal_year_id: 'a', paid: true, charged_amount: 12000 }] };
  assert.equal(summarizeFinance(data, 'a').annual.membershipIncome, 12000);
});
test('actual historical charge amount is preserved rather than recalculated from grade', () => {
  const data = { ...empty(), payments: [{ fiscal_year_id: 'a', paid: true, charged_amount: 10000, applied_grade: '정회원' }] };
  assert.equal(summarizeFinance(data, 'a').cumulative.totalIncome, 10000);
});
test('additional charge receipts and settlement surplus are not double counted', () => {
  const data = {
    ...empty(),
    chargeGroups: [{ fiscal_year_id: 'a', participant_paid_total: 150000, participant_charge_total: 200000 }],
    incomes: [{ fiscal_year_id: 'a', charge_group_id: 'settlement', amount: 50000 }, { fiscal_year_id: 'a', charge_group_id: null, amount: 400000 }],
    expenses: [{ fiscal_year_id: 'a', amount: 120000 }],
  };
  const result = summarizeFinance(data, 'a');
  assert.equal(result.annual.additionalIncome, 150000);
  assert.equal(result.annual.otherIncome, 400000);
  assert.equal(result.annual.totalIncome, 550000);
  assert.equal(result.annual.balance, 430000);
});
test('paid fees assigned to a later fiscal year remain in cumulative cash receipts', () => {
  const result = summarizeFinance(mockBundle, 'year-2027');
  assert.equal(result.annual.membershipIncome, 70000);
  assert.equal(result.cumulative.membershipIncome, 160000);
});
test('expenses across all years and a negative balance are supported', () => {
  const data = { ...empty(), expenses: [{ fiscal_year_id: 'a', amount: 50000 }, { fiscal_year_id: 'b', amount: 30000 }] };
  const result = summarizeFinance(data, 'a');
  assert.equal(result.annual.balance, -50000);
  assert.equal(result.cumulative.balance, -80000);
});
test('empty and unknown fiscal years produce zero annual totals', () => {
  assert.equal(summarizeFinance(empty(), 'unknown').cumulative.balance, 0);
  assert.equal(summarizeFinance(mockBundle, 'unknown').annual.totalIncome, 0);
});
