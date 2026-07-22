'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createAdditionalChargeGroupAction,
  createExpenseEntryAction,
  createIncomeEntryAction,
  deleteAdditionalChargeGroupAction,
  deleteExpenseEntryAction,
  deleteIncomeEntryAction,
  reopenAdditionalChargeSettlementAction,
  sendAdditionalChargeReminderAction,
  settleAdditionalChargeSurplusAction,
  toggleAdditionalChargePaidAction,
  updateAdditionalChargeAmountAction,
} from '@/app/actions';
import { HIDDEN_PROFILE_EMAILS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { AdditionalChargeCategory, ChargeGroup, DashboardBundle, ExpenseEntry, IncomeEntry, ParticipantCharge, Profile } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

const CATEGORY_LABELS: Record<AdditionalChargeCategory, string> = {
  JOIN_FEE: '가입비',
  UNIFORM_FEE: '유니폼비',
  DINNER_FEE: '회식비',
  TOURNAMENT_FEE: '대회비',
  ETC_FEE: '기타 비용',
};

type ChargeCreateMode = 'split' | 'manual';

function formatNumberInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

function parseNumberInput(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function FinanceManagement({ bundle, source }: { bundle: DashboardBundle; source: 'mock' | 'spring' }) {
  const router = useRouter();
  const [data, setData] = useState(bundle);
  const [selectedYearId, setSelectedYearId] = useState(bundle.selectedYear?.id ?? bundle.fiscalYears[0]?.id ?? '');
  const [incomeForm, setIncomeForm] = useState({ label: '', amount: '' });
  const [expenseForm, setExpenseForm] = useState({ label: '', amount: '' });
  const [chargeForm, setChargeForm] = useState({
    title: '',
    category: 'TOURNAMENT_FEE' as AdditionalChargeCategory,
    chargeMode: 'split' as ChargeCreateMode,
    eventDate: '',
    supportAmount: '',
    totalExpenseAmount: '',
    manualAmount: '',
    roundingUnit: '1000' as '1' | '10' | '100' | '1000',
    memo: '',
    participantIds: [] as string[],
  });
  const [participantSearch, setParticipantSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupParticipantSearch, setGroupParticipantSearch] = useState<Record<string, string>>({});
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [chargeFilter, setChargeFilter] = useState<'settlement_pending' | 'settlement_completed'>('settlement_pending');
  const [chargeAmountForms, setChargeAmountForms] = useState<Record<string, { amount: string; reason: string }>>({});
  const [settlementActualCostForms, setSettlementActualCostForms] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setData(bundle);
    setSelectedYearId((current) => {
      if (bundle.fiscalYears.some((year) => year.id === current)) {
        return current;
      }
      return bundle.selectedYear?.id ?? bundle.fiscalYears[0]?.id ?? '';
    });
  }, [bundle]);

  const years = data.fiscalYears;
  const selectedYear = years.find((item) => item.id === selectedYearId) ?? years[0];
  const incomes = useMemo(
    () => data.incomes.filter((item) => item.fiscal_year_id === selectedYear?.id),
    [data.incomes, selectedYear]
  );
  const expenses = useMemo(
    () => data.expenses.filter((item) => item.fiscal_year_id === selectedYear?.id),
    [data.expenses, selectedYear]
  );
  const allChargeGroups = useMemo(
    () => data.chargeGroups.filter((item) => item.fiscal_year_id === selectedYear?.id),
    [data.chargeGroups, selectedYear]
  );
  const chargeGroups = useMemo(() => {
    const keyword = groupSearch.trim().toLowerCase();
    const filteredByStatus = allChargeGroups.filter((group) => {
      if (chargeFilter === 'settlement_completed') return group.settlement_completed;
      return !group.settlement_completed;
    });

    if (!keyword) return filteredByStatus;
    return filteredByStatus.filter((group) => {
      const inTitle = group.title.toLowerCase().includes(keyword);
      const inParticipants = group.participant_charges.some((charge) =>
        charge.member_name.toLowerCase().includes(keyword) || (charge.member_username ?? '').toLowerCase().includes(keyword)
      );
      return inTitle || inParticipants;
    });
  }, [allChargeGroups, chargeFilter, groupSearch]);
  const participantCandidates = useMemo(
    () => data.profiles.filter((item) => item.approval_status === 'approved' && item.is_active && item.app_role !== 'super_admin' && !HIDDEN_PROFILE_EMAILS.includes((item.email ?? '') as (typeof HIDDEN_PROFILE_EMAILS)[number])),
    [data.profiles]
  );
  const filteredParticipantCandidates = useMemo(() => {
    const keyword = participantSearch.trim().toLowerCase();
    if (!keyword) return participantCandidates;
    return participantCandidates.filter((member) =>
      member.full_name.toLowerCase().includes(keyword) || (member.username ?? '').toLowerCase().includes(keyword)
    );
  }, [participantCandidates, participantSearch]);

  const incomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const extraChargeTotal = allChargeGroups.reduce((sum, group) => sum + group.participant_charge_total, 0);
  const extraChargePaidTotal = allChargeGroups.reduce((sum, group) => sum + group.participant_paid_total, 0);
  const reportExportHref = selectedYear
    ? `/api/admin/finance-report/export?fiscalYearId=${encodeURIComponent(selectedYear.id)}`
    : '#';
  const selectedParticipantCount = chargeForm.participantIds.length;
  const supportAmountPreview = parseNumberInput(chargeForm.supportAmount || '0');
  const totalExpenseAmountPreview = parseNumberInput(chargeForm.totalExpenseAmount || '0');
  const manualAmountPreview = parseNumberInput(chargeForm.manualAmount || '0');
  const roundingUnitPreview = Number(chargeForm.roundingUnit || '1000');
  const participantExpenseBase =
    selectedParticipantCount > 0 ? Math.max(totalExpenseAmountPreview - supportAmountPreview, 0) / selectedParticipantCount : 0;
  const calculatedSplitAmountPerParticipant =
    selectedParticipantCount > 0 && totalExpenseAmountPreview > 0
      ? Math.ceil(participantExpenseBase / roundingUnitPreview) * roundingUnitPreview
      : 0;
  const calculatedAmountPerParticipant =
    chargeForm.chargeMode === 'manual' ? manualAmountPreview : calculatedSplitAmountPerParticipant;
  const calculatedParticipantChargeTotal = calculatedAmountPerParticipant * selectedParticipantCount;
  const effectiveTotalExpenseAmountPreview =
    chargeForm.chargeMode === 'manual'
      ? totalExpenseAmountPreview || calculatedParticipantChargeTotal
      : totalExpenseAmountPreview;
  const calculatedSurplusPreview = Math.max(
    calculatedParticipantChargeTotal - Math.max(effectiveTotalExpenseAmountPreview - supportAmountPreview, 0),
    0
  );

  const addEntry = (kind: 'income' | 'expense') => {
    if (!selectedYear) return;

    const form = kind === 'income' ? incomeForm : expenseForm;
    const label = form.label.trim();
    const amount = parseNumberInput(form.amount);

    if (!label || !amount) {
      setToastTone('error');
      setMessage('항목명과 금액을 모두 입력해 주세요.');
      return;
    }

    setMessage('');

    if (kind === 'income') {
      const entry: IncomeEntry = {
        id: `${selectedYear.id}-income-${Date.now()}`,
        fiscal_year_id: selectedYear.id,
        charge_group_id: null,
        label,
        amount,
        memo: null,
      };

      setData((current) => ({ ...current, incomes: [entry, ...current.incomes] }));
      setIncomeForm({ label: '', amount: '' });

      if (source === 'spring') {
        startTransition(async () => {
          const result = await createIncomeEntryAction({ fiscalYearId: selectedYear.id, label, amount });
          if (!result.ok) {
            setToastTone('error');
            setMessage(result.message ?? '세입 추가에 실패했습니다.');
            router.refresh();
            return;
          }
          setToastTone('success');
          setMessage('세입이 추가되었습니다.');
        });
      }

      return;
    }

    const entry: ExpenseEntry = {
      id: `${selectedYear.id}-expense-${Date.now()}`,
      fiscal_year_id: selectedYear.id,
      charge_group_id: null,
      label,
      amount,
      memo: null,
    };

    setData((current) => ({ ...current, expenses: [entry, ...current.expenses] }));
    setExpenseForm({ label: '', amount: '' });

    if (source === 'spring') {
      startTransition(async () => {
        const result = await createExpenseEntryAction({ fiscalYearId: selectedYear.id, label, amount });
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '지출 추가에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('지출이 추가되었습니다.');
      });
    }
  };

  const removeEntry = (kind: 'income' | 'expense', id: string) => {
    setMessage('');
    setData((current) =>
      kind === 'income'
        ? { ...current, incomes: current.incomes.filter((item) => item.id !== id) }
        : { ...current, expenses: current.expenses.filter((item) => item.id !== id) }
    );

    if (source === 'spring') {
      startTransition(async () => {
        const result = kind === 'income'
          ? await deleteIncomeEntryAction(id)
          : await deleteExpenseEntryAction(id);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '항목 삭제에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage(`${kind === 'income' ? '세입' : '지출'} 항목이 삭제되었습니다.`);
        router.refresh();
      });
    }
  };

  const toggleParticipant = (memberId: string) => {
    setChargeForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(memberId)
        ? current.participantIds.filter((id) => id !== memberId)
        : [...current.participantIds, memberId],
    }));
  };

  const selectAllFilteredParticipants = () => {
    setChargeForm((current) => ({
      ...current,
      participantIds: Array.from(new Set([...current.participantIds, ...filteredParticipantCandidates.map((member) => member.id)])),
    }));
  };

  const clearFilteredParticipants = () => {
    const visibleIds = new Set(filteredParticipantCandidates.map((member) => member.id));
    setChargeForm((current) => ({
      ...current,
      participantIds: current.participantIds.filter((id) => !visibleIds.has(id)),
    }));
  };

  const createChargeGroup = () => {
    if (!selectedYear) return;

    const title = chargeForm.title.trim();
    const supportAmount = parseNumberInput(chargeForm.supportAmount || '0');
    const inputTotalExpenseAmount = parseNumberInput(chargeForm.totalExpenseAmount || '0');
    const manualAmount = parseNumberInput(chargeForm.manualAmount || '0');
    const amountPerParticipant = chargeForm.chargeMode === 'manual'
      ? manualAmount
      : calculatedAmountPerParticipant;
    const totalExpenseAmount = chargeForm.chargeMode === 'manual'
      ? inputTotalExpenseAmount || amountPerParticipant * chargeForm.participantIds.length
      : inputTotalExpenseAmount;

    if (!title || !chargeForm.participantIds.length || (chargeForm.chargeMode === 'split' ? !totalExpenseAmount : !amountPerParticipant)) {
      setToastTone('error');
      setMessage(
        chargeForm.chargeMode === 'manual'
          ? '이벤트명, 참가자, 1인당 납부 금액을 모두 입력해 주세요.'
          : '이벤트명, 참가자, 총 지출 금액을 모두 입력해 주세요.'
      );
      return;
    }

    if (!amountPerParticipant) {
      setToastTone('error');
      setMessage('선택 인원 기준으로 1인당 분담금을 계산할 수 없습니다.');
      return;
    }

    setMessage('');

    const participants = participantCandidates.filter((member) => chargeForm.participantIds.includes(member.id));
    const optimisticGroupId = `${selectedYear.id}-charge-group-${Date.now()}`;
    const optimisticGroup: ChargeGroup = {
      id: optimisticGroupId,
      fiscal_year_id: selectedYear.id,
      title,
      category: chargeForm.category,
      event_date: chargeForm.eventDate || null,
      support_amount: supportAmount,
      actual_cost: totalExpenseAmount,
      settlement_completed: false,
      participant_charge_total: participants.length * amountPerParticipant,
      participant_paid_total: 0,
      surplus_amount: 0,
      memo: chargeForm.memo || null,
      created_at: new Date().toISOString(),
      participant_charges: participants.map((member) => ({
        id: `${optimisticGroupId}-${member.id}`,
        charge_group_id: optimisticGroupId,
        member_id: member.id,
        member_name: member.full_name,
        member_username: member.username,
        amount: amountPerParticipant,
        base_amount: amountPerParticipant,
        adjustment_reason: null,
        status: 'UNPAID',
        paid_at: null,
        memo: chargeForm.memo || null,
      })),
    };

    setChargeForm({
      title: '',
      category: 'TOURNAMENT_FEE',
      chargeMode: 'split',
      eventDate: '',
      supportAmount: '',
      totalExpenseAmount: '',
      manualAmount: '',
      roundingUnit: '1000',
      memo: '',
      participantIds: [],
    });
    setParticipantSearch('');

    if (source === 'spring') {
      setToastTone('info');
      setMessage('추가 비용 이벤트를 생성 중입니다. 생성이 완료되면 목록이 새로고침됩니다.');
      startTransition(async () => {
        const result = await createAdditionalChargeGroupAction({
          fiscalYearId: selectedYear.id,
          title,
          category: chargeForm.category,
          eventDate: chargeForm.eventDate || null,
          supportAmount,
          actualCost: totalExpenseAmount,
          memo: chargeForm.memo || null,
          participantMemberIds: chargeForm.participantIds,
          amountPerParticipant,
        });

        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '추가 비용 이벤트 생성에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('추가 비용 이벤트가 생성되었습니다.');
        router.refresh();
      });
      return;
    }

    setData((current) => ({
      ...current,
      chargeGroups: [optimisticGroup, ...current.chargeGroups],
    }));
    setExpandedGroupId(optimisticGroupId);
  };

  const toggleChargePaid = (chargeGroupId: string, charge: ParticipantCharge, paid: boolean) => {
    setMessage('');
    setData((current) => ({
      ...current,
      chargeGroups: current.chargeGroups.map((group) => {
        if (group.id !== chargeGroupId) return group;
        const nextParticipantCharges: ParticipantCharge[] = group.participant_charges.map((item) =>
          item.id === charge.id
            ? { ...item, status: (paid ? 'PAID' : 'UNPAID') as ParticipantCharge['status'], paid_at: paid ? new Date().toISOString() : null }
            : item
        );
        return {
          ...group,
          participant_charges: nextParticipantCharges,
          participant_paid_total: nextParticipantCharges.reduce((sum, item) => sum + (item.status === 'PAID' ? item.amount : 0), 0),
        };
      }),
    }));
    setToastTone('success');
    setMessage(`${charge.member_name}님을 ${paid ? '납부 완료' : '미납'}로 처리했습니다.`);

    if (source === 'spring') {
      startTransition(async () => {
        const result = await toggleAdditionalChargePaidAction(charge.id, paid);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '추가 비용 납부 상태 변경에 실패했습니다.');
          router.refresh();
        }
      });
    }
  };

  const getChargeAmountForm = (charge: ParticipantCharge) =>
    chargeAmountForms[charge.id] ?? {
      amount: formatNumberInput(String(charge.amount)),
      reason: charge.adjustment_reason ?? '',
    };

  const updateChargeAmount = (chargeGroupId: string, charge: ParticipantCharge) => {
    const form = getChargeAmountForm(charge);
    const amount = parseNumberInput(form.amount);
    const reason = form.reason.trim();

    if (!amount) {
      setToastTone('error');
      setMessage('수정할 금액을 입력해 주세요.');
      return;
    }

    setMessage('');
    setData((current) => ({
      ...current,
      chargeGroups: current.chargeGroups.map((group) => {
        if (group.id !== chargeGroupId) return group;

        const nextParticipantCharges: ParticipantCharge[] = group.participant_charges.map((item) =>
          item.id === charge.id
            ? {
                ...item,
                amount,
                base_amount: item.base_amount ?? item.amount,
                adjustment_reason: reason || null,
              }
            : item
        );

        return {
          ...group,
          participant_charges: nextParticipantCharges,
          participant_charge_total: nextParticipantCharges.reduce((sum, item) => sum + item.amount, 0),
          participant_paid_total: nextParticipantCharges.reduce((sum, item) => sum + (item.status === 'PAID' ? item.amount : 0), 0),
        };
      }),
    }));
    setToastTone('success');
    setMessage(`${charge.member_name}님 추가 비용 금액을 수정했습니다.`);

    if (source === 'spring') {
      startTransition(async () => {
        const result = await updateAdditionalChargeAmountAction({
          chargeId: charge.id,
          amount,
          adjustmentReason: reason || null,
        });

        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '추가 비용 금액 수정에 실패했습니다.');
          router.refresh();
          return;
        }

        router.refresh();
      });
    }
  };

  const settleGroupSurplus = (group: ChargeGroup) => {
    if (isPending) {
      setToastTone('error');
      setMessage('납부 상태를 동기화하는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    const unpaidCount = group.participant_charges.filter((charge) => charge.status !== 'PAID').length;
    if (unpaidCount > 0) {
      setToastTone('error');
      setMessage('모든 참가자가 납부 완료된 뒤에만 정산 완료를 진행할 수 있습니다.');
      return;
    }

    const actualCost = parseNumberInput(settlementActualCostForms[group.id] ?? (group.actual_cost ? String(group.actual_cost) : ''));
    if (!Number.isFinite(actualCost) || actualCost <= 0) {
      setToastTone('error');
      setMessage('정산할 실제 사용금액을 입력해 주세요.');
      return;
    }

    setMessage('');
    const nextSurplus = Math.max(group.participant_paid_total - Math.max(actualCost - group.support_amount, 0), 0);
    const supportExpenseAmount = group.support_amount;
    const participantExpenseAmount = Math.max(actualCost - supportExpenseAmount, 0);
    setData((current) => ({
      ...current,
      expenses: [
        ...(supportExpenseAmount > 0
          ? [
              {
                id: `${group.id}-support-expense`,
                fiscal_year_id: group.fiscal_year_id,
                charge_group_id: group.id,
                label: `${group.title} 공용 지원`,
                amount: supportExpenseAmount,
                memo: group.memo,
              } as ExpenseEntry,
            ]
          : []),
        ...(participantExpenseAmount > 0
          ? [
              {
                id: `${group.id}-participant-expense`,
                fiscal_year_id: group.fiscal_year_id,
                charge_group_id: group.id,
                label: `${group.title} 참가자 부담`,
                amount: participantExpenseAmount,
                memo: group.memo,
              } as ExpenseEntry,
            ]
          : []),
        ...current.expenses.filter((item) => item.charge_group_id !== group.id),
      ],
      incomes: nextSurplus > 0
        ? [{
            id: `${group.id}-surplus-income`,
            fiscal_year_id: group.fiscal_year_id,
            charge_group_id: group.id,
            label: `${group.title} 잔액 반영`,
            amount: nextSurplus,
            memo: '추가 비용 정산 후 남은 금액',
          }, ...current.incomes.filter((item) => item.charge_group_id !== group.id)]
        : current.incomes.filter((item) => item.charge_group_id !== group.id),
      chargeGroups: current.chargeGroups.map((item) =>
        item.id === group.id
          ? { ...item, actual_cost: actualCost, settlement_completed: true, surplus_amount: nextSurplus }
          : item
      ),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await settleAdditionalChargeSurplusAction(group.id, actualCost);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '잔액 세입 처리에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage(`${group.title} 이벤트가 정산 완료되었습니다.`);
        router.refresh();
      });
    }
  };

  const deleteChargeGroup = (groupId: string) => {
    setMessage('');
    setData((current) => ({
      ...current,
      chargeGroups: current.chargeGroups.filter((group) => group.id !== groupId),
      incomes: current.incomes.filter((item) => item.charge_group_id !== groupId),
      expenses: current.expenses.filter((item) => item.charge_group_id !== groupId),
    }));
    setExpandedGroupId((current) => (current === groupId ? null : current));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await deleteAdditionalChargeGroupAction(groupId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '추가 비용 이벤트 삭제에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('추가 비용 이벤트가 삭제되었습니다.');
        router.refresh();
      });
    }
  };

  const reopenSettlement = (group: ChargeGroup) => {
    setMessage('');
    setData((current) => ({
      ...current,
      chargeGroups: current.chargeGroups.map((item) =>
        item.id === group.id
          ? { ...item, settlement_completed: false, surplus_amount: 0 }
          : item
      ),
      incomes: current.incomes.filter((item) => item.charge_group_id !== group.id),
      expenses: current.expenses.filter((item) => item.charge_group_id !== group.id),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await reopenAdditionalChargeSettlementAction(group.id);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '정산 수정 모드 전환에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage(`${group.title} 이벤트를 다시 수정할 수 있습니다.`);
        router.refresh();
      });
      return;
    }

    setToastTone('success');
    setMessage(`${group.title} 이벤트를 다시 수정할 수 있습니다.`);
  };

  const sendChargeReminder = (group: ChargeGroup) => {
    const unpaidCount = group.participant_charges.filter((charge) => charge.status === 'UNPAID').length;
    if (!unpaidCount) {
      setToastTone('info');
      setMessage('현재 미납 참가자가 없습니다.');
      return;
    }

    setToastTone('info');
    setMessage(`${group.title} 미납자 ${unpaidCount}명에게 알림을 발송 중입니다.`);

    if (source === 'spring') {
      startTransition(async () => {
        const result = await sendAdditionalChargeReminderAction(group.id);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '추가비용 알림 발송에 실패했습니다.');
          return;
        }
        setToastTone('success');
        setMessage(result.message ?? '추가비용 알림을 발송했습니다.');
        router.refresh();
      });
      return;
    }

    setToastTone('success');
    setMessage(`${group.title} 미납자 ${unpaidCount}명에게 알림을 보냈습니다.`);
  };

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="space-y-8">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Finance Pages</p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">세입 / 지출 / 추가 비용 관리</h2>
        <p className="mt-2 text-sm text-slate-500">월회비와 분리해서, 대회비·회식비·유니폼비 같은 추가 비용은 이벤트 단위로 생성하고 참가자별로 납부 상태를 관리합니다.</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-2">기준 연도: {selectedYear?.year}년</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">기타 세입 {formatCurrency(incomeTotal)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">지출 {formatCurrency(expenseTotal)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">추가 비용 청구 {formatCurrency(extraChargeTotal)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">추가 비용 납부 {formatCurrency(extraChargePaidTotal)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">{source === 'spring' ? 'Spring API' : 'Mock'} {isPending ? '동기화 중' : '연결됨'}</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">연도 선택</span>
              <select
                value={selectedYearId}
                onChange={(event) => setSelectedYearId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
              >
                {years.map((year) => (
                  <option key={year.id} value={year.id}>{year.year}년</option>
                ))}
              </select>
            </label>
            <a
              href={reportExportHref}
              className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition ${
                selectedYear
                  ? 'bg-slate-900 text-white hover:bg-slate-700'
                  : 'pointer-events-none bg-slate-200 text-slate-400'
              }`}
            >
              재정 리포트 CSV
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Additional Charges</p>
            <h3 className="mt-2 text-xl font-black text-slate-900">대회비 / 회식비 / 유니폼비 정산</h3>
            <p className="mt-2 text-sm text-slate-500">스크롤 부담을 줄이기 위해 이벤트는 기본 접힘 상태로 보이고, 눌렀을 때만 납부/미납 참가자 목록이 열립니다.</p>
          </div>
          <input
            value={groupSearch}
            onChange={(event) => setGroupSearch(event.target.value)}
            type="text"
            placeholder="이벤트명, 참가자 이름/아이디 검색"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none lg:max-w-sm"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">계산 방식</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setChargeForm((current) => ({ ...current, chargeMode: 'split' }))}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  chargeForm.chargeMode === 'split'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-brand-800'
                }`}
              >
                총 지출 N빵
              </button>
              <button
                type="button"
                onClick={() => setChargeForm((current) => ({ ...current, chargeMode: 'manual' }))}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  chargeForm.chargeMode === 'manual'
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-brand-800'
                }`}
              >
                1인당 금액 직접 입력
              </button>
            </div>
            <p className="mt-2 px-2 text-xs font-semibold text-slate-500">
              {chargeForm.chargeMode === 'manual'
                ? '선택 회원 전원에게 입력한 1인당 금액을 그대로 부과합니다.'
                : '총 지출에서 공용지원금을 뺀 금액을 선택 인원으로 나눕니다.'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">비용 유형</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => {
                const selected = chargeForm.category === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setChargeForm((current) => ({
                        ...current,
                        category: value as AdditionalChargeCategory,
                      }))
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      selected
                        ? 'border-brand-300 bg-brand-100 text-brand-900'
                        : 'border-transparent bg-white text-slate-600 hover:text-brand-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input value={chargeForm.title} onChange={(event) => setChargeForm((current) => ({ ...current, title: event.target.value }))} type="text" placeholder="예: 2026 춘계대회 참가 분담금" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none lg:col-span-2" />
          <label className="block rounded-2xl border border-slate-200 bg-white px-4 py-2.5 focus-within:border-brand-400">
            <span className="block text-xs font-semibold text-slate-400">마감 날짜</span>
            <input
              value={chargeForm.eventDate}
              onChange={(event) => setChargeForm((current) => ({ ...current, eventDate: event.target.value }))}
              type="date"
              className="mt-1 w-full bg-transparent text-sm text-slate-900 focus:outline-none"
            />
          </label>
          <input value={chargeForm.supportAmount} onChange={(event) => setChargeForm((current) => ({ ...current, supportAmount: formatNumberInput(event.target.value) }))} type="text" inputMode="numeric" placeholder="회비 공용지원 금액 (없으면 비워두기)" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none" />
          <input value={chargeForm.totalExpenseAmount} onChange={(event) => setChargeForm((current) => ({ ...current, totalExpenseAmount: formatNumberInput(event.target.value) }))} type="text" inputMode="numeric" placeholder={chargeForm.chargeMode === 'manual' ? '정산 기준 비용 (선택)' : '정산 기준 총 비용'} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none" />
          {chargeForm.chargeMode === 'manual' ? (
            <input
              value={chargeForm.manualAmount}
              onChange={(event) => setChargeForm((current) => ({ ...current, manualAmount: formatNumberInput(event.target.value) }))}
              type="text"
              inputMode="numeric"
              placeholder="1인당 납부 금액"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
            />
          ) : (
            <select
              value={chargeForm.roundingUnit}
              onChange={(event) =>
                setChargeForm((current) => ({
                  ...current,
                  roundingUnit: event.target.value as '1' | '10' | '100' | '1000',
                }))
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
            >
              <option value="1">1원 단위</option>
              <option value="10">10원 올림</option>
              <option value="100">100원 올림</option>
              <option value="1000">1,000원 올림</option>
            </select>
          )}
          <input value={chargeForm.memo} onChange={(event) => setChargeForm((current) => ({ ...current, memo: event.target.value }))} type="text" placeholder="메모 (선택)" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none" />
        </div>

        <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">선택 인원</p>
            <p className="mt-2 text-lg font-black text-slate-900">{selectedParticipantCount}명</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {chargeForm.chargeMode === 'manual' ? '1인당 직접 청구금' : '1인당 자동 분담금'}
            </p>
            <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(calculatedAmountPerParticipant)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">총 청구 예상</p>
            <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(calculatedParticipantChargeTotal)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {chargeForm.chargeMode === 'manual' ? '예상 정산 잔액' : '예상 잔액 세입'}
            </p>
            <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(calculatedSurplusPreview)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-900">참가자 선택</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={participantSearch}
                onChange={(event) => setParticipantSearch(event.target.value)}
                type="text"
                placeholder="이름 또는 아이디 검색"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              <button onClick={selectAllFilteredParticipants} type="button" className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:text-brand-800">검색 결과 전체 선택</button>
              <button onClick={clearFilteredParticipants} type="button" className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600">검색 결과 선택 해제</button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredParticipantCandidates.map((member) => {
              const checked = chargeForm.participantIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${checked ? 'border-brand-500 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}
                >
                  <p className="font-semibold">{member.full_name}</p>
                  <p className="mt-1 text-xs">{member.username ?? '아이디 없음'} · {member.member_grade}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600">선택 인원 {chargeForm.participantIds.length}명</span>
            <button onClick={createChargeGroup} className="rounded-2xl bg-brand-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-800">추가 비용 이벤트 생성</button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setChargeFilter('settlement_pending')} className={`rounded-full px-4 py-2 text-sm font-semibold ${chargeFilter === 'settlement_pending' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'}`}>미납</button>
          <button onClick={() => setChargeFilter('settlement_completed')} className={`rounded-full px-4 py-2 text-sm font-semibold ${chargeFilter === 'settlement_completed' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600'}`}>정산 완료</button>
        </div>

        <div className="mt-4 space-y-4">
          {chargeGroups.length ? chargeGroups.map((group) => {
            const paidCount = group.participant_charges.filter((charge) => charge.status === 'PAID').length;
            const unpaidCount = group.participant_charges.length - paidCount;
            const participantKeyword = (groupParticipantSearch[group.id] ?? '').trim().toLowerCase();
            const visibleParticipantCharges = participantKeyword
              ? group.participant_charges.filter((charge) =>
                  charge.member_name.toLowerCase().includes(participantKeyword) ||
                  (charge.member_username ?? '').toLowerCase().includes(participantKeyword)
                )
              : group.participant_charges;
            const expanded = expandedGroupId === group.id;
            const canSettle = unpaidCount === 0 && !isPending;
            const settlementActualCostValue = settlementActualCostForms[group.id] ?? (group.actual_cost ? formatNumberInput(String(group.actual_cost)) : '');
            return (
              <div key={group.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <button
                  type="button"
                  onClick={() => setExpandedGroupId((current) => (current === group.id ? null : group.id))}
                  className="flex w-full flex-col gap-3 text-left lg:flex-row lg:items-start lg:justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{CATEGORY_LABELS[group.category]}</p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">{group.title}</h4>
                    <p className="mt-2 text-sm text-slate-500">
                      마감 {group.event_date ?? '미정'} · 공용 지원 {formatCurrency(group.support_amount)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">참가 {group.participant_charges.length}명</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-900">납부 {paidCount}명</span>
                      <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-900">미납 {unpaidCount}명</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">총 청구 {formatCurrency(group.participant_charge_total)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">실납부 {formatCurrency(group.participant_paid_total)}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                    {expanded ? '접기' : '열어서 납부/미납 보기'}
                  </div>
                </button>

                {expanded ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      {group.settlement_completed ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-900">정산 완료된 이벤트입니다</span>
                      ) : canSettle ? (
                        <span className="rounded-full bg-brand-50 px-3 py-2 text-brand-800">전원 납부 완료, 정산 진행 가능</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-2 text-amber-900">미납 {unpaidCount}명 남아 있어 아직 정산할 수 없습니다</span>
                      )}
                    </div>
                    {!group.settlement_completed ? (
                      <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          정산 실제 사용금액
                        </label>
                        <input
                          value={settlementActualCostValue}
                          onChange={(event) =>
                            setSettlementActualCostForms((current) => ({
                              ...current,
                              [group.id]: formatNumberInput(event.target.value),
                            }))
                          }
                          type="text"
                          inputMode="numeric"
                          placeholder="실제로 사용한 총 금액"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
                        />
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          참가자 실납부액에서 실제 참가자 부담 지출을 제외한 남은 금액이 세입으로 반영됩니다.
                        </p>
                      </div>
                    ) : null}
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                      <div className="grid gap-3 sm:grid-cols-[auto_auto]">
                        <button
                          type="button"
                          onClick={() => settleGroupSurplus(group)}
                          disabled={!canSettle || group.settlement_completed}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            !canSettle || group.settlement_completed
                              ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                              : 'bg-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          실제 사용금액으로 정산
                        </button>
                        {group.settlement_completed ? (
                          <button
                            type="button"
                            onClick={() => reopenSettlement(group)}
                            className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800 transition hover:bg-brand-100"
                          >
                            정산 수정
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => sendChargeReminder(group)}
                          disabled={unpaidCount === 0 || isPending}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            unpaidCount === 0 || isPending
                              ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          푸시 알림 발송
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteChargeGroup(group.id)}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                        >
                          이벤트 삭제
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">
                          {group.settlement_completed ? '실제 사용금액' : '정산 기준 비용'} {formatCurrency(group.actual_cost ?? 0)}
                        </span>
                        <span className="rounded-full bg-brand-50 px-3 py-2 text-brand-800">세입 반영 잔액 {formatCurrency(group.surplus_amount)}</span>
                        {group.settlement_completed ? <span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-900">정산 완료</span> : null}
                      </div>
                    </div>
                    {group.memo ? <p className="mt-3 text-sm text-slate-500">{group.memo}</p> : null}
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-500">
                        {participantKeyword
                          ? `검색 결과 ${visibleParticipantCharges.length}명`
                          : `참가자 전체 ${group.participant_charges.length}명`}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={groupParticipantSearch[group.id] ?? ''}
                          onChange={(event) =>
                            setGroupParticipantSearch((current) => ({
                              ...current,
                              [group.id]: event.target.value,
                            }))
                          }
                          type="text"
                          placeholder="이 이벤트 참가자 검색"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                        />
                        {(groupParticipantSearch[group.id] ?? '').trim() ? (
                          <button
                            type="button"
                            onClick={() =>
                              setGroupParticipantSearch((current) => ({
                                ...current,
                                [group.id]: '',
                              }))
                            }
                            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
                          >
                            초기화
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {visibleParticipantCharges.length ? visibleParticipantCharges.map((charge) => {
                        const paid = charge.status === 'PAID';
                        const amountForm = getChargeAmountForm(charge);
                        const adjusted = charge.base_amount !== charge.amount || Boolean(charge.adjustment_reason);
                        return (
                          <div key={charge.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{charge.member_name}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {charge.member_username ?? '아이디 없음'} · 최종 {formatCurrency(charge.amount)}
                                </p>
                                {adjusted ? (
                                  <p className="mt-1 text-xs font-semibold text-amber-800">
                                    기준 {formatCurrency(charge.base_amount)}
                                    {charge.adjustment_reason ? ` · ${charge.adjustment_reason}` : ''}
                                  </p>
                                ) : null}
                              </div>
                              <button
                                onClick={() => toggleChargePaid(group.id, charge, !paid)}
                                disabled={group.settlement_completed || isPending}
                                className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${group.settlement_completed ? 'cursor-not-allowed bg-slate-200 text-slate-500' : paid ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-800'}`}
                              >
                                {group.settlement_completed ? (paid ? '정산 완료' : '정산 종료') : paid ? '납부 완료' : '미납'}
                              </button>
                            </div>
                            {!group.settlement_completed ? (
                              <div className="mt-3 grid gap-2 lg:grid-cols-[160px_1fr_auto]">
                                <input
                                  value={amountForm.amount}
                                  onChange={(event) =>
                                    setChargeAmountForms((current) => ({
                                      ...current,
                                      [charge.id]: { ...amountForm, amount: formatNumberInput(event.target.value) },
                                    }))
                                  }
                                  inputMode="numeric"
                                  type="text"
                                  placeholder="최종 금액"
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                                />
                                <input
                                  value={amountForm.reason}
                                  onChange={(event) =>
                                    setChargeAmountForms((current) => ({
                                      ...current,
                                      [charge.id]: { ...amountForm, reason: event.target.value },
                                    }))
                                  }
                                  type="text"
                                  placeholder="조정 사유 예: 교통비 면제"
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateChargeAmount(group.id, charge)}
                                  disabled={isPending}
                                  className="rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                >
                                  금액 저장
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      }) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                          검색된 참가자가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">등록된 추가 비용 이벤트가 없습니다.</div>}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <CrudFinanceList
          title="기타 세입 관리"
          kind="income"
          total={incomeTotal}
          items={incomes}
          labelValue={incomeForm.label}
          amountValue={incomeForm.amount}
          onLabelChange={(value) => setIncomeForm((current) => ({ ...current, label: value }))}
          onAmountChange={(value) => setIncomeForm((current) => ({ ...current, amount: value }))}
          onAdd={() => addEntry('income')}
          onDelete={(id) => removeEntry('income', id)}
        />
        <CrudFinanceList
          title="지출 관리"
          kind="expense"
          total={expenseTotal}
          items={expenses}
          labelValue={expenseForm.label}
          amountValue={expenseForm.amount}
          onLabelChange={(value) => setExpenseForm((current) => ({ ...current, label: value }))}
          onAmountChange={(value) => setExpenseForm((current) => ({ ...current, amount: value }))}
          onAdd={() => addEntry('expense')}
          onDelete={(id) => removeEntry('expense', id)}
        />
      </div>
      </div>
    </>
  );
}

function CrudFinanceList({
  title,
  kind,
  total,
  items,
  labelValue,
  amountValue,
  onLabelChange,
  onAmountChange,
  onAdd,
  onDelete,
}: {
  title: string;
  kind: 'income' | 'expense';
  total: number;
  items: Array<IncomeEntry | ExpenseEntry>;
  labelValue: string;
  amountValue: string;
  onLabelChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
      <div className="flex items-end justify-between border-b border-slate-200/80 pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">{kind === 'income' ? 'Income' : 'Expense'}</p>
          <h3 className="mt-2 text-xl font-black text-slate-900">{title}</h3>
        </div>
        <span className="text-sm font-semibold text-slate-500">합계 {formatCurrency(total)}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
        <input
          value={labelValue}
          onChange={(event) => onLabelChange(event.target.value)}
          type="text"
          placeholder={kind === 'income' ? '예: 찬조금, 후원금' : '예: 대관료, 유니폼비'}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <input
          value={amountValue}
          onChange={(event) => onAmountChange(formatNumberInput(event.target.value))}
          type="text"
          inputMode="numeric"
          placeholder="금액"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
        />
        <button
          onClick={onAdd}
          className={`rounded-2xl px-4 py-3 text-sm font-bold text-white transition ${kind === 'income' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-900 hover:bg-slate-800'}`}
        >
          추가
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-900">{item.label}</p>
              <p className="text-xs text-slate-500">{kind === 'income' ? '세입 항목' : '지출 항목'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-900">{formatCurrency(item.amount)}</span>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
              >
                삭제
              </button>
            </div>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">{`등록된 ${kind === 'income' ? '세입' : '지출'}이 없습니다.`}</div>}
      </div>
    </section>
  );
}
