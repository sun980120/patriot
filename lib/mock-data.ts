import { getVisibleMonths } from '@/lib/constants';
import type { DashboardBundle } from '@/lib/types';

const fiscal2026 = 'year-2026';
const fiscal2027 = 'year-2027';

export const mockBundle: DashboardBundle = {
  profile: {
    id: 'admin-1',
    full_name: '박형주',
    email: 'woosung9801@gmail.com',
    username: 'woosung9801',
    phone_number: '010-1234-5678',
    address: '서울특별시',
    base_address: '서울특별시',
    detail_address: null,
    birth_date: '1994-05-10',
    app_role: 'super_admin',
    member_grade: '간사',
    grade_source: 'manual',
    approval_status: 'approved',
    is_active: true,
    fee_exemption_months: 0,
    fee_exemption_start_date: null,
    joined_at: '2026-05-01T09:00:00',
  },
  fiscalYears: [
    { id: fiscal2026, year: 2026, visible_months: getVisibleMonths(2026), is_active: true },
    { id: fiscal2027, year: 2027, visible_months: getVisibleMonths(2027), is_active: false },
  ],
  selectedYear: { id: fiscal2026, year: 2026, visible_months: getVisibleMonths(2026), is_active: true },
  profiles: [
    { id: 'admin-1', full_name: '박형주', email: 'woosung9801@gmail.com', username: 'woosung9801', phone_number: '010-1234-5678', address: '서울특별시', base_address: '서울특별시', detail_address: null, birth_date: '1994-05-10', app_role: 'super_admin', member_grade: '간사', grade_source: 'manual', approval_status: 'approved', is_active: true, fee_exemption_months: 0, fee_exemption_start_date: null, joined_at: '2026-05-01T09:00:00' },
    { id: 'admin-2', full_name: '남대우', email: 'manager@patriot.club', username: 'manager', phone_number: '010-9876-1234', address: '경기도 성남시', base_address: '경기도 성남시', detail_address: null, birth_date: '1993-09-12', app_role: 'admin', member_grade: '간사', grade_source: 'manual', approval_status: 'approved', is_active: true, fee_exemption_months: 0, fee_exemption_start_date: null, joined_at: '2026-05-01T09:05:00' },
    { id: 'member-1', full_name: '홍우성', email: 'member1@patriot.club', username: 'hongws', phone_number: '010-1111-2222', address: '서울특별시 마포구', base_address: '서울특별시 마포구', detail_address: null, birth_date: '1996-02-01', app_role: 'member', member_grade: '정회원', grade_source: 'auto', approval_status: 'approved', is_active: true, fee_exemption_months: 2, fee_exemption_start_date: '2026-05-01', joined_at: '2026-05-02T09:00:00' },
    { id: 'member-2', full_name: '박시하', email: 'member2@patriot.club', username: 'parksh', phone_number: '010-3333-4444', address: '서울특별시 강서구', base_address: '서울특별시 강서구', detail_address: null, birth_date: '1997-11-21', app_role: 'member', member_grade: '정회원', grade_source: 'auto', approval_status: 'approved', is_active: true, fee_exemption_months: 0, fee_exemption_start_date: null, joined_at: '2026-05-03T09:00:00' },
    { id: 'member-3', full_name: '김하랑', email: 'member3@patriot.club', username: 'kimhr', phone_number: '010-5555-6666', address: '인천광역시', base_address: '인천광역시', detail_address: null, birth_date: '2009-07-14', app_role: 'member', member_grade: '준회원', grade_source: 'auto', approval_status: 'approved', is_active: true, fee_exemption_months: 0, fee_exemption_start_date: null, joined_at: '2026-05-04T09:00:00' },
    { id: 'member-4', full_name: '김성현', email: 'member4@patriot.club', username: 'kimsh', phone_number: '010-7777-8888', address: '경기도 고양시', base_address: '경기도 고양시', detail_address: null, birth_date: '2008-03-18', app_role: 'member', member_grade: '준회원', grade_source: 'auto', approval_status: 'approved', is_active: true, fee_exemption_months: 0, fee_exemption_start_date: null, joined_at: '2026-05-05T09:00:00' },
    { id: 'pending-1', full_name: '오준혁', email: 'pending1@patriot.club', username: 'ohjh', phone_number: '010-9999-0000', address: '서울특별시 송파구', base_address: '서울특별시 송파구', detail_address: null, birth_date: '1998-08-08', app_role: 'member', member_grade: '정회원', grade_source: 'auto', approval_status: 'pending', is_active: true, fee_exemption_months: 2, fee_exemption_start_date: null, joined_at: '2026-05-06T09:00:00' },
    { id: 'pending-2', full_name: '최신화', email: 'pending2@patriot.club', username: 'choish', phone_number: '010-2222-9999', address: '경기도 하남시', base_address: '경기도 하남시', detail_address: null, birth_date: '2010-04-03', app_role: 'member', member_grade: '준회원', grade_source: 'auto', approval_status: 'pending', is_active: true, fee_exemption_months: 0, fee_exemption_start_date: null, joined_at: '2026-05-07T09:00:00' },
  ],
  payments: [
    { id: 'p1', fiscal_year_id: fiscal2026, member_id: 'member-1', month: 5, paid: true, charged_amount: 20000, applied_grade: '정회원', manual_exempt: false, exemption_reason: null },
    { id: 'p2', fiscal_year_id: fiscal2026, member_id: 'member-2', month: 5, paid: true, charged_amount: 20000, applied_grade: '정회원', manual_exempt: false, exemption_reason: null },
    { id: 'p3', fiscal_year_id: fiscal2026, member_id: 'member-2', month: 6, paid: true, charged_amount: 20000, applied_grade: '정회원', manual_exempt: false, exemption_reason: null },
    { id: 'p4', fiscal_year_id: fiscal2026, member_id: 'member-2', month: 7, paid: true, charged_amount: 20000, applied_grade: '정회원', manual_exempt: false, exemption_reason: null },
    { id: 'p5', fiscal_year_id: fiscal2026, member_id: 'member-3', month: 5, paid: true, charged_amount: 10000, applied_grade: '준회원', manual_exempt: false, exemption_reason: null },
    { id: 'p6', fiscal_year_id: fiscal2027, member_id: 'member-1', month: 1, paid: true, charged_amount: 20000, applied_grade: '정회원', manual_exempt: false, exemption_reason: null },
    { id: 'p7', fiscal_year_id: fiscal2027, member_id: 'member-1', month: 2, paid: true, charged_amount: 20000, applied_grade: '정회원', manual_exempt: false, exemption_reason: null },
    { id: 'p8', fiscal_year_id: fiscal2027, member_id: 'member-3', month: 1, paid: true, charged_amount: 10000, applied_grade: '준회원', manual_exempt: false, exemption_reason: null },
    { id: 'p9', fiscal_year_id: fiscal2027, member_id: 'member-3', month: 2, paid: true, charged_amount: 10000, applied_grade: '준회원', manual_exempt: false, exemption_reason: null },
    { id: 'p10', fiscal_year_id: fiscal2027, member_id: 'member-3', month: 3, paid: true, charged_amount: 10000, applied_grade: '준회원', manual_exempt: false, exemption_reason: null }
  ],
  incomes: [
    { id: 'i1', fiscal_year_id: fiscal2026, charge_group_id: null, label: '세일스포츠', amount: 200000, memo: null },
    { id: 'i2', fiscal_year_id: fiscal2026, charge_group_id: null, label: '장군당정', amount: 200000, memo: null },
  ],
  expenses: [
    { id: 'e1', fiscal_year_id: fiscal2026, charge_group_id: null, label: '4, 5월 대관료', amount: 50000, memo: null },
    { id: 'e2', fiscal_year_id: fiscal2026, charge_group_id: null, label: '유니폼 샘플 보증', amount: 100000, memo: null },
    { id: 'e3', fiscal_year_id: fiscal2026, charge_group_id: null, label: '유니폼 시안 보증', amount: 50000, memo: null },
  ],
  chargeGroups: [
    {
      id: 'cg-1',
      fiscal_year_id: fiscal2026,
      club_event_id: null,
      club_event_title: null,
      title: '춘계 대회 참가 분담금',
      category: 'TOURNAMENT_FEE',
      event_date: '2026-06-10',
      support_amount: 200000,
      actual_cost: null,
      settlement_completed: false,
      participant_charge_total: 60000,
      participant_paid_total: 30000,
      surplus_amount: 0,
      memo: '회비에서 일부 지원 후 참가자 추가 분담',
      created_at: '2026-05-21T10:00:00',
      participant_charges: [
        { id: 'mc-1', charge_group_id: 'cg-1', member_id: 'member-1', member_name: '홍우성', member_username: 'hongws', amount: 30000, base_amount: 30000, adjustment_reason: null, status: 'PAID', paid_at: '2026-05-21T10:10:00', memo: null },
        { id: 'mc-2', charge_group_id: 'cg-1', member_id: 'member-2', member_name: '박시하', member_username: 'parksh', amount: 30000, base_amount: 30000, adjustment_reason: null, status: 'UNPAID', paid_at: null, memo: null },
      ],
    },
  ],
};
