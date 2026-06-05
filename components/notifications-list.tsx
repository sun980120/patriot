'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { deleteNotificationAction, markNotificationReadAction } from '@/app/actions';
import type { AppNotification } from '@/lib/notifications-data';

type NotificationTab = 'unread' | 'all';

function formatNotificationDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function typeLabel(type: AppNotification['type']) {
  if (type === 'MONTHLY_DUES') return '월회비';
  if (type === 'ADDITIONAL_CHARGE') return '추가 비용';
  if (type === 'ADMIN_NOTICE') return '관리자 공지';
  if (type === 'PAYMENT_CONFIRMED') return '납부 확인';
  return '면제 변경';
}

export function NotificationsList({ notifications, unreadCount }: { notifications: AppNotification[]; unreadCount: number }) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState<NotificationTab>('unread');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const currentUnreadCount = items.filter((item) => !item.read).length;
  const visibleNotifications = useMemo(
    () => (tab === 'unread' ? items.filter((item) => !item.read) : items),
    [items, tab]
  );

  const markRead = (notificationId: string) => {
    setPendingId(notificationId);
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);
      setPendingId(null);
      if (!result.ok) return;

      setItems((current) => current.map((item) =>
        item.id === notificationId ? { ...item, read: true, readAt: new Date().toISOString() } : item
      ));
      window.dispatchEvent(new Event('patriot:notifications-changed'));
    });
  };

  const deleteNotification = (notificationId: string) => {
    setPendingId(notificationId);
    startTransition(async () => {
      const result = await deleteNotificationAction(notificationId);
      setPendingId(null);
      if (!result.ok) return;

      setItems((current) => current.filter((item) => item.id !== notificationId));
      window.dispatchEvent(new Event('patriot:notifications-changed'));
    });
  };

  const openNotificationLink = (item: AppNotification) => {
    if (!item.linkUrl) return;

    if (item.read) {
      router.push(item.linkUrl as Route);
      return;
    }

    setPendingId(item.id);
    startTransition(async () => {
      const result = await markNotificationReadAction(item.id);
      setPendingId(null);
      if (!result.ok) return;

      setItems((current) => current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, read: true, readAt: new Date().toISOString() } : currentItem
      ));
      window.dispatchEvent(new Event('patriot:notifications-changed'));
      router.push(item.linkUrl as Route);
    });
  };

  return (
    <>
      <div className="mt-5 inline-flex rounded-full bg-slate-100 p-1 text-sm font-bold">
        <button
          type="button"
          onClick={() => setTab('unread')}
          className={`rounded-full px-4 py-2 transition ${tab === 'unread' ? 'bg-brand-700 text-white' : 'text-slate-600'}`}
        >
          미확인 {currentUnreadCount}건
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`rounded-full px-4 py-2 transition ${tab === 'all' ? 'bg-brand-700 text-white' : 'text-slate-600'}`}
        >
          전체 {items.length}건
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {visibleNotifications.length ? visibleNotifications.map((item) => (
          <article
            key={item.id}
            className={`rounded-3xl border p-5 ${item.read ? 'border-slate-200 bg-white/80' : 'border-amber-200 bg-amber-50/80'}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-black text-brand-800">{typeLabel(item.type)}</span>
                  {!item.read ? <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">새 알림</span> : null}
                  <span className="text-sm font-semibold text-slate-400">{formatNotificationDate(item.createdAt)}</span>
                </div>
                <h3 className="mt-3 text-xl font-black text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.message}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {item.linkUrl ? (
                  <button
                    type="button"
                    onClick={() => openNotificationLink(item)}
                    disabled={pendingId === item.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    바로가기
                  </button>
                ) : null}
                {!item.read ? (
                  <button
                    type="button"
                    onClick={() => markRead(item.id)}
                    disabled={pendingId === item.id}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {pendingId === item.id ? '처리 중' : '읽음'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => deleteNotification(item.id)}
                  disabled={pendingId === item.id}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-600 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300"
                >
                  삭제
                </button>
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-sm font-semibold text-slate-500">
            {tab === 'unread' ? '미확인 알림이 없습니다.' : '아직 받은 알림이 없습니다.'}
          </div>
        )}
      </div>
    </>
  );
}
