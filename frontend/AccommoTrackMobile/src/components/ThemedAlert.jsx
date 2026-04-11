import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useUIState } from '../contexts/UIStateContext.jsx';

const { width } = Dimensions.get('window');

const ThemedAlert = () => {
  const { theme } = useTheme();
  const uiContext = useUIState();
  const uiState = uiContext?.uiState || {};
  const hideAlert = uiContext?.hideAlert || (() => {});
  const showAlert = uiContext?.showAlert || (() => {});
  const alert = uiState?.alert || {
    visible: false,
    title: '',
    message: '',
    buttons: [],
    options: {},
  };

  useEffect(() => {
    const originalAlert = Alert.alert;

    Alert.alert = (title, message, buttons = [], options = {}) => {
      showAlert(
        title ?? '',
        message ?? '',
        Array.isArray(buttons) ? buttons : [],
        options && typeof options === 'object' ? options : {},
      );
    };

    return () => {
      Alert.alert = originalAlert;
    };
  }, [showAlert]);

  const handleDismiss = useCallback(() => {
    hideAlert();
    if (alert?.options?.onDismiss && typeof alert.options.onDismiss === 'function') {
      setTimeout(alert.options.onDismiss, 100);
    }
  }, [alert?.options, hideAlert]);

  if (!alert.visible) return null;

  const handleButtonPress = (callback) => {
    hideAlert();
    if (callback && typeof callback === 'function') {
      // Small delay to ensure modal is closed before next action (like navigation)
      setTimeout(callback, 100);
    }
  };

  const isCancelable = alert?.options?.cancelable === true;

  const defaultButtons = [{ text: 'OK', onPress: () => {} }];
  const buttons = alert.buttons && alert.buttons.length > 0 ? alert.buttons : defaultButtons;

  return (
    <Modal
      transparent
      visible={alert.visible}
      animationType="fade"
      onRequestClose={() => {
        if (isCancelable) {
          handleDismiss();
        }
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={() => {
          if (isCancelable) {
            handleDismiss();
          }
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[
            styles.alertCard, 
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}>
            {alert.title ? (
              <Text style={[styles.title, { color: theme.colors.text }]}> 
                {alert.title}
              </Text>
            ) : null}
            
            <Text style={[styles.message, { color: theme.colors.textSecondary }]}> 
              {alert.message}
            </Text>

            <View style={[styles.buttonRow, buttons.length > 2 ? styles.buttonColumn : null]}>
              {buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                
                let textColor = theme.colors.primary;
                if (isDestructive) textColor = theme.colors.error;
                if (isCancel) textColor = theme.colors.textSecondary;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      buttons.length > 2 ? styles.columnButton : null,
                      index > 0 && buttons.length <= 2 ? { borderLeftWidth: 1, borderLeftColor: theme.colors.border } : null,
                      index > 0 && buttons.length > 2 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : null,
                    ]}
                    onPress={() => handleButtonPress(btn.onPress)}
                  >
                    <Text style={[
                      styles.buttonText, 
                      { color: textColor, fontWeight: isCancel ? 'normal' : '600' }
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  alertCard: {
    width: Math.min(width * 0.85, 340),
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    marginBottom: 8
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    lineHeight: 20
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)', // fallback if theme border is too light
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnButton: {
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
  }
});

export default ThemedAlert;
