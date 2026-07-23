import { cookies } from 'next/headers';
import { serverApiFetch } from '@/lib/backend-api';
import { mockBundle } from '@/lib/mock-data';
import { toProfile, type MemberSummaryApiResponse } from '@/lib/profile-data';
import { ACCESS_TOKEN_COOKIE, getBackendBaseUrl } from '@/lib/session';
import type { ChargeGroup, DashboardBundle, ExpenseEntry, FiscalYear, IncomeEntry, PaymentRecord, Profile } from '@/lib/types';

type DashboardApiResponse = {
  profile: MemberSummaryApiResponse;
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
  profiles: MemberSummaryApiResponse[];
  payments: Array<{
    id: string;
    fiscalYearId: string;
    memberId: string;
    month: number;
    paid: boolean;
    chargedAmount: number;
    appliedGrade: Profile['member_grade'];
    manualExempt: boolean;
    exemptionReason: string | null;
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
    clubEventId: string | null;
    clubEventTitle: string | null;
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
      baseAmount: number | null;
      adjustmentReason: string | null;
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
    manual_exempt: row.manualExempt ?? false,
    exemption_reason: row.exemptionReason ?? null,
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
    club_event_id: row.clubEventId ?? null,
    club_event_title: row.clubEventTitle ?? null,
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
      base_amount: charge.baseAmount ?? charge.amount,
      adjustment_reason: charge.adjustmentReason ?? null,
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
