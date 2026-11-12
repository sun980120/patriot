const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-typescript.cjs');
const { dashboardSnapshot, formatDuesPeriods, formatRecordedDate, groupExemptions, overviewDuesRows, recentTransactions, upcomingOccurrences } = load('lib/dashboard-overview.ts');
const { formatOccurrenceTime, validCalendarDate } = load('lib/calendar-occurrences.ts');
const { buildNavLinks } = load('lib/navigation.ts');

const year = { id: 'year', year: 2026, visible_months: [5, 6, 7, 8, 9, 10, 11, 12] };
const now = new Date('2026-11-12T01:00:00Z');
const member = { id: 'one', full_name: '회원', member_grade: '정회원', joined_at: '2026-05-01', fee_exemption_months: 0 };
const event = (patch = {}) => ({ id: 'event', title: '정기운동', status: 'PLANNED', start_date: '2026-11-01', end_date: '2026-11-01', start_time: '19:00:00', end_time: '21:00:00', recurrence_type: 'WEEKLY', recurrence_until: null, recurrence_exclusion_dates: [], ...patch });

test('overview includes all unpaid months from May, not just recent or current months', () => {
  const rows = overviewDuesRows([member], [year], [], now);
  assert.equal(Array.from(rows[0].unpaid, (cell) => cell.month).join(','), '5,6,7,8,9,10,11');
  assert.equal(rows[0].dueAmount, 140_000);
});
test('member who paid November remains an arrears member for older unpaid months', () => {
  const payments = [{ fiscal_year_id: 'year', member_id: 'one', month: 11, paid: true, charged_amount: 20000 }];
  const row = overviewDuesRows([member], [year], payments, now)[0];
  assert.equal(row.unpaid.length, 6);
  assert.equal(row.dueAmount, 120000);
  assert.equal(formatDuesPeriods(row.unpaid), '2026년 5·6·7·8·9·10월');
});
test('arrears are retained across fiscal years', () => {
  const previous = { id: 'previous', year: 2025, visible_months: [11,12] };
  const row = overviewDuesRows([{ ...member, joined_at: '2025-01-01' }], [year, previous], [], now)[0];
  assert.equal(row.unpaid.length, 9);
  assert.equal(row.unpaid[0].fiscalYearId, 'previous');
  assert.equal(row.dueAmount, 180000);
});
test('all arrears members are retained rather than silently capped at six', () => {
  const people = Array.from({ length: 9 }, (_, i) => ({ ...member, id: String(i) }));
  assert.equal(overviewDuesRows(people, [year], [], now).filter((row) => row.unpaid.length).length, 9);
});
test('manual and automatic exemption reasons retain their actual periods', () => {
  const person = { ...member, fee_exemption_months: 1, fee_exemption_start_date: '2026-05-01' };
  const payments = [{ fiscal_year_id: 'year', member_id: 'one', month: 5, paid: false, manual_exempt: true, exemption_reason: '부상' }];
  const row = overviewDuesRows([person], [year], payments, now)[0];
  assert.equal(row.exemptions.length, 2);
  assert.equal(row.unpaid.length, 5);
  const groups = groupExemptions(row.exemptions);
  assert.equal(groups[0].detail.reason, '부상');
  assert.equal(groups[0].periods[0].month, 5);
  assert.equal(groups[1].detail.kind, 'automatic');
  assert.equal(groups[1].periods[0].month, 6);
});
test('joining before and future periods do not enter overdue totals', () => {
  const row = overviewDuesRows([{ ...member, joined_at: '2026-10-15' }], [year], [], now)[0];
  assert.equal(Array.from(row.unpaid, (cell) => cell.month).join(','), '10,11');
  assert.equal(row.dueAmount, 40000);
});
test('staff exemption content covers all elapsed configured months', () => {
  const row = overviewDuesRows([{ ...member, member_grade: '간사' }], [year], [], now)[0];
  assert.equal(row.dueAmount, 0);
  assert.equal(row.exemptions.length, 7);
  assert.equal(row.exemptions[0].exemption.label, '간사 면제');
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

const snapshotBundle = (patch = {}) => ({ profile: member, fiscalYears: [year], profiles: [member], payments: [], chargeGroups: [], ...patch });
test('monthly collection and all-period arrears have different scopes', () => {
  const data = snapshotBundle({ payments: [{ fiscal_year_id: year.id, member_id: member.id, month: 11, paid: true, charged_amount: 20000 }] });
  const result = dashboardSnapshot(data, year, [member], true, now);
  assert.equal(result.month, 11);
  assert.equal(result.monthly.paid, 1);
  assert.equal(result.monthly.due, 0);
  assert.equal(result.monthly.rate, 100);
  assert.equal(result.unpaidAmount, 120000);
  assert.equal(result.firstDue.month, 5);
  assert.equal(result.lastDue.month, 10);
});
test('monthly target excludes exemptions and before-joining periods', () => {
  const people = [member, { ...member, id:'junior', member_grade:'준회원' }, { ...member, id:'staff', member_grade:'간사' }, { ...member, id:'later', joined_at:'2026-12-01' }];
  const result = dashboardSnapshot(snapshotBundle(), year, people, true, now);
  assert.equal(result.monthly.target, 2);
  assert.equal(result.monthly.dueAmount, 30000);
  assert.equal(result.monthly.exemptions.length, 1);
});
test('member dashboard scopes both dues and additional charges to the signed-in member', () => {
  const data = snapshotBundle({ chargeGroups: [{ id:'group', participant_charges:[{ member_id:'one', status:'UNPAID', amount:30000 }, { member_id:'two', status:'UNPAID', amount:50000 }] }] });
  const result = dashboardSnapshot(data, year, [member, { ...member, id:'two' }], false, now);
  assert.equal(result.rows.length, 1);
  assert.equal(result.additional.length, 1);
  assert.equal(result.additionalAmount, 30000);
  assert.equal(result.unpaidAmount, 140000);
});
test('future year uses its first configured month for advance-payment progress', () => {
  const next = { ...year, id:'next', year:2027, visible_months:[3,1,2] };
  const data = snapshotBundle({ fiscalYears:[year,next], payments:[{ member_id:'one', fiscal_year_id:'next', month:1, paid:true, charged_amount:12000 }] });
  const result = dashboardSnapshot(data,next,[member],true,now);
  assert.equal(result.month,1);
  assert.equal(result.monthly.rate,100);
  assert.equal(result.unpaidAmount,140000);
  assert.equal(result.ownPaidAmount,12000);
});
test('own annual paid totals include future advance payments and historical amounts', () => {
  const data = snapshotBundle({ payments:[{ member_id:'one', fiscal_year_id:year.id, month:12, paid:true, charged_amount:10000 }, { member_id:'two', fiscal_year_id:year.id, month:12, paid:true, charged_amount:20000 }] });
  const result = dashboardSnapshot(data,year,[member],false,now);
  assert.equal(result.ownPaidCount,1);
  assert.equal(result.ownPaidAmount,10000);
  assert.equal(result.unpaidMonths,7);
});
test('settlement tasks require unpaid settlement state and at least one fully paid participant', () => {
  const data = snapshotBundle({ chargeGroups:[
    { id:'ready', settlement_completed:false, participant_charges:[{ status:'PAID' }] },
    { id:'empty', settlement_completed:false, participant_charges:[] },
    { id:'unpaid', settlement_completed:false, participant_charges:[{ status:'UNPAID' }] },
    { id:'done', settlement_completed:true, participant_charges:[{ status:'PAID' }] },
  ] });
  assert.equal(dashboardSnapshot(data,year,[member],true,now).readyGroups.map(g=>g.id).join(','),'ready');
  assert.equal(dashboardSnapshot(data,year,[member],false,now).readyGroups.length,0);
});
test('personal recent activity does not include club ledger or other members receipts', () => {
  const rows = recentTransactions(bundle,'year',false,true);
  assert.equal(rows.map(item=>item.id).sort().join(','),'charge-charge,payment-p1');
});
test('empty and hydrating dashboards do not invent overdue amounts', () => {
  const data = snapshotBundle();
  const hydrating = dashboardSnapshot(data,year,[member],true,null);
  assert.equal(hydrating.unpaidAmount,0);
  assert.equal(hydrating.firstDue,undefined);
  const empty = dashboardSnapshot(data,{ ...year, visible_months:[] },[],true,now);
  assert.equal(empty.monthly.target,0);
  assert.equal(empty.monthly.rate,null);
});
test('member dashboard only prioritizes outstanding personal dues or charges', () => {
  const payments = year.visible_months.map(month => ({ member_id:member.id, fiscal_year_id:year.id, month, paid:month<=11, charged_amount:month<=11?20000:0 }));
  const data = snapshotBundle({ payments });
  assert.equal(dashboardSnapshot(data,year,[member],false,now).hasOutstanding,false);
  assert.equal(dashboardSnapshot(snapshotBundle(),year,[member],false,null).hasOutstanding,false);
  const withOldDebt = { ...data, payments:payments.filter(item=>item.month!==5) };
  assert.equal(dashboardSnapshot(withOldDebt,year,[member],false,now).hasOutstanding,true);
  const withCharge = { ...data, chargeGroups:[{ participant_charges:[{ member_id:member.id, status:'UNPAID', amount:30000 }] }] };
  const result = dashboardSnapshot(withCharge,year,[member],false,now);
  assert.equal(result.unpaidAmount,0);
  assert.equal(result.additionalAmount,30000);
  assert.equal(result.hasOutstanding,true);
});
