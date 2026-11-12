import type { Route } from 'next';
import type { Profile } from '@/lib/types';

export function buildNavLinks(profile: Profile | null): { href: Route; label: string }[] {
  if (!profile) return [{ href: '/signup', label: '동호회 가입' }, { href: '/login', label: '로그인' }];
  const links: { href: Route; label: string }[] = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/dashboard?view=dues' as Route, label: '회비 관리' },
    { href: '/calendar', label: '캘린더' },
    { href: '/tactics', label: '전술 보드' },
    { href: '/account', label: '내 정보' },
  ];
  if (profile.app_role === 'admin' || profile.app_role === 'super_admin') links.splice(4, 0,
    { href: '/admin/members', label: '회원 관리' },
    { href: '/admin/finance', label: '재정 관리' },
    { href: '/admin/audit-logs', label: '감사 로그' },
  );
  return links;
}
