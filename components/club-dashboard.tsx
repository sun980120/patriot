'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createFiscalYearAction, markBulkPaymentsPaidAction, sendAdditionalChargeFiscalYearReminderAction, sendMonthlyDuesPushReminderAction, togglePaymentAction, updateManualPaymentExemptionAction } from '@/app/actions';
import { HIDDEN_PROFILE_EMAILS, ROLE_META, CLUB_BANK } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { ClubEvent, DashboardBundle, FiscalYear, PaymentRecord, Profile } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';
import { AdminDuesManagement } from '@/components/admin-dues-management';
import { DashboardOverview } from '@/components/dashboard-overview';
import { MemberDuesHistory } from '@/components/member-dues-history';
import { MemberAdditionalCharges } from '@/components/member-additional-charges';
import { summarizeFinance } from '@/lib/finance-summary';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DUES_STATUS_LABELS, duesAmount, getDuesExemption, getDuesStatus, isDuesPayable, isFeeExempt, koreanYearMonth } from '@/lib/dues';
import { DuesExemptionNote } from '@/components/dues-exemption-note';
import { Bell, Check, Copy, Info, Landmark } from 'lucide-react';

function isAdmin(profile: Profile | null) {
  return profile?.app_role === 'admin' || profile?.app_role === 'super_admin';
}

const GRADE_ORDER: Record<Profile['member_grade'], number> = {
  간사: 0,
  정회원: 1,
  준회원: 2,
};

function compareMembers(a: Profile, b: Profile) {
  const gradeDiff = GRADE_ORDER[a.member_grade] - GRADE_ORDER[b.member_grade];
  if (gradeDiff !== 0) return gradeDiff;

  const aBirth = a.birth_date ? new Date(a.birth_date).getTime() : Number.MAX_SAFE_INTEGER;
  const bBirth = b.birth_date ? new Date(b.birth_date).getTime() : Number.MAX_SAFE_INTEGER;
  if (aBirth !== bBirth) return aBirth - bBirth;

  return a.full_name.localeCompare(b.full_name, 'ko');
}

function getNextReminderDate(today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (day <= 1) return new Date(year, month, 1);
  if (day <= 5) return new Date(year, month, 5);
  return new Date(year, month + 1, 1);
}

function getMonthlyNoticePeriods(today: Date, fiscalYears: FiscalYear[]) {
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return fiscalYears
    .flatMap((fiscalYear) =>
      fiscalYear.visible_months.map((month) => ({
        fiscalYear,
        month,
        monthStart: new Date(fiscalYear.year, month - 1, 1),
      }))
    )
    .filter((period) => period.monthStart <= currentMonthStart)
    .sort((a, b) => {
      if (a.fiscalYear.year !== b.fiscalYear.year) return a.fiscalYear.year - b.fiscalYear.year;
      return a.month - b.month;
    });
}

function getPushReminderMonthlyPeriods(today: Date, fiscalYears: FiscalYear[]) {  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const isCurrentMonthReminderDay = today.getDate() === 1 || today.getDate() === 5;

  return fiscalYears
    .flatMap((fiscalYear) =>
      fiscalYear.visible_months.map((month) => ({
        fiscalYear,
        month,
        dueDate: new Date(fiscalYear.year, month - 1, 6),
      }))
    )
    .filter((period) => {
      const isCurrentMonth =
        period.fiscalYear.year === currentYear && period.month === currentMonth;
      return period.dueDate <= todayStart || (isCurrentMonthReminderDay && isCurrentMonth);
    })
    .sort((a, b) => {
      if (a.fiscalYear.year !== b.fiscalYear.year) return a.fiscalYear.year - b.fiscalYear.year;
      return a.month - b.month;
    });
}

function formatMonthlyPeriods(periods: { year: number; month: number }[]) {
  return periods
    .map((period) => `${period.year}년 ${period.month}월`)
    .join(', ');
}

