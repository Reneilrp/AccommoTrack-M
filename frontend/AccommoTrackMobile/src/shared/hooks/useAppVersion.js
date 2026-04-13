import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import api from '../../services/api.js';

const toBool = (value) => value === true || value === 1 || value === '1' || value === 'true';

const compareVersions = (leftVersion, rightVersion) => {
  const leftParts = String(leftVersion || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(rightVersion || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const left = leftParts[index] || 0;
    const right = rightParts[index] || 0;

    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
};

export function useAppVersion() {
  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  const query = useQuery({
    queryKey: ['system', 'toggles', 'app-version'],
    queryFn: async () => {
      const response = await api.get('/system/toggles');
      if (response?.data?.data) {
        return response.data.data;
      }
      throw new Error('Invalid response format');
    },
    // Cache for 5 minutes since version rarely changes mid-session
    staleTime: 5 * 60 * 1000, 
  });

  const latestVersion = query.data?.mobile_latest_version || currentVersion;
  const downloadUrl = query.data?.mobile_download_url || '';
  const isForceUpdate = toBool(query.data?.mobile_force_update);
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;

  return {
    currentVersion,
    latestVersion,
    downloadUrl,
    isForceUpdate,
    updateAvailable,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
