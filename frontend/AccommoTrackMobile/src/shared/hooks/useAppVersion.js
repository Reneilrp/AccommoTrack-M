import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import api from '../../services/api.js';

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
  
  // Simple check: if latest version string is different, assume it's newer
  const updateAvailable = latestVersion !== currentVersion;

  return {
    currentVersion,
    latestVersion,
    downloadUrl,
    updateAvailable,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
