import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/backend-api';
import { mockBundle } from '@/lib/mock-data';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';
import type { DashboardBundle, ExpenseEntry, FiscalYear, IncomeEntry, PaymentRecord, Profile } from '@/lib/types';

type DashboardApiResponse = {
  profile: {
    id: string;
    fullName: string;
    email: string | null;
    username: string | null;
    phoneNumber: string | null;
    address: string | null;
    birthDate: string | null;
    appRole: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
    memberGrade: Profile['member_grade'];
    gradeSource: 'AUTO' | 'MANUAL';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    active: boolean;
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
    birthDate: string | null;
    appRole: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
    memberGrade: Profile['member_grade'];
    gradeSource: 'AUTO' | 'MANUAL';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    active: boolean;
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
    label: string;
    amount: number;
    memo: string | null;
  }>;
  expenses: Array<{
    id: string;
    fiscalYearId: string;
    label: string;
    amount: number;
    memo: string | null;
  }>;
};

function hasBackendEnv() {
  return Boolean(getBackendBaseUrl());
}

function mockFallbackEnabled() {
  return process.env.ENABLE_MOCK_FALLBACK === 'true';
}

function toProfile(row: DashboardApiResponse['profile'] | DashboardApiResponse['profiles'][number]): Profile {
  return {
    id: row.id,
    full_name: row.fullName,
    email: row.email ?? null,
    username: row.username ?? null,
    phone_number: row.phoneNumber ?? null,
    address: row.address ?? null,
    birth_date: row.birthDate ?? null,
    app_role: row.appRole.toLowerCase() as Profile['app_role'],
    member_grade: row.memberGrade,
    grade_source: row.gradeSource.toLowerCase() as Profile['grade_source'],
    approval_status: row.approvalStatus.toLowerCase() as Profile['approval_status'],
    is_active: row.active,
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
    label: row.label,
    amount: row.amount,
    memo: row.memo,
  };
}

function toExpense(row: DashboardApiResponse['expenses'][number]): ExpenseEntry {
  return {
    id: row.id,
    fiscal_year_id: row.fiscalYearId,
    label: row.label,
    amount: row.amount,
    memo: row.memo,
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
      },
    };
  } catch {
    return { mode: 'guest' };
  }
}
