'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { Menu, X } from 'lucide-react';
import { CLUB_NAME } from '@/lib/constants';
import { LogoutButton } from '@/components/logout-button';
import { PwaNotificationPrompt } from '@/components/pwa-notification-prompt';
import { NotificationNavLink } from '@/components/notification-nav-link';
import type { Profile } from '@/lib/types';

type NavLink = {
  href: Route;
  label: string;
};

type SiteNavProps = {
  showLogout?: boolean;
  profile?: Profile | null;
  initialNotificationUnreadCount?: number;
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
    { href: '/tactics' as Route, label: '전술 보드' },
    { href: '/account', label: '사용자 정보 변경' },
  ];

  if (adminMode) {
    links.push({ href: '/admin/members', label: '회원 관리' });
    links.push({ href: '/admin/events' as Route, label: '이벤트 관리' });
    links.push({ href: '/admin/finance', label: '세입/지출 관리' });
    links.push({ href: '/admin/audit-logs' as Route, label: '감사 로그' });
  }

  return links;
}

export function SiteNav({
  showLogout = false,
  profile = null,
  initialNotificationUnreadCount,
}: SiteNavProps) {
  const links = buildLinks(profile);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <nav className="flex flex-col gap-2 text-sm lg:flex-row lg:flex-wrap lg:items-center">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setMobileOpen(false)}
          className={`rounded-2xl px-4 py-3 font-semibold transition lg:rounded-full lg:px-3 lg:py-2 ${
            pathname === link.href
              ? 'bg-brand-700 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {profile ? <PwaNotificationPrompt /> : null}
      <header className="mb-8 rounded-[28px] border border-white/70 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Patriot Club Finance</p>
            <h1 className="mt-1 text-xl font-black text-slate-900">{CLUB_NAME} 회비 관리 서비스</h1>
          </div>
          <div className="ml-auto hidden items-center gap-2 text-sm lg:flex">
            {navLinks}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {profile ? (
              <NotificationNavLink initialUnreadCount={initialNotificationUnreadCount} />
            ) : null}
            {showLogout ? (
              <div className="hidden lg:block">
                <LogoutButton />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen ? (
          <div className="mt-4 rounded-[24px] border border-slate-100 bg-white/95 p-3 shadow-sm lg:hidden">
            {navLinks}
            {showLogout ? <div className="mt-2"><LogoutButton /></div> : null}
          </div>
        ) : null}
      </header>
    </>
  );
}
