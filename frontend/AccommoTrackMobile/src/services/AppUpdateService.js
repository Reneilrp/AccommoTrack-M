import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { WEB_BASE_URL } from '../config/index.js';

const APK_FILE_NAME = 'AccommoTrack_update.apk';
const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;
const DOWNLOAD_PROBE_TIMEOUT_MS = 12_000;

export const resolveAppDownloadUrl = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = String(WEB_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) {
    return trimmed;
  }

  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
};

const buildDestinationUri = () => {
  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new Error('No writable app directory available for update download.');
  }

  return `${baseDirectory}${APK_FILE_NAME}`;
};

const removeExistingFile = async (uri) => {
  const info = await FileSystem.getInfoAsync(uri);
  if (info?.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
};

const normalizeProgress = (writtenBytes, totalBytes) => {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return 0;
  }
  const value = writtenBytes / totalBytes;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const downloadApkFile = async ({ resolvedUrl, destinationUri, onProgress }) => {
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
    return result?.uri || '';
  }

  if (typeof FileSystem.downloadAsync === 'function') {
    const result = await FileSystem.downloadAsync(resolvedUrl, destinationUri);
    if (typeof onProgress === 'function') {
      onProgress(1);
    }
    return result?.uri || '';
  }

  throw new Error('File download API is unavailable in this build.');
};

const launchInstaller = async (contentUri) => {
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
      type: APK_MIME_TYPE,
    });
  } catch {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
      type: APK_MIME_TYPE,
    });
  }
};

const buildAndroidInstallHelpText = () => (
  'If installation is blocked, allow "Install unknown apps" for AccommoTrack in Android settings, then retry.'
);

const isLikelyInstallPermissionIssue = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('permission') ||
    message.includes('install') ||
    message.includes('package') ||
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
    '';

  if (!packageName) {
    return false;
  }

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

const withFetchTimeout = async (url, options = {}, timeoutMs = DOWNLOAD_PROBE_TIMEOUT_MS) => {
  if (typeof fetch !== 'function') {
    return { ok: true, status: 0 };
  }

  if (typeof AbortController === 'undefined') {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const assertDownloadUrlReachable = async (resolvedUrl) => {
  try {
    const headResponse = await withFetchTimeout(resolvedUrl, { method: 'HEAD' });

    if (headResponse?.ok) return;

    if (headResponse?.status === 405 || headResponse?.status === 501) {
      const getResponse = await withFetchTimeout(resolvedUrl, { method: 'GET' });
      if (getResponse?.ok) return;

      throw new Error(`Download URL responded with HTTP ${getResponse?.status || 'error'}.`);
    }

    throw new Error(`Download URL responded with HTTP ${headResponse?.status || 'error'}.`);
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('aborted') || message.includes('network request failed')) {
      throw new Error('Unable to reach the update server. Please check your internet connection and try again.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unable to verify update package URL.');
  }
};

const toActionableInstallError = (error) => {
  const base = String(error?.message || 'Unable to install update package.');
  if (isLikelyInstallPermissionIssue(error)) {
    return `${base} ${buildAndroidInstallHelpText()}`;
  }

  return base;
};

export const downloadAndInstallUpdate = async ({ downloadUrl, onProgress } = {}) => {
  const resolvedUrl = resolveAppDownloadUrl(downloadUrl);
  if (!resolvedUrl) {
    throw new Error('Download URL is missing.');
  }

  await assertDownloadUrlReachable(resolvedUrl);

  if (Platform.OS !== 'android') {
    await Linking.openURL(resolvedUrl);
    return {
      openedExternally: true,
      resolvedUrl,
    };
  }

  try {
    const destinationUri = buildDestinationUri();
    await removeExistingFile(destinationUri);

    const localUri = await downloadApkFile({
      resolvedUrl,
      destinationUri,
      onProgress,
    });

    if (!localUri) {
      throw new Error('Failed to download update package.');
    }

    const contentUri = await FileSystem.getContentUriAsync(localUri);
    await launchInstaller(contentUri);

    return {
      openedExternally: false,
      resolvedUrl,
      localUri,
      contentUri,
    };
  } catch (error) {
    // Some Android devices/ROM policies block in-app APK installation intents.
    // First try opening Unknown apps settings for this app, then fallback to browser/download manager.
    const installHelp = toActionableInstallError(error);
    const openedInstallSettings = await openUnknownAppsSettings();

    if (openedInstallSettings) {
      return {
        openedExternally: false,
        openedInstallSettings: true,
        resolvedUrl,
        fallbackReason: installHelp,
      };
    }

    try {
      await Linking.openURL(resolvedUrl);
      return {
        openedExternally: true,
        openedInstallSettings: false,
        resolvedUrl,
        fallbackReason: installHelp,
      };
    } catch {
      throw new Error(`${installHelp} Browser fallback also failed.`);
    }
  }
};
