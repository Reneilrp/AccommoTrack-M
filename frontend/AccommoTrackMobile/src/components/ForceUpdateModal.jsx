import React from 'react';
import { View, Text, Modal, TouchableOpacity, Linking, StyleSheet, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const ForceUpdateModal = ({ visible, downloadUrl, latestVersion }) => {
  const { theme } = useTheme();
  
  const handleDownload = () => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl).catch(err => console.error("Couldn't exacted link", err));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      // Setting onRequestClose to empty prevents hardware back button from closing it on Android
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download" size={48} color={theme.colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Update Required
          </Text>
          
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            A new version of AccommoTrack ({latestVersion}) is available. Please update the app to continue using it.
          </Text>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Download Update</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForceUpdateModal;
