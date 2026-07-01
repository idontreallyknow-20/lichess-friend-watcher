import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateUser } from './api/lichess';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useStatus } from './hooks/useStatus';
import { useGames } from './hooks/useGames';
import { useProfile } from './hooks/useProfile';
import { useRatingHistory } from './hooks/useRatingHistory';
import { useTheme } from './hooks/useTheme';
import { computeStats, filterLastWeek, filterToday } from './utils/stats';
import { computeSessions, currentSession } from './utils/sessions';
import { filterBySpeed } from './utils/insights';
import { orderSpeeds, speedLabel } from './utils/speeds';
import type { GameRecord, Profile } from './types';

import { Header } from './components/Header';
import { ThemePicker } from './components/ThemePicker';
import { SearchBar } from './components/SearchBar';
import { RecentUsers } from './components/RecentUsers';
import { StatusCard } from './components/StatusCard';
import { CurrentGameCard } from './components/CurrentGameCard';
import { StatsCard } from './components/StatsCard';
import { SessionCard } from './components/SessionCard';
import { InsightsCard } from './components/InsightsCard';
import { AllTimeCard } from './components/AllTimeCard';
import { InstallButton } from './components/InstallButton';
import { MoodCard } from './components/MoodCard';
import { TrendCard } from './components/TrendCard';
import { GamesTable } from './components/GamesTable';
import { OpeningsCard } from './components/OpeningsCard';

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
  {
    id: 'mesh',
    name: 'Mesh',
    value:
      'radial-gradient(620px 460px at 8% 12%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), radial-gradient(560px 460px at 92% 8%, color-mix(in srgb, var(--win) 18%, transparent), transparent 60%), radial-gradient(680px 520px at 60% 100%, color-mix(in srgb, var(--draw) 16%, transparent), transparent 62%), var(--bg)',
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    value:
      'radial-gradient(1000px 640px at 50% -12%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 60%), var(--bg)',
  },
  {
    id: 'grid',
    name: 'Grid',
    value:
      'linear-gradient(color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px) 0 0 / 34px 34px, linear-gradient(90deg, color-mix(in srgb, var(--border) 45%, transparent) 1px, transparent 1px) 0 0 / 34px 34px, radial-gradient(900px 520px at 50% -10%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%), var(--bg)',
  },
  {
    id: 'dots',
    name: 'Dots',
    value:
      'radial-gradient(color-mix(in srgb, var(--border) 70%, transparent) 1.4px, transparent 1.4px) 0 0 / 22px 22px, var(--bg)',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    value:
      'radial-gradient(700px 700px at 78% 18%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 55%), radial-gradient(620px 620px at 12% 78%, color-mix(in srgb, var(--loss) 20%, transparent), transparent 55%), linear-gradient(160deg, color-mix(in srgb, var(--bg) 84%, black), var(--bg))',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    value:
      'linear-gradient(180deg, color-mix(in srgb, var(--draw) 22%, transparent), transparent 40%), radial-gradient(900px 500px at 50% 120%, color-mix(in srgb, var(--loss) 26%, transparent), transparent 60%), var(--bg)',
  },
  {
    id: 'plain',
    name: 'Plain',
    value: 'var(--bg)',
  },
  {
    id: 'midnight-board',
    name: 'Midnight board',
    value:
      'linear-gradient(45deg, color-mix(in srgb, var(--bg-elev) 28%, transparent) 25%, transparent 25% 75%, color-mix(in srgb, var(--bg-elev) 28%, transparent) 75%), linear-gradient(45deg, color-mix(in srgb, var(--bg-elev) 28%, transparent) 25%, transparent 25% 75%, color-mix(in srgb, var(--bg-elev) 28%, transparent) 75%), radial-gradient(900px 520px at 80% 0%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 62%), var(--bg)',
  },
  {
    id: 'time-scramble',
    name: 'Time scramble',
    value:
      'conic-gradient(from 220deg at 82% 14%, color-mix(in srgb, var(--loss) 28%, transparent), transparent 24%, color-mix(in srgb, var(--draw) 22%, transparent), transparent 58%), radial-gradient(780px 540px at 8% 80%, color-mix(in srgb, var(--win) 18%, transparent), transparent 64%), var(--bg)',
  },
  {
    id: 'neon-file',
    name: 'Neon file',
    value:
      'repeating-linear-gradient(90deg, color-mix(in srgb, var(--border) 30%, transparent) 0 1px, transparent 1px 76px), radial-gradient(760px 460px at 74% 6%, color-mix(in srgb, var(--win) 20%, transparent), transparent 66%), radial-gradient(720px 520px at 15% 95%, color-mix(in srgb, var(--loss) 18%, transparent), transparent 62%), var(--bg)',
  },
];

