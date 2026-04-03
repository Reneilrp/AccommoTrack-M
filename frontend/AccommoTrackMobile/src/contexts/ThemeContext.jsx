import React, { createContext, useContext, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const ThemeContext = createContext();

// Color palettes matching web app's Tailwind config exactly
// Brand colors from tailwind.config.js: brand-50 to brand-900
// Updated to use the Emerald palette from the Web Guest UI
export const lightTheme = {
  isDark: false,
  colors: {
    // Brand/Primary colors (Emerald palette - matching web guest brand colors)
    primary: '#047857', // emerald-700 (Increased for contrast)
    primaryDark: '#047857', // emerald-700
    primaryLight: '#d1fae5', // emerald-100
    brand50: '#ecfdf5', // emerald-50
    brand100: '#d1fae5', // emerald-100
    brand200: '#a7f3d0', // emerald-200
    brand300: '#6ee7b7', // emerald-300
    brand400: '#34d399', // emerald-400
    brand500: '#10b981', // emerald-500
    brand600: '#059669', // emerald-600
    brand700: '#047857', // emerald-700
    brand800: '#065f46', // emerald-800
    brand900: '#064e3b', // emerald-900
    
    // Background colors (matching CSS variables)
    background: '#ffffff', // --bg-primary
    backgroundSecondary: '#f9fafb', // --bg-secondary / gray-50
    backgroundTertiary: '#f3f4f6', // --bg-tertiary / gray-100
    
    // Surface colors
    surface: '#ffffff', // white
    surfaceHover: '#f9fafb', // gray-50
    
    // Text colors (matching CSS variables)
    text: '#111827', // --text-primary / gray-900
    textSecondary: '#4b5563', // --text-secondary / gray-500
    textTertiary: '#71717a', // --text-muted / gray-500 (Increased for contrast)
    textInverse: '#ffffff',
    
    // Border colors (matching CSS variables)
    border: '#e5e7eb', // --border-color / gray-200
    borderLight: '#f3f4f6', // --border-light / gray-100
    
    // Status colors (matching web app usage)
    success: '#047857', // emerald-700 (Increased for contrast)
    successLight: '#d1fae5', // emerald-100
    successDark: '#047857', // emerald-700
    error: '#ef4444', // red-500
    errorLight: '#fee2e2', // red-100
    errorDark: '#dc2626', // red-600
    warning: '#f59e0b', // amber-500
    warningLight: '#fef3c7', // amber-100
    warningDark: '#d97706', // amber-600
    info: '#3b82f6', // blue-500
    infoLight: '#dbeafe', // blue-100
    infoDark: '#2563eb', // blue-600
    
    // Semantic colors
    danger: '#ef4444', // red-500
    dangerLight: '#fee2e2', // red-100
    
    // Additional colors used in web app
    purple: '#9333ea', // purple-600
    purpleLight: '#e9d5ff', // purple-100
    
    // Card shadows
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowDark: 'rgba(0, 0, 0, 0.2)',
  },
};

export const darkTheme = {
  isDark: true,
  colors: {
    // Brand/Primary colors (Emerald palette - matching web guest brand colors)
    primary: '#34d399', // emerald-400 (Lighter for dark mode contrast)
    primaryDark: '#047857', // emerald-700
    primaryLight: '#064e3b', // emerald-900
    brand50: '#ecfdf5', // emerald-50
    brand100: '#d1fae5', // emerald-100
    brand200: '#a7f3d0', // emerald-200
    brand300: '#6ee7b7', // emerald-300
    brand400: '#34d399', // emerald-400
    brand500: '#10b981', // emerald-500
    brand600: '#059669', // emerald-600
    brand700: '#047857', // emerald-700
    brand800: '#065f46', // emerald-800
    brand900: '#064e3b', // emerald-900
    
    // Background colors (matching CSS variables)
    background: '#111827', // --bg-primary / gray-900
    backgroundSecondary: '#1f2937', // --bg-secondary / gray-800
    backgroundTertiary: '#374151', // --bg-tertiary / gray-700
    
    // Surface colors
    surface: '#1f2937', // gray-800
    surfaceHover: '#374151', // gray-700
    
    // Text colors (matching CSS variables)
    text: '#f9fafb', // --text-primary / gray-50
    textSecondary: '#d1d5db', // --text-secondary / gray-300
    textTertiary: '#71717a', // --text-muted / gray-500 (Synced with web)
    textInverse: '#111827',
    
    // Border colors (matching CSS variables)
    border: '#374151', // --border-color / gray-700
    borderLight: '#4b5563', // --border-light / gray-600
    
    // Status colors (matching web app usage)
    success: '#34d399', // emerald-400 (Lighter for dark mode contrast)
    successLight: '#064e3b', // emerald-900 (dark mode)
    successDark: '#047857', // emerald-700
    error: '#ef4444', // red-500
    errorLight: '#7f1d1d', // red-900 (dark mode)
    errorDark: '#dc2626', // red-600
    warning: '#f59e0b', // amber-500
    warningLight: '#78350f', // amber-900 (dark mode)
    warningDark: '#d97706', // amber-600
    info: '#3b82f6', // blue-500
    infoLight: '#1e3a8a', // blue-900 (dark mode)
    infoDark: '#2563eb', // blue-600
    
    // Semantic colors
    danger: '#ef4444', // red-500
    dangerLight: '#7f1d1d', // red-900
    
    // Additional colors used in web app
    purple: '#9333ea', // purple-600
    purpleLight: '#581c87', // purple-900 (dark mode)
    
    // Card shadows
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowDark: 'rgba(0, 0, 0, 0.5)',
  },
};

const THEME_STORAGE_KEY = 'theme_store';
const LEGACY_THEME_STORAGE_KEY = 'theme';

const getSystemDarkPreference = () => Appearance.getColorScheme() === 'dark';

export const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: getSystemDarkPreference(),
      hasHydrated: false,

      setHydrated: (value) => set({ hasHydrated: Boolean(value) }),
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setTheme: (themeMode) => set({ isDarkMode: themeMode === 'dark' }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Error loading theme preference:', error);
        }

        state?.setHydrated(true);
      },
    },
  ),
);

export const ThemeProvider = ({ children }) => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const hasHydrated = useThemeStore((state) => state.hasHydrated);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    if (!hasHydrated) return;

    const migrateLegacyThemePreference = async () => {
      try {
        const currentThemeStoreValue = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (currentThemeStoreValue) {
          return;
        }

        const legacyTheme = await AsyncStorage.getItem(LEGACY_THEME_STORAGE_KEY);
        if (legacyTheme === 'dark' || legacyTheme === 'light') {
          setTheme(legacyTheme);
        }

        if (legacyTheme !== null) {
          await AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error migrating legacy theme preference:', error);
      }
    };

    migrateLegacyThemePreference();
  }, [hasHydrated, setTheme]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      theme,
      isDarkMode,
      toggleTheme,
      setTheme,
      isLoading: !hasHydrated,
    }),
    [theme, isDarkMode, toggleTheme, setTheme, hasHydrated],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
