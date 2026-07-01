import type { ReactNode } from 'react';

export function Header({ action }: { action?: ReactNode }) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden="true">
          ♞
        </span>
        <div>
          <h1 className="header__title">Lichess Friend Watcher</h1>
        </div>
      </div>
      {action && <div className="header__action">{action}</div>}
    </header>
  );
}