type Panel = 'session' | 'tilt' | 'insights' | 'trend' | 'openings' | 'games' | 'settings';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'session', label: 'Current session' },
  { id: 'tilt', label: 'Tilt meter' },
  { id: 'insights', label: 'Insights' },
  { id: 'trend', label: 'Trend' },
  { id: 'openings', label: 'Openings' },
  { id: 'games', label: 'Games' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const { themeId, setThemeId, themes } = useTheme();

  const [recent, setRecent] = useLocalStorage<string[]>('lfw.recentUsernames', []);
  const [watched, setWatched] = useLocalStorage<string | null>('lfw.selectedUsername', null);
  const [sessionGapMin, setSessionGapMin] = useLocalStorage<number>('lfw.sessionGap', 30);
  const [backgroundId, setBackgroundId] = useLocalStorage<string>('lfw.background', 'aurora');
  const [customBackground, setCustomBackground] = useLocalStorage<string | null>('lfw.customBackground', null);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Panel>('session');
  const [copied, setCopied] = useState(false);

  // Bumped to force a games refetch (new game detected / manual refresh).
  const [refreshKey, setRefreshKey] = useState(0);

  const statusState = useStatus(watched);
  const gamesState = useGames(watched, refreshKey);
  const profileState = useProfile(watched);
  const ratingHistoryState = useRatingHistory(watched);

  useEffect(() => {
    if (backgroundId === 'custom' && customBackground) {
      document.body.style.background = `linear-gradient(180deg, color-mix(in srgb, var(--bg) 42%, transparent), color-mix(in srgb, var(--bg) 68%, transparent)), url("${customBackground}") center / cover fixed no-repeat`;
      return () => {
        document.body.style.background = '';
      };
    }

    const background = BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
    document.body.style.background = background.value;
    return () => {
      document.body.style.background = '';
    };
  }, [backgroundId, customBackground]);

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
  const weekGames = useMemo(() => filterLastWeek(gamesState.games), [gamesState.games]);
  const sessionGames = useMemo(() => {
    const sessions = computeSessions(gamesState.games, sessionGapMin * 60 * 1000);
    return currentSession(sessions)?.games ?? [];
  }, [gamesState.games, sessionGapMin]);
  const dailyStats = useMemo(() => computeStats(todayGames), [todayGames]);
  const isPlaying = statusState.status?.playing ?? false;

  return (
    <div className="app">
      <Header action={<InstallButton />} />

      {watched && (
        <div className="toolbar">
          <button className="btn btn--ghost" onClick={handleShare}>
            {copied ? 'Copied' : 'Share'}
          </button>
          <button className="btn btn--ghost" onClick={handleRefresh}>
            Refresh now
          </button>
        </div>
      )}

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
                games={gamesState.games}
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
            <InsightsPanel
              recentGames={gamesState.games}
              todayGames={todayGames}
              weekGames={weekGames}
              sessionGames={sessionGames}
              perfs={profileState.profile?.perfs ?? {}}
              profileLoading={profileState.loading}
            />
          )}

          {activePanel === 'trend' && (
            <TrendCard
              games={gamesState.games}
              history={ratingHistoryState.history}
              perfs={profileState.profile?.perfs ?? {}}
              loading={ratingHistoryState.loading || profileState.loading}
              error={ratingHistoryState.error}
            />
          )}

          {activePanel === 'openings' && <OpeningsCard games={gamesState.games} />}

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
              customBackground={customBackground}
              onCustomBackground={setCustomBackground}
              gapMinutes={sessionGapMin}
              onGapChange={setSessionGapMin}
            />
          )}
        </>
      ) : (
        <section className="card">
          <p className="empty" style={{ marginTop: 0 }}>
            Enter a Lichess username above to start watching their status and stats.
          </p>
          <div className="appearance">
            <ThemePicker themes={themes} value={themeId} onChange={setThemeId} />
            <BackgroundPicker
              value={backgroundId}
              customBackground={customBackground}
              onChange={setBackgroundId}
              onCustomBackground={setCustomBackground}
            />
          </div>
        </section>
      )}
    </div>
  );
}

type Scope = 'recent' | 'week' | 'today' | 'session';

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'week', label: 'Last week' },
  { id: 'today', label: 'Today' },
  { id: 'session', label: 'Session' },
];

