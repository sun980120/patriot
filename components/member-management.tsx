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
  rejectMemberAction,
  resetMemberPasswordAction,
} from '@/app/actions';
import { HIDDEN_PROFILE_EMAILS, ROLE_META } from '@/lib/constants';
import type { DashboardBundle, MemberGrade } from '@/lib/types';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

export function MemberManagement({ bundle, source }: { bundle: DashboardBundle; source: 'mock' | 'spring' }) {
  const router = useRouter();
  const [data, setData] = useState(bundle);
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [isPending, startTransition] = useTransition();
  const currentProfile = data.profile;
  const isSuperAdmin = currentProfile?.app_role === 'super_admin';

  const isHiddenProfile = (email: string | null) =>
    HIDDEN_PROFILE_EMAILS.includes((email ?? '') as (typeof HIDDEN_PROFILE_EMAILS)[number]);

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

  const handleReject = (memberId: string) => {
    setMessage('');
    setData((current) => ({
      ...current,
      profiles: current.profiles.map((item) =>
        item.id === memberId ? { ...item, approval_status: 'rejected', is_active: false } : item
      ),
    }));

    if (source === 'spring') {
      startTransition(async () => {
        const result = await rejectMemberAction(memberId);
        if (!result.ok) {
          setToastTone('error');
          setMessage(result.message ?? '회원 거절에 실패했습니다.');
          router.refresh();
          return;
        }
        setToastTone('success');
        setMessage('가입 요청이 거절되었습니다.');
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

      <SectionCard title="승인 대기 회원" emptyText="대기 중인 가입 신청이 없습니다.">
        {pending.map((member) => (
          <MemberRow
            key={member.id}
            name={member.full_name}
            username={member.username}
            role={member.member_grade}
            appRole={member.app_role}
            status="가입 요청"
            details={buildDetails(member)}
            actions={[
              { label: '승인', onClick: () => handleApprove(member.id) },
              { label: '거절', onClick: () => handleReject(member.id) },
            ]}
          />
        ))}
      </SectionCard>

      <SectionCard title="활성 회원" emptyText="활성 회원이 없습니다.">
        {active.map((member) => (
          <MemberRow
            key={member.id}
            name={member.full_name}
            username={member.username}
            role={member.member_grade}
            appRole={member.app_role}
            status={member.app_role === 'super_admin' ? '최상위 관리자' : member.app_role === 'admin' ? '관리자' : '활성'}
            details={buildDetails(member)}
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

      <SectionCard title="비활성 회원" emptyText="비활성 회원이 없습니다.">
        {inactive.map((member) => (
          <MemberRow
            key={member.id}
            name={member.full_name}
            username={member.username}
            role={member.member_grade}
            appRole={member.app_role}
            status="비활성"
            details={buildDetails(member)}
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

function buildDetails(member: DashboardBundle['profiles'][number]) {
  return [
    member.username ? { label: '아이디', value: member.username } : null,
    member.phone_number ? { label: '전화번호', value: member.phone_number } : null,
    member.address ? { label: '주소', value: member.address } : null,
    member.birth_date ? { label: '생년월일', value: member.birth_date } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}

function SectionCard({ title, emptyText, children }: { title: string; emptyText: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur">
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {hasChildren ? children : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">{emptyText}</div>}
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
  actions = [],
}: {
  name: string;
  username: string | null;
  role: keyof typeof ROLE_META;
  appRole: 'super_admin' | 'admin' | 'member';
  status: string;
  details: Array<{ label: string; value: string }>;
  actions?: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-black text-slate-900">{name}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_META[role].badge}`}>{role}</span>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {status === '가입 요청'
                ? '가입 대기'
                : appRole === 'super_admin'
                  ? '최상위 관리자'
                  : appRole === 'admin'
                    ? '관리자'
                    : '회원'}
            </span>
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{status}</span>
        </div>
        {details.length ? (
          <div className="mt-3 space-y-1 text-sm leading-6 text-slate-500">
            {details.map((detail) => (
              <p key={detail.label}>
                <span className="font-semibold text-slate-600">{detail.label}:</span> {detail.value}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 sm:rounded-2xl sm:px-4 sm:text-sm">
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
