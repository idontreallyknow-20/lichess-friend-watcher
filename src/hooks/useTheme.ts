import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_THEME_ID, getTheme, THEMES } from '../theme/themes';

/**
 * Persists the selected theme id and applies its CSS variables (and color
 * scheme) to the document root whenever it changes.
 */
export function useTheme() {
  const [themeId, setThemeId] = useLocalStorage<string>('lfw.theme', DEFAULT_THEME_ID);

  useEffect(() => {
    const theme = getTheme(themeId);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
    root.style.colorScheme = theme.scheme;
    root.setAttribute('data-scheme', theme.scheme);
  }, [themeId]);

  return { themeId, setThemeId, themes: THEMES };
}
