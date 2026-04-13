import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const ForceUpdateModal = ({ visible, downloadUrl, latestVersion, required = false, onLater }) => {
  const { theme } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setDownloading(true);
    setProgress(0);

    try {
      // 1. Setup the download tracker
      const callback = downloadProgress => {
        const currentProgress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setProgress(currentProgress);
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        FileSystem.documentDirectory + 'AccommoTrack_update.apk',
        {},
        callback
      );

      // 2. Execute the download
      const { uri } = await downloadResumable.downloadAsync();

      // 3. Convert local file URI to content URI (Required for Android 7+)
      const contentUri = await FileSystem.getContentUriAsync(uri);

      // 4. Trigger the Android Package Installer natively
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

    } catch (error) {
      console.error("APK Sideloading failed:", error);
      // Fallback: If intent fails or OS blocks it unexpectedly, open browser
      Linking.openURL(downloadUrl).catch(err => console.error("Couldn't open link", err));
    } finally {
      setDownloading(false);
    }
  };

  const handleClose = () => {
    if (!required && typeof onLater === 'function' && !downloading) {
      onLater();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={[styles.container, { backgroundColor: theme.colors.card || '#ffffff' }]}>
              {!required && !downloading && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}

              <View style={styles.iconContainer}>
                <Ionicons name="cloud-download" size={48} color={theme.colors.primary} />
              </View>

              <Text style={[styles.title, { color: theme.colors.text }]}>
                {required ? 'Update Required' : 'Update Available'}
              </Text>

              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                {required
                  ? `A new version of AccommoTrack (${latestVersion}) is available. Please update the app to continue using it.`
                  : `A new version of AccommoTrack (${latestVersion}) is available. You can update now or later from Settings.`}
              </Text>

              {/* Progress UI injected here */}
              {downloading ? (
                <View style={styles.progressContainer}>
                  <Text style={[styles.progressText, { color: theme.colors.text }]}>
                    Downloading... {Math.round(progress * 100)}%
                  </Text>
                  <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.border }]}>
                    <View style={[styles.progressBarFill, { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }]} />
                  </View>
                </View>
              ) : (
                <View style={[styles.actions, !required ? styles.actionsRow : null]}>
                  {!required ? (
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.border }]}
                      onPress={onLater}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>Later</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.primary, flex: required ? 0 : 1 }]}
                    onPress={handleDownload}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Download Update</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
});

export default ForceUpdateModal;