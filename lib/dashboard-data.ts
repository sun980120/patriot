import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/backend-api';
import { mockBundle } from '@/lib/mock-data';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';
import type { ChargeGroup, DashboardBundle, ExpenseEntry, FiscalYear, IncomeEntry, PaymentRecord, Profile } from '@/lib/types';

type DashboardApiResponse = {
  profile: {
    id: string;
    fullName: string;
    email: string | null;
    username: string | null;
    phoneNumber: string | null;
    address: string | null;
    addressDetail: string | null;
    birthDate: string | null;
    appRole: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
    memberGrade: Profile['member_grade'];
    gradeSource: 'AUTO' | 'MANUAL';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    active: boolean;
    feeExemptionMonths: number;
    feeExemptionStartDate: string | null;
    joinedAt: string | null;
  };
  fiscalYears: Array<{
    id: string;
    year: number;
    visibleMonths: number[];
    active: boolean;
  }>;
  selectedYear: {
    id: string;
    year: number;
    visibleMonths: number[];
    active: boolean;
  } | null;
  profiles: Array<{
    id: string;
    fullName: string;
    email: string | null;
    username: string | null;
    phoneNumber: string | null;
    address: string | null;
    addressDetail: string | null;
    birthDate: string | null;
    appRole: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
    memberGrade: Profile['member_grade'];
    gradeSource: 'AUTO' | 'MANUAL';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    active: boolean;
    feeExemptionMonths: number;
    feeExemptionStartDate: string | null;
    joinedAt: string | null;
  }>;
  payments: Array<{
    id: string;
    fiscalYearId: string;
    memberId: string;
    month: number;
    paid: boolean;
    chargedAmount: number;
    appliedGrade: Profile['member_grade'];
  }>;
  incomes: Array<{
    id: string;
    fiscalYearId: string;
    chargeGroupId: string | null;
    label: string;
    amount: number;
    memo: string | null;
  }>;
  expenses: Array<{
    id: string;
    fiscalYearId: string;
    chargeGroupId: string | null;
    label: string;
    amount: number;
    memo: string | null;
  }>;
  chargeGroups: Array<{
    id: string;
    fiscalYearId: string;
    title: string;
    category: ChargeGroup['category'];
    eventDate: string | null;
    supportAmount: number;
    actualCost: number | null;
    settlementCompleted: boolean;
    participantChargeTotal: number;
    participantPaidTotal: number;
    surplusAmount: number;
    memo: string | null;
    createdAt: string | null;
    participantCharges: Array<{
      id: string;
      chargeGroupId: string;
      memberId: string;
      memberName: string;
      memberUsername: string | null;
      amount: number;
      status: ChargeGroup['participant_charges'][number]['status'];
      paidAt: string | null;
      memo: string | null;
    }>;
  }>;
};

function hasBackendEnv() {
  return Boolean(getBackendBaseUrl());
}

function mockFallbackEnabled() {
  return process.env.ENABLE_MOCK_FALLBACK === 'true';
}

function toProfile(row: DashboardApiResponse['profile'] | DashboardApiResponse['profiles'][number]): Profile {
  const baseAddress = row.address ?? null;
  const detailAddress = row.addressDetail ?? null;
  const combinedAddress = [baseAddress, detailAddress].filter(Boolean).join(', ') || null;

  return {
    id: row.id,
    full_name: row.fullName,
    email: row.email ?? null,
    username: row.username ?? null,
    phone_number: row.phoneNumber ?? null,
    address: combinedAddress,
    base_address: baseAddress,
    detail_address: detailAddress,
    birth_date: row.birthDate ?? null,
    app_role: row.appRole.toLowerCase() as Profile['app_role'],
    member_grade: row.memberGrade,
    grade_source: row.gradeSource.toLowerCase() as Profile['grade_source'],
    approval_status: row.approvalStatus.toLowerCase() as Profile['approval_status'],
    is_active: row.active,
    fee_exemption_months: row.feeExemptionMonths ?? 0,
    fee_exemption_start_date: row.feeExemptionStartDate ?? null,
    joined_at: row.joinedAt ?? null,
  };
}

function toFiscalYear(row: DashboardApiResponse['fiscalYears'][number]): FiscalYear {
  return {
    id: row.id,
    year: row.year,
    visible_months: row.visibleMonths,
    is_active: row.active,
  };
}

function toPayment(row: DashboardApiResponse['payments'][number]): PaymentRecord {
  return {
    id: row.id,
    fiscal_year_id: row.fiscalYearId,
    member_id: row.memberId,
    month: row.month,
    paid: row.paid,
    charged_amount: row.chargedAmount,
    applied_grade: row.appliedGrade,
  };
}

function toIncome(row: DashboardApiResponse['incomes'][number]): IncomeEntry {
  return {
    id: row.id,
    fiscal_year_id: row.fiscalYearId,
    charge_group_id: row.chargeGroupId,
    label: row.label,
    amount: row.amount,
    memo: row.memo,
  };
}

function toExpense(row: DashboardApiResponse['expenses'][number]): ExpenseEntry {
  return {
    id: row.id,
    fiscal_year_id: row.fiscalYearId,
    charge_group_id: row.chargeGroupId,
    label: row.label,
    amount: row.amount,
    memo: row.memo,
  };
}

function toChargeGroup(row: DashboardApiResponse['chargeGroups'][number]): ChargeGroup {
  return {
    id: row.id,
    fiscal_year_id: row.fiscalYearId,
    title: row.title,
    category: row.category,
    event_date: row.eventDate,
    support_amount: row.supportAmount,
    actual_cost: row.actualCost,
    settlement_completed: row.settlementCompleted,
    participant_charge_total: row.participantChargeTotal,
    participant_paid_total: row.participantPaidTotal,
    surplus_amount: row.surplusAmount,
    memo: row.memo,
    created_at: row.createdAt,
    participant_charges: row.participantCharges.map((charge) => ({
      id: charge.id,
      charge_group_id: charge.chargeGroupId,
      member_id: charge.memberId,
      member_name: charge.memberName,
      member_username: charge.memberUsername,
      amount: charge.amount,
      status: charge.status,
      paid_at: charge.paidAt,
      memo: charge.memo,
    })),
  };
}

export async function loadDashboardData(): Promise<{ mode: 'guest' } | { mode: 'app'; bundle: DashboardBundle; source: 'mock' | 'spring' }> {
  if (!hasBackendEnv()) {
    return mockFallbackEnabled()
      ? { mode: 'app', bundle: mockBundle, source: 'mock' }
      : { mode: 'guest' };
  }

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return { mode: 'guest' };
  }

  try {
    const result = await serverApiFetch<DashboardApiResponse>('/api/dashboard');

    if (!result.ok) {
      if (result.status === 401 || result.status === 403) {
        return { mode: 'guest' };
      }
      return { mode: 'guest' };
    }

    const payload = result.data!;
    const fiscalYears = payload.fiscalYears.map(toFiscalYear);
    const selectedYear = payload.selectedYear ? toFiscalYear(payload.selectedYear) : fiscalYears[0] ?? null;

    return {
      mode: 'app',
      source: 'spring',
      bundle: {
        profile: payload.profile ? toProfile(payload.profile) : null,
        fiscalYears,
        selectedYear,
        profiles: payload.profiles.map(toProfile),
        payments: payload.payments.map(toPayment),
        incomes: payload.incomes.map(toIncome),
        expenses: payload.expenses.map(toExpense),
        chargeGroups: payload.chargeGroups.map(toChargeGroup),
      },
    };
  } catch {
    return { mode: 'guest' };
  }
}
