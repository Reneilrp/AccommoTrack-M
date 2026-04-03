import React, { useState } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { Type, Check, Sun, Moon, Monitor } from 'lucide-react';
import { SkeletonAppearanceTab } from '../../components/Shared/Skeleton';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AppearanceTab({ loading = false, user, onUserUpdate }) {
  const {
    fontSize,
    setFontSize,
    theme,
    effectiveTheme,
    setTheme,
    resetPreferences,
  } = usePreferences();
  const [isSaving, setIsSaving] = useState(false);

  const persistedAppearance = (user?.preferences && typeof user.preferences === 'object' && user.preferences.appearance)
    ? user.preferences.appearance
    : {};
  const savedTheme = persistedAppearance?.theme || 'system';
  const savedFontSize = persistedAppearance?.fontSize || 'medium';
  const hasUnsavedChanges = theme !== savedTheme || fontSize !== savedFontSize;

  const handleSavePreferences = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const currentPreferences = (user?.preferences && typeof user.preferences === 'object')
        ? user.preferences
        : {};

      const nextPreferences = {
        ...currentPreferences,
        appearance: {
          theme,
          fontSize
        }
      };

      const response = await api.put('/me', { preferences: nextPreferences });
      const nextUser = response.data?.user || { ...user, preferences: nextPreferences };
      if (onUserUpdate) onUserUpdate(nextUser);

      toast.success('Appearance preferences saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save appearance preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, description: 'Always use light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, description: 'Always use dark theme' },
    { value: 'system', label: 'System', icon: Monitor, description: 'Follow device settings' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', preview: 'Aa', size: 'text-sm', description: '90%' },
    { value: 'medium', label: 'Medium', preview: 'Aa', size: 'text-base', description: '100%' },
    { value: 'large', label: 'Large', preview: 'Aa', size: 'text-lg', description: '115%' },
    { value: 'x-large', label: 'Extra Large', preview: 'Aa', size: 'text-xl', description: '130%' }
  ];

  if (loading) return <SkeletonAppearanceTab />;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Appearance Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Customize how AccommoTrack looks for you. Click Save Preferences to sync this to your account.
          </p>
        </div>

        {/* Theme Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {effectiveTheme === 'dark' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Theme
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose how AccommoTrack looks to you. Select a theme or let it follow your device settings.
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${theme === option.value ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}
                >
                  {theme === option.value && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${theme === option.value ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Size Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Font Size
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a font size that's comfortable for you to read. Text content will scale while keeping layouts stable.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontSize(option.value)}
                className={`relative p-4 rounded-xl border-2 transition-all ${fontSize === option.value ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'}`}
              >
                {fontSize === option.value && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
                <div className={`${option.size} font-semibold text-gray-900 dark:text-white mb-2`}>
                  {option.preview}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            💡 Accessibility Tip
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Larger font sizes can reduce eye strain, especially for extended use. 
            Choose settings that feel most comfortable for you.
          </p>
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={resetPreferences}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSavePreferences}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
