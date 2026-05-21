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
    birth_date: '1994-05-10',
    app_role: 'super_admin',
    member_grade: '간사',
    grade_source: 'manual',
    approval_status: 'approved',
    is_active: true,
  },
  fiscalYears: [
    { id: fiscal2026, year: 2026, visible_months: getVisibleMonths(2026), is_active: true },
    { id: fiscal2027, year: 2027, visible_months: getVisibleMonths(2027), is_active: false },
  ],
  selectedYear: { id: fiscal2026, year: 2026, visible_months: getVisibleMonths(2026), is_active: true },
  profiles: [
    { id: 'admin-1', full_name: '박형주', email: 'woosung9801@gmail.com', username: 'woosung9801', phone_number: '010-1234-5678', address: '서울특별시', birth_date: '1994-05-10', app_role: 'super_admin', member_grade: '간사', grade_source: 'manual', approval_status: 'approved', is_active: true },
    { id: 'admin-2', full_name: '남대우', email: 'manager@patriot.club', username: 'manager', phone_number: '010-9876-1234', address: '경기도 성남시', birth_date: '1993-09-12', app_role: 'admin', member_grade: '간사', grade_source: 'manual', approval_status: 'approved', is_active: true },
    { id: 'member-1', full_name: '홍우성', email: 'member1@patriot.club', username: 'hongws', phone_number: '010-1111-2222', address: '서울특별시 마포구', birth_date: '1996-02-01', app_role: 'member', member_grade: '정회원', grade_source: 'auto', approval_status: 'approved', is_active: true },
    { id: 'member-2', full_name: '박시하', email: 'member2@patriot.club', username: 'parksh', phone_number: '010-3333-4444', address: '서울특별시 강서구', birth_date: '1997-11-21', app_role: 'member', member_grade: '정회원', grade_source: 'auto', approval_status: 'approved', is_active: true },
    { id: 'member-3', full_name: '김하랑', email: 'member3@patriot.club', username: 'kimhr', phone_number: '010-5555-6666', address: '인천광역시', birth_date: '2009-07-14', app_role: 'member', member_grade: '준회원', grade_source: 'auto', approval_status: 'approved', is_active: true },
    { id: 'member-4', full_name: '김성현', email: 'member4@patriot.club', username: 'kimsh', phone_number: '010-7777-8888', address: '경기도 고양시', birth_date: '2008-03-18', app_role: 'member', member_grade: '준회원', grade_source: 'auto', approval_status: 'approved', is_active: true },
    { id: 'pending-1', full_name: '오준혁', email: 'pending1@patriot.club', username: 'ohjh', phone_number: '010-9999-0000', address: '서울특별시 송파구', birth_date: '1998-08-08', app_role: 'member', member_grade: '정회원', grade_source: 'auto', approval_status: 'pending', is_active: true },
    { id: 'pending-2', full_name: '최신화', email: 'pending2@patriot.club', username: 'choish', phone_number: '010-2222-9999', address: '경기도 하남시', birth_date: '2010-04-03', app_role: 'member', member_grade: '준회원', grade_source: 'auto', approval_status: 'pending', is_active: true },
  ],
  payments: [
    { id: 'p1', fiscal_year_id: fiscal2026, member_id: 'member-1', month: 5, paid: true, charged_amount: 20000, applied_grade: '정회원' },
    { id: 'p2', fiscal_year_id: fiscal2026, member_id: 'member-2', month: 5, paid: true, charged_amount: 20000, applied_grade: '정회원' },
    { id: 'p3', fiscal_year_id: fiscal2026, member_id: 'member-2', month: 6, paid: true, charged_amount: 20000, applied_grade: '정회원' },
    { id: 'p4', fiscal_year_id: fiscal2026, member_id: 'member-2', month: 7, paid: true, charged_amount: 20000, applied_grade: '정회원' },
    { id: 'p5', fiscal_year_id: fiscal2026, member_id: 'member-3', month: 5, paid: true, charged_amount: 10000, applied_grade: '준회원' },
    { id: 'p6', fiscal_year_id: fiscal2027, member_id: 'member-1', month: 1, paid: true, charged_amount: 20000, applied_grade: '정회원' },
    { id: 'p7', fiscal_year_id: fiscal2027, member_id: 'member-1', month: 2, paid: true, charged_amount: 20000, applied_grade: '정회원' },
    { id: 'p8', fiscal_year_id: fiscal2027, member_id: 'member-3', month: 1, paid: true, charged_amount: 10000, applied_grade: '준회원' },
    { id: 'p9', fiscal_year_id: fiscal2027, member_id: 'member-3', month: 2, paid: true, charged_amount: 10000, applied_grade: '준회원' },
    { id: 'p10', fiscal_year_id: fiscal2027, member_id: 'member-3', month: 3, paid: true, charged_amount: 10000, applied_grade: '준회원' }
  ],
  incomes: [
    { id: 'i1', fiscal_year_id: fiscal2026, label: '세일스포츠', amount: 200000, memo: null },
    { id: 'i2', fiscal_year_id: fiscal2026, label: '장군당정', amount: 200000, memo: null },
  ],
  expenses: [
    { id: 'e1', fiscal_year_id: fiscal2026, label: '4, 5월 대관료', amount: 50000, memo: null },
    { id: 'e2', fiscal_year_id: fiscal2026, label: '유니폼 샘플 보증', amount: 100000, memo: null },
    { id: 'e3', fiscal_year_id: fiscal2026, label: '유니폼 시안 보증', amount: 50000, memo: null },
  ],
};
