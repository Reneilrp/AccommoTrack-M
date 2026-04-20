import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { downloadAndInstallUpdate, resolveAppDownloadUrl } from '../AppUpdateService.js';

jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'android',
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///app/',
  createDownloadResumable: jest.fn(),
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getContentUriAsync: jest.fn(),
}));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      android: {
        package: 'com.techweave.AccommoTrack',
      },
    },
    manifest2: {},
    manifest: {},
  },
}));

jest.mock('../../config/index.js', () => ({
  WEB_BASE_URL: 'https://accommotrack.me',
}));

describe('AppUpdateService (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    FileSystem.getInfoAsync.mockResolvedValue({ exists: false });
    FileSystem.getContentUriAsync.mockResolvedValue('content://app/AccommoTrack_update.apk');
  });

  it('resolves relative download path against WEB_BASE_URL', () => {
    expect(resolveAppDownloadUrl('/downloads/AccommoTrack.apk')).toBe(
      'https://accommotrack.me/downloads/AccommoTrack.apk',
    );
  });

  it('downloads APK and launches Android installer intent in-app', async () => {
    const downloadAsync = jest
      .fn()
      .mockResolvedValue({ uri: 'file:///app/AccommoTrack_update.apk' });

    FileSystem.createDownloadResumable.mockReturnValue({
      downloadAsync,
    });

    IntentLauncher.startActivityAsync.mockResolvedValue(undefined);

    const result = await downloadAndInstallUpdate({
      downloadUrl: 'https://accommotrack.me/downloads/AccommoTrack.apk',
    });

    expect(downloadAsync).toHaveBeenCalledTimes(1);
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      'android.intent.action.INSTALL_PACKAGE',
      expect.objectContaining({
        data: 'content://app/AccommoTrack_update.apk',
      }),
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        openedExternally: false,
      }),
    );
  });

  it('opens Unknown Apps settings when installer fails with permission issue', async () => {
    const downloadAsync = jest
      .fn()
      .mockResolvedValue({ uri: 'file:///app/AccommoTrack_update.apk' });

    FileSystem.createDownloadResumable.mockReturnValue({
      downloadAsync,
    });

    IntentLauncher.startActivityAsync
      .mockRejectedValueOnce(new Error('Permission denied by package installer'))
      .mockRejectedValueOnce(new Error('Permission denied by package installer'))
      .mockResolvedValueOnce(undefined);

    const result = await downloadAndInstallUpdate({
      downloadUrl: 'https://accommotrack.me/downloads/AccommoTrack.apk',
    });

    expect(IntentLauncher.startActivityAsync).toHaveBeenNthCalledWith(
      3,
      'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
      expect.objectContaining({
        data: 'package:com.techweave.AccommoTrack',
      }),
    );
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        openedExternally: false,
        openedInstallSettings: true,
      }),
    );
  });

  it('does not auto-open browser when Android in-app install fails', async () => {
    const downloadAsync = jest.fn().mockRejectedValue(new Error('Network unreachable'));

    FileSystem.createDownloadResumable.mockReturnValue({
      downloadAsync,
    });

    const result = await downloadAndInstallUpdate({
      downloadUrl: 'https://accommotrack.me/downloads/AccommoTrack.apk',
    });

    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        openedExternally: false,
        requiresManualFallback: true,
      }),
    );
  });

  it('can still open browser fallback when explicitly enabled', async () => {
    const downloadAsync = jest.fn().mockRejectedValue(new Error('Network unreachable'));

    FileSystem.createDownloadResumable.mockReturnValue({
      downloadAsync,
    });

    Linking.openURL.mockResolvedValue(undefined);

    const result = await downloadAndInstallUpdate({
      downloadUrl: 'https://accommotrack.me/downloads/AccommoTrack.apk',
      allowBrowserFallback: true,
    });

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://accommotrack.me/downloads/AccommoTrack.apk',
    );
    expect(result).toEqual(
      expect.objectContaining({
        openedExternally: true,
      }),
    );
  });
});
