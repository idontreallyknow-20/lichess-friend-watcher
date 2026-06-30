import { useCallback, useEffect, useMemo, useState } from 'react';
import { validateUser } from './api/lichess';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStatus } from './hooks/useStatus';
import { useGames } from './hooks/useGames';
import { useNotifications } from './hooks/useNotifications';
import { computeStats, filterSession, filterToday } from './utils/stats';

import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { RecentUsers } from './components/RecentUsers';
import { StatusCard } from './components/StatusCard';
import { CurrentGameCard } from './components/CurrentGameCard';
import { StatsCard } from './components/StatsCard';
import { SessionControls } from './components/SessionControls';
import { GamesTable } from './components/GamesTable';

const MAX_RECENT = 8;

export default function App() {
  const [recent, setRecent] = useLocalStorage<string[]>('lfw.recentUsernames', []);
  const [watched, setWatched] = useLocalStorage<string | null>('lfw.selectedUsername', null);
  const [sessionStart, setSessionStart] = useLocalStorage<number | null>('lfw.sessionStart', null);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Bumped to force a games refetch (new game detected / manual refresh).
  const [refreshKey, setRefreshKey] = useState(0);

  const statusState = useStatus(watched);
  const gamesState = useGames(watched, refreshKey);
  const { permission, requestPermission } = useNotifications(statusState.status);

  // Refetch games whenever a game starts or ends so the table stays current.
  const detectedAt = statusState.gameDetectedAt;
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [detectedAt]);

  const addRecent = useCallback(
    (name: string) => {
      setRecent((prev) => {
        const without = prev.filter((u) => u.toLowerCase() !== name.toLowerCase());
        return [name, ...without].slice(0, MAX_RECENT);
      });
    },
    [setRecent],
  );

  const handleWatch = useCallback(
    async (name: string) => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const canonical = await validateUser(name);
        if (!canonical) {
          setSearchError(`User "${name}" was not found on Lichess.`);
          return;
        }
        setWatched(canonical);
        addRecent(canonical);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setSearchLoading(false);
      }
    },
    [addRecent, setWatched],
  );

  const handleSelectRecent = useCallback(
    (name: string) => {
      setSearchError(null);
      setWatched(name);
      addRecent(name);
    },
    [addRecent, setWatched],
  );

  const handleRemoveRecent = useCallback(
    (name: string) => {
      setRecent((prev) => prev.filter((u) => u.toLowerCase() !== name.toLowerCase()));
    },
    [setRecent],
  );

  const handleRefresh = useCallback(() => {
    statusState.refresh();
    gamesState.refresh();
  }, [statusState, gamesState]);

  const dailyStats = useMemo(() => computeStats(filterToday(gamesState.games)), [gamesState.games]);
  const sessionStats = useMemo(
    () => computeStats(sessionStart ? filterSession(gamesState.games, sessionStart) : []),
    [gamesState.games, sessionStart],
  );

  return (
    <div className="app">
      <Header />

      <div className="toolbar">
        <NotificationButton permission={permission} onRequest={requestPermission} />
        <button className="btn btn--ghost" onClick={handleRefresh} disabled={!watched}>
          ⟳ Refresh now
        </button>
      </div>

      <SearchBar onSubmit={handleWatch} loading={searchLoading} error={searchError} />

      <RecentUsers
        users={recent}
        active={watched}
        onSelect={handleSelectRecent}
        onRemove={handleRemoveRecent}
      />

      {watched ? (
        <>
          <div className="grid">
            <StatusCard
              username={watched}
              status={statusState.status}
              lastChecked={statusState.lastChecked}
              loading={statusState.loading}
              error={statusState.error}
            />
            <CurrentGameCard status={statusState.status} gameDetectedAt={statusState.gameDetectedAt} />
            <StatsCard title="Today" stats={dailyStats} loading={gamesState.loading} />
            <StatsCard
              title="Session"
              stats={sessionStats}
              loading={gamesState.loading}
              footer={
                <SessionControls
                  sessionStart={sessionStart}
                  onStart={() => setSessionStart(Date.now())}
                  onReset={() => setSessionStart(null)}
                />
              }
            />
          </div>

          <GamesTable games={gamesState.games} loading={gamesState.loading} error={gamesState.error} />
        </>
      ) : (
        <section className="card">
          <p className="empty">
            Enter a Lichess username above to start watching their status and stats.
          </p>
        </section>
      )}

      <footer className="footer">
        Data from the public{' '}
        <a href="https://lichess.org/api" target="_blank" rel="noopener noreferrer">
          Lichess API
        </a>
        . For spectating and stats only — no engine analysis or move suggestions.
      </footer>
    </div>
  );
}

interface NotificationButtonProps {
  permission: NotificationPermission | 'unsupported';
  onRequest: () => void;
}

function NotificationButton({ permission, onRequest }: NotificationButtonProps) {
  if (permission === 'unsupported') {
    return <span className="notif-status notif-status--off">Notifications unsupported</span>;
  }
  if (permission === 'granted') {
    return <span className="notif-status notif-status--on">🔔 Notifications on</span>;
  }
  if (permission === 'denied') {
    return <span className="notif-status notif-status--off">🔕 Notifications blocked</span>;
  }
  return (
    <button className="btn btn--ghost" onClick={onRequest}>
      🔔 Enable notifications
    </button>
  );
}
