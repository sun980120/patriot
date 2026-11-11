import type { PaymentRecord, Profile } from '@/lib/types';

export type PaymentApiResponse = {
  id: string;
  fiscalYearId: string;
  memberId: string;
  month: number;
  paid: boolean;
  chargedAmount: number;
  appliedGrade: Profile['member_grade'];
  manualExempt: boolean;
  exemptionReason: string | null;
};

export function toPaymentRecord(row: PaymentApiResponse): PaymentRecord {
  return {
    id: row.id, fiscal_year_id: row.fiscalYearId, member_id: row.memberId, month: row.month,
    paid: row.paid, charged_amount: row.chargedAmount, applied_grade: row.appliedGrade,
    manual_exempt: row.manualExempt ?? false, exemption_reason: row.exemptionReason ?? null,
  };
}
