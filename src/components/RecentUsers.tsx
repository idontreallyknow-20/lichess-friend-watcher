interface RecentUsersProps {
  users: string[];
  active: string | null;
  onSelect: (username: string) => void;
  onRemove: (username: string) => void;
}

export function RecentUsers({ users, active, onSelect, onRemove }: RecentUsersProps) {
  if (users.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">Recent</h2>
      <div className="chips">
        {users.map((user) => (
          <div
            key={user}
            className={`chip ${user.toLowerCase() === active?.toLowerCase() ? 'chip--active' : ''}`}
          >
            <button className="chip__label" onClick={() => onSelect(user)}>
              {user}
            </button>
            <button
              className="chip__remove"
              aria-label={`Remove ${user}`}
              onClick={() => onRemove(user)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
