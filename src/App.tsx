import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateUser } from './api/lichess';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStatus } from './hooks/useStatus';
import { useGames } from './hooks/useGames';
import { useProfile } from './hooks/useProfile';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { computeStats, filterToday } from './utils/stats';
import { orderSpeeds, speedLabel } from './utils/speeds';

import { Header } from './components/Header';
import { ThemePicker } from './components/ThemePicker';
import { SearchBar } from './components/SearchBar';
import { RecentUsers } from './components/RecentUsers';
import { PerformanceTabs } from './components/PerformanceTabs';
import { StatusCard } from './components/StatusCard';
import { CurrentGameCard } from './components/CurrentGameCard';
import { StatsCard } from './components/StatsCard';
import { SessionCard } from './components/SessionCard';
import { InsightsCard } from './components/InsightsCard';
import { TrendCard } from './components/TrendCard';
import { GamesTable } from './components/GamesTable';

const MAX_RECENT = 8;

export default function App() {
  const { themeId, setThemeId, themes } = useTheme();

  const [recent, setRecent] = useLocalStorage<string[]>('lfw.recentUsernames', []);
  const [watched, setWatched] = useLocalStorage<string | null>('lfw.selectedUsername', null);
  const [sessionGapMin, setSessionGapMin] = useLocalStorage<number>('lfw.sessionGap', 30);
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('lfw.sound', false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [speedFilter, setSpeedFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // Bumped to force a games refetch (new game detected / manual refresh).
  const [refreshKey, setRefreshKey] = useState(0);

  const statusState = useStatus(watched);
  const gamesState = useGames(watched, refreshKey);
  const { profile, loading: profileLoading } = useProfile(watched);
  const { permission, requestPermission, testNotification } = useNotifications(
    statusState.status,
    soundEnabled,
  );

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

  // On first load, a "?user=" query parameter takes priority (shareable links).
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const param = new URLSearchParams(window.location.search).get('user');
    if (param && param.trim()) {
      handleWatch(param.trim());
    }
  }, [handleWatch]);

  // Keep the URL in sync with the watched user so it can be copied / shared.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (watched) url.searchParams.set('user', watched);
    else url.searchParams.delete('user');
    window.history.replaceState(null, '', url);
  }, [watched]);

  // Reflect live status in the browser tab title.
  useEffect(() => {
    const base = 'Lichess Friend Watcher';
    const s = statusState.status;
    if (!watched || !s) {
      document.title = base;
      return;
    }
    if (s.playing) document.title = `● ${s.name} playing`;
    else if (s.online) document.title = `${s.name} online`;
    else document.title = `${s.name} offline`;
    return () => {
      document.title = base;
    };
  }, [watched, statusState.status]);

  // Reset the speed filter when switching players.
  useEffect(() => {
    setSpeedFilter('all');
  }, [watched]);

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

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; ignore.
    }
  }, []);

  // Speeds available to filter by: those present in recent games or rated perfs.
  const availableSpeeds = useMemo(() => {
    const set = new Set<string>();
    for (const g of gamesState.games) set.add(g.speed);
    if (profile) {
      for (const [key, perf] of Object.entries(profile.perfs)) {
        if (perf.games > 0) set.add(key);
      }
    }
    return orderSpeeds(set);
  }, [gamesState.games, profile]);

  const filteredGames = useMemo(
    () => (speedFilter === 'all' ? gamesState.games : gamesState.games.filter((g) => g.speed === speedFilter)),
    [gamesState.games, speedFilter],
  );

  const dailyStats = useMemo(() => computeStats(filterToday(filteredGames)), [filteredGames]);

  const scopeLabel = speedFilter === 'all' ? 'all speeds' : speedLabel(speedFilter);
  const isPlaying = statusState.status?.playing ?? false;

  return (
    <div className="app">
      <Header />

      <div className="toolbar">
        <ThemePicker themes={themes} value={themeId} onChange={setThemeId} />
        <NotificationButton permission={permission} onRequest={requestPermission} />
        {permission === 'granted' && (
          <button className="btn btn--ghost" onClick={() => testNotification(watched ?? undefined)}>
            Test alert
          </button>
        )}
        <button
          className={`btn btn--ghost ${soundEnabled ? 'btn--on' : ''}`}
          onClick={() => setSoundEnabled((v) => !v)}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? '\u{1F50A} Sound on' : '\u{1F507} Sound off'}
        </button>
        {watched && (
          <button className="btn btn--ghost" onClick={handleShare}>
            {copied ? '✓ Copied' : '\u{1F517} Share'}
          </button>
        )}
        <button className="btn btn--ghost" onClick={handleRefresh} disabled={!watched}>
          {'⟳'} Refresh now
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
          <PerformanceTabs
            perfs={profile?.perfs ?? {}}
            speeds={availableSpeeds}
            value={speedFilter}
            onChange={setSpeedFilter}
            loading={profileLoading}
          />

          <div className="grid">
            <StatusCard
              username={watched}
              status={statusState.status}
              lastChecked={statusState.lastChecked}
              loading={statusState.loading}
              error={statusState.error}
            />
            <CurrentGameCard status={statusState.status} gameDetectedAt={statusState.gameDetectedAt} />
            <StatsCard title={`Today · ${scopeLabel}`} stats={dailyStats} loading={gamesState.loading} />
            <SessionCard
              games={gamesState.games}
              gapMinutes={sessionGapMin}
              onGapChange={setSessionGapMin}
              isPlaying={isPlaying}
              loading={gamesState.loading}
            />
          </div>

          <div className="grid">
            <InsightsCard games={filteredGames} />
            <TrendCard games={filteredGames} scopeLabel={scopeLabel} />
          </div>

          <GamesTable games={filteredGames} loading={gamesState.loading} error={gamesState.error} />
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
        . For spectating and stats only, with no engine analysis or move suggestions.
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
    return <span className="notif-status notif-status--on">{'\u{1F514}'} Notifications on</span>;
  }
  if (permission === 'denied') {
    return <span className="notif-status notif-status--off">{'\u{1F515}'} Notifications blocked</span>;
  }
  return (
    <button className="btn btn--ghost" onClick={onRequest}>
      {'\u{1F514}'} Enable notifications
    </button>
  );
}
