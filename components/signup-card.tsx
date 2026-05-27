'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { signupAction } from '@/app/actions';
import { FloatingToast, type ToastTone } from '@/components/ui/floating-toast';

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function SignupCard() {
  const openPostcodePopup = useDaumPostcodePopup();
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    phoneNumber: '',
    address: '',
    birthDate: '',
    password: '',
  });

  const [detailAddress, setDetailAddress] = useState('');
  const [message, setMessage] = useState('');
  const [toastTone, setToastTone] = useState<ToastTone>('info');
  const [pending, setPending] = useState(false);

  const handleSignup = async () => {
    setPending(true);
    setMessage('');

    const result = await signupAction({
      ...form,
      address: form.address,
      addressDetail: detailAddress,
    });

    setPending(false);

    setToastTone(result.ok ? 'success' : 'error');
    setMessage(result.message ?? '가입 신청에 실패했습니다.');

    if (result.ok) {
      setForm({
        fullName: '',
        username: '',
        phoneNumber: '',
        address: '',
        birthDate: '',
        password: '',
      });

      setDetailAddress('');
    }
  };

  const handleAddressSearch = () => {
    openPostcodePopup({
      onComplete: (data) => {
        setForm((current) => ({
          ...current,
          address: data.address,
        }));
      },
      onError: () => {
        setToastTone('error');
        setMessage('주소 검색을 열지 못했습니다. 다시 시도해 주세요.');
      },
    });
  };

  const baseInputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base sm:text-sm focus:border-brand-400 focus:outline-none';

  return (
    <>
      <FloatingToast open={Boolean(message)} message={message} tone={toastTone} onClose={() => setMessage('')} />
      <div className="mx-auto max-w-xl rounded-[32px] bg-white/90 p-6 shadow-soft backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">
              Join
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-900">
              동호회 가입 신청
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              가입 후 관리자가 승인하면 통합 대시보드에서 회비 현황을 확인할 수 있습니다.
            </p>
          </div>

          <span className="rounded-full bg-brand-100 p-3 text-brand-700">
            <UserPlus className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-6 space-y-3">
          <input
            value={form.fullName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            type="text"
            placeholder="이름"
            className={baseInputClass}
          />

        <input
          value={form.username}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          type="text"
          placeholder="아이디"
          className={baseInputClass}
        />

        <input
          value={form.phoneNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              phoneNumber: formatPhoneNumber(event.target.value),
            }))
          }
          type="tel"
          inputMode="numeric"
          placeholder="전화번호"
          className={baseInputClass}
        />

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleAddressSearch}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
          >
            주소 검색
          </button>

          <input
            value={form.address}
            readOnly
            placeholder="주소 검색 버튼을 눌러주세요"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base focus:outline-none sm:text-sm"
          />

          <input
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
            type="text"
            placeholder="상세 주소"
            className={baseInputClass}
          />

        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">
            생년월일
          </label>

          <div className="relative">
            {!form.birthDate ? (
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-slate-400 sm:text-sm">
                생년월일 선택
              </span>
            ) : null}
            <input
              value={form.birthDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className={`${baseInputClass} min-h-[54px] appearance-none ${form.birthDate ? 'text-slate-900' : 'text-transparent'}`}
            />
          </div>
        </div>

        <input
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          type="password"
          placeholder="비밀번호"
          className={baseInputClass}
        />

          <button
            onClick={handleSignup}
            disabled={pending}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {pending ? '신청 중...' : '가입 신청'}
          </button>
        </div>
      </div>
    </>
  );
}
