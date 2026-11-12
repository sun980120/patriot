const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadTypescript = require('./load-typescript.cjs');

const { getDuesStatus, getDuesExemption, isFeeExempt, isDuesPayable, koreanYearMonth, duesAmount } = loadTypescript('lib/dues.ts');
const year = { id: '2026', year: 2026, visible_months: [5, 6, 7, 8, 9, 10, 11, 12] };
const member = { id: 'member', member_grade: '정회원', joined_at: '2026-05-02T09:00:00', fee_exemption_months: 0, fee_exemption_start_date: null };
const now = new Date('2026-11-11T00:00:00Z');
const payment = (month, values = {}) => ({ fiscal_year_id: year.id, member_id: member.id, month, paid: false, manual_exempt: false, ...values });
const status = (person, month, record, history = record ? [record] : [], date = now) => getDuesStatus(person, year, month, record, [year], history, date);

test('historical payment stays paid after a joining-date or grade change', () => {
  assert.equal(status({ ...member, joined_at: '2026-11-01', member_grade: '간사' }, 5, payment(5, { paid: true })), 'paid');
});
test('joining month is eligible, earlier months are not', () => {
  const person = { ...member, joined_at: '2026-09-30T23:00:00' };
  assert.equal(status(person, 8), 'before');
  assert.equal(status(person, 9), 'due');
});
test('future period is scheduled while an advance payment remains paid', () => {
  assert.equal(status(member, 12), 'future');
  assert.equal(status(member, 12, payment(12, { paid: true })), 'paid');
});
test('unpaid and scheduled dues can be paid without counting scheduled dues as overdue', () => {
  assert.equal(isDuesPayable(status(member, 11)), true);
  assert.equal(isDuesPayable(status(member, 12)), true);
  assert.equal(status(member, 12), 'future');
  assert.equal(isDuesPayable(status(member, 12, payment(12, { paid: true }))), false);
});
test('advance payment does not bypass joining dates or exemptions', () => {
  assert.equal(isDuesPayable(status({ ...member, joined_at: '2027-01-01' }, 12)), false);
  assert.equal(isDuesPayable(status({ ...member, member_grade: '간사' }, 12)), false);
  assert.equal(isDuesPayable(status(member, 12, payment(12, { manual_exempt: true }))), false);
  const exempt = { ...member, fee_exemption_months: 1, fee_exemption_start_date: '2026-12-01' };
  assert.equal(isDuesPayable(status(exempt, 12)), false);
});
test('staff and manually exempt records are not unpaid', () => {
  assert.equal(status({ ...member, member_grade: '간사' }, 11), 'exempt');
  assert.equal(status(member, 11, payment(11, { manual_exempt: true })), 'exempt');
});
test('manual exemption does not consume automatic allowance', () => {
  const person = { ...member, fee_exemption_months: 1, fee_exemption_start_date: '2026-05-01' };
  const history = [payment(5, { manual_exempt: true })];
  assert.equal(isFeeExempt(person, [year], history, 2026, 6), true);
  assert.equal(isFeeExempt(person, [year], history, 2026, 7), false);
});
test('paid months do not consume automatic allowance', () => {
  const person = { ...member, fee_exemption_months: 1, fee_exemption_start_date: '2026-05-01' };
  assert.equal(isFeeExempt(person, [year], [payment(5, { paid: true })], 2026, 6), true);
});
test('automatic allowance carries across fiscal years in chronological order', () => {
  const next = { id: '2027', year: 2027, visible_months: [2, 1] };
  const person = { ...member, fee_exemption_months: 2, fee_exemption_start_date: '2026-12-01' };
  assert.equal(isFeeExempt(person, [next, year], [], 2027, 1), true);
  assert.equal(isFeeExempt(person, [next, year], [], 2027, 2), false);
});
test('Korean month boundary determines whether a fee is due', () => {
  const boundary = new Date('2026-10-31T15:00:00Z');
  const current = koreanYearMonth(boundary);
  assert.equal(current.year, 2026);
  assert.equal(current.month, 11);
  assert.equal(status(member, 11, undefined, [], boundary), 'due');
});
test('hydration does not temporarily classify future fees as unpaid', () => {
  assert.equal(status(member, 11, undefined, [], null), 'future');
});
test('mixed membership grades retain their actual fee rates', () => {
  assert.equal(duesAmount(member), 20_000);
  assert.equal(duesAmount({ ...member, member_grade: '준회원' }), 10_000);
  assert.equal(duesAmount({ ...member, member_grade: '간사' }), 0);
});
test('exemption details preserve manual reasons without classifying paid records as exempt', () => {
  const record = payment(11, { manual_exempt: true, exemption_reason: ' 부상 ' });
  assert.equal(getDuesExemption(member, record, 'exempt').reason, '부상');
  assert.equal(getDuesExemption(member, record, 'exempt').label, '수동 면제');
  assert.equal(getDuesExemption(member, record, 'paid'), null);
});
test('missing exemption reason is explicit rather than invented', () => {
  assert.equal(getDuesExemption(member, payment(11, { manual_exempt: true }), 'exempt').reason, '사유 미입력');
});
test('automatic exemption describes its start date and configured allowance', () => {
  const person = { ...member, fee_exemption_months: 2, fee_exemption_start_date: '2026-05-01' };
  const details = getDuesExemption(person, undefined, 'exempt');
  assert.equal(details.kind, 'automatic');
  assert.equal(details.reason, '2026-05-01 시작 · 2회 면제');
});
