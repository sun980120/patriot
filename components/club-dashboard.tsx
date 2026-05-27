'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveMemberAction, createFiscalYearAction, deletePendingMemberAction, togglePaymentAction } from '@/app/actions';
import { HIDDEN_PROFILE_EMAILS, ROLE_META, CLUB_BANK } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { DashboardBundle, ExpenseEntry, FiscalYear, IncomeEntry, PaymentRecord, Profile } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

function isAdmin(profile: Profile | null) {
  return profile?.app_role === 'admin' || profile?.app_role === 'super_admin';
}

const GRADE_ORDER: Record<Profile['member_grade'], number> = {
  간사: 0,
  정회원: 1,
  준회원: 2,
};

function paymentAmount(payment?: PaymentRecord) {
  return payment?.paid ? payment.charged_amount : 0;
}

function isFeeExempt(member: Profile, fiscalYears: FiscalYear[], payments: PaymentRecord[], year: number, month: number) {
  if (
    member.member_grade === '간사' ||
    !member.fee_exemption_months ||
    member.fee_exemption_months <= 0 ||
    !member.fee_exemption_start_date
  ) {
    return false;
  }

  const startDate = new Date(`${member.fee_exemption_start_date}T00:00:00`);
  const orderedYears = [...fiscalYears].sort((a, b) => a.year - b.year);
  let remaining = member.fee_exemption_months;

  for (const fiscalYear of orderedYears) {
    for (const visibleMonth of fiscalYear.visible_months) {
      const currentMonthDate = new Date(fiscalYear.year, visibleMonth - 1, 1);
      if (currentMonthDate < new Date(startDate.getFullYear(), startDate.getMonth(), 1)) {
        continue;
      }

      const payment = payments.find(
        (item) =>
          item.fiscal_year_id === fiscalYear.id &&
          item.member_id === member.id &&
          item.month === visibleMonth
      );

      if (payment?.paid) {
        if (fiscalYear.year === year && visibleMonth === month) {
          return false;
        }
        continue;
      }

      if (remaining <= 0) {
        return false;
      }

      if (fiscalYear.year === year && visibleMonth === month) {
        return true;
      }

      remaining -= 1;
    }
  }

  return false;
}

function buildPaymentButtonClass(staff: boolean, exempt: boolean, paid: boolean, clickable: boolean) {
  if (staff) {
    return 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
  }
  if (exempt) {
    return 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400';
  }
  if (paid) {
    return 'border-emerald-300 bg-emerald-100 text-emerald-900';
  }
  if (clickable) {
    return 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50';
  }
  return 'border-slate-200 bg-slate-50 text-slate-500';
}

function compareMembers(a: Profile, b: Profile) {
  const gradeDiff = GRADE_ORDER[a.member_grade] - GRADE_ORDER[b.member_grade];
  if (gradeDiff !== 0) return gradeDiff;

  const aBirth = a.birth_date ? new Date(a.birth_date).getTime() : Number.MAX_SAFE_INTEGER;
  const bBirth = b.birth_date ? new Date(b.birth_date).getTime() : Number.MAX_SAFE_INTEGER;
  if (aBirth !== bBirth) return aBirth - bBirth;

  return a.full_name.localeCompare(b.full_name, 'ko');
}

