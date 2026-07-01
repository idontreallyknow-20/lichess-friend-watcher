import { useCallback, useEffect, useState } from 'react';

/**
 * The `beforeinstallprompt` event isn't in the standard DOM lib types, so we
 * describe the parts we use here.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptState {
  /** True when the browser has offered an install prompt we can trigger. */
  canInstall: boolean;
  /** True when the app is already running as an installed PWA. */
  installed: boolean;
  /** Triggers the native install prompt. Resolves once the user has chosen. */
  install: () => Promise<void>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari exposes `navigator.standalone`; everyone else uses the media query.
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

/**
 * Captures the browser's install prompt so the app can offer a "download as an
 * app" button. Falls back gracefully on browsers that don't support it.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Stop Chrome's mini-infobar so we can surface our own button instead.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    // The prompt can only be used once; drop it regardless of the outcome.
    setDeferred(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  }, [deferred]);

  return { canInstall: deferred !== null && !installed, installed, install };
}
