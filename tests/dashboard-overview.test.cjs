const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { dashboardMonth, formatRecordedDate, overviewDuesRows, recentTransactions, upcomingOccurrences } = load('lib/dashboard-overview.ts');
const { formatOccurrenceTime, validCalendarDate } = load('lib/calendar-occurrences.ts');
const { buildNavLinks } = load('lib/navigation.ts');

const year = { id: 'year', year: 2026, visible_months: [5, 6, 7, 8, 9, 10, 11, 12] };
const now = new Date('2026-11-12T01:00:00Z');
const member = { id: 'one', full_name: '회원', member_grade: '정회원', joined_at: '2026-05-01', fee_exemption_months: 0 };
const event = (patch = {}) => ({ id: 'event', title: '정기운동', status: 'PLANNED', start_date: '2026-11-01', end_date: '2026-11-01', start_time: '19:00:00', end_time: '21:00:00', recurrence_type: 'WEEKLY', recurrence_until: null, recurrence_exclusion_dates: [], ...patch });

test('default period follows the selected fiscal year and Korean current month', () => {
  assert.equal(dashboardMonth(year, now), 11);
  assert.equal(dashboardMonth({ ...year, year: 2025 }, now), 12);
  assert.equal(dashboardMonth({ ...year, year: 2027 }, now), 5);
});
test('overview shows only recent months and uses current-month dues amount', () => {
  const rows = overviewDuesRows([member], year, [year], [], now);
  assert.equal(Array.from(rows[0].cells, (cell) => cell.month).join(','), '9,10,11');
  assert.equal(rows[0].dueAmount, 20_000);
});
test('weekly agenda uses future occurrences instead of the original event date', () => {
  const result = upcomingOccurrences([event()], now);
  assert.equal(result[0].startDate, '2026-11-15');
  assert.equal(formatOccurrenceTime(result[0]), '19:00-21:00');
});
test('excluded weekly occurrence is not shown', () => {
  const result = upcomingOccurrences([event({ recurrence_exclusion_dates: ['2026-11-15'] })], now);
  assert.equal(result[0].startDate, '2026-11-22');
});
test('monthly recurrence and recurrence end are respected', () => {
  const result = upcomingOccurrences([event({ start_date: '2026-10-15', end_date: '2026-10-15', recurrence_type: 'MONTHLY', recurrence_until: '2026-11-15' })], now, 5);
  assert.equal(result.length, 1);
  assert.equal(result[0].startDate, '2026-11-15');
});
test('multi-day event is shown once even when it spans multiple agenda days', () => {
  const result = upcomingOccurrences([event({ start_date: '2026-11-11', end_date: '2026-11-13', recurrence_type: 'NONE' })], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-11-12');
  assert.equal(result[0].endDate, '2026-11-13');
});
test('cancelled and completed events are not upcoming', () => {
  assert.equal(upcomingOccurrences([event({ status: 'CANCELLED' }), event({ status: 'COMPLETED' })], now).length, 0);
});
test('finished timed events are removed while all-day events remain', () => {
  const finished = event({ start_date: '2026-11-12', end_date: '2026-11-12', start_time: '08:00', end_time: '09:00', recurrence_type: 'NONE' });
  const allDay = event({ ...finished, id: 'all-day', start_time: null, end_time: null });
  const result = upcomingOccurrences([finished, allDay], now);
  assert.equal(result.length, 1);
  assert.equal(result[0].event.id, 'all-day');
});
test('Korean date boundary determines agenda day', () => {
  const result = upcomingOccurrences([event({ start_date: '2026-11-12', end_date: '2026-11-12', start_time: null, end_time: null, recurrence_type: 'NONE' })], new Date('2026-11-11T15:01:00Z'));
  assert.equal(result[0].date, '2026-11-12');
});

const bundle = {
  profile: { id: 'one' }, profiles: [{ id: 'one', full_name: '본인' }, { id: 'two', full_name: '다른 회원' }],
  payments: [
    { id: 'p1', fiscal_year_id: 'year', member_id: 'one', month: 11, paid: true, charged_amount: 20_000, updated_at: '2026-11-10T12:00:00' },
    { id: 'p2', fiscal_year_id: 'year', member_id: 'two', month: 11, paid: true, charged_amount: 20_000, updated_at: '2026-11-11T12:00:00' },
    { id: 'p3', fiscal_year_id: 'year', member_id: 'one', month: 10, paid: false, charged_amount: 0 },
  ], incomes: [{ id: 'i1', fiscal_year_id: 'year', label: '기타 세입', amount: 1000, created_at: null }, { id: 'duplicate', fiscal_year_id: 'year', charge_group_id: 'group', amount: 2000 }],
  expenses: [{ id: 'e1', fiscal_year_id: 'year', label: '대관료', amount: 50_000, created_at: '2026-11-12T09:00:00' }],
  chargeGroups: [{ id: 'group', fiscal_year_id: 'year', title: '대회비', participant_charges: [{ id: 'charge', member_id: 'one', member_name: '본인', status: 'PAID', amount: 2000, paid_at: '2026-11-09T12:00:00Z' }] }],
};
test('recent transactions are chronological without inventing missing dates', () => {
  const rows = recentTransactions(bundle, 'year', true);
  assert.equal(rows[0].id, 'expense-e1');
  assert.equal(rows.at(-1).recordedAt, null);
  assert.equal(rows.length, 5);
  assert.equal(rows.some((row) => row.id === 'income-duplicate'), false);
});
test('ordinary members do not see other members payment details', () => {
  const rows = recentTransactions(bundle, 'year', false);
  assert.equal(rows.some((row) => row.id === 'payment-p2'), false);
  assert.equal(rows.some((row) => row.id === 'payment-p1'), true);
});
test('unselected fiscal year does not leak into the transaction list', () => {
  assert.equal(recentTransactions(bundle, 'another-year', true).length, 0);
});
test('record dates display in Korean time without inventing missing dates', () => {
  assert.equal(formatRecordedDate('2026-11-11T16:00:00Z'), '11.12');
  assert.equal(formatRecordedDate('2026-11-12T01:00:00'), '11.12');
  assert.equal(formatRecordedDate(null), '—');
  assert.equal(formatRecordedDate('invalid'), '—');
});
test('calendar deep links reject invalid and non-string dates', () => {
  assert.equal(validCalendarDate('2026-02-30'), undefined);
  assert.equal(validCalendarDate('2028-02-29'), '2028-02-29');
  assert.equal(validCalendarDate(['2026-11-15']), undefined);
  assert.equal(validCalendarDate('<script>'), undefined);
});
test('navigation preserves role restrictions and exposes dues management', () => {
  const ordinary = buildNavLinks({ app_role: 'member' });
  assert.equal(ordinary.some((link) => link.href.startsWith('/admin/')), false);
  assert.equal(ordinary.some((link) => link.href === '/dashboard?view=dues'), true);
  assert.equal(buildNavLinks({ app_role: 'admin' }).some((link) => link.href === '/admin/members'), true);
  assert.equal(buildNavLinks(null).length, 2);
});
