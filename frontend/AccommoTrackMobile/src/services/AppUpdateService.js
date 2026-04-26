import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { WEB_BASE_URL } from '../config/index.js';

const APK_FILE_NAME = 'AccommoTrack_update.apk';
const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

export const resolveAppDownloadUrl = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Ensure WEB_BASE_URL doesn't have trailing slash
  const base = String(WEB_BASE_URL || 'https://accommotrack.me').trim().replace(/\/+$/, '');
  
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
};

const buildDestinationUri = () => {
  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new Error('No writable app directory available for update download.');
  }

  const slash = baseDirectory.endsWith('/') ? '' : '/';
  return `${baseDirectory}${slash}${APK_FILE_NAME}`;
};

const removeExistingFile = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info?.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.warn('[AppUpdateService] Failed to cleanup old APK:', e.message);
  }
};

const normalizeProgress = (writtenBytes, totalBytes) => {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return 0;
  }
  const value = writtenBytes / totalBytes;
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
};

const downloadApkFile = async ({ resolvedUrl, destinationUri, onProgress }) => {
  console.log(`[AppUpdateService] Starting download from ${resolvedUrl} to ${destinationUri}`);
  
  if (typeof FileSystem.createDownloadResumable === 'function') {
    const downloadResumable = FileSystem.createDownloadResumable(
      resolvedUrl,
      destinationUri,
      {},
      (downloadProgress) => {
        if (typeof onProgress !== 'function') return;
        const progress = normalizeProgress(
          downloadProgress?.totalBytesWritten,
          downloadProgress?.totalBytesExpectedToWrite,
        );
        onProgress(progress);
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      throw new Error(`Download failed with status ${result?.status || 'unknown'}`);
    }
    return result.uri;
  }

  const result = await FileSystem.downloadAsync(resolvedUrl, destinationUri);
  if (!result || result.status !== 200) {
    throw new Error(`Download failed with status ${result?.status || 'unknown'}`);
  }
  if (typeof onProgress === 'function') onProgress(1);
  return result.uri;
};

const launchInstaller = async (localUri) => {
  // 1. Get Content URI (required for IntentLauncher)
  const contentUri = await FileSystem.getContentUriAsync(localUri);
  console.log('[AppUpdateService] Launching installer with URI:', contentUri);

  try {
    // 2. Try IntentLauncher (Direct Install)
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
      type: APK_MIME_TYPE,
    });
    return true;
  } catch (intentError) {
    console.warn('[AppUpdateService] IntentLauncher failed, trying Sharing fallback:', intentError.message);
    
    // 3. Fallback to expo-sharing (Often works when intents are blocked)
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: APK_MIME_TYPE,
          dialogTitle: 'Install AccommoTrack Update',
          UTI: 'com.pkware.cpp.apk', // For iOS/general if needed
        });
        return true;
      }
    } catch (sharingError) {
      console.error('[AppUpdateService] Sharing fallback also failed:', sharingError.message);
    }
    
    throw intentError;
  }
};

const isLikelyInstallPermissionIssue = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('permission') ||
    message.includes('install') ||
    message.includes('unknown apps') ||
    message.includes('activity not started')
  );
};

const openUnknownAppsSettings = async () => {
  if (Platform.OS !== 'android') return false;

  const packageName =
    Constants.expoConfig?.android?.package ||
    Constants.manifest2?.extra?.expoClient?.android?.package ||
    Constants.manifest?.android?.package ||
    'com.techweave.AccommoTrack';

  try {
    await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
      data: `package:${packageName}`,
      flags: FLAG_ACTIVITY_NEW_TASK,
    });
    return true;
  } catch {
    return false;
  }
};

export const downloadAndInstallUpdate = async ({
  downloadUrl,
  onProgress,
  allowBrowserFallback = true,
} = {}) => {
  const resolvedUrl = resolveAppDownloadUrl(downloadUrl);
  if (!resolvedUrl) throw new Error('Download URL is missing.');

  if (Platform.OS !== 'android') {
    await Linking.openURL(resolvedUrl);
    return { openedExternally: true, resolvedUrl };
  }

  try {
    const destinationUri = buildDestinationUri();
    await removeExistingFile(destinationUri);

    const localUri = await downloadApkFile({
      resolvedUrl,
      destinationUri,
      onProgress,
    });

    if (!localUri) throw new Error('Failed to download update package.');

    await launchInstaller(localUri);

    return {
      openedExternally: false,
      resolvedUrl,
      localUri,
    };
  } catch (error) {
    console.error('[AppUpdateService] In-app update flow failed:', error);
    
    const isPermissionIssue = isLikelyInstallPermissionIssue(error);
    const openedInstallSettings = isPermissionIssue ? await openUnknownAppsSettings() : false;

    if (openedInstallSettings) {
      return {
        openedExternally: false,
        openedInstallSettings: true,
        resolvedUrl,
        fallbackReason: 'Please allow "Install unknown apps" then try again.',
      };
    }

    if (allowBrowserFallback) {
      try {
        await Linking.openURL(resolvedUrl);
        return {
          openedExternally: true,
          resolvedUrl,
        };
      } catch (linkError) {
        throw new Error(`Installation failed and browser fallback also failed. ${error.message}`);
      }
    }

    return {
      openedExternally: false,
      requiresManualFallback: true,
      resolvedUrl,
      fallbackReason: error.message,
    };
  }
};

