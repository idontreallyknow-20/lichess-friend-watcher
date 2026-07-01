import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * Small always-visible "Install app" button. When the browser exposes a native
 * install prompt we trigger it directly; otherwise (iOS Safari, or browsers
 * that haven't offered the prompt yet) we show a short how-to instead.
 */
export function InstallButton() {
  const { canInstall, installed, iosSafari, install } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);

  // Nothing to do once it's already installed / running standalone.
  if (installed) return null;

  const handleClick = () => {
    if (canInstall) {
      install();
    } else {
      setShowHelp((v) => !v);
    }
  };

  return (
    <div className="install">
      <button
        className="btn btn--primary btn--sm"
        onClick={handleClick}
        aria-expanded={showHelp}
        title="Install this app on your device"
      >
        ⤓ Install app
      </button>
      {showHelp && !canInstall && (
        <div className="install__help" role="dialog" aria-label="How to install">
          {iosSafari ? (
            <p className="install__help-text">
              Tap the <strong>Share</strong> icon, then <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="install__help-text">
              Use your browser's install icon in the address bar, or its menu →{' '}
              <strong>Install app</strong>.
            </p>
          )}
          <button className="btn btn--ghost btn--sm" onClick={() => setShowHelp(false)}>
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
