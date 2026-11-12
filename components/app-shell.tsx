'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, History, LayoutDashboard, LogOut, Menu, Settings, Swords, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { buildNavLinks } from '@/lib/navigation';
import { logoutAction } from '@/app/actions';
import { NotificationNavLink } from '@/components/notification-nav-link';
import { PwaNotificationPrompt } from '@/components/pwa-notification-prompt';
import type { Profile } from '@/lib/types';

const icons: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard, '/dashboard?view=dues': Wallet, '/calendar': CalendarDays,
  '/tactics': Swords, '/admin/members': Users, '/admin/finance': Wallet,
  '/admin/audit-logs': History, '/account': Settings,
};

export function AppShell({ profile, title, children, initialNotificationUnreadCount }: {
  profile: Profile | null; title: string; children: ReactNode; initialNotificationUnreadCount?: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const mobileNav = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const links = buildNavLinks(profile);
  const admin = profile?.app_role === 'admin' || profile?.app_role === 'super_admin';
  const role = admin ? '관리자' : profile?.member_grade === '간사' ? '간사' : '회원';
  const active = (href: string) => href === '/dashboard?view=dues'
    ? pathname === '/dashboard' && params.get('view') === 'dues'
    : href === '/dashboard' ? pathname === '/dashboard' && params.get('view') !== 'dues' : pathname === href;

  useEffect(() => {
    const update = () => setDate(new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()));
    update(); const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', closeOnDesktop);
    return () => media.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mobileNav.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab') return;
      const items = [...(mobileNav.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') ?? [])];
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); menuButton.current?.focus(); };
  }, [open]);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutAction(); window.location.assign('/login'); }
    finally { setLoggingOut(false); }
  };
  const nav = (expanded: boolean) => <nav aria-label={expanded ? '모바일 주 메뉴' : '주 메뉴'} className="grid shrink-0 gap-1">
    {links.map((link) => {
      const Icon = icons[link.href] ?? LayoutDashboard;
      return <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={active(link.href) ? 'page' : undefined} aria-label={link.label} title={link.label} className={`flex min-h-10 min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition ${active(link.href) ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" /><span className={expanded ? '' : 'hidden min-[1440px]:inline'}>{link.label}</span>
      </Link>;
    })}
  </nav>;
  const avatar = <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{profile?.full_name.slice(0, 1) ?? 'P'}</span>;

  return <div className="app-shell min-h-dvh bg-white text-slate-900">
    {profile ? <PwaNotificationPrompt /> : null}
    <aside inert={open} className="fixed inset-y-0 left-0 z-30 hidden w-[60px] flex-col overflow-y-auto border-r border-slate-200 bg-slate-50/80 px-2 py-5 md:flex min-[1440px]:w-[184px] min-[1440px]:px-3" aria-label="사이드 메뉴">
      <Link href="/dashboard" aria-label="패트리어트 대시보드" title="패트리어트 대시보드" className="mb-7 flex items-center gap-2 px-1"><img src="/icon-192.png" alt="" className="h-9 w-9 shrink-0 object-contain" /><span className="hidden min-[1440px]:block"><strong className="block text-sm font-bold">PATRIOT</strong><span className="text-[11px] text-slate-500">Floorball Club</span></span></Link>
      {nav(false)}
      <div className="mt-auto grid gap-2 border-t border-slate-200 pt-4">
        <Link href="/account" title="내 정보" aria-label="내 정보" className="flex items-center gap-2 px-1">{avatar}<span className="hidden min-w-0 min-[1440px]:block"><strong className="block break-words text-xs font-semibold">{profile?.full_name}</strong><span className="text-[11px] text-slate-500">{role} 계정</span></span></Link>
        <button type="button" onClick={() => void logout()} disabled={loggingOut} title="로그아웃" aria-label="로그아웃" className="flex min-h-10 items-center gap-3 rounded-md px-3 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><LogOut className="h-4 w-4 shrink-0" /><span className="hidden text-xs min-[1440px]:inline">{loggingOut ? '로그아웃 중…' : '로그아웃'}</span></button>
      </div>
    </aside>
    <div className="min-w-0 md:ml-[60px] min-[1440px]:ml-[184px]" inert={open}>
      <header className="flex min-h-[58px] items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-6 lg:px-7">
        <div className="flex min-w-0 items-center gap-2"><button ref={menuButton} type="button" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 md:hidden"><Menu className="h-5 w-5" /></button><LayoutDashboard className="hidden h-4 w-4 shrink-0 text-slate-400 md:block" /><span className="truncate text-xs text-slate-500">클럽 / {title}</span></div>
        <div className="flex shrink-0 items-center gap-2"><time className="mr-1 hidden text-xs text-slate-500 lg:block">{date}</time><NotificationNavLink initialUnreadCount={initialNotificationUnreadCount} variant="quiet" /><span className="hidden rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500 sm:inline">{role}</span><Link href="/account" aria-label="내 정보" title="내 정보">{avatar}</Link></div>
      </header>
      <main className="mx-auto min-w-0 max-w-[1480px] px-4 py-6 sm:px-6 lg:px-7">{children}</main>
    </div>
    {open ? <div className="fixed inset-0 z-[80] bg-black/30 md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside ref={mobileNav} role="dialog" aria-modal="true" aria-label="메뉴" className="flex h-full w-[min(280px,calc(100%_-_48px))] flex-col overflow-y-auto bg-white p-4"><div className="mb-5 flex items-center justify-between"><strong className="text-base">PATRIOT</strong><button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{nav(true)}<button type="button" disabled={loggingOut} onClick={() => void logout()} className="mt-auto flex min-h-11 items-center gap-3 border-t border-slate-100 px-3 text-sm text-slate-500"><LogOut className="h-4 w-4" />로그아웃</button></aside></div> : null}
  </div>;
}
