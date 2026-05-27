'use client';

import { useState, useTransition } from 'react';
import { changePasswordAction, checkUsernameAvailabilityAction, updateProfileAction } from '@/app/actions';
import type { Profile } from '@/lib/types';
import DaumPostcodeEmbed from 'react-daum-postcode';

export function AccountSettingsCard({ profile }: { profile: Profile }) {
  const [profileForm, setProfileForm] = useState({
    username: profile.username ?? '',
    address: profile.base_address ?? profile.address ?? '',
    birthDate: profile.birth_date ?? '',
  });

  const [detailAddress, setDetailAddress] = useState(profile.detail_address ?? '');
  const [openPostcode, setOpenPostcode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [usernameMessage, setUsernameMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const handleUsernameCheck = () => {
    setUsernameMessage('');

    startTransition(async () => {
      const result = await checkUsernameAvailabilityAction(profileForm.username);
      setUsernameMessage(result.message ?? (result.ok ? '사용 가능한 아이디입니다.' : '아이디 확인에 실패했습니다.'));
    });
  };

  const handleProfileSave = () => {
    setProfileMessage('');

    if (!profileForm.username || !profileForm.address || !profileForm.birthDate) {
      setProfileMessage('아이디, 주소, 생년월일을 모두 입력해 주세요.');
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction({
        ...profileForm,
        address: profileForm.address,
        addressDetail: detailAddress,
      });
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

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
        <div className="border-b border-slate-200/80 pb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Account</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">사용자 정보 변경</h2>
          <p className="mt-2 text-sm text-slate-500">아이디, 주소, 생년월일을 수정하고 아이디 중복 여부를 확인할 수 있습니다.</p>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={profileForm.username}
              onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
              type="text"
              placeholder="아이디"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleUsernameCheck}
              disabled={pending}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              아이디 중복 확인
            </button>
          </div>
          {usernameMessage ? <p className="text-sm text-slate-600">{usernameMessage}</p> : null}
          <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOpenPostcode(true)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            주소 검색
          </button>

          <input
            value={profileForm.address}
            readOnly
            placeholder="주소 검색 버튼을 눌러주세요"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none"
          />

          <input
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
            type="text"
            placeholder="상세 주소"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />

          {openPostcode ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <DaumPostcodeEmbed
                onComplete={(data) => {
                  setProfileForm((current) => ({
                    ...current,
                    address: data.address,
                  }));

                  setOpenPostcode(false);
                }}
              />
            </div>
          ) : null}
        </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">
              생년월일
            </label>

            <input
              value={profileForm.birthDate}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">아이디를 바꾸면 다음 로그인부터 새 아이디를 사용합니다.</p>
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={pending}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '저장 중...' : '사용자 정보 저장'}
          </button>
        </div>
        {profileMessage ? <p className="mt-3 text-sm text-slate-600">{profileMessage}</p> : null}
      </section>

      <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
        <div className="border-b border-slate-200/80 pb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Security</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">비밀번호 변경</h2>
          <p className="mt-2 text-sm text-slate-500">현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>
        </div>
        <div className="mt-4 grid gap-3">
          <input
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            type="password"
            placeholder="현재 비밀번호"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />
          <input
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
            type="password"
            placeholder="새 비밀번호"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />
          <input
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            type="password"
            placeholder="새 비밀번호 확인"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">관리자가 회원 비밀번호를 초기화하는 경우 기본값은 0000 입니다.</p>
          <button
            type="button"
            onClick={handlePasswordSave}
            disabled={pending}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
        {passwordMessage ? <p className="mt-3 text-sm text-slate-600">{passwordMessage}</p> : null}
      </section>
    </div>
  );
}