interface InsightsPanelProps {
  recentGames: GameRecord[];
  todayGames: GameRecord[];
  weekGames: GameRecord[];
  sessionGames: GameRecord[];
  perfs: Profile['perfs'];
  profileLoading: boolean;
}

function InsightsPanel({
  recentGames,
  todayGames,
  weekGames,
  sessionGames,
  perfs,
  profileLoading,
}: InsightsPanelProps) {
  const [scope, setScope] = useState<Scope>('recent');
  const [speed, setSpeed] = useState<string>('all');

  // Speeds offered come from the player's rated perfs plus any speed seen in the
  // recent games, so the filter only ever lists things that have data.
  const speeds = useMemo(() => {
    const keys = new Set<string>();
    for (const k of Object.keys(perfs)) {
      if ((perfs[k]?.games ?? 0) > 0) keys.add(k);
    }
    for (const g of recentGames) keys.add(g.speed);
    return orderSpeeds(keys);
  }, [perfs, recentGames]);

  const baseGames =
    scope === 'today'
      ? todayGames
      : scope === 'week'
        ? weekGames
        : scope === 'session'
          ? sessionGames
          : recentGames;
  const games = useMemo(() => filterBySpeed(baseGames, speed), [baseGames, speed]);

  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label ?? 'Recent';
  const speedText = speed === 'all' ? 'All speeds' : speedLabel(speed);
  const title = `${speedText} - ${scopeLabel}`;

  return (
    <div className="insights-panel">
      <div className="insights-controls">
        <div className="seg" role="tablist" aria-label="Speed">
          <button
            className={`seg__btn ${speed === 'all' ? 'seg__btn--active' : ''}`}
            onClick={() => setSpeed('all')}
          >
            All
          </button>
          {speeds.map((s) => (
            <button
              key={s}
              className={`seg__btn ${speed === s ? 'seg__btn--active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {speedLabel(s)}
            </button>
          ))}
        </div>
        <div className="seg" role="tablist" aria-label="Scope">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              className={`seg__btn ${scope === s.id ? 'seg__btn--active' : ''}`}
              onClick={() => setScope(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        <AllTimeCard perfs={perfs} speed={speed} loading={profileLoading} />
        <InsightsCard title={title} games={games} />
      </div>
    </div>
  );
}

function BackgroundPicker({
  value,
  customBackground,
  onChange,
  onCustomBackground,
}: {
  value: string;
  customBackground: string | null;
  onChange: (id: string) => void;
  onCustomBackground: (value: string | null) => void;
}) {
  const handleUpload = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        onCustomBackground(reader.result);
        onChange('custom');
      };
      reader.readAsDataURL(file);
    },
    [onChange, onCustomBackground],
  );

  return (
    <div className="theme-picker">
      <label className="theme-picker__label" htmlFor="background-preset">
        Background
      </label>
      <select
        id="background-preset"
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Background"
      >
        {BACKGROUNDS.map((background) => (
          <option key={background.id} value={background.id}>
            {background.name}
          </option>
        ))}
        <option value="custom" disabled={!customBackground}>
          Uploaded image
        </option>
      </select>
      <label className="btn btn--ghost btn--upload">
        Upload background
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          className="visually-hidden"
        />
      </label>
      {customBackground && (
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => {
            onCustomBackground(null);
            if (value === 'custom') onChange('aurora');
          }}
        >
          Clear upload
        </button>
      )}
    </div>
  );
}

interface SettingsPanelProps {
  themes: ReturnType<typeof useTheme>['themes'];
  themeId: string;
  onThemeChange: (id: string) => void;
  backgroundId: string;
  onBackgroundChange: (id: string) => void;
  customBackground: string | null;
  onCustomBackground: (value: string | null) => void;
  gapMinutes: number;
  onGapChange: (minutes: number) => void;
}

function SettingsPanel({
  themes,
  themeId,
  onThemeChange,
  backgroundId,
  onBackgroundChange,
  customBackground,
  onCustomBackground,
  gapMinutes,
  onGapChange,
}: SettingsPanelProps) {
  return (
    <section className="card card--wide">
      <h2 className="card__title">Settings</h2>
      <div
        className="settings-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}
      >
        <ThemePicker themes={themes} value={themeId} onChange={onThemeChange} />
        <BackgroundPicker
          value={backgroundId}
          customBackground={customBackground}
          onChange={onBackgroundChange}
          onCustomBackground={onCustomBackground}
        />
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
    </section>
  );
}
