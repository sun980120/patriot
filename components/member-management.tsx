'use client';

import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  activateMemberAction,
  approveMemberAction,
  deactivateMemberAction,
  promoteToAdminAction,
  adminToPromoteAction,
  deletePendingMemberAction,
  resetMemberPasswordAction,
  updateMemberFeeExemptionAction,
} from '@/app/actions';
import { HIDDEN_PROFILE_EMAILS, ROLE_META } from '@/lib/constants';
import type { DashboardBundle, MemberGrade } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

export function MemberManagement({ bundle, source }: { bundle: DashboardBundle; source: 'mock' | 'spring' }) {
  const router = useRouter();
  const [data, setData] = useState(bundle);
  const [exemptionInputs, setExemptionInputs] = useState<Record<string, string>>({});
  const [pendingSearch, setPendingSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [inactiveSearch, setInactiveSearch] = useState('');
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [isPending, startTransition] = useTransition();
  const currentProfile = data.profile;
  const isSuperAdmin = currentProfile?.app_role === 'super_admin';

  const isHiddenProfile = (email: string | null) =>
    HIDDEN_PROFILE_EMAILS.includes((email ?? '') as (typeof HIDDEN_PROFILE_EMAILS)[number]);

  const gradeOrder: Record<MemberGrade, number> = {
    간사: 0,
    정회원: 1,
    준회원: 2,
  };

  const birthOrder = (birthDate: string | null) =>
    birthDate ? new Date(birthDate).getTime() : Number.MAX_SAFE_INTEGER;

  const joinedOrder = (joinedAt: string | null) =>
    joinedAt ? new Date(joinedAt).getTime() : Number.MAX_SAFE_INTEGER;

  const getRemainingExemptionMonths = (member: DashboardBundle['profiles'][number]) => {
    if (
      member.member_grade === '간사' ||
      !member.fee_exemption_months ||
      member.fee_exemption_months <= 0 ||
      !member.fee_exemption_start_date
    ) {
      return 0;
    }

    const start = new Date(`${member.fee_exemption_start_date}T00:00:00`);
    const today = new Date();
    const orderedYears = [...data.fiscalYears].sort((a, b) => a.year - b.year);
    let remaining = member.fee_exemption_months;

    for (const fiscalYear of orderedYears) {
      for (const month of fiscalYear.visible_months) {
        const currentMonth = new Date(fiscalYear.year, month - 1, 1);
        if (currentMonth < new Date(start.getFullYear(), start.getMonth(), 1)) {
          continue;
        }
        if (currentMonth > new Date(today.getFullYear(), today.getMonth(), 1)) {
          return remaining;
        }

        const payment = data.payments.find(
          (item) =>
            item.fiscal_year_id === fiscalYear.id &&
            item.member_id === member.id &&
            item.month === month
        );

        if (payment?.paid) {
          continue;
        }

        if (remaining <= 0) {
          return 0;
        }

        remaining -= 1;
      }
    }

    return remaining;
  };

  const pending = data.profiles.filter(
    (item) => item.approval_status === 'pending' && item.app_role !== 'super_admin' && !isHiddenProfile(item.email)
  );
  const active = data.profiles.filter(
    (item) => item.approval_status === 'approved' && item.is_active && item.app_role !== 'super_admin' && !isHiddenProfile(item.email)
  );
  const inactive = data.profiles.filter(
    (item) =>
      item.approval_status === 'approved' &&
      !item.is_active &&
      item.app_role !== 'super_admin' &&
      !isHiddenProfile(item.email)
  );

  const matchesMemberSearch = (member: DashboardBundle['profiles'][number], keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return true;

    return [member.full_name, member.username ?? '', member.phone_number ?? '']
      .some((value) => value.toLowerCase().includes(normalized));
  };

  const filteredPending = [...pending]
    .sort((a, b) => joinedOrder(a.joined_at) - joinedOrder(b.joined_at))
    .filter((member) => matchesMemberSearch(member, pendingSearch));
  const filteredActive = [...active]
    .sort((a, b) => {
      const roleDiff = gradeOrder[a.member_grade] - gradeOrder[b.member_grade];
      if (roleDiff !== 0) return roleDiff;
      return birthOrder(a.birth_date) - birthOrder(b.birth_date);
    })
    .filter((member) => matchesMemberSearch(member, activeSearch));
  const filteredInactive = [...inactive]
    .sort((a, b) => birthOrder(a.birth_date) - birthOrder(b.birth_date))
    .filter((member) => matchesMemberSearch(member, inactiveSearch));

  const handleApprove = (memberId: string) => {
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) => item.id === memberId ? { ...item, approval_status: 'approved', is_active: true } : item),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await approveMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '회원 승인에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('회원이 승인되었습니다.');
      });
    }
  };

  const handleDeactivate = (memberId: string) => {
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) => item.id === memberId ? { ...item, is_active: false } : item),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await deactivateMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '회원 비활성화에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('회원이 비활성화되었습니다.');
      });
    }
  };

  const handleActivate = (memberId: string) => {
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) => item.id === memberId ? { ...item, is_active: true, approval_status: 'approved' } : item),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await activateMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '회원 활성화에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('회원이 다시 활성화되었습니다.');
      });
    }
  };

  const handlePromoteToAdmin = (memberId: string) => {
    if (!isSuperAdmin) return;
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === memberId
          ? { ...item, app_role: 'admin', member_grade: '간사', approval_status: 'approved', is_active: true }
          : item
      ),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await promoteToAdminAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '간사 승격에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('간사로 승격되었습니다.');
      });
    }
  };

    const handleAdminToPromote = (memberId: string) => {
    if (!isSuperAdmin) return;
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === memberId
          ? { ...item, app_role: 'member', member_grade: calculateMemberGrade(item.birth_date), approval_status: 'approved', is_active: true }
          : item
      ),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await adminToPromoteAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '간사 제거에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('간사 권한이 해제되었습니다.');
      });
    }
  };

  const handleDeletePending = (memberId: string) => {
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.filter((item) => item.id !== memberId),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await deletePendingMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '가입 신청 삭제에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('가입 신청이 삭제되었습니다.');
      });
    }
  };

  const handleResetPassword = (memberId: string) => {
    setMessage('');

    if (source === 'spring') {
      startTransition(async () => {
        const result = await resetMemberPasswordAction(memberId);
        setToastTone(result.ok ? 'success' : 'error');
        setMessage(result.message ?? (result.ok ? '비밀번호가 기본값으로 초기화되었습니다.' : '비밀번호 초기화에 실패했습니다.'));
        if (!result.ok) {
          router.refresh();
        }
      });
    } else {
      setToastTone('success');
      setMessage('비밀번호가 기본값 0000으로 초기화되었습니다.');
    }
  };

  const handleSaveFeeExemption = (memberId: string, overrideMonths?: number) => {
    const member = data.profiles.find((item) => item.id === memberId);
    if (!member) return;
    const months =
      typeof overrideMonths === 'number'
        ? Math.max(0, overrideMonths)
        : Math.max(0, Number(exemptionInputs[memberId] ?? member.fee_exemption_months ?? 0) || 0);

    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === memberId
          ? {
              ...item,
              fee_exemption_months: months,
              fee_exemption_start_date:
                months > 0
                  ? item.fee_exemption_start_date ?? new Date().toISOString().slice(0, 10)
                  : null,
            }
          : item
      ),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await updateMemberFeeExemptionAction(memberId, months);
        setToastTone(result.ok ? 'success' : 'error');
        setMessage(result.message ?? (result.ok ? '회비 면제 설정이 저장되었습니다.' : '회비 면제 설정 변경에 실패했습니다.'));
        if (!result.ok) {
          router.refresh();
        }
      });
    } else {
      setToastTone('success');
      setMessage('회비 면제 설정이 저장되었습니다.');
    }
  };

  function calculateMemberGrade(birthDate: string | null): MemberGrade {
    if (!birthDate) return '정회원';

    const today = new Date();
    const birth = new Date(birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const hasBirthdayPassed =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() &&
        today.getDate() >= birth.getDate());

    if (!hasBirthdayPassed) {
      age--;
    }

    return age >= 19 ? '정회원' : '준회원';
  }

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="space-y-8">
      <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Admin</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">가입 회원 승인 및 비활성화</h2>
          <p className="mt-2 text-sm text-slate-500">승인 대기 회원과 승인 후 비활성 회원을 분리해서 관리하는 전용 페이지입니다.</p>
        </div>
      </section>

      <SectionCard
        title="승인 대기 회원"
        emptyText={pendingSearch.trim() ? '검색된 승인 대기 회원이 없습니다.' : '대기 중인 가입 신청이 없습니다.'}
        searchValue={pendingSearch}
        onSearchChange={setPendingSearch}
      >
        {filteredPending.map((member) => (
          <MemberRow
            key={member.id}
            name={member.full_name}
            username={member.username}
            role={member.member_grade}
            appRole={member.app_role}
            status="가입 요청"
            details={buildDetails(member, getRemainingExemptionMonths(member))}
            extra={member.app_role === 'member' ? (
              <FeeExemptionEditor
                value={exemptionInputs[member.id] ?? String(member.fee_exemption_months || '')}
                startDate={member.fee_exemption_start_date}
                remainingMonths={getRemainingExemptionMonths(member)}
                onChange={(value) => setExemptionInputs((current) => ({ ...current, [member.id]: value.replace(/\D/g, '') }))}
                onSave={() => handleSaveFeeExemption(member.id)}
                onClear={() => handleSaveFeeExemption(member.id, 0)}
              />
            ) : null}
            actions={[
              { label: '승인', onClick: () => handleApprove(member.id) },
              { label: '삭제', onClick: () => handleDeletePending(member.id) },
            ]}
          />
        ))}
      </SectionCard>

      <SectionCard
        title="활성 회원"
        emptyText={activeSearch.trim() ? '검색된 활성 회원이 없습니다.' : '활성 회원이 없습니다.'}
        searchValue={activeSearch}
        onSearchChange={setActiveSearch}
      >
        {filteredActive.map((member) => (
          <MemberRow
            key={member.id}
            name={member.full_name}
            username={member.username}
            role={member.member_grade}
            appRole={member.app_role}
            status={member.app_role === 'super_admin' ? '최상위 관리자' : member.app_role === 'admin' ? '관리자' : '활성'}
            details={buildDetails(member, getRemainingExemptionMonths(member))}
            extra={member.app_role === 'member' ? (
              <FeeExemptionEditor
                value={exemptionInputs[member.id] ?? String(member.fee_exemption_months || '')}
                startDate={member.fee_exemption_start_date}
                remainingMonths={getRemainingExemptionMonths(member)}
                onChange={(value) => setExemptionInputs((current) => ({ ...current, [member.id]: value.replace(/\D/g, '') }))}
                onSave={() => handleSaveFeeExemption(member.id)}
                onClear={() => handleSaveFeeExemption(member.id, 0)}
              />
            ) : null}
            actions={[
            ...(member.app_role === 'member' && isSuperAdmin
              ? [
                  {
                    label: '간사 승격',
                    onClick: () => handlePromoteToAdmin(member.id),
                  },
                ]
              : []),

            ...(member.app_role === 'admin' && isSuperAdmin
              ? [
                  {
                    label: '간사 제거',
                    onClick: () => handleAdminToPromote(member.id),
                  },
                ]
              : []),

            {
              label: '비밀번호 초기화',
              onClick: () => handleResetPassword(member.id),
            },

            ...(member.app_role === 'member'
              ? [
                  {
                    label: '비활성화',
                    onClick: () => handleDeactivate(member.id),
                  },
                ]
              : []),
          ]}
          />
        ))}
      </SectionCard>

      <SectionCard
        title="비활성 회원"
        emptyText={inactiveSearch.trim() ? '검색된 비활성 회원이 없습니다.' : '비활성 회원이 없습니다.'}
        searchValue={inactiveSearch}
        onSearchChange={setInactiveSearch}
      >
        {filteredInactive.map((member) => (
          <MemberRow
            key={member.id}
            name={member.full_name}
            username={member.username}
            role={member.member_grade}
            appRole={member.app_role}
            status="비활성"
            details={buildDetails(member, getRemainingExemptionMonths(member))}
            extra={member.app_role === 'member' ? (
              <FeeExemptionEditor
                value={exemptionInputs[member.id] ?? String(member.fee_exemption_months || '')}
                startDate={member.fee_exemption_start_date}
                remainingMonths={getRemainingExemptionMonths(member)}
                onChange={(value) => setExemptionInputs((current) => ({ ...current, [member.id]: value.replace(/\D/g, '') }))}
                onSave={() => handleSaveFeeExemption(member.id)}
                onClear={() => handleSaveFeeExemption(member.id, 0)}
              />
            ) : null}
            actions={[
              { label: '비밀번호 초기화', onClick: () => handleResetPassword(member.id) },
              { label: '활성화', onClick: () => handleActivate(member.id) },
            ]}
          />
        ))}
      </SectionCard>
      </div>
    </>
  );
}

