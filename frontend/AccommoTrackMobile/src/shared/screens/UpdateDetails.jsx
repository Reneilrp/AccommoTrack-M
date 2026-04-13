import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useAppVersion } from '../hooks/useAppVersion.js';

export default function UpdateDetails({ navigation }) {
  const { theme } = useTheme();
  const { otaUpdateId, otaCreatedAt, otaChannel, currentVersion } = useAppVersion();

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    container: {
      padding: 20,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 16,
    },
    infoRow: {
      marginBottom: 20,
    },
    infoLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    updateIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    releaseNotesTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
    },
    releaseNotesText: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    footer: {
      padding: 20,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.updateIcon}>
              <Ionicons name="cloud-done" size={32} color={theme.colors.primary} />
            </View>
            <Text style={[styles.infoValue, { textAlign: 'center', fontSize: 20, marginBottom: 8 }]}>
              System Up to Date
            </Text>
            <Text style={[styles.infoLabel, { textAlign: 'center', marginBottom: 20 }]}>
              You are running the latest OTA version
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Native App Version</Text>
              <Text style={styles.infoValue}>{currentVersion}</Text>
            </View>

            {otaUpdateId && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>EAS Update ID</Text>
                <Text style={styles.infoValue}>{otaUpdateId}</Text>
              </View>
            )}

            {otaCreatedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Released On</Text>
                <Text style={styles.infoValue}>{otaCreatedAt}</Text>
              </View>
            )}

            {otaChannel && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Update Channel</Text>
                <Text style={styles.infoValue}>{otaChannel}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.releaseNotesTitle}>What's New</Text>
            <Text style={styles.releaseNotesText}>
              • Performance improvements and bug fixes.{"\n"}
              • UI enhancements for a better user experience.{"\n"}
              • Security updates and system stability improvements.{"\n"}
              {"\n"}
              This update was delivered automatically via Expo EAS Updates (Over-The-Air).
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 AccommoTrack. All rights reserved.{"\n"}
              Build with Expo EAS
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
