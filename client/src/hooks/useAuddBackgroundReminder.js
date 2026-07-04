import { useEffect, useCallback, useState } from 'react';

const REMINDER_TAG = 'pandora-bingo-mic-reminder';

// Requests permission to show a system notification. Must be called from a
// user gesture (a click handler) — browsers, especially iOS Safari, will
// silently ignore or reject a permission request that isn't tied directly
// to a tap. Returns the resulting permission string.
export function useNotificationPermission() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      return 'denied';
    }
  }, []);

  return { permission, requestPermission };
}

// While `enabled`, watches for the tab going into the background (host
// switches apps, locks the phone, etc). The instant that happens — before
// the OS actually suspends JS execution — it fires a notification via the
// service worker reminding the host that mic detection pauses until they
// return. When the host comes back, any pending reminder is cleared.
//
// This only covers the moment of backgrounding, not a recurring nag while
// the host stays away — that would require server-triggered Web Push,
// which is a separate, heavier piece of infrastructure (VAPID keys,
// subscription storage, a push endpoint). This is the lightweight version:
// an immediate nudge right when it happens.
export function useAuddBackgroundReminder({ enabled, isActiveRef }) {
  useEffect(() => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator)) return;

    const onVisibilityChange = () => {
      if (!isActiveRef.current) return;

      if (document.visibilityState === 'hidden') {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification('Pandora Bingo', {
              body: '🎙 Mic detection pauses in the background — return to the app to keep identifying songs.',
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: REMINDER_TAG,
            })
          )
          .catch(() => {});
      } else if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready
          .then((reg) => reg.getNotifications({ tag: REMINDER_TAG }))
          .then((notifications) => notifications.forEach((n) => n.close()))
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [enabled]); // eslint-disable-line
}