export function ClubDashboard({ initialData, source }: { initialData: DashboardBundle; source: 'mock' | 'spring' }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [selectedYearId, setSelectedYearId] = useState(initialData.selectedYear?.id ?? initialData.fiscalYears[0]?.id ?? '');
  const [newYearInput, setNewYearInput] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [financeTab, setFinanceTab] = useState<'income' | 'expense'>('income');
  const [actionMessage, setActionMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [copyMessage, setCopyMessage] = useState('');
  const [showBankApps, setShowBankApps] = useState(false);
  const [launchingApp, setLaunchingApp] = useState<'toss' | 'kakaobank' | null>(null);
  const [appMessage, setAppMessage] = useState('');
  
  const [paymentGuide, setPaymentGuide] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
    setSelectedYearId((current) => {
      if (initialData.fiscalYears.some((year) => year.id === current)) return current;
      return initialData.selectedYear?.id ?? initialData.fiscalYears[0]?.id ?? '';
    });
  }, [initialData]);

  const profile = data.profile;
  const adminMode = isAdmin(profile);
  const fiscalYears = data.fiscalYears;
  const selectedYear = fiscalYears.find((item) => item.id === selectedYearId) ?? fiscalYears[0];
  const hasFiscalYear = Boolean(selectedYear);
  const tableMinWidth = 420 + (selectedYear?.visible_months.length ?? 0) * 112 + 180;

  const financialProfiles = useMemo(
    () =>
      data.profiles.filter(
        (item) =>
          item.approval_status === 'approved' &&
          item.app_role !== 'super_admin' &&
          !HIDDEN_PROFILE_EMAILS.includes((item.email ?? '') as (typeof HIDDEN_PROFILE_EMAILS)[number])
      ),
    [data.profiles]
  );

  const activeApprovedProfiles = useMemo(
    () => financialProfiles.filter((item) => item.is_active),
    [financialProfiles]
  );

  const visibleProfiles = useMemo(() => {
    if (adminMode) return activeApprovedProfiles;
    if (!profile || profile.approval_status !== 'approved') return [];
    return activeApprovedProfiles.filter((item) => item.id === profile.id);
  }, [activeApprovedProfiles, adminMode, profile]);

  const filteredProfiles = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    const searched = !keyword
      ? visibleProfiles
      : visibleProfiles.filter((item) => item.full_name.toLowerCase().includes(keyword));

    return [...searched].sort(compareMembers);
  }, [memberSearch, visibleProfiles]);

  const pendingProfiles = useMemo(
    () =>
      data.profiles.filter(
        (item) =>
          item.approval_status === 'pending' &&
          item.app_role !== 'super_admin' &&
          !HIDDEN_PROFILE_EMAILS.includes((item.email ?? '') as (typeof HIDDEN_PROFILE_EMAILS)[number])
      ),
    [data.profiles]
  );

  const yearIncomes = useMemo(
    () => (selectedYear ? data.incomes.filter((item) => item.fiscal_year_id === selectedYear.id) : []),
    [data.incomes, selectedYear]
  );

  const yearExpenses = useMemo(
    () => (selectedYear ? data.expenses.filter((item) => item.fiscal_year_id === selectedYear.id) : []),
    [data.expenses, selectedYear]
  );

  const summary = useMemo(() => {
    const yearMembershipIncome = selectedYear
      ? data.payments
          .filter((item) => item.fiscal_year_id === selectedYear.id)
          .reduce((sum, item) => sum + paymentAmount(item), 0)
      : 0;

    const yearAdditionalChargeIncome = selectedYear
      ? data.chargeGroups
          .filter((group) => group.fiscal_year_id === selectedYear.id)
          .reduce((sum, group) => sum + group.participant_paid_total, 0)
      : 0;

    const otherIncome = yearIncomes
      .filter((item) => !item.charge_group_id)
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = yearExpenses.reduce((sum, item) => sum + item.amount, 0);
    const cumulativeOtherIncome = data.incomes
      .filter((item) => !item.charge_group_id)
      .reduce((sum, item) => sum + item.amount, 0);
    const cumulativeExpense = data.expenses.reduce((sum, item) => sum + item.amount, 0);
    const cumulativeMembershipIncome = data.payments.reduce((sum, item) => sum + paymentAmount(item), 0);
    const cumulativeAdditionalChargeIncome = data.chargeGroups.reduce((sum, group) => sum + group.participant_paid_total, 0);

    return {
      membershipIncome: yearMembershipIncome,
      additionalChargeIncome: yearAdditionalChargeIncome,
      otherIncome,
      totalIncome: yearMembershipIncome + yearAdditionalChargeIncome + otherIncome,
      totalExpense,
      balance: yearMembershipIncome + yearAdditionalChargeIncome + otherIncome - totalExpense,
      cumulativeBalance:
        cumulativeMembershipIncome + cumulativeAdditionalChargeIncome + cumulativeOtherIncome - cumulativeExpense,
    };
  }, [data.chargeGroups, data.expenses, data.incomes, data.payments, selectedYear, yearExpenses, yearIncomes]);

  const rows = useMemo(
    () =>
      filteredProfiles.map((member, index) => ({
        member,
        order: index + 1,
        cells: (selectedYear?.visible_months ?? []).map((month) => {
          const payment = data.payments.find(
            (item) => item.fiscal_year_id === selectedYear?.id && item.member_id === member.id && item.month === month
          );
          return { month, payment };
        }),
      })),
    [data.payments, filteredProfiles, selectedYear]
  );

  const handleTogglePaid = (member: Profile, month: number) => {
    if (!adminMode || member.member_grade === '간사' || !selectedYear) return;
    if (isFeeExempt(member, fiscalYears, data.payments, selectedYear.year, month)) {
      setToastTone('error');
      setActionMessage('회비 면제 기간에는 납부 처리할 수 없습니다.');
      return;
    }
    setActionMessage('');

    let nextPaid = false;
    setData((current) => {
      const index = current.payments.findIndex(
        (item) => item.fiscal_year_id === selectedYear.id && item.member_id === member.id && item.month === month
      );

      if (index >= 0) {
        const nextPayments = [...current.payments];
        nextPaid = !nextPayments[index].paid;
        nextPayments[index] = {
          ...nextPayments[index],
          paid: nextPaid,
          charged_amount: nextPaid ? ROLE_META[member.member_grade].fee : 0,
          applied_grade: member.member_grade,
        };
        return { ...current, payments: nextPayments };
      }

      const newPayment: PaymentRecord = {
        id: `payment-${selectedYear.id}-${member.id}-${month}`,
        fiscal_year_id: selectedYear.id,
        member_id: member.id,
        month,
        paid: true,
        charged_amount: ROLE_META[member.member_grade].fee,
        applied_grade: member.member_grade,
      };
      nextPaid = true;

      return { ...current, payments: [...current.payments, newPayment] };
    });

    if (source === 'spring') {
      startTransition(async () => {
        const result = await togglePaymentAction({
          fiscalYearId: selectedYear.id,
          memberId: member.id,
          month,
          paid: !nextPaid,
        });

        if (!result.ok) {
          setToastTone('error');
          setActionMessage(result.message ?? '납부 상태 변경에 실패했습니다.');
          router.refresh();
        }
      });
    }
  };

  const handleApprove = (memberId: string) => {
    if (!adminMode) return;
    setActionMessage('');

    setData((current) => {
      const nextProfiles = current.profiles.map((item) =>
        item.id === memberId ? { ...item, approval_status: 'approved' as const } : item
      );

      const approved = nextProfiles.find((item) => item.id === memberId);
      const missingPayments = approved
        ? current.fiscalYears.flatMap((year) =>
            year.visible_months.flatMap((month) =>
              isFeeExempt(approved, current.fiscalYears, current.payments, year.year, month)
                ? []
                : [{
                    id: `payment-${year.id}-${approved.id}-${month}`,
                    fiscal_year_id: year.id,
                    member_id: approved.id,
                    month,
                    paid: false,
                    charged_amount: 0,
                    applied_grade: approved.member_grade,
                  }]
            )
          )
        : [];

      const existingKeys = new Set(current.payments.map((item) => `${item.fiscal_year_id}-${item.member_id}-${item.month}`));
      const nextPayments = [...current.payments];
      missingPayments.forEach((item) => {
        const key = `${item.fiscal_year_id}-${item.member_id}-${item.month}`;
        if (!existingKeys.has(key)) nextPayments.push(item);
      });

      return { ...current, profiles: nextProfiles, payments: nextPayments };
    });

    if (source === 'spring') {
      startTransition(async () => {
        const result = await approveMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setActionMessage(result.message ?? '회원 승인에 실패했습니다.');
          router.refresh();
          return;
        }
        router.refresh();
      });
    }
  };

  const handleDeletePending = (memberId: string) => {
    if (!adminMode) return;
    setActionMessage('');

    setData((current) => ({
      ...current,
      profiles: current.profiles.filter((item) => item.id !== memberId),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await deletePendingMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setActionMessage(result.message ?? '가입 신청 삭제에 실패했습니다.');
          router.refresh();
          return;
        }
      });
    }
  };

  const addYear = () => {
    if (!adminMode) return;
    setActionMessage('');
    const nextYearValue = Number(newYearInput);
    if (!nextYearValue) {
      setActionMessage('개설할 연도를 입력해 주세요. 예: 2028');
      return;
    }
    if (fiscalYears.some((item) => item.year === nextYearValue)) {
      setActionMessage(`${nextYearValue}년은 이미 존재합니다.`);
      return;
    }

    const visibleMonths = nextYearValue === 2026 ? [5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const fiscalYear: FiscalYear = {
      id: `year-${nextYearValue}`,
      year: nextYearValue,
      visible_months: visibleMonths,
      is_active: false,
    };

    const newPayments = activeApprovedProfiles.flatMap((member) =>
      visibleMonths.flatMap((month) =>
        isFeeExempt(member, [...fiscalYears, fiscalYear], data.payments, nextYearValue, month)
          ? []
          : [{
              id: `payment-year-${nextYearValue}-${member.id}-${month}`,
              fiscal_year_id: fiscalYear.id,
              member_id: member.id,
              month,
              paid: false,
              charged_amount: 0,
              applied_grade: member.member_grade,
            }]
      )
    );

    setData((current) => ({
      ...current,
      fiscalYears: [...current.fiscalYears, fiscalYear].sort((a, b) => a.year - b.year),
      payments: [...current.payments, ...newPayments],
    }));
    setSelectedYearId(fiscalYear.id);
    setNewYearInput('');

    if (source === 'spring') {
      startTransition(async () => {
        const result = await createFiscalYearAction(nextYearValue);
        if (result.ok) {
          router.refresh();
          return;
        }
        setToastTone('error');
        setActionMessage(result.message ?? '연도 개설에 실패했습니다.');
        router.refresh();
      });
    }
  };
  const resetPaymentModalState = () => {
    setCopyMessage('');
    setShowBankApps(false);
    setLaunchingApp(null);
    setAppMessage('');
  };

  if (!hasFiscalYear) {
    return (
      <>
        <FloatingToast open={Boolean(actionMessage)} message={actionMessage} tone={toastTone} onClose={() => setActionMessage('')} />
        <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Setup Required</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">연도 데이터가 아직 없습니다.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            `fiscal_years` 테이블에 최소 1개 연도를 생성해야 대시보드를 표시할 수 있습니다.
            {adminMode ? ' 관리자라면 새 연도를 먼저 개설해 주세요.' : ' 관리자에게 연도 개설을 요청해 주세요.'}
          </p>
          {adminMode ? (
            <div className="mt-6 space-y-3 sm:flex sm:flex-wrap sm:items-end sm:gap-3 sm:space-y-0">
              <button
                type="button"
                onClick={() => {
                  setActionMessage('');
                  const initialYear = 2026;
                  if (!fiscalYears.some((item) => item.year === initialYear)) {
                    const visibleMonths = [5, 6, 7, 8, 9, 10, 11, 12];
                    const fiscalYear: FiscalYear = {
                      id: `year-${initialYear}`,
                      year: initialYear,
                      visible_months: visibleMonths,
                      is_active: true,
                    };

                    const newPayments = activeApprovedProfiles.flatMap((member) =>
                      visibleMonths.flatMap((month) =>
                        isFeeExempt(member, [fiscalYear], data.payments, initialYear, month)
                          ? []
                          : [{
                              id: `payment-year-${initialYear}-${member.id}-${month}`,
                              fiscal_year_id: fiscalYear.id,
                              member_id: member.id,
                              month,
                              paid: false,
                              charged_amount: 0,
                              applied_grade: member.member_grade,
                            }]
                      )
                    );

                    setData((current) => ({
                      ...current,
                      fiscalYears: [fiscalYear],
                      selectedYear: fiscalYear,
                      payments: [...current.payments, ...newPayments],
                    }));
                    setSelectedYearId(fiscalYear.id);
                  }

                  if (source === 'spring') {
                    startTransition(async () => {
                      const result = await createFiscalYearAction(initialYear);
                      if (result.ok) {
                        router.refresh();
                        return;
                      }
                      setToastTone('error');
                      setActionMessage(result.message ?? '초기 연도 생성에 실패했습니다.');
                      router.refresh();
                    });
                  }
                }}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                2026년 초기 연도 생성
              </button>
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
                <input
                  value={newYearInput}
                  onChange={(event) => setNewYearInput(event.target.value)}
                  type="number"
                  min={2026}
                  step={1}
                  placeholder="예: 2028"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none sm:w-40"
                />
                <button
                  type="button"
                  onClick={addYear}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 sm:w-auto"
                >
                  다른 연도 직접 개설
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </>
    );
  }

  return (
    <>
      <FloatingToast open={Boolean(actionMessage)} message={actionMessage} tone={toastTone} onClose={() => setActionMessage('')} />
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label={`${selectedYear.year}년 총 세입`} value={formatCurrency(summary.totalIncome)} description="회비 + 추가 비용 + 기타 세입" />
          <MetricCard label={`${selectedYear.year}년 총 지출`} value={formatCurrency(summary.totalExpense)} description="해당 연도 지출 합계" />
          <MetricCard label="누적 남은 잔액" value={formatCurrency(summary.cumulativeBalance)} description="전체 누적 세입 - 전체 누적 지출" accent />
        </section>

        <section className="grid min-w-0 gap-6">
          <section className="glass-panel min-w-0 overflow-hidden rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Finance Control</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">연도별 회비 관리</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {adminMode
                    ? '간사는 월 칸을 클릭해 원클릭으로 납부 완료를 처리할 수 있습니다.'
                    : '일반 회원은 본인의 납부 현황을 읽기 전용으로 확인합니다.'}
                </p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[160px_auto] lg:items-end">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">연도 선택</span>
                  <select
                    value={selectedYearId}
                    onChange={(event) => setSelectedYearId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
                  >
                    {fiscalYears.map((year) => (
                      <option key={year.id} value={year.id}>{year.year}년</option>
                    ))}
                  </select>
                </label>
                {adminMode ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:w-[340px]">
                    <input
                      value={newYearInput}
                      onChange={(event) => setNewYearInput(event.target.value)}
                      type="number"
                      min={2026}
                      step={1}
                      placeholder="예: 2028"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
                    />
                    <button onClick={addYear} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                      새 연도 개설
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-600">표시 월: {selectedYear.visible_months.map((month) => `${month}월`).join(' / ')}</span>
              <span className="rounded-full bg-amber-100 px-4 py-2 text-amber-900">준회원</span>
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-emerald-900">간사 회비 면제</span>
            </div>

            {adminMode ? (
              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">회원 검색</p>
                  <p className="mt-1 text-sm text-slate-500">이름으로 검색해서 해당 회원만 빠르게 납부 처리할 수 있습니다.</p>
                </div>
                <div className="grid gap-2 sm:w-[320px] sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    type="text"
                    placeholder="회원 이름 검색"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMemberSearch('')}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    초기화
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 space-y-4 lg:hidden">
              {adminMode ? (
                rows.length ? rows.map((row) => {
                  const total = row.cells.reduce((sum, cell) => sum + paymentAmount(cell.payment), 0);
                  const expanded = expandedMemberId === row.member.id;

                  return (
                    <article
                      key={row.member.id}
                      className={`rounded-[24px] border p-4 shadow-sm ${
                        row.member.member_grade === '준회원'
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMemberId((current) =>
                            current === row.member.id ? null : row.member.id
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              회원 {row.order}
                            </p>

                            <h3 className="mt-1 text-xl font-black text-slate-900">
                              {row.member.full_name}
                            </h3>
                          </div>

                          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${ROLE_META[row.member.member_grade].badge}`}>
                            {row.member.member_grade}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                          <span className="text-sm text-slate-500">총 납부액</span>
                          <span className="text-lg font-black text-slate-900">
                            {formatCurrency(total)}
                          </span>
                        </div>

                        <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                          {expanded ? '납부 내역 닫기' : '납부 내역 보기'}
                        </p>
                      </button>

                      {expanded ? (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {row.cells.map((cell) => {
                            const staff = row.member.member_grade === '간사';
                            const exempt = selectedYear ? isFeeExempt(row.member, fiscalYears, data.payments, selectedYear.year, cell.month) : false;
                            const cellActive = adminMode && !staff && !exempt;
                            const paid = Boolean(cell.payment?.paid);

                            return (
                              <button
                                key={`${row.member.id}-${cell.month}`}
                                type="button"
                                disabled={!cellActive}
                                onClick={() => handleTogglePaid(row.member, cell.month)}
                                className={`flex min-h-[136px] flex-col justify-between rounded-2xl border px-4 py-4 text-left transition ${buildPaymentButtonClass(
                                  staff,
                                  exempt,
                                  paid,
                                  cellActive
                                )}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-2xl font-black tracking-tight">
                                    {cell.month}월
                                  </span>

                                  <span className="text-sm font-bold">
                                    {staff ? '면제' : exempt ? '면제' : paid ? '납부 완료' : '미납'}
                                  </span>
                                </div>

                                <div className="mt-4">
                                  {staff ? (
                                    <p className="text-xs font-semibold text-slate-400">간사 회비 면제</p>
                                  ) : exempt ? (
                                    <p className="text-xs font-semibold text-slate-400">면제 적용 기간</p>
                                  ) : paid ? (
                                    <p className="text-xs font-semibold text-emerald-700">납부가 완료되었습니다</p>
                                  ) : (
                                    <p className="text-xs font-semibold">탭해서 등록</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </article>
                  );
                }) : (
                  <EmptyState text="검색된 회원이 없습니다." />
                )
              ) : (
                rows.length ? rows.map((row) => {
                  const total = row.cells.reduce((sum, cell) => sum + paymentAmount(cell.payment), 0);

                  return (
                    <article
                      key={row.member.id}
                      className={`rounded-[24px] border p-4 shadow-sm ${
                        row.member.member_grade === '준회원'
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            회원 {row.order}
                          </p>

                          <h3 className="mt-1 text-xl font-black text-slate-900">
                            {row.member.full_name}
                          </h3>
                        </div>

                        <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${ROLE_META[row.member.member_grade].badge}`}>
                          {row.member.member_grade}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-500">총 납부액</span>
                        <span className="text-lg font-black text-slate-900">
                          {formatCurrency(total)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {row.cells.map((cell) => {
                          const staff = row.member.member_grade === '간사';
                          const exempt = selectedYear ? isFeeExempt(row.member, fiscalYears, data.payments, selectedYear.year, cell.month) : false;
                          const paid = Boolean(cell.payment?.paid);

                          return (
                            <div
                              key={`${row.member.id}-${cell.month}`}
                              className={`flex min-h-[136px] flex-col justify-between rounded-2xl border px-4 py-4 text-left transition ${buildPaymentButtonClass(
                                staff,
                                exempt,
                                paid,
                                false
                              )}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-2xl font-black tracking-tight">
                                  {cell.month}월
                                </span>

                                <span className="text-sm font-bold">
                                  {staff ? '면제' : exempt ? '면제' : paid ? '납부 완료' : '미납'}
                                </span>
                              </div>

                              <div className="mt-4">
                                {staff ? (
                                  <p className="text-xs font-semibold text-slate-400">간사 회비 면제</p>
                                ) : exempt ? (
                                  <p className="text-xs font-semibold text-slate-400">면제 적용 기간</p>
                                ) : paid ? (
                                  <p className="text-xs font-semibold text-emerald-700">납부가 완료되었습니다</p>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPaymentGuide(row.member.full_name)
                                    }
                                    className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                                  >
                                    납부하기
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                }) : (
                  <EmptyState text="검색된 회원이 없습니다." />
                )
              )}
            </div>

            <div className="mt-6 hidden max-w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white lg:block">
              <div className="max-w-full overflow-x-auto">
                <table className="divide-y divide-slate-200 text-sm" style={{ minWidth: `${tableMinWidth}px` }}>
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-20 whitespace-nowrap px-4 py-4 text-left font-semibold text-slate-500">순번</th>
                      <th className="w-36 whitespace-nowrap px-4 py-4 text-left font-semibold text-slate-500">이름</th>
                      <th className="w-36 whitespace-nowrap px-4 py-4 text-left font-semibold text-slate-500">등급</th>
                      {selectedYear.visible_months.map((month) => (
                        <th key={month} className="w-28 whitespace-nowrap px-3 py-4 text-center font-semibold text-slate-500">{month}월</th>
                      ))}
                      <th className="w-40 whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-500">개인별 총 납부액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length ? rows.map((row) => {
                      const total = row.cells.reduce((sum, cell) => sum + paymentAmount(cell.payment), 0);
                      return (
                        <tr key={row.member.id} className={row.member.member_grade === '준회원' ? 'bg-amber-50/80' : 'bg-white'}>
                          <td className="px-4 py-5 font-semibold text-slate-500">{row.order}</td>
                          <td className="px-4 py-5 font-semibold text-slate-900 whitespace-nowrap">{row.member.full_name}</td>
                          <td className="px-4 py-5">
                            <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${ROLE_META[row.member.member_grade].badge}`}>{row.member.member_grade}</span>
                            <p className="mt-2 whitespace-nowrap text-xs text-slate-500">{row.member.member_grade === '간사' ? '회비 면제' : `월 ${formatCurrency(ROLE_META[row.member.member_grade].fee)}`}</p>
                          </td>
                          {row.cells.map((cell) => {
                            const staff = row.member.member_grade === '간사';
                            const exempt = isFeeExempt(row.member, fiscalYears, data.payments, selectedYear.year, cell.month);
                            const cellActive = adminMode && !staff && !exempt;
                            const paid = Boolean(cell.payment?.paid);
                            const amount = cell.payment?.charged_amount ?? 0;
                            const appliedGrade = cell.payment?.applied_grade ?? row.member.member_grade;
                            return (
                              <td key={`${row.member.id}-${cell.month}`} className="px-2 py-4">
                                <button
                                  type="button"
                                  disabled={!cellActive}
                                  onClick={() => handleTogglePaid(row.member, cell.month)}
                                  className={`flex h-24 w-full flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition ${buildPaymentButtonClass(staff, exempt, paid, cellActive)}`}
                                >
                                  <span className="block text-xs font-bold">
                                    {staff ? '면제' : exempt ? '면제' : paid ? '납부 완료' : '미납'}
                                  </span>
                                  <span className="mt-1 block text-[11px] font-semibold whitespace-nowrap">
                                    {staff
                                      ? '간사 회비 면제'
                                      : exempt
                                        ? '면제 적용 기간'
                                        : paid
                                          ? '납부가 완료됨'
                                          : cellActive
                                            ? '클릭하여 등록'
                                            : '납부 전'}
                                  </span>
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-4 py-5 text-right font-black text-slate-900">{formatCurrency(total)}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={selectedYear.visible_months.length + 4} className="px-4 py-10 text-center text-sm text-slate-500">
                          검색된 회원이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {adminMode ? (
            <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Approval</p>
              <div className="mt-2">
                <h2 className="text-2xl font-black text-slate-900">회원 승인 관리</h2>
                <p className="mt-2 text-sm text-slate-500">가입 요청 회원을 승인하면 모든 연도 테이블에 자동 포함됩니다.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pendingProfiles.length ? pendingProfiles.map((member) => (
                  <div key={member.id} className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{member.full_name}</p>
                        <p className="mt-1 text-xs text-slate-500">가입 요청 · {member.member_grade}</p>
                        {member.phone_number ? (
                          <p className="mt-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">전화번호:</span> {member.phone_number}
                          </p>
                        ) : null}
                        {member.birth_date ? (
                          <p className="mt-1 text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">생년월일:</span> {member.birth_date}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleApprove(member.id)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800">
                          승인
                        </button>
                        <button
                          onClick={() => handleDeletePending(member.id)}
                          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="sm:col-span-2 xl:col-span-3">
                    <EmptyState text="현재 승인 대기 회원이 없습니다." />
                  </div>
                )}
              </div>
            </section>
          ) : null}

          <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Finance</p>
                <h3 className="mt-2 text-xl font-black text-slate-900">세입 / 지출 현황</h3>
                <p className="mt-2 text-sm text-slate-500">선택한 연도의 세입과 지출을 한 카드에서 전환해서 확인합니다.</p>
              </div>
              <div className="inline-flex rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setFinanceTab('income')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    financeTab === 'income' ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  세입
                </button>
                <button
                  type="button"
                  onClick={() => setFinanceTab('expense')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    financeTab === 'expense' ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  지출
                </button>
              </div>
            </div>
            <div className="mt-4">
              {financeTab === 'income' ? (
                <TransactionPanel
                  title="기타 세입"
                  total={yearIncomes.reduce((sum, item) => sum + item.amount, 0)}
                  items={yearIncomes}
                  kind="income"
                  embedded
                />
              ) : (
                <TransactionPanel title="지출 내역" total={summary.totalExpense} items={yearExpenses} kind="expense" embedded />
              )}
            </div>
          </section>

        </section>
      </div>
      {paymentGuide ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-soft">
          <h3 className="text-xl font-black text-slate-900">회비 납부 안내</h3>

          <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              <span className="font-bold text-slate-900">은행:</span> {CLUB_BANK.bankName}
            </p>
            <p>
              <span className="font-bold text-slate-900">계좌번호:</span> {CLUB_BANK.accountNumber}
            </p>
            <p>
              <span className="font-bold text-slate-900">예금주:</span> {CLUB_BANK.accountHolder}
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(`${CLUB_BANK.bankName} ${CLUB_BANK.accountNumber}`);
              setCopyMessage('은행 및 계좌번호가 복사되었습니다.');
              setShowBankApps(true);
              setAppMessage('');
            }}
            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            계좌번호 복사
          </button>

          {copyMessage ? (
            <p className="mt-2 text-center text-sm font-semibold text-emerald-700">
              {copyMessage}
            </p>
          ) : null}

          {showBankApps ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setLaunchingApp('toss');
                  setAppMessage('');

                  const timeout = setTimeout(() => {
                    setLaunchingApp(null);
                    setAppMessage('토스 앱이 설치되어 있지 않거나 실행되지 않았습니다.');
                  }, 900);

                  window.location.href = 'supertoss://';

                  window.addEventListener(
                    'blur',
                    () => {
                      clearTimeout(timeout);

                      setTimeout(() => {
                        setCopyMessage('');
                        setShowBankApps(false);
                        setLaunchingApp(null);
                        setAppMessage('');
                      }, 500);
                    },
                    { once: true }
                  );
                }}
                className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  launchingApp === 'toss'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {launchingApp === 'toss' ? '토스 실행 중...' : '토스 열기'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setLaunchingApp('kakaobank');
                  setAppMessage('');

                  const timeout = setTimeout(() => {
                    setLaunchingApp(null);
                    setAppMessage('카카오뱅크 앱이 설치되어 있지 않거나 실행되지 않았습니다.');
                  }, 900);

                  window.location.href = 'kakaobank://';

                  window.addEventListener(
                    'blur',
                    () => {
                      clearTimeout(timeout);

                      setTimeout(() => {
                        setCopyMessage('');
                        setShowBankApps(false);
                        setLaunchingApp(null);
                        setAppMessage('');
                      }, 500);
                    },
                    { once: true }
                  );
                }}
                className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  launchingApp === 'kakaobank'
                    ? 'bg-yellow-400 text-black'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {launchingApp === 'kakaobank'
                  ? '카카오뱅크 실행 중...'
                  : '카카오뱅크 열기'}
              </button>
            </>
          ) : null}

          {appMessage ? (
            <p className="mt-3 text-center text-sm font-semibold text-rose-600">
              {appMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setPaymentGuide(null);
              resetPaymentModalState();
            }}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
          >
            닫기
          </button>
        </div>
      </div>
    ) : null}
    </>
    
  );
}

function MetricCard({ label, value, description, accent = false }: { label: string; value: string; description: string; accent?: boolean }) {
  return (
    <article className={accent ? 'rounded-[28px] bg-brand-700 p-5 text-white shadow-soft' : 'glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft'}>
      <p className={accent ? 'text-sm font-semibold text-white/70' : 'text-sm font-semibold text-slate-500'}>{label}</p>
      <p className={accent ? 'mt-4 text-3xl font-black' : 'mt-4 text-3xl font-black text-slate-900'}>{value}</p>
      <p className={accent ? 'mt-2 text-sm text-white/70' : 'mt-2 text-sm text-slate-500'}>{description}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">{text}</div>;
}

function TransactionPanel({
  title,
  total,
  items,
  kind,
  embedded = false,
}: {
  title: string;
  total: number;
  items: Array<IncomeEntry | ExpenseEntry>;
  kind: 'income' | 'expense';
  embedded?: boolean;
}) {
  return (
    <article className={embedded ? '' : 'glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6'}>
      <div className={`flex items-end justify-between ${embedded ? 'pb-2' : 'border-b border-slate-200/80 pb-4'}`}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">{kind === 'income' ? 'Income' : 'Expense'}</p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
        </div>
        <span className="text-sm font-semibold text-slate-500">합계 {formatCurrency(total)}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{kind === 'income' ? '세입 항목' : '지출 항목'}</p>
            </div>
            <span className="text-sm font-black text-slate-900">{formatCurrency(item.amount)}</span>
          </div>
        )) : <EmptyState text={`등록된 ${kind === 'income' ? '기타 세입' : '지출'}이 없습니다.`} />}
      </div>
    </article>
  );
}