function buildDetails(member: DashboardBundle['profiles'][number], remainingMonths: number) {
  const combinedAddress = [member.base_address, member.detail_address].filter(Boolean).join(', ') || member.address;

  return [
    member.username ? { label: '아이디', value: member.username } : null,
    member.phone_number ? { label: '전화번호', value: member.phone_number } : null,
    combinedAddress ? { label: '주소', value: combinedAddress } : null,
    member.birth_date ? { label: '생년월일', value: member.birth_date } : null,
    member.fee_exemption_months > 0
      ? {
          label: '회비 면제',
          value: `설정 ${member.fee_exemption_months}개월 / 남은 ${remainingMonths}개월${member.fee_exemption_start_date ? ` · 시작 ${member.fee_exemption_start_date}` : ''}`,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}

function SectionCard({
  title,
  emptyText,
  searchValue,
  onSearchChange,
  children,
}: {
  title: string;
  emptyText: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          type="text"
          placeholder="이름, 아이디, 전화번호 검색"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none sm:max-w-sm"
        />
      </div>
      <div className="mt-4">
        {hasChildren ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {children}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

function MemberRow({
  name,
  username,
  role,
  appRole,
  status,
  details,
  extra,
  actions = [],
}: {
  name: string;
  username: string | null;
  role: keyof typeof ROLE_META;
  appRole: 'super_admin' | 'admin' | 'member';
  status: string;
  details: Array<{ label: string; value: string }>;
  extra?: ReactNode;
  actions?: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div className="h-full rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-900">{name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_META[role].badge}`}>{role}</span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {status === '가입 요청'
                ? '가입 대기'
                : appRole === 'super_admin'
                  ? '최상위 관리자'
                  : appRole === 'admin'
                    ? '관리자'
                    : '회원'}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{status}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[420px] lg:justify-end">
          {actions.map((action) => (
            <button key={action.label} onClick={action.onClick} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 sm:rounded-2xl sm:px-4 sm:text-sm">
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {details.length ? (
        <div className="mt-4 space-y-1 text-sm leading-6 text-slate-500">
          {details.map((detail) => (
            <p key={detail.label}>
              <span className="font-semibold text-slate-600">{detail.label}:</span> {detail.value}
            </p>
          ))}
        </div>
      ) : null}

      {extra ? <div className="mt-4">{extra}</div> : null}
    </div>
  );
}

function FeeExemptionEditor({
  value,
  startDate,
  remainingMonths,
  onChange,
  onSave,
  onClear,
}: {
  value: string;
  startDate: string | null;
  remainingMonths: number;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">회비 면제 설정</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          inputMode="numeric"
          placeholder="면제 개월"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none sm:max-w-[140px]"
        />
        <button onClick={onSave} className="rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-800">
          저장
        </button>
        <button onClick={onClear} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
          면제 제거
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {startDate ? `설정된 면제 시작월: ${startDate} · 남은 ${remainingMonths}개월` : '관리자가 저장한 시점 기준으로 면제가 시작됩니다.'}
      </p>
    </div>
  );
}
