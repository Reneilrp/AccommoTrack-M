import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PreferencesContext = createContext(null);

const FONT_SIZES = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  'x-large': 1.3 
};

const FONT_SIZE_LABELS = {
  small: 'Small',
  medium: 'Medium (Default)',
  large: 'Large',
  'x-large': 'Extra Large'
};

// Theme options
const THEME_OPTIONS = {
  light: 'light',
  dark: 'dark',
  system: 'system'
};

const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
};

const STORAGE_KEY = 'accommo_preferences';

const DEFAULT_PREFERENCES = {
  fontSize: 'medium',
  theme: 'system'
};

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    // Load from localStorage on initial render
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  });

  const getEffectiveTheme = useCallback((themePreference) => {
    if (themePreference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themePreference;
  }, []);

  // Apply preferences to document
  useEffect(() => {
    const root = document.documentElement;
    
    const scale = FONT_SIZES[preferences.fontSize] || FONT_SIZES.medium;
    root.style.setProperty('--font-scale', scale);
    
    document.body.classList.add('font-scaled');
    
    // Apply theme
    const effectiveTheme = getEffectiveTheme(preferences.theme);
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }, [preferences, getEffectiveTheme]);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (preferences.theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.theme]);

  const setFontSize = (size) => {
    if (FONT_SIZES[size]) {
      setPreferences(prev => ({ ...prev, fontSize: size }));
    }
  };

  const setTheme = (theme) => {
    if (THEME_OPTIONS[theme]) {
      setPreferences(prev => ({ ...prev, theme }));
    }
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  // Get the currently active theme (resolved from system if needed)
  const effectiveTheme = getEffectiveTheme(preferences.theme);

  const value = {
    preferences,
    fontSize: preferences.fontSize,
    theme: preferences.theme,
    effectiveTheme,
    setFontSize,
    setTheme,
    resetPreferences,
    FONT_SIZES,
    FONT_SIZE_LABELS,
    THEME_OPTIONS,
    THEME_LABELS
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

export default PreferencesContext;
