import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const ForceUpdateModal = ({ visible, downloadUrl, latestVersion, required = false, onLater }) => {
  const { theme } = useTheme();
  
  const handleDownload = () => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl).catch(err => console.error("Couldn't exacted link", err));
    }
  };

  const handleClose = () => {
    if (!required && typeof onLater === 'function') {
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
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor: theme.colors.card || '#ffffff' }]}>
              {!required && (
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
});

export default ForceUpdateModal;
