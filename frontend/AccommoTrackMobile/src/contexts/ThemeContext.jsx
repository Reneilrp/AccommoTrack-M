import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

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

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // Use system preference
        const colorScheme = Appearance.getColorScheme();
        setIsDarkMode(colorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = async (theme) => {
    try {
      const newIsDark = theme === 'dark';
      setIsDarkMode(newIsDark);
      await AsyncStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    theme,
    isDarkMode,
    toggleTheme,
    setTheme,
    isLoading,
  };

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
