import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../../../styles/Tenant/ProfilePage.js';
import LeadDev from '../../../mobile-landlord/src/Dashboard/DevTeam/assets/LeadDeveloper.jpeg';

export default function ProfilePage() {
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: '25',
    phone: '+63 912 345 6789',
    bio: 'Looking for a quiet and comfortable place near the university.',
    preferences: {
      quiet: true,
      petFriendly: false,
      smoking: false,
      cooking: true,
    },
    profileImage: LeadDev,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        setProfileData(prev => ({
          ...prev,
          name: user.first_name || user.middle_name || user.last_name 
            ? [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') 
            : prev.name,
          email: user.email || prev.email,
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceToggle = (preference) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: !prev.preferences[preference],
      },
    }));
  };

  const handleSave = () => {
    Alert.alert(
      'Success',
      'Profile updated successfully!',
      [{ text: 'OK', onPress: () => setIsEditing(false) }]
    );
    console.log('Saving profile:', profileData);
  };

  const handleChangePhoto = () => {
    Alert.alert('Change Photo', 'Photo picker will be implemented here');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            if (isEditing) {
              handleSave();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            <Image source={profileData.profileImage} style={styles.profilePhoto} />
            {isEditing && (
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={handleChangePhoto}
              >
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          {!isEditing && (
            <Text style={styles.userName}>{profileData.name}</Text>
          )}
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputContainer, !isEditing && styles.inputDisabled]}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profileData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                editable={isEditing}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profileData.email}
                editable={false}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          {/* Age */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={[styles.inputContainer, !isEditing && styles.inputDisabled]}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profileData.age}
                onChangeText={(text) => handleInputChange('age', text)}
                editable={isEditing}
                keyboardType="numeric"
                placeholder="Enter your age"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputContainer, !isEditing && styles.inputDisabled]}>
              <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profileData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>About Me</Text>
            <View style={[styles.textAreaContainer, !isEditing && styles.inputDisabled]}>
              <TextInput
                style={styles.textArea}
                value={profileData.bio}
                onChangeText={(text) => handleInputChange('bio', text)}
                editable={isEditing}
                multiline
                numberOfLines={4}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.preferencesSection}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={() => isEditing && handlePreferenceToggle('quiet')}
              disabled={!isEditing}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons name="volume-mute" size={24} color="#4CAF50" />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Quiet Environment</Text>
                  <Text style={styles.preferenceDescription}>I prefer a peaceful place</Text>
                </View>
              </View>
              <View style={[
                styles.toggle,
                profileData.preferences.quiet && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleCircle,
                  profileData.preferences.quiet && styles.toggleCircleActive
                ]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={() => isEditing && handlePreferenceToggle('petFriendly')}
              disabled={!isEditing}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons name="paw" size={24} color="#4CAF50" />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Pet Friendly</Text>
                  <Text style={styles.preferenceDescription}>I have or plan to have pets</Text>
                </View>
              </View>
              <View style={[
                styles.toggle,
                profileData.preferences.petFriendly && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleCircle,
                  profileData.preferences.petFriendly && styles.toggleCircleActive
                ]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={() => isEditing && handlePreferenceToggle('smoking')}
              disabled={!isEditing}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons name="ban" size={24} color="#4CAF50" />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>No Smoking</Text>
                  <Text style={styles.preferenceDescription}>I prefer smoke-free areas</Text>
                </View>
              </View>
              <View style={[
                styles.toggle,
                profileData.preferences.smoking && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleCircle,
                  profileData.preferences.smoking && styles.toggleCircleActive
                ]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.preferenceItem}
              onPress={() => isEditing && handlePreferenceToggle('cooking')}
              disabled={!isEditing}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons name="restaurant" size={24} color="#4CAF50" />
                <View style={styles.preferenceText}>
                  <Text style={styles.preferenceTitle}>Cooking Allowed</Text>
                  <Text style={styles.preferenceDescription}>I like to cook my own meals</Text>
                </View>
              </View>
              <View style={[
                styles.toggle,
                profileData.preferences.cooking && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleCircle,
                  profileData.preferences.cooking && styles.toggleCircleActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}