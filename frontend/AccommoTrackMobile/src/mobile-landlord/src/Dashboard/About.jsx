import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/About';

export default function About({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* About App Card */}
        <View style={styles.card}>
          <View style={styles.tempScreenContent}>
            <Ionicons name="information-circle-outline" size={60} color="#4CAF50" />
            <Text style={styles.tempTextBold}>AccommoTrack</Text>
            <Text style={styles.tempTextNormal}>
              AccommoTrack is a dormitory management system designed to help landlords
              and tenants manage rooms, bookings, and communication seamlessly.
            </Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application Info</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="albums-outline" size={22} color="#4CAF50" />
                <Text style={styles.settingLabel}>Version</Text>
              </View>
              <Text style={styles.settingLabel}>1.0.0</Text>
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="calendar-outline" size={22} color="#4CAF50" />
                <Text style={styles.settingLabel}>Last Updated</Text>
              </View>
              <Text style={styles.settingLabel}>November 2025</Text>
            </View>
          </View>
        </View>

        {/* Developer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developed By</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => navigation.navigate('DevTeam')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="person-circle-outline" size={22} color="#4CAF50" />
                <Text style={styles.settingLabel}>AccommoTrack Dev Team</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#666" />
            </TouchableOpacity>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail-outline" size={22} color="#4CAF50" />
                <Text style={styles.settingLabel}>support@accommotrack.com</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>© 2025 AccommoTrack. All rights reserved.</Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}