export function ClubDashboard({ initialData, source, events = null, view = 'overview', initialYearId, initialDuesMonth, initialDuesFilter, initialMemberId, initialArrears = false }: {
  initialData: DashboardBundle; source: 'mock' | 'spring'; events?: ClubEvent[] | null;
  view?: 'overview' | 'dues'; initialYearId?: string; initialDuesMonth?: number; initialDuesFilter?: 'all' | 'due' | 'exempt'; initialMemberId?: string; initialArrears?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId ?? initialData.selectedYear?.id ?? initialData.fiscalYears[0]?.id ?? '');
  const [newYearInput, setNewYearInput] = useState('');
  const [adminNoticeTab, setAdminNoticeTab] = useState<'monthly' | 'additional'>('monthly');
  const [actionMessage, setActionMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [isPending, startTransition] = useTransition();
  const [showReminders, setShowReminders] = useState(false);
  const [launchingAppKey, setLaunchingAppKey] = useState<string | null>(null);
  const [paymentGuide, setPaymentGuide] = useState<{ memberName: string; amount: number; label: string } | null>(null);
  const [paymentActionTarget, setPaymentActionTarget] = useState<{ member: Profile; month: number } | null>(null);
  const [paymentExemptionReason, setPaymentExemptionReason] = useState('');
  const [paymentMode, setPaymentMode] = useState<'paid' | 'exempt'>('paid');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const paymentMutation = useRef(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setData(initialData);
    setSelectedYearId((current) => {
      if (initialData.fiscalYears.some((year) => year.id === current)) return current;
      return initialData.selectedYear?.id ?? initialData.fiscalYears[0]?.id ?? '';
    });
  }, [initialData]);

  useEffect(() => { if (initialYearId) setSelectedYearId(initialYearId); }, [initialYearId]);

  const profile = data.profile;
  const adminMode = isAdmin(profile);
  const fiscalYears = data.fiscalYears;
  const selectedYear = fiscalYears.find((item) => item.id === selectedYearId) ?? fiscalYears[0];
  const hasFiscalYear = Boolean(selectedYear);

  useEffect(() => {
    setPaymentActionTarget(null);
    setPaymentGuide(null);
    setShowReminders(false);
  }, [view, selectedYearId]);

  useEffect(() => {
    if (!paymentActionTarget || !selectedYear) {
      setPaymentExemptionReason('');
      return;
    }

    const payment = data.payments.find(
      (item) =>
        item.fiscal_year_id === selectedYear.id &&
        item.member_id === paymentActionTarget.member.id &&
        item.month === paymentActionTarget.month
    );
    setPaymentExemptionReason(payment?.exemption_reason ?? '');
  }, [data.payments, paymentActionTarget, selectedYear]);

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
    return [...visibleProfiles].sort(compareMembers);
  }, [visibleProfiles]);

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

  const memberChargeAssignments = useMemo(() => {
    if (!selectedYear || !profile) return [];

    return data.chargeGroups
      .flatMap((group) =>
        group.participant_charges
          .filter((charge) => charge.member_id === profile.id)
          .map((charge) => ({
            charge,
            group,
          }))
      );
  }, [data.chargeGroups, profile, selectedYear]);

  const currentMonthReminder = useMemo(() => {
    if (!today) return null;

    const reminderDay = today.getDate() === 1 || today.getDate() === 5;
    const nextReminderDate = getNextReminderDate(today);
    const noticePeriods = getMonthlyNoticePeriods(today, fiscalYears);
    const pushPeriods = getPushReminderMonthlyPeriods(today, fiscalYears);
    const latestPeriod = noticePeriods.at(-1) ?? null;

    const buildTargets = (periods: Array<{ fiscalYear: FiscalYear; month: number }>) =>
      activeApprovedProfiles
        .filter((member) => member.member_grade !== '간사')
        .map((member) => {
          const unpaidPeriods = periods.filter(({ fiscalYear, month }) => {
            const payment = data.payments.find(
              (item) => item.fiscal_year_id === fiscalYear.id && item.member_id === member.id && item.month === month
            );
            return getDuesStatus(member, fiscalYear, month, payment, fiscalYears, data.payments, today) === 'due';
          });

          return {
            member,
            amount: ROLE_META[member.member_grade].fee * unpaidPeriods.length,
            months: unpaidPeriods.map(({ fiscalYear, month }) => ({ year: fiscalYear.year, month })),
          };
        })
        .filter((target) => target.amount > 0)
        .sort((a, b) => compareMembers(a.member, b.member));

    if (!noticePeriods.length) {      return {
        fiscalYear: null,
        month: today.getMonth() + 1,
        months: [],
        reminderDay,
        nextReminderDate,
        targets: [],
        pushTargets: [],        currentUserTarget: null,
      };
    }

    const targets = buildTargets(noticePeriods);
    const pushTargets = buildTargets(pushPeriods);
    return {
      fiscalYear: latestPeriod?.fiscalYear ?? null,
      month: latestPeriod?.month ?? today.getMonth() + 1,
      months: noticePeriods.map(({ fiscalYear, month }) => ({ year: fiscalYear.year, month })),
      reminderDay,
      nextReminderDate,
      targets,
      pushTargets,      currentUserTarget: profile ? targets.find((item) => item.member.id === profile.id) ?? null : null,
    };
  }, [activeApprovedProfiles, data.payments, fiscalYears, profile, today]);

  const additionalReminderTargets = useMemo(() => {
    if (!selectedYear) return [];

    const activeProfileMap = new Map(activeApprovedProfiles.map((member) => [member.id, member]));

    return data.chargeGroups
      .filter((group) => group.fiscal_year_id === selectedYear.id)
      .flatMap((group) =>
        group.participant_charges
          .filter((charge) => charge.status === 'UNPAID')
          .map((charge) => {
            const member = activeProfileMap.get(charge.member_id);
            if (!member) return null;
            return { member, charge, group };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      )
      .sort((a, b) => {
        const memberOrder = compareMembers(a.member, b.member);
        if (memberOrder !== 0) return memberOrder;
        const aDate = a.group.event_date ?? '9999-12-31';
        const bDate = b.group.event_date ?? '9999-12-31';
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return a.group.title.localeCompare(b.group.title, 'ko');
      });
  }, [activeApprovedProfiles, data.chargeGroups, selectedYear]);

  const summary = useMemo(() => summarizeFinance(data, selectedYear?.id ?? ''), [data, selectedYear]);

  const mergePaymentRecords = (records: PaymentRecord[]) => {
    setData((current) => ({
      ...current,
      payments: [
        ...current.payments.filter((existing) => !records.some((record) =>
          record.fiscal_year_id === existing.fiscal_year_id && record.member_id === existing.member_id && record.month === existing.month)),
        ...records,
      ],
    }));
  };

  const reportPaymentError = (message: string) => {
    setToastTone('error');
    setActionMessage(message);
  };

  const handleTogglePaid = async (member: Profile, month: number) => {
    if (paymentMutation.current || !adminMode || member.member_grade === '간사' || !selectedYear || !today) return false;
    const existing = data.payments.find((item) => item.fiscal_year_id === selectedYear.id && item.member_id === member.id && item.month === month);
    const status = getDuesStatus(member, selectedYear, month, existing, fiscalYears, data.payments, today);
    if (!isDuesPayable(status) && status !== 'paid') {
      reportPaymentError('납부 대상 회비만 처리할 수 있습니다.');
      return false;
    }
    paymentMutation.current = true;
    setPaymentSaving(true);
    try {
      if (source === 'spring') {
        const result = await togglePaymentAction({ fiscalYearId: selectedYear.id, memberId: member.id, month, paid: Boolean(existing?.paid) });
        if (!result.ok || !result.payment) {
          reportPaymentError(result.message ?? '납부 상태 변경에 실패했습니다.');
          router.refresh();
          return false;
        }
        mergePaymentRecords([result.payment]);
      } else {
        const paid = !existing?.paid;
        mergePaymentRecords([{
          id: existing?.id ?? `payment-${selectedYear.id}-${member.id}-${month}`,
          fiscal_year_id: selectedYear.id, member_id: member.id, month, paid,
          charged_amount: paid ? duesAmount(member) : 0, applied_grade: member.member_grade, updated_at: new Date().toISOString(),
          manual_exempt: false, exemption_reason: null,
        }]);
      }
      setToastTone('success');
      setActionMessage(existing?.paid ? '납부가 취소되었습니다.' : '납부 완료로 처리했습니다.');
      return true;
    } catch {
      reportPaymentError('서버에 연결하지 못했습니다. 다시 시도해 주세요.');
      return false;
    } finally { paymentMutation.current = false; setPaymentSaving(false); }
  };

  const handleManualExemption = async (member: Profile, month: number, exempt: boolean, reasonInput?: string) => {
    if (paymentMutation.current || !adminMode || member.member_grade === '간사' || !selectedYear) return false;
    const existing = data.payments.find((item) => item.fiscal_year_id === selectedYear.id && item.member_id === member.id && item.month === month);
    const status = getDuesStatus(member, selectedYear, month, existing, fiscalYears, data.payments, today);
    if (status === 'paid' || status === 'before' || status === 'future' || (!existing?.manual_exempt && status === 'exempt')) {
      reportPaymentError('해당 상태의 회비는 수동 면제를 변경할 수 없습니다.');
      return false;
    }
    const reason = exempt ? reasonInput?.trim() || '운영진 승인' : null;
    paymentMutation.current = true;
    setPaymentSaving(true);
    try {
      if (source === 'spring') {
        const result = await updateManualPaymentExemptionAction({ fiscalYearId: selectedYear.id, memberId: member.id, month, exempt, reason: reason ?? undefined });
        if (!result.ok || !result.payment) {
          reportPaymentError(result.message ?? '면제 상태 변경에 실패했습니다.');
          router.refresh();
          return false;
        }
        mergePaymentRecords([result.payment]);
      } else {
        mergePaymentRecords([{
          id: existing?.id ?? `payment-${selectedYear.id}-${member.id}-${month}`,
          fiscal_year_id: selectedYear.id, member_id: member.id, month, paid: false,
          charged_amount: 0, applied_grade: member.member_grade, manual_exempt: exempt, exemption_reason: reason, updated_at: new Date().toISOString(),
        }]);
      }
      setToastTone('success');
      setActionMessage(exempt ? '회비 면제가 처리되었습니다.' : '회비 면제가 해제되었습니다.');
      return true;
    } catch {
      reportPaymentError('서버에 연결하지 못했습니다. 다시 시도해 주세요.');
      return false;
    } finally { paymentMutation.current = false; setPaymentSaving(false); }
  };

  const handleBulkPaid = async (memberIds: string[], month: number) => {
    if (!adminMode || !selectedYear || !today || paymentMutation.current) return { ok: false, message: '다른 납부 처리가 진행 중입니다.' };
    const targets = activeApprovedProfiles.filter((member) => memberIds.includes(member.id));
    if (!memberIds.length || memberIds.length > 200 || targets.length !== memberIds.length || targets.some((member) => {
      const payment = data.payments.find((item) => item.member_id === member.id && item.fiscal_year_id === selectedYear.id && item.month === month);
      return !isDuesPayable(getDuesStatus(member, selectedYear, month, payment, fiscalYears, data.payments, today));
    })) return { ok: false, message: '납부 대상이 변경되었습니다. 다시 선택해 주세요.' };
    paymentMutation.current = true;
    setPaymentSaving(true);
    try {
      if (source === 'spring') {
        const result = await markBulkPaymentsPaidAction({ fiscalYearId: selectedYear.id, memberIds, month });
        if (!result.ok || !result.payments) { router.refresh(); return { ok: false, message: result.message ?? '일괄 처리에 실패했습니다.' }; }
        mergePaymentRecords(result.payments);
      } else {
        mergePaymentRecords(targets.map((member) => ({
          id: data.payments.find((item) => item.member_id === member.id && item.fiscal_year_id === selectedYear.id && item.month === month)?.id ?? `payment-${selectedYear.id}-${member.id}-${month}`,
          fiscal_year_id: selectedYear.id, member_id: member.id, month, paid: true,
          charged_amount: duesAmount(member), applied_grade: member.member_grade, manual_exempt: false, exemption_reason: null, updated_at: new Date().toISOString(),
        })));
      }
      setToastTone('success');
      setActionMessage(`${month}월 ${memberIds.length}명의 회비를 납부 완료로 처리했습니다.`);
      return { ok: true };
    } catch { return { ok: false, message: '서버에 연결하지 못했습니다. 다시 시도해 주세요.' }; }
    finally { paymentMutation.current = false; setPaymentSaving(false); }
  };

  const openPaymentAction = (member: Profile, month: number) => {
    if (!adminMode || member.member_grade === '간사' || !selectedYear || !today) return;
    const payment = data.payments.find((item) => item.fiscal_year_id === selectedYear.id && item.member_id === member.id && item.month === month);
    const status = getDuesStatus(member, selectedYear, month, payment, fiscalYears, data.payments, today);
    if (status === 'before') return;
    setPaymentMode(status === 'exempt' ? 'exempt' : 'paid');
    setActionMessage('');
    setPaymentActionTarget({ member, month });
  };

  const handlePaymentActionTogglePaid = async (member: Profile, month: number) => {
    if (await handleTogglePaid(member, month)) setPaymentActionTarget(null);
  };

  const handlePaymentActionManualExemption = async (member: Profile, month: number, exempt: boolean) => {
    if (await handleManualExemption(member, month, exempt, paymentExemptionReason)) setPaymentActionTarget(null);
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
              manual_exempt: false,
              exemption_reason: null,
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
    setLaunchingAppKey(null);
  };

  const buildTransferText = (amount: number) =>
    `${CLUB_BANK.bankName} ${CLUB_BANK.accountNumber} ${amount.toLocaleString('ko-KR')}원`;

  const openMonthlyPaymentGuide = (member: Profile, month: number) => {
    setPaymentGuide({
      memberName: member.full_name,
      amount: ROLE_META[member.member_grade].fee,
      label: `${selectedYear?.year}년 ${month}월 회비`,
    });
  };

  const copyPaymentText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastTone('success'); setActionMessage(message);
      return true;
    } catch {
      reportPaymentError('복사하지 못했습니다. 계좌번호와 금액을 직접 확인해 주세요.');
      return false;
    }
  };

  const handleCopyMonthlyTransfer = async () => {
    if (!paymentGuide) return false;
    return copyPaymentText(buildTransferText(paymentGuide.amount), `${paymentGuide.label} 정보가 복사되었습니다.`);
  };

  const handleSendReminder = () => {
    if (!adminMode || isPending || !selectedYear) return;
    setActionMessage('');
    if (source === 'mock') {
      setToastTone('info'); setActionMessage('샘플 데이터에서는 실제 알림을 발송하지 않습니다.');
      setShowReminders(false); return;
    }
    startTransition(async () => {
      try {
        const result = adminNoticeTab === 'monthly'
          ? await sendMonthlyDuesPushReminderAction()
          : await sendAdditionalChargeFiscalYearReminderAction(selectedYear.id);
        setToastTone(result.ok ? 'success' : 'error');
        setActionMessage(result.message ?? (result.ok ? '알림을 발송했습니다.' : '알림 발송에 실패했습니다.'));
        if (result.ok) setShowReminders(false);
      } catch { reportPaymentError('서버에 연결하지 못했습니다. 다시 시도해 주세요.'); }
    });
  };

  const handleOpenMonthlyBankApp = async (app: 'toss' | 'kakaobank') => {
    if (!paymentGuide) return;
    if (!await handleCopyMonthlyTransfer()) return;
    const currentKey = `payment-guide:${app}`;
    setLaunchingAppKey(currentKey);

    const timeout = setTimeout(() => {
      setLaunchingAppKey(null);
      setToastTone('error');
      setActionMessage(app === 'toss' ? '토스가 설치되어 있지 않거나 실행되지 않았습니다.' : '카카오뱅크가 설치되어 있지 않거나 실행되지 않았습니다.');
    }, 900);

    window.location.href = app === 'toss' ? 'supertoss://' : 'kakaobank://';

    window.addEventListener(
      'blur',
      () => {
        clearTimeout(timeout);
        setTimeout(() => {
          setLaunchingAppKey(null);
        }, 500);
      },
      { once: true }
    );
  };

  const paymentActionPayment =
    paymentActionTarget && selectedYear
      ? data.payments.find(
          (item) =>
            item.fiscal_year_id === selectedYear.id &&
            item.member_id === paymentActionTarget.member.id &&
            item.month === paymentActionTarget.month
        )
      : undefined;
  const paymentActionManualExempt = Boolean(paymentActionPayment?.manual_exempt);
  const paymentActionPaid = Boolean(paymentActionPayment?.paid);
  const paymentActionStatus = paymentActionTarget && selectedYear
    ? getDuesStatus(paymentActionTarget.member, selectedYear, paymentActionTarget.month, paymentActionPayment, fiscalYears, data.payments, today)
    : null;
  const paymentActionFuturePeriod = Boolean(paymentActionTarget && selectedYear && today &&
    selectedYear.year * 12 + paymentActionTarget.month > koreanYearMonth(today).year * 12 + koreanYearMonth(today).month);
  const paymentActionAutoExempt =
    Boolean(paymentActionTarget && selectedYear) &&
    isFeeExempt(
      paymentActionTarget!.member,
      fiscalYears,
      data.payments,
      selectedYear!.year,
      paymentActionTarget!.month
    );
  const paymentActionCanTogglePaid = Boolean(paymentActionTarget && !paymentActionAutoExempt && !paymentActionManualExempt);
  const paymentActionCanManualExempt = Boolean(paymentActionTarget && !paymentActionPaid && !paymentActionAutoExempt && !paymentActionFuturePeriod);

  if (!hasFiscalYear) {
    return (
      <>
        <FloatingToast open={Boolean(actionMessage)} message={actionMessage} tone={toastTone} onClose={() => setActionMessage('')} />
        <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Setup Required</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">연도 데이터가 아직 없습니다.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            회비 관리 연도가 아직 개설되지 않았습니다.
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
                              manual_exempt: false,
                              exemption_reason: null,
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
      {view === 'overview' ? (
        <DashboardOverview data={data} year={selectedYear} members={filteredProfiles} admin={adminMode}
          today={today} summary={summary} events={events} source={source} pendingCount={pendingProfiles.length}
          onYearChange={setSelectedYearId} onRefresh={() => router.refresh()} />
      ) : (
        <>
          {adminMode ? <AdminDuesManagement key={`${selectedYear.id}:${initialDuesMonth ?? ''}:${initialDuesFilter ?? ''}:${initialMemberId ?? ''}:${initialArrears}`}
            year={selectedYear} fiscalYears={fiscalYears} members={filteredProfiles} payments={data.payments}
            today={today} onYearChange={setSelectedYearId} onOpenPayment={openPaymentAction}
            onBulkPaid={handleBulkPaid} newYearInput={newYearInput} onNewYearInputChange={setNewYearInput}
            onCreateYear={addYear} initialMonth={initialDuesMonth} initialFilter={initialDuesFilter}
            initialMemberId={initialMemberId} initialArrears={initialArrears} onOpenReminders={() => { setActionMessage(''); setShowReminders(true); }} />
            : <MemberDuesHistory member={filteredProfiles[0]} year={selectedYear} years={fiscalYears}
                payments={data.payments} today={today} onYearChange={setSelectedYearId} onPay={openMonthlyPaymentGuide} />}
          {!adminMode || memberChargeAssignments.length ? <MemberAdditionalCharges assignments={memberChargeAssignments} profile={profile}
            onOpenGuide={(memberName, amount, label) => { setActionMessage(''); setPaymentGuide({ memberName, amount, label }); }} /> : null}
        </>
      )}
      {showReminders && adminMode ? (
        <ResponsiveDialog title="미납 알림" busy={isPending} onClose={() => setShowReminders(false)}>
          <div role="group" aria-label="미납 알림 유형" className="mb-4 flex gap-5 border-b border-slate-200">
            {(['monthly', 'additional'] as const).map((value) => <button key={value} type="button" disabled={isPending} aria-pressed={adminNoticeTab === value} onClick={() => setAdminNoticeTab(value)} className={`min-h-11 border-b-2 text-sm ${adminNoticeTab === value ? 'border-emerald-700 font-semibold' : 'border-transparent text-slate-500'}`}>{value === 'monthly' ? `월회비 ${currentMonthReminder?.pushTargets.length ?? 0}명` : `추가 비용 ${additionalReminderTargets.length}건`}</button>)}
          </div>
          <p className="mb-3 text-xs leading-5 text-slate-500">{adminNoticeTab === 'monthly' ? '납부 기한이 지난 월회비 전체를 기준으로 알림을 보냅니다. 매월 1일과 5일에는 이번 달도 포함합니다.' : `${selectedYear.year}년의 미납 추가 비용을 기준으로 알림을 보냅니다.`}</p>
          <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
            {adminNoticeTab === 'monthly' ? (currentMonthReminder?.pushTargets ?? []).map(({ member, amount, months }) => <li key={member.id} className="py-3"><div className="flex justify-between gap-3 text-sm"><strong className="font-semibold">{member.full_name}</strong><span className="tabular-nums">{formatCurrency(amount)}</span></div><p className="mt-1 text-xs text-slate-500">{formatMonthlyPeriods(months)}</p></li>) : additionalReminderTargets.map(({ member, charge, group }) => <li key={charge.id} className="py-3"><div className="flex justify-between gap-3 text-sm"><strong className="font-semibold">{member.full_name}</strong><span className="tabular-nums">{formatCurrency(charge.amount)}</span></div><p className="mt-1 text-xs text-slate-500">{group.title}</p></li>)}
          </ul>
          {!(adminNoticeTab === 'monthly' ? currentMonthReminder?.pushTargets.length : additionalReminderTargets.length) ? <p className="py-5 text-center text-sm text-slate-500">알림 대상이 없습니다.</p> : null}
          {actionMessage && toastTone === 'error' ? <p role="alert" className="mt-3 text-sm text-rose-700">{actionMessage}</p> : null}
          <button type="button" disabled={isPending || !(adminNoticeTab === 'monthly' ? currentMonthReminder?.pushTargets.length : additionalReminderTargets.length)} onClick={handleSendReminder} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-40"><Bell className="h-4 w-4" />{isPending ? '발송 중…' : '대상 확인 · 알림 발송'}</button>
        </ResponsiveDialog>
      ) : null}
      {paymentActionTarget ? (
        <ResponsiveDialog title="월 회비 관리" busy={paymentSaving} onClose={() => setPaymentActionTarget(null)}>
          <p className="text-sm text-slate-500">{selectedYear?.year}년 {paymentActionTarget.month}월 · {paymentActionTarget.member.full_name} · {paymentActionTarget.member.member_grade}</p>
          <div className="my-5 flex items-center justify-between gap-3 border-y border-slate-200 py-4">
            <span className="text-sm text-slate-500">회비</span>
            <strong className="text-2xl font-semibold tabular-nums">{formatCurrency(paymentActionPaid ? paymentActionPayment?.charged_amount ?? 0 : duesAmount(paymentActionTarget.member))}</strong>
          </div>
          <div role="group" aria-label="회비 처리 방식" className="mb-5 flex gap-6 border-b border-slate-200">
            {(['paid', 'exempt'] as const).map((mode) => <button key={mode} type="button" aria-pressed={paymentMode === mode} disabled={paymentSaving || (mode === 'paid' && (paymentActionManualExempt || paymentActionAutoExempt)) || (mode === 'exempt' && (paymentActionPaid || paymentActionFuturePeriod))} onClick={() => setPaymentMode(mode)} className={`min-h-11 border-b-2 text-sm disabled:opacity-40 ${paymentMode === mode ? 'border-emerald-700 font-semibold text-slate-900' : 'border-transparent text-slate-500'}`}>{mode === 'paid' ? paymentActionFuturePeriod ? '선납 처리' : '납부 처리' : '면제 관리'}</button>)}
          </div>
          <div className="mb-5 flex items-center justify-between text-sm">
            <span className="text-slate-500">현재 상태</span>
            <span className={`rounded px-2 py-1 text-xs ${paymentActionPaid ? 'bg-emerald-50 text-emerald-700' : paymentActionManualExempt || paymentActionAutoExempt || paymentActionStatus === 'future' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-700'}`}>{paymentActionManualExempt ? '수동 면제' : paymentActionAutoExempt ? '자동 면제' : paymentActionStatus ? DUES_STATUS_LABELS[paymentActionStatus] : '—'}</span>
          </div>
          {paymentMode === 'paid' ? (
            <>
              <button type="button" disabled={paymentSaving || !paymentActionCanTogglePaid} onClick={() => void handlePaymentActionTogglePaid(paymentActionTarget.member, paymentActionTarget.month)} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-40 ${paymentActionPaid ? 'border border-slate-200 text-rose-700' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}><Check className="h-4 w-4" />{paymentSaving ? '처리 중…' : paymentActionPaid ? '납부 취소' : paymentActionFuturePeriod ? '선납 완료로 변경' : '납부 완료로 변경'}</button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />{paymentActionPaid ? `납부 취소 시 해당 월을 ${paymentActionFuturePeriod ? '예정' : '미납'} 상태로 되돌립니다.` : '실제 계좌의 입금 내역을 확인한 뒤 처리해 주세요.'}</p>
            </>
          ) : (
            <>
              <label className="mb-4 block text-sm text-slate-600">면제 사유 (선택)<input value={paymentExemptionReason} onChange={(event) => setPaymentExemptionReason(event.target.value)} disabled={paymentSaving || paymentActionAutoExempt || paymentActionManualExempt} type="text" maxLength={255} placeholder="예: 부상, 장기 결석" className="mt-2 min-h-11 w-full rounded-md border border-slate-200 px-3 text-base disabled:bg-slate-50 sm:text-sm" /></label>
              <button type="button" disabled={paymentSaving || !paymentActionCanManualExempt} onClick={() => void handlePaymentActionManualExemption(paymentActionTarget.member, paymentActionTarget.month, !paymentActionManualExempt)} className="min-h-11 w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40">{paymentSaving ? '처리 중…' : paymentActionManualExempt ? '면제 해제' : '면제 적용'}</button>
              {paymentActionAutoExempt ? <DuesExemptionNote detail={getDuesExemption(paymentActionTarget.member, paymentActionPayment, 'exempt')} /> : null}
            </>
          )}
          {actionMessage && toastTone === 'error' ? <p role="alert" className="mt-3 text-sm text-rose-700">{actionMessage}</p> : null}
        </ResponsiveDialog>
      ) : null}
      {paymentGuide ? (
        <ResponsiveDialog title="회비 납부 안내" onClose={() => { setPaymentGuide(null); resetPaymentModalState(); }}>
          <p className="text-sm text-slate-500">{paymentGuide.memberName} · {paymentGuide.label}</p>
          <p className="mt-4 text-3xl font-semibold tabular-nums text-slate-900">{formatCurrency(paymentGuide.amount)}</p>
          <div className="my-5 border-y border-slate-200 py-4">
            <p className="flex items-center gap-2 text-sm text-slate-600"><Landmark className="h-4 w-4" />{CLUB_BANK.bankName}</p>
            <div className="my-2 flex items-center justify-between gap-2"><strong className="break-all text-xl font-semibold tabular-nums">{CLUB_BANK.accountNumber}</strong><button type="button" aria-label="계좌번호 복사" title="계좌번호 복사" onClick={() => void copyPaymentText(CLUB_BANK.accountNumber, '계좌번호가 복사되었습니다.')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100"><Copy className="h-4 w-4" /></button></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">예금주</span><span>{CLUB_BANK.accountHolder}</span></div>
            <div className="mt-2 flex justify-between gap-3 text-sm"><span className="text-slate-500">입금자명</span><span>{paymentGuide.memberName}</span></div>
          </div>
          <button type="button" onClick={() => void handleCopyMonthlyTransfer()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><Copy className="h-4 w-4" />납부 정보 복사</button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" disabled={Boolean(launchingAppKey)} onClick={() => void handleOpenMonthlyBankApp('toss')} className="min-h-11 rounded-md border border-slate-200 px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">{launchingAppKey === 'payment-guide:toss' ? '실행 중…' : '토스 열기'}</button>
            <button type="button" disabled={Boolean(launchingAppKey)} onClick={() => void handleOpenMonthlyBankApp('kakaobank')} className="min-h-11 rounded-md border border-slate-200 px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">{launchingAppKey === 'payment-guide:kakaobank' ? '실행 중…' : '카카오뱅크 열기'}</button>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>이체 후 간사가 입금을 확인하면 납부 완료로 변경됩니다.</span></p>
        </ResponsiveDialog>
      ) : null}
    </>
    
  );
}
