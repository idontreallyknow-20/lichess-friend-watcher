import { formatDuration } from '../utils/format';
import { useNow } from '../hooks/useNow';

interface SessionControlsProps {
  sessionStart: number | null;
  onStart: () => void;
  onReset: () => void;
}

export function SessionControls({ sessionStart, onStart, onReset }: SessionControlsProps) {
  const now = useNow(1000);

  return (
    <div className="session-controls">
      {sessionStart ? (
        <>
          <div className="session-duration">
            <span className="session-duration__label">Session duration</span>
            <span className="session-duration__value">
              {formatDuration(now - sessionStart)}
            </span>
          </div>
          <button className="btn btn--ghost" onClick={onReset}>
            Reset session
          </button>
        </>
      ) : (
        <>
          <p className="empty empty--inline">No active session.</p>
          <button className="btn btn--primary" onClick={onStart}>
            Start session
          </button>
        </>
      )}
    </div>
  );
}
