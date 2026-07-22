export type AppRole = 'super_admin' | 'admin' | 'member';
export type MemberGrade = '정회원' | '준회원' | '간사';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type GradeSource = 'auto' | 'manual';
export type AdditionalChargeCategory = 'JOIN_FEE' | 'UNIFORM_FEE' | 'DINNER_FEE' | 'TOURNAMENT_FEE' | 'ETC_FEE';
export type AdditionalChargeStatus = 'UNPAID' | 'PAID';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  phone_number: string | null;
  address: string | null;
  base_address: string | null;
  detail_address: string | null;
  birth_date: string | null;
  app_role: AppRole;
  member_grade: MemberGrade;
  grade_source: GradeSource;
  approval_status: ApprovalStatus;
  is_active: boolean;
  fee_exemption_months: number;
  fee_exemption_start_date: string | null;
  joined_at: string | null;
};

export type FiscalYear = {
  id: string;
  year: number;
  visible_months: number[];
  is_active: boolean;
};

export type PaymentRecord = {
  id: string;
  fiscal_year_id: string;
  member_id: string;
  month: number;
  paid: boolean;
  charged_amount: number;
  applied_grade: MemberGrade;
  manual_exempt: boolean;
  exemption_reason: string | null;
};

export type IncomeEntry = {
  id: string;
  fiscal_year_id: string;
  charge_group_id: string | null;
  label: string;
  amount: number;
  memo: string | null;
};

export type ExpenseEntry = {
  id: string;
  fiscal_year_id: string;
  charge_group_id: string | null;
  label: string;
  amount: number;
  memo: string | null;
};

export type ParticipantCharge = {
  id: string;
  charge_group_id: string;
  member_id: string;
  member_name: string;
  member_username: string | null;
  amount: number;
  base_amount: number;
  adjustment_reason: string | null;
  status: AdditionalChargeStatus;
  paid_at: string | null;
  memo: string | null;
};

export type ChargeGroup = {
  id: string;
  fiscal_year_id: string;
  title: string;
  category: AdditionalChargeCategory;
  event_date: string | null;
  support_amount: number;
  actual_cost: number | null;
  settlement_completed: boolean;
  participant_charge_total: number;
  participant_paid_total: number;
  surplus_amount: number;
  memo: string | null;
  created_at: string | null;
  participant_charges: ParticipantCharge[];
};

export type AuditLog = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  actor_id: string | null;
  actor_name: string | null;
  detail: string | null;
  created_at: string | null;
};

export type DashboardBundle = {
  profile: Profile | null;
  fiscalYears: FiscalYear[];
  selectedYear: FiscalYear | null;
  profiles: Profile[];
  payments: PaymentRecord[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  chargeGroups: ChargeGroup[];
};
