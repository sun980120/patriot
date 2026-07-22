'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getNotificationUnreadCountAction } from '@/app/actions';

type NotificationChangeDetail = {
  unreadCount?: number;
};

export function NotificationNavLink({
  className = '',
  initialUnreadCount,
}: {
  className?: string;
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);

  useEffect(() => {
    let active = true;

    const refreshUnreadCount = async () => {
      const result = await getNotificationUnreadCountAction();
      if (active && result.ok) {
        setUnreadCount(result.unreadCount ?? 0);
      }
    };

    const handleNotificationChange = (event: Event) => {
      const nextUnreadCount = (event as CustomEvent<NotificationChangeDetail>).detail?.unreadCount;
      if (typeof nextUnreadCount === 'number') {
        setUnreadCount(nextUnreadCount);
        return;
      }

      void refreshUnreadCount();
    };

    if (typeof initialUnreadCount === 'number') {
      setUnreadCount(initialUnreadCount);
    } else {
      void refreshUnreadCount();
    }

    window.addEventListener('patriot:notifications-changed', handleNotificationChange);
    window.addEventListener('focus', refreshUnreadCount);
    return () => {
      active = false;
      window.removeEventListener('patriot:notifications-changed', handleNotificationChange);
      window.removeEventListener('focus', refreshUnreadCount);
    };
  }, [initialUnreadCount]);

  const active = pathname === '/notifications';

  return (
    <Link
      href={'/notifications' as Route}
      aria-label={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '알림'}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full font-semibold transition ${
        active ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800'
      } ${className}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-black leading-none text-white ring-2 ring-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
