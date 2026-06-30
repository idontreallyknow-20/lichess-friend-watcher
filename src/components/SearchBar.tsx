import { useState, type FormEvent } from 'react';

interface SearchBarProps {
  onSubmit: (username: string) => void;
  loading: boolean;
  error: string | null;
}

export function SearchBar({ onSubmit, loading, error }: SearchBarProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <section className="card">
      <h2 className="card__title">Watch a player</h2>
      <form className="search" onSubmit={handleSubmit}>
        <input
          className="search__input"
          type="text"
          placeholder="Lichess username…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Lichess username"
        />
        <button className="btn btn--primary" type="submit" disabled={loading || !value.trim()}>
          {loading ? 'Checking…' : 'Watch'}
        </button>
      </form>
      {error && <p className="search__error" role="alert">{error}</p>}
    </section>
  );
}
