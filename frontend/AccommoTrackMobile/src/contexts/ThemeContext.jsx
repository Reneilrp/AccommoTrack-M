import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

// Color palettes matching web app's Tailwind config exactly
// Brand colors from tailwind.config.js: brand-50 to brand-900
// Updated to use the Green palette from the Web Guest UI
export const lightTheme = {
  isDark: false,
  colors: {
    // Brand/Primary colors (Green palette - matching web guest brand colors)
    primary: '#16a34a', // green-600
    primaryDark: '#15803d', // green-700
    primaryLight: '#dcfce7', // green-100
    brand50: '#f0fdf4', // green-50
    brand100: '#dcfce7', // green-100
    brand200: '#bbf7d0', // green-200
    brand300: '#86efac', // green-300
    brand400: '#4ade80', // green-400
    brand500: '#22c55e', // green-500
    brand600: '#16a34a', // green-600
    brand700: '#15803d', // green-700
    brand800: '#166534', // green-800
    brand900: '#14532d', // green-900
    
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
    textTertiary: '#9ca3af', // --text-muted / gray-400
    textInverse: '#ffffff',
    
    // Border colors (matching CSS variables)
    border: '#e5e7eb', // --border-color / gray-200
    borderLight: '#f3f4f6', // --border-light / gray-100
    
    // Status colors (matching web app usage)
    success: '#16a34a', // green-600
    successLight: '#dcfce7', // green-100
    successDark: '#15803d', // green-700
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
    // Brand/Primary colors (Green palette - matching web guest brand colors)
    primary: '#16a34a', // green-600 (matching web guest primary)
    primaryDark: '#15803d', // green-700
    primaryLight: '#14532d', // green-900
    brand50: '#f0fdf4', // green-50
    brand100: '#dcfce7', // green-100
    brand200: '#bbf7d0', // green-200
    brand300: '#86efac', // green-300
    brand400: '#4ade80', // green-400
    brand500: '#22c55e', // green-500
    brand600: '#16a34a', // green-600
    brand700: '#15803d', // green-700
    brand800: '#166534', // green-800
    brand900: '#14532d', // green-900
    
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
    textTertiary: '#9ca3af', // --text-muted / gray-400
    textInverse: '#111827',
    
    // Border colors (matching CSS variables)
    border: '#374151', // --border-color / gray-700
    borderLight: '#4b5563', // --border-light / gray-600
    
    // Status colors (matching web app usage)
    success: '#16a34a', // green-600
    successLight: '#14532d', // green-900 (dark mode)
    successDark: '#15803d', // green-700
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
