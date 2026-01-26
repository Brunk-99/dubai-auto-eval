import { createContext, useContext, useState, useEffect } from 'react';

// Theme definitions
export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Klassisch',
    description: 'Helles, minimalistisches Design',
    // Backgrounds
    pageBg: 'bg-gray-50',
    headerBg: 'bg-white/95 backdrop-blur-sm border-b border-gray-100',
    headerText: 'text-gray-900',
    headerIcon: 'text-gray-700',
    headerHover: 'hover:bg-gray-100 active:bg-gray-200',
    // Cards & Sections
    cardBg: 'bg-white',
    sectionBg: 'bg-white border-b border-gray-100',
    // Text
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-500',
    textMuted: 'text-gray-400',
    // Inputs
    inputBg: 'bg-white',
    inputBorder: 'border-gray-300',
    inputText: 'text-gray-900',
    // Buttons
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
    buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    // Accents
    accent: 'text-blue-600',
    accentBg: 'bg-blue-600',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Glassmorphism mit blauen Akzenten',
    // Backgrounds
    pageBg: 'bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100',
    headerBg: 'bg-gradient-to-r from-blue-400 to-blue-500 shadow-lg',
    headerText: 'text-white',
    headerIcon: 'text-white',
    headerHover: 'hover:bg-white/20 active:bg-white/30',
    // Cards & Sections
    cardBg: 'bg-white/90 backdrop-blur-sm',
    sectionBg: 'bg-white/80 backdrop-blur-sm border-b border-white/50',
    // Text
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400',
    // Inputs
    inputBg: 'bg-white/80',
    inputBorder: 'border-gray-200',
    inputText: 'text-gray-900',
    // Buttons
    buttonPrimary: 'bg-blue-500 hover:bg-blue-600 text-white',
    buttonSecondary: 'bg-white/80 hover:bg-white text-gray-700',
    // Accents
    accent: 'text-blue-600',
    accentBg: 'bg-blue-500',
  },
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Dunkles Design für die Augen',
    // Backgrounds
    pageBg: 'bg-gray-900',
    headerBg: 'bg-gray-800 border-b border-gray-700',
    headerText: 'text-white',
    headerIcon: 'text-gray-300',
    headerHover: 'hover:bg-gray-700 active:bg-gray-600',
    // Cards & Sections
    cardBg: 'bg-gray-800',
    sectionBg: 'bg-gray-800 border-b border-gray-700',
    // Text
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    textMuted: 'text-gray-500',
    // Inputs
    inputBg: 'bg-gray-700',
    inputBorder: 'border-gray-600',
    inputText: 'text-white',
    // Buttons
    buttonPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
    buttonSecondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
    // Accents
    accent: 'text-blue-400',
    accentBg: 'bg-blue-600',
  },
};

const THEME_STORAGE_KEY = 'dubai-auto-eval-theme';

// Context
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    // Load from localStorage or default to 'modern'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && THEMES[saved]) {
        return saved;
      }
    }
    return 'modern';
  });

  const theme = THEMES[themeId];

  // Save to localStorage when theme changes
  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);

    // Update body class for global styles
    document.body.className = themeId === 'dark' ? 'dark-theme' : '';
  }, [themeId]);

  const setTheme = (id) => {
    if (THEMES[id]) {
      setThemeId(id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper hook for common class combinations
export function useThemeClasses() {
  const { theme } = useTheme();

  return {
    page: `min-h-screen ${theme.pageBg}`,
    header: theme.headerBg,
    headerText: theme.headerText,
    headerIcon: theme.headerIcon,
    headerHover: theme.headerHover,
    card: `${theme.cardBg} rounded-2xl p-5 shadow-sm`,
    section: theme.sectionBg,
    text: theme.textPrimary,
    textSecondary: theme.textSecondary,
    textMuted: theme.textMuted,
    input: `${theme.inputBg} ${theme.inputBorder} ${theme.inputText}`,
    buttonPrimary: theme.buttonPrimary,
    buttonSecondary: theme.buttonSecondary,
    accent: theme.accent,
  };
}
