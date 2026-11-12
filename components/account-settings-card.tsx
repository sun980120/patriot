'use client';

import { PageHeading } from '@/components/ui/page-heading';

import { useState, useTransition } from 'react';
import { changePasswordAction, checkUsernameAvailabilityAction, updateProfileAction } from '@/app/actions';
import type { Profile } from '@/lib/types';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';
import { KeyRound, MapPin, Save, UserRoundCheck } from 'lucide-react';

export function AccountSettingsCard({ profile }: { profile: Profile }) {
  const openPostcodePopup = useDaumPostcodePopup();
  const [profileForm, setProfileForm] = useState({
    fullName: profile.full_name,
    username: profile.username ?? '',
    address: profile.base_address ?? profile.address ?? '',
    birthDate: profile.birth_date ?? '',
  });

  const [detailAddress, setDetailAddress] = useState(profile.detail_address ?? '');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [usernameMessage, setUsernameMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [pending, startTransition] = useTransition();

  const handleUsernameCheck = () => {
    setUsernameMessage('');

    startTransition(async () => {
      const result = await checkUsernameAvailabilityAction(profileForm.username);
      setToastTone(result.ok ? 'success' : 'error');
      setUsernameMessage(result.message ?? (result.ok ? '사용 가능한 아이디입니다.' : '아이디 확인에 실패했습니다.'));
    });
  };

  const handleProfileSave = () => {
    setProfileMessage('');

    if (!profileForm.fullName.trim() || !profileForm.username || !profileForm.address || !profileForm.birthDate) {
      setToastTone('error');
      setProfileMessage('이름, 아이디, 주소, 생년월일을 모두 입력해 주세요.');
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction({
        ...profileForm,
        fullName: profileForm.fullName.trim(),
        address: profileForm.address,
        addressDetail: detailAddress,
      });
      setToastTone(result.ok ? 'success' : 'error');
      setProfileMessage(result.message ?? (result.ok ? '사용자 정보가 변경되었습니다.' : '사용자 정보 변경에 실패했습니다.'));
    });
  };

  const handlePasswordSave = () => {
    setPasswordMessage('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage('현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setToastTone(result.ok ? 'success' : 'error');
      setPasswordMessage(result.message ?? (result.ok ? '비밀번호가 변경되었습니다.' : '비밀번호 변경에 실패했습니다.'));

      if (result.ok) {
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    });
  };

  const handleAddressSearch = () => {
    openPostcodePopup({
      onComplete: (data) => {
        setProfileForm((current) => ({
          ...current,
          address: data.address,
        }));
      },
      onError: () => {
        setToastTone('error');
        setProfileMessage('주소 검색을 열지 못했습니다. 다시 시도해 주세요.');
      },
    });
  };

  const baseInputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base sm:text-sm focus:border-brand-400 focus:outline-none';

  return (
    <>
      <FloatingToast
        open={Boolean(usernameMessage || profileMessage || passwordMessage)}
        message={usernameMessage || profileMessage || passwordMessage}
        tone={toastTone}
        onClose={() => {
          setUsernameMessage('');
          setProfileMessage('');
          setPasswordMessage('');
        }}
      />
      <div className="workspace-page"><PageHeading title="내 정보" description={`${profile.full_name} · ${profile.member_grade}`} /><div className="account-sections grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="workspace-section">
        <div className="border-b border-slate-200/80 pb-4">

          <h2 className="workspace-section-title">기본 정보</h2>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="space-y-1">
            <label htmlFor="profile-full-name" className="text-xs font-semibold text-slate-500">이름</label>
            <input
              id="profile-full-name"
              value={profileForm.fullName}
              onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
              type="text"
              autoComplete="name"
              maxLength={255}
              required
              disabled={pending}
              className={baseInputClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={profileForm.username}
              onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
              type="text"
              placeholder="아이디" aria-label="아이디"
              className={baseInputClass}
            />
            <button
              type="button"
              onClick={handleUsernameCheck}
              disabled={pending}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              <span className="inline-flex items-center gap-2"><UserRoundCheck className="h-4 w-4" />아이디 중복 확인</span>
            </button>
          </div>
          <div className="space-y-2">
          <button
            type="button"
            onClick={handleAddressSearch}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
          >
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />주소 검색</span>
          </button>

          <input
            value={profileForm.address}
            readOnly
            placeholder="주소 검색 버튼을 눌러주세요"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:outline-none sm:text-sm"
          />

          <input
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
            type="text"
            placeholder="상세 주소" aria-label="상세 주소"
            className={baseInputClass}
          />

        </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              생년월일
            </label>

            <div className="relative">
              {!profileForm.birthDate ? (
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-slate-400 sm:text-sm">
                  생년월일 선택
                </span>
              ) : null}
              <input
                value={profileForm.birthDate}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
                type="date"
                aria-label="생년월일"
                max={new Date().toISOString().split('T')[0]}
                className={`${baseInputClass} min-h-[54px] appearance-none ${profileForm.birthDate ? 'text-slate-900' : 'text-transparent'}`}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">아이디를 바꾸면 다음 로그인부터 새 아이디를 사용합니다.</p>
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={pending}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            <span className="inline-flex items-center gap-2"><Save className="h-4 w-4" />{pending ? '저장 중...' : '사용자 정보 저장'}</span>
          </button>
        </div>
      </section>

      <section className="workspace-section">
        <div className="border-b border-slate-200/80 pb-4">

          <h2 className="workspace-section-title">비밀번호 변경</h2>

        </div>
        <div className="mt-4 grid gap-3">
          <input
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            type="password"
            placeholder="현재 비밀번호" aria-label="현재 비밀번호"
            className={baseInputClass}
          />
          <input
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
            type="password"
            placeholder="새 비밀번호" aria-label="새 비밀번호"
            className={baseInputClass}
          />
          <input
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            type="password"
            placeholder="새 비밀번호 확인" aria-label="새 비밀번호 확인"
            className={baseInputClass}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <button
            type="button"
            onClick={handlePasswordSave}
            disabled={pending}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" />{pending ? '변경 중...' : '비밀번호 변경'}</span>
          </button>
        </div>
      </section>
    </div></div>
    </>
  );
}
