'use client';

import { useEffect, useMemo, useState } from 'react';
import { getVapidPublicKeyAction, savePushSubscriptionAction, sendTestPushNotificationAction } from '@/app/actions';

type PermissionState = NotificationPermission | 'unsupported' | 'checking';

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function canUseServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export function PwaNotificationCard({ monthlyDueLabel }: { monthlyDueLabel?: string }) {
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [message, setMessage] = useState('');
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [serverPushReady, setServerPushReady] = useState(false);

  useEffect(() => {
    if (!canUseNotifications()) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);

    if (!canUseServiceWorker()) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => setServiceWorkerReady(true))
      .catch(() => {
        setServiceWorkerReady(false);
      });

    getVapidPublicKeyAction().then((result) => {
      if (result.ok && result.publicKey) {
        setVapidPublicKey(result.publicKey);
        setServerPushReady(true);
        return;
      }
      setServerPushReady(false);
    });
  }, []);

  const status = useMemo(() => {
    if (permission === 'checking') return { label: '확인 중', tone: 'bg-slate-100 text-slate-600' };
    if (permission === 'unsupported') return { label: '미지원', tone: 'bg-slate-100 text-slate-500' };
    if (permission === 'granted') return { label: '허용됨', tone: 'bg-emerald-100 text-emerald-900' };
    if (permission === 'denied') return { label: '차단됨', tone: 'bg-rose-100 text-rose-700' };
    return { label: '권한 필요', tone: 'bg-amber-100 text-amber-900' };
  }, [permission]);

  const requestPermission = async () => {
    setMessage('');

    if (!canUseNotifications()) {
      setPermission('unsupported');
      setMessage('이 브라우저는 앱 알림을 지원하지 않습니다.');
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== 'granted') {
      setMessage('알림 권한이 허용되지 않았습니다.');
      return;
    }

    const subscribed = await subscribeServerPush();
    setMessage(subscribed ? '알림 권한과 서버 구독이 저장되었습니다.' : '알림 권한은 허용됐지만 서버 구독은 아직 설정되지 않았습니다.');
  };

  const subscribeServerPush = async () => {
    if (!canUseServiceWorker() || !vapidPublicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription = existingSubscription ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    const json = subscription.toJSON();

    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const result = await savePushSubscriptionAction({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      userAgent: navigator.userAgent,
    });

    return result.ok;
  };

  const showTestNotification = async () => {
    setMessage('');

    if (!canUseNotifications()) {
      setMessage('이 브라우저는 앱 알림을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission !== 'granted') {
      setMessage('먼저 알림 권한을 허용해 주세요.');
      setPermission(Notification.permission);
      return;
    }

    const title = '패트리어트 회비 알림';
    const body = monthlyDueLabel ?? '이번 달 회비 납부 대상자를 확인해 주세요.';

    if (serverPushReady) {
      const result = await sendTestPushNotificationAction();
      if (result.ok) {
        setMessage(result.message ?? '테스트 알림을 보냈습니다.');
        return;
      }
      setMessage(result.message ?? '서버 테스트 알림에 실패해 기기 테스트 알림으로 전환합니다.');
    }

    if (serviceWorkerReady && canUseServiceWorker()) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'patriot-monthly-dues',
        data: { url: '/dashboard' },
      });
    } else {
      new Notification(title, { body, icon: '/icon-192.png' });
    }

    setMessage('테스트 알림을 보냈습니다.');
  };

  return (
    <section className="glass-panel rounded-[28px] border border-white/70 p-5 shadow-soft sm:rounded-[32px] sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">PWA Notice</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">앱 알림 설정</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            휴대폰 홈 화면에 설치한 PWA에서 알림 권한을 허용하면 회비 안내 알림을 받을 준비가 됩니다.
          </p>
        </div>
        <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${status.tone}`}>{status.label}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={requestPermission}
          disabled={permission === 'unsupported' || permission === 'granted'}
          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          알림 권한 허용
        </button>
        <button
          type="button"
          onClick={showTestNotification}
          disabled={permission !== 'granted'}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          테스트 알림 보내기
        </button>
      </div>

      {message ? <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p> : null}
      <p className="mt-3 text-xs leading-5 text-slate-400">
        {serverPushReady
          ? '서버 푸시 구독 저장이 가능한 상태입니다. 관리자가 월회비 알림 발송 API를 실행할 수 있습니다.'
          : '서버 푸시를 사용하려면 백엔드에 VAPID 키를 설정해야 합니다.'}
      </p>
    </section>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
