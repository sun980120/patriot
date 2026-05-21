export type AppRole = 'super_admin' | 'admin' | 'member';
export type MemberGrade = '정회원' | '준회원' | '간사';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type GradeSource = 'auto' | 'manual';

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  phone_number: string | null;
  address: string | null;
  birth_date: string | null;
  app_role: AppRole;
  member_grade: MemberGrade;
  grade_source: GradeSource;
  approval_status: ApprovalStatus;
  is_active: boolean;
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
};

export type IncomeEntry = {
  id: string;
  fiscal_year_id: string;
  label: string;
  amount: number;
  memo: string | null;
};

export type ExpenseEntry = {
  id: string;
  fiscal_year_id: string;
  label: string;
  amount: number;
  memo: string | null;
};

export type DashboardBundle = {
  profile: Profile | null;
  fiscalYears: FiscalYear[];
  selectedYear: FiscalYear | null;
  profiles: Profile[];
  payments: PaymentRecord[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
};
