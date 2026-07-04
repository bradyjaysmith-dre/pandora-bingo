import { useEffect, useRef, useCallback } from 'react';

// Keeps the screen awake while `active` is true. Browsers release the wake
// lock automatically whenever the tab is hidden (backgrounded, screen off,
// app-switched), so we re-request it every time the tab becomes visible
// again as long as `active` is still true. Silently no-ops on browsers that
// don't support the Wake Lock API (e.g. older Safari) — it's a nice-to-have,
// not a requirement.
export function useWakeLock(active) {
  const lockRef = useRef(null);

  const requestLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    if (document.visibilityState !== 'visible') return;
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
    } catch (err) {
      // Common + harmless: request rejected because the page isn't visible,
      // or the OS declined (e.g. low battery mode). Nothing to surface here.
    }
  }, []);

  const releaseLock = useCallback(async () => {
    try {
      await lockRef.current?.release?.();
    } catch (err) {
      // Already released or never acquired — fine either way.
    }
    lockRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      releaseLock();
      return;
    }

    requestLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestLock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseLock();
    };
  }, [active, requestLock, releaseLock]);
}
