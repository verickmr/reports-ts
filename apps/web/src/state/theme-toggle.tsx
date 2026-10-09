import { useThemePreference } from './theme-preference';

export function ThemeToggle({ inverse = false }: { inverse?: boolean }) {
  const mode = useThemePreference((state) => state.mode);
  const toggleMode = useThemePreference((state) => state.toggleMode);
  const nextMode = mode === 'dark' ? 'claro' : 'escuro';

  return (
    <button
      type="button"
      className={`theme-toggle${inverse ? ' theme-toggle-inverse' : ''}`}
      onClick={toggleMode}
      aria-label={`Ativar modo ${nextMode}`}
      title={`Ativar modo ${nextMode}`}
    >
      {mode === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20.3 16.3A8.5 8.5 0 0 1 7.7 3.7 8.5 8.5 0 1 0 20.3 16.3Z" />
        </svg>
      )}
      <span>Modo {nextMode}</span>
    </button>
  );
}
