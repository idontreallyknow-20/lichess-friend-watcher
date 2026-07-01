import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateUser } from './api/lichess';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStatus } from './hooks/useStatus';
import { useGames } from './hooks/useGames';
import { useTheme } from './hooks/useTheme';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { computeStats, filterToday } from './utils/stats';
import { computeSessions, currentSession } from './utils/sessions';

import { Header } from './components/Header';
import { ThemePicker } from './components/ThemePicker';
import { SearchBar } from './components/SearchBar';
import { RecentUsers } from './components/RecentUsers';
import { StatusCard } from './components/StatusCard';
import { CurrentGameCard } from './components/CurrentGameCard';
import { StatsCard } from './components/StatsCard';
import { SessionCard } from './components/SessionCard';
import { InsightsCard } from './components/InsightsCard';
import { MoodCard } from './components/MoodCard';
import { TrendCard } from './components/TrendCard';
import { GamesTable } from './components/GamesTable';

const MAX_RECENT = 8;
const BACKGROUNDS = [
  {
    id: 'aurora',
    name: 'Aurora',
    value:
      'radial-gradient(900px 520px at 15% 0%, color-mix(in srgb, var(--win) 20%, transparent), transparent 65%), radial-gradient(850px 560px at 90% 12%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 62%), var(--bg)',
  },
  {
    id: 'arena',
    name: 'Arena',
    value:
      'linear-gradient(135deg, color-mix(in srgb, var(--bg) 88%, black), var(--bg)), repeating-linear-gradient(45deg, color-mix(in srgb, var(--border) 35%, transparent) 0 1px, transparent 1px 18px)',
  },
  {
    id: 'rage',
    name: 'Rage Meter',
    value:
      'radial-gradient(900px 520px at 72% -8%, color-mix(in srgb, var(--loss) 28%, transparent), transparent 62%), radial-gradient(700px 520px at 20% 14%, color-mix(in srgb, var(--draw) 16%, transparent), transparent 58%), var(--bg)',
  },
  {
    id: 'paper',
    name: 'Paper',
    value:
      'linear-gradient(180deg, color-mix(in srgb, var(--bg-elev) 16%, transparent), transparent 240px), var(--bg)',
  },
];

