import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');
const sideWidth = Math.max(56, Math.round(width * 0.05));

export default function Header({ onMenuPress, title, onBack, rightElement }) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ backgroundColor: COLORS.primary }} edges={['top']}>
      <View style={styles.header}> 
        <View style={styles.headerSide}>
          {onBack ? (
            <TouchableOpacity style={styles.headerIcon} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity style={styles.headerIcon} onPress={onMenuPress}>
              <Ionicons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.headerSide}>
          {rightElement || null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerIcon: {
    padding: 8,
  },
  headerSide: {
    width: sideWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
