const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { clubLedgerEntries, summarizeFinance } = load('lib/finance-summary.ts');
const { calculateChargeSettlement } = load('lib/charge-settlement.ts');
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
test('100000 spent and 60000 received reduce club funds by exactly 40000', () => {
  const allocation = calculateChargeSettlement(200000, 60000, 100000);
  const data = {
    ...empty(),
    chargeGroups: [{ fiscal_year_id: 'a', participant_paid_total: 60000 }],
    incomes: [{ fiscal_year_id: 'a', charge_group_id: 'reference', amount: allocation.surplus }],
    expenses: [{ fiscal_year_id: 'a', amount: allocation.appliedSupport }, { fiscal_year_id: 'a', amount: allocation.participantExpense }],
  };
  const result = summarizeFinance(data, 'a');
  assert.equal(result.cumulative.totalIncome, 60000);
  assert.equal(result.cumulative.totalExpense, 100000);
  assert.equal(result.cumulative.balance, -40000);
});

test('public club ledger reconciles with selected-year income and expense totals', () => {
  for (const year of mockBundle.fiscalYears) {
    const ledger = clubLedgerEntries(mockBundle, year.id);
    const totals = summarizeFinance(mockBundle, year.id).annual;
    assert.equal(ledger.incomes.reduce((sum, item) => sum + item.amount, 0), totals.totalIncome);
    assert.equal(ledger.expenses.reduce((sum, item) => sum + item.amount, 0), totals.totalExpense);
  }
});
test('membership receipts are grouped by month without exposing member names or IDs', () => {
  const data = { ...empty(), payments: [
    { member_id:'private-one', full_name:'비공개 회원', fiscal_year_id:'a', month:11, paid:true, charged_amount:12000, updated_at:'2026-11-01T12:00:00' },
    { member_id:'private-two', fiscal_year_id:'a', month:11, paid:true, charged_amount:10000, updated_at:'2026-11-03T12:00:00' },
    { member_id:'private-three', fiscal_year_id:'a', month:11, paid:false, charged_amount:20000 },
  ] };
  const ledger = clubLedgerEntries(data,'a');
  assert.equal(ledger.incomes.length,1);
  assert.equal(ledger.incomes[0].amount,22000);
  assert.equal(ledger.incomes[0].recordedAt,'2026-11-03T12:00:00');
  assert.equal(JSON.stringify(ledger).includes('private'),false);
  assert.equal(JSON.stringify(ledger).includes('비공개'),false);
});
test('club ledger excludes reference surplus and preserves expenses and advance receipts', () => {
  const data = { ...empty(), payments:[{ fiscal_year_id:'a', month:12, paid:true, charged_amount:10000 }],
    chargeGroups:[{ id:'g', title:'대회비', fiscal_year_id:'a', participant_paid_total:60000, participant_charges:[{ status:'PAID', paid_at:null }] }],
    incomes:[{ id:'ref', fiscal_year_id:'a', charge_group_id:'g', amount:60000, label:'참고 잔액' }],
    expenses:[{ id:'cost', fiscal_year_id:'a', charge_group_id:'g', amount:100000, label:'실제 지출' }],
  };
  const ledger = clubLedgerEntries(data,'a');
  assert.equal(ledger.incomes.reduce((sum,item)=>sum+item.amount,0),70000);
  assert.equal(ledger.incomes.some(item=>item.label==='참고 잔액'),false);
  assert.equal(ledger.expenses[0].amount,100000);
  assert.equal(ledger.incomes.every(item=>item.recordedAt===null),true);
  assert.equal(clubLedgerEntries(data,'other').incomes.length,0);
});
