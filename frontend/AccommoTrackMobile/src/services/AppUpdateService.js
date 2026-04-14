import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
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

export const downloadAndInstallUpdate = async ({ downloadUrl, onProgress } = {}) => {
  const resolvedUrl = resolveAppDownloadUrl(downloadUrl);
  if (!resolvedUrl) {
    throw new Error('Download URL is missing.');
  }

  if (Platform.OS !== 'android') {
    await Linking.openURL(resolvedUrl);
    return {
      openedExternally: true,
      resolvedUrl,
    };
  }

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
};
