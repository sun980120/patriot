'use client';

import { logoutAction } from '@/app/actions';

export function LogoutButton() {
  const handleLogout = async () => {
    await logoutAction();
    window.location.assign('/login');
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      로그아웃
    </button>
  );
}
