import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext.jsx';

const BlockedUserModal = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleContactSupport = () => {
    onClose();
    // Use the theme primary color for navigation context if needed
    navigation.navigate('HelpSupport');
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 25, width: '85%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, borderWidth: theme.isDark ? 1 : 0, borderColor: theme.colors.border }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.isDark ? theme.colors.errorLight : '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <Ionicons name="shield-half-outline" size={45} color={theme.colors.error} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8, textAlign: 'center' }}>Account Blocked</Text>
          <Text style={{ fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 24 }}>
            Your account has been blocked by the administrator. Please contact support for assistance.
          </Text>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity 
              onPress={handleContactSupport}
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              accessibilityLabel="Contact Support"
              accessibilityRole="button"
            >
              <Ionicons name="mail-outline" size={20} color={theme.colors.textInverse} />
              <Text style={[styles.buttonText, { color: theme.colors.textInverse }]}>Contact Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={onClose}
              style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundSecondary }]}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  secondaryButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default BlockedUserModal;
