import type { Theme } from '../theme/themes';

interface ThemePickerProps {
  themes: Theme[];
  value: string;
  onChange: (id: string) => void;
}

export function ThemePicker({ themes, value, onChange }: ThemePickerProps) {
  return (
    <label className="theme-picker">
      <span className="theme-picker__label">Theme</span>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Color theme"
      >
        {themes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
