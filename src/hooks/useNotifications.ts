import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserStatus } from '../types';
import { playChime } from '../utils/sound';

type Permission = NotificationPermission | 'unsupported';

function currentPermission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Browser-notification handling for the watched user.
 *
 * - Notifies once when a new game starts.
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

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const gameUrl = `https://lichess.org/${gameId}`;
      const notification = new Notification(`${status.name} started a game on Lichess`, {
        body: 'Click to spectate the game.',
        tag: gameId, // collapses duplicates at the OS level too
        icon: '/favicon.svg',
      });
      notification.onclick = () => {
        window.open(gameUrl, '_blank', 'noopener');
        notification.close();
      };
    }
  }, [status]);

  return { permission, requestPermission };
}
