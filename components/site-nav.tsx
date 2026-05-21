'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { CLUB_NAME } from '@/lib/constants';
import { LogoutButton } from '@/components/logout-button';
import type { Profile } from '@/lib/types';

type NavLink = {
  href: Route;
  label: string;
};

function buildLinks(profile: Profile | null): NavLink[] {
  if (!profile) {
    return [
      { href: '/signup', label: '동호회 가입' },
      { href: '/login', label: '로그인' },
    ];
  }

  const adminMode = profile.app_role === 'admin' || profile.app_role === 'super_admin';
  const links: NavLink[] = [
    { href: '/dashboard', label: '통합 대시보드' },
    { href: '/account', label: '사용자 정보 변경' },
  ];

  if (adminMode) {
    links.push({ href: '/admin/members', label: '회원 관리' });
    links.push({ href: '/admin/finance', label: '세입/지출 관리' });
  }

  return links;
}

export function SiteNav({ showLogout = false, profile = null }: { showLogout?: boolean; profile?: Profile | null }) {
  const links = buildLinks(profile);
  const pathname = usePathname();

  return (
    <header className="mb-8 rounded-[28px] border border-white/70 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Patriot Club Finance</p>
          <h1 className="mt-1 text-xl font-black text-slate-900">{CLUB_NAME} 회비 관리 서비스</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <nav className="flex flex-wrap gap-2 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 font-semibold transition ${
                  pathname === link.href
                    ? 'bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {showLogout ? <LogoutButton /> : null}
        </div>
      </div>
    </header>
  );
}
