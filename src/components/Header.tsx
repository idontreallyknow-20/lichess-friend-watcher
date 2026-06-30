export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden="true">♞</span>
        <div>
          <h1 className="header__title">Lichess Friend Watcher</h1>
          <p className="header__subtitle">
            Spectate &amp; track stats — no advice, no analysis, just watching.
          </p>
        </div>
      </div>
    </header>
  );
}