type Panel = 'session' | 'tilt' | 'insights' | 'trend' | 'games' | 'settings';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'session', label: 'Current session' },
  { id: 'tilt', label: 'Tilt meter' },
  { id: 'insights', label: 'Insights' },
  { id: 'trend', label: 'Trend' },
  { id: 'games', label: 'Games' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const { themeId, setThemeId, themes } = useTheme();
  const { canInstall, install } = useInstallPrompt();

  const [recent, setRecent] = useLocalStorage<string[]>('lfw.recentUsernames', []);
  const [watched, setWatched] = useLocalStorage<string | null>('lfw.selectedUsername', null);
  const [sessionGapMin, setSessionGapMin] = useLocalStorage<number>('lfw.sessionGap', 30);
  const [backgroundId, setBackgroundId] = useLocalStorage<string>('lfw.background', 'aurora');

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>('session');
  const [copied, setCopied] = useState(false);

  // Bumped to force a games refetch (new game detected / manual refresh).
  const [refreshKey, setRefreshKey] = useState(0);

  const statusState = useStatus(watched);
  const gamesState = useGames(watched, refreshKey);

  useEffect(() => {
    const background = BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
    document.body.style.background = background.value;
    return () => {
      document.body.style.background = '';
    };
  }, [backgroundId]);

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
    if (s.playing) document.title = `${s.name} playing`;
    else if (s.online) document.title = `${s.name} online`;
    else document.title = `${s.name} offline`;
    return () => {
      document.title = base;
    };
  }, [watched, statusState.status]);

  // Reset the open panel when switching players.
  useEffect(() => {
    setActivePanel('session');
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

  const todayGames = useMemo(() => filterToday(gamesState.games), [gamesState.games]);
  const sessionGames = useMemo(() => {
    const sessions = computeSessions(gamesState.games, sessionGapMin * 60 * 1000);
    return currentSession(sessions)?.games ?? [];
  }, [gamesState.games, sessionGapMin]);
  const dailyStats = useMemo(() => computeStats(todayGames), [todayGames]);
  const isPlaying = statusState.status?.playing ?? false;

  return (
    <div className="app">
      <Header />

      <div className="toolbar">
        <ThemePicker themes={themes} value={themeId} onChange={setThemeId} />
        <BackgroundPicker value={backgroundId} onChange={setBackgroundId} />
        {canInstall && (
          <button className="btn btn--primary" onClick={install} title="Install as an app on your device">
            Install app
          </button>
        )}
        {watched && (
          <button className="btn btn--ghost" onClick={handleShare}>
            {copied ? 'Copied' : 'Share'}
          </button>
        )}
        <button className="btn btn--ghost" onClick={handleRefresh} disabled={!watched}>
          Refresh now
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
          <nav className="tabs" role="tablist" aria-label="Dashboard sections">
            {PANELS.map((panel) => (
              <button
                key={panel.id}
                className={`tab ${activePanel === panel.id ? 'tab--active' : ''}`}
                role="tab"
                aria-selected={activePanel === panel.id}
                onClick={() => setActivePanel(panel.id)}
              >
                <span className="tab__name">{panel.label}</span>
              </button>
            ))}
          </nav>

          {activePanel === 'session' && (
            <div className="grid">
              <StatusCard
                username={watched}
                status={statusState.status}
                lastChecked={statusState.lastChecked}
                loading={statusState.loading}
                error={statusState.error}
              />
              <CurrentGameCard
                username={watched}
                status={statusState.status}
                gameDetectedAt={statusState.gameDetectedAt}
              />
              <StatsCard title="Today" stats={dailyStats} loading={gamesState.loading} />
              <SessionCard
                games={gamesState.games}
                gapMinutes={sessionGapMin}
                onGapChange={setSessionGapMin}
                isPlaying={isPlaying}
                loading={gamesState.loading}
              />
            </div>
          )}

          {activePanel === 'tilt' && (
            <MoodCard
              games={gamesState.games}
              gapMinutes={sessionGapMin}
              isPlaying={isPlaying}
              loading={gamesState.loading}
            />
          )}

          {activePanel === 'insights' && (
            <div className="grid">
              <InsightsCard title="Today insights" games={todayGames} />
              <InsightsCard title="Session insights" games={sessionGames} />
            </div>
          )}

          {activePanel === 'trend' && <TrendCard games={gamesState.games} scopeLabel="all speeds" />}

          {activePanel === 'games' && (
            <GamesTable games={gamesState.games} loading={gamesState.loading} error={gamesState.error} />
          )}

          {activePanel === 'settings' && (
            <SettingsPanel
              themes={themes}
              themeId={themeId}
              onThemeChange={setThemeId}
              backgroundId={backgroundId}
              onBackgroundChange={setBackgroundId}
              gapMinutes={sessionGapMin}
              onGapChange={setSessionGapMin}
              onRefresh={handleRefresh}
              onShare={handleShare}
              copied={copied}
            />
          )}
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

function BackgroundPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label className="theme-picker">
      <span className="theme-picker__label">Background</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Background">
        {BACKGROUNDS.map((background) => (
          <option key={background.id} value={background.id}>
            {background.name}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SettingsPanelProps {
  themes: ReturnType<typeof useTheme>['themes'];
  themeId: string;
  onThemeChange: (id: string) => void;
  backgroundId: string;
  onBackgroundChange: (id: string) => void;
  gapMinutes: number;
  onGapChange: (minutes: number) => void;
  onRefresh: () => void;
  onShare: () => void;
  copied: boolean;
}

function SettingsPanel({
  themes,
  themeId,
  onThemeChange,
  backgroundId,
  onBackgroundChange,
  gapMinutes,
  onGapChange,
  onRefresh,
  onShare,
  copied,
}: SettingsPanelProps) {
  return (
    <section className="card card--wide">
      <h2 className="card__title">Settings</h2>
      <div
        className="settings-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}
      >
        <ThemePicker themes={themes} value={themeId} onChange={onThemeChange} />
        <BackgroundPicker value={backgroundId} onChange={onBackgroundChange} />
        <label className="theme-picker">
          <span className="theme-picker__label">Session gap</span>
          <select className="select" value={gapMinutes} onChange={(e) => onGapChange(Number(e.target.value))}>
            {[15, 30, 60, 120].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="settings-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        <button className="btn btn--ghost" onClick={onShare}>
          {copied ? 'Copied' : 'Copy watch link'}
        </button>
        <button className="btn btn--ghost" onClick={onRefresh}>
          Refresh data
        </button>
      </div>
      <p className="empty">
        Mood and tilt use the latest detected session, recent losses, loss streaks, and Elo movement. Live status
        stays simple so it works cleanly on mobile and desktop.
      </p>
    </section>
  );
}
