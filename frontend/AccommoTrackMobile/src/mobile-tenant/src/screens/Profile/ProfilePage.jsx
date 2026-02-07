import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { styles } from '../../../../styles/Tenant/ProfilePage.js';
import { API_BASE_URL as API_URL } from '../../../../config';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function ProfilePage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    age: '',
    phone: '',
    bio: '',
    dateOfBirth: '',
    preferences: {
      quiet: true,
      petFriendly: false,
      smoking: false,
      cooking: true,
    },
    profileImage: null,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const getAuthHeaders = async () => {
    let token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      token = await AsyncStorage.getItem('token');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}/tenant/profile`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        
        const fullName = [data.first_name, data.middle_name, data.last_name]
          .filter(Boolean)
          .join(' ');

        setProfileData(prev => ({
          ...prev,
          name: fullName || 'User',
          firstName: data.first_name || '',
          middleName: data.middle_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          age: data.age ? String(data.age) : '',
          dateOfBirth: data.tenant_profile?.date_of_birth || '',
          bio: data.tenant_profile?.notes || '',
          profileImage: data.profile_image || null,
          preferences: data.tenant_profile?.preference 
            ? JSON.parse(data.tenant_profile.preference) 
            : prev.preferences,
        }));
      } else {
        // Fallback to local storage
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          setProfileData(prev => ({
            ...prev,
            name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || 'User',
            firstName: user.first_name || '',
            middleName: user.middle_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const headers = await getAuthHeaders();
      
      // Create form data for multipart upload
      const formData = new FormData();
      
      // Parse the full name back to parts if user edited name field
      const nameParts = profileData.name.trim().split(' ');
      formData.append('first_name', profileData.firstName || nameParts[0] || '');
      formData.append('middle_name', profileData.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''));
      formData.append('last_name', profileData.lastName || nameParts[nameParts.length - 1] || '');
      formData.append('phone', profileData.phone || '');
      formData.append('notes', profileData.bio || '');
      formData.append('preference', JSON.stringify(profileData.preferences));
      
      if (profileData.dateOfBirth) {
        formData.append('date_of_birth', profileData.dateOfBirth);
      }

      const response = await fetch(`${API_URL}/tenant/profile`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => setIsEditing(false) }
        ]);
        
        // Update local storage with new user data
        if (result.user) {
          await AsyncStorage.setItem('user', JSON.stringify(result.user));
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your photo.');
        return;
      }

      // Show options
      Alert.alert(
        'Change Profile Photo',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus !== 'granted') {
                Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
                return;
              }
              
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadProfileImage(result.assets[0]);
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadProfileImage(result.assets[0]);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfileImage = async (imageAsset) => {
    try {
      setSaving(true);
      const headers = await getAuthHeaders();

      const formData = new FormData();
      
      // Get file extension from URI
      const uriParts = imageAsset.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('profile_image', {
        uri: imageAsset.uri,
        name: `profile_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      });

      // Include current user data to prevent losing other fields
      formData.append('first_name', profileData.firstName);
      formData.append('last_name', profileData.lastName);

      const response = await fetch(`${API_URL}/tenant/profile`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state with new image URL
        if (result.user?.profile_image) {
          setProfileData(prev => ({
            ...prev,
            profileImage: result.user.profile_image,
          }));
        } else {
          // Use local URI temporarily
          setProfileData(prev => ({
            ...prev,
            profileImage: imageAsset.uri,
          }));
        }

        // Update local storage
        if (result.user) {
          await AsyncStorage.setItem('user', JSON.stringify(result.user));
        }

        Alert.alert('Success', 'Profile photo updated!');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setSaving(false);
    }
  };

  const getProfileImageSource = () => {
    if (profileData.profileImage) {
      // Check if it's a remote URL or local URI
      if (profileData.profileImage.startsWith('http') || profileData.profileImage.startsWith('file://')) {
        return { uri: profileData.profileImage };
      }
      return { uri: profileData.profileImage };
    }
    // Default placeholder
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textInverse }]}>Profile</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.editButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {getProfileImageSource() ? (
              <Image source={getProfileImageSource()} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={60} color={theme.colors.primary} />
              </View>
            )}
            {isEditing && (
              <TouchableOpacity 
                style={[styles.changePhotoButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleChangePhoto}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.colors.textInverse} />
                ) : (
                  <Ionicons name="camera" size={24} color={theme.colors.textInverse} />
                )}
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
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                editable={isEditing}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.email}
                editable={false}
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholderTextColor={theme.colors.textTertiary}
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
                <Ionicons name="volume-mute" size={24} color={theme.colors.primary} />
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
                <Ionicons name="paw" size={24} color={theme.colors.primary} />
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
                <Ionicons name="ban" size={24} color={theme.colors.primary} />
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
                <Ionicons name="restaurant" size={24} color={theme.colors.primary} />
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