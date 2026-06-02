'use client';

import { useEffect, useState } from 'react';
import { getVapidPublicKeyAction, savePushSubscriptionAction } from '@/app/actions';

const DISMISS_KEY = 'patriot:pwa-notification-prompt-dismissed';
export const LOGIN_NOTIFICATION_PROMPT_KEY = 'patriot:show-notification-prompt-after-login';

type PromptState = 'hidden' | 'ready' | 'loading' | 'done' | 'blocked' | 'unsupported';

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function canUseServiceWorker() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(navigatorWithStandalone.standalone);
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

export function PwaNotificationPrompt() {
  const [state, setState] = useState<PromptState>('hidden');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isStandalonePwa()) return;
    if (window.localStorage.getItem(LOGIN_NOTIFICATION_PROMPT_KEY) !== 'true') return;
    if (!canUseNotifications() || !canUseServiceWorker()) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') {
      setState('blocked');
      return;
    }
    if (window.localStorage.getItem(DISMISS_KEY) === 'true') return;

    setState('ready');
  }, []);

  const closePrompt = () => {
    window.localStorage.setItem(DISMISS_KEY, 'true');
    window.localStorage.removeItem(LOGIN_NOTIFICATION_PROMPT_KEY);
    setState('hidden');
  };

  const enableNotifications = async () => {
    setState('loading');
    setMessage('');

    if (!canUseNotifications() || !canUseServiceWorker()) {
      setState('unsupported');
      setMessage('이 기기에서는 앱 알림을 지원하지 않습니다.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'blocked' : 'ready');
      setMessage('알림 권한이 허용되지 않았습니다.');
      return;
    }

    try {
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;
      const keyResult = await getVapidPublicKeyAction();

      if (!keyResult.ok || !keyResult.publicKey) {
        setState('ready');
        setMessage('서버 알림 키가 아직 설정되지 않았습니다.');
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyResult.publicKey),
      });
      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setState('ready');
        setMessage('알림 구독 정보를 만들 수 없습니다.');
        return;
      }

      const saveResult = await savePushSubscriptionAction({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        userAgent: navigator.userAgent,
      });

      if (!saveResult.ok) {
        setState('ready');
        setMessage(saveResult.message ?? '알림 구독 저장에 실패했습니다.');
        return;
      }

      window.localStorage.setItem(DISMISS_KEY, 'true');
      window.localStorage.removeItem(LOGIN_NOTIFICATION_PROMPT_KEY);
      setState('done');
      setMessage('앱 알림이 설정되었습니다.');
      window.setTimeout(() => setState('hidden'), 2200);
    } catch {
      setState('ready');
      setMessage('알림 설정 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  if (state === 'hidden' || state === 'unsupported') return null;

  return (
    <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-xl sm:top-5">
      <div className="rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-black text-brand-800">
            !
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-slate-900">앱 알림을 받을까요?</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              회비 납부일과 관리자 안내를 PWA 알림으로 받을 수 있습니다.
            </p>
            {message ? <p className="mt-2 text-sm font-semibold text-amber-700">{message}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={enableNotifications}
                disabled={state === 'loading' || state === 'blocked'}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {state === 'loading' ? '설정 중...' : state === 'blocked' ? '권한 차단됨' : '알림 받기'}
              </button>
              <button
                type="button"
                onClick={closePrompt}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
