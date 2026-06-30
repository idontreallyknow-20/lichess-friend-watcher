import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserStatus } from '../types';
import { playChime } from '../utils/sound';

type Permission = NotificationPermission | 'unsupported';

function currentPermission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Show a notification, preferring the service worker registration (more
 * reliable, works while the tab is backgrounded, and clickable via the SW) and
 * falling back to a plain Notification when no SW is active.
 */
function showNotification(title: string, url?: string, tag?: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    tag,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: url ? { url } : undefined,
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, options))
      .catch(() => fallbackNotification(title, url, tag));
    return;
  }
  fallbackNotification(title, url, tag);
}

function fallbackNotification(title: string, url?: string, tag?: string): void {
  try {
    const n = new Notification(title, { tag, icon: '/favicon.svg' });
    if (url) {
      n.onclick = () => {
        window.open(url, '_blank', 'noopener');
        n.close();
      };
    }
  } catch {
    // Construction can throw on some platforms (e.g. Android needs the SW path).
  }
}

/**
 * Browser-notification handling for the watched user.
 *
 * - Notifies once when a new game starts ("{name} is playing").
 * - Never notifies twice for the same game id (tracked in a ref).
 * - Resets when the user stops playing, so the next game can notify again.
 */
export function useNotifications(status: UserStatus | null, soundEnabled = false) {
  const [permission, setPermission] = useState<Permission>(currentPermission);

  // Last game id we already notified about. null = no active notified game.
  const lastNotifiedRef = useRef<string | null>(null);

  // Keep the latest sound preference without re-running the notify effect.
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // Some browsers reject the promise form; fall back to current value.
      setPermission(currentPermission());
    }
  }, []);

  /** Fire a sample notification so the user can confirm the setup works. */
  const testNotification = useCallback(
    async (name?: string) => {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') {
        await requestPermission();
      }
      if (Notification.permission === 'granted') {
        showNotification(`${name ?? 'Test'} is playing`, 'https://lichess.org', 'lfw-test');
      }
    },
    [requestPermission],
  );

  useEffect(() => {
    if (!status) return;

    const gameId = status.playing ? status.playingId : null;

    // Not playing -> reset so the next game can notify again.
    if (!gameId) {
      lastNotifiedRef.current = null;
      return;
    }

    // Already notified for this exact game -> do nothing (no duplicates).
    if (gameId === lastNotifiedRef.current) return;

    lastNotifiedRef.current = gameId;

    if (soundRef.current) {
      playChime();
    }

    showNotification(`${status.name} is playing`, `https://lichess.org/${gameId}`, gameId);
  }, [status]);

  return { permission, requestPermission, testNotification };
}
