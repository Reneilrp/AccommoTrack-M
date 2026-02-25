import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  Switch, 
  Image, 
  StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../../contexts/ThemeContext';
import homeStyles from '../../../../styles/Tenant/HomePage.js';
import { getStyles } from '../../../../styles/Tenant/ProfilePage.js';
import ProfileService from '../../../../services/ProfileService';

export default function ProfilePage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileData, setProfileData] = useState({
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

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const res = await ProfileService.getProfile();

      if (res.success) {
        const data = res.data;
        
        // Calculate age from DOB if age is missing but DOB exists
        let calculatedAge = data.age ? String(data.age) : '';
        if (!calculatedAge && data.tenant_profile?.date_of_birth) {
            calculatedAge = String(calculateAge(new Date(data.tenant_profile.date_of_birth)));
        }

        setProfileData(prev => ({
          ...prev,
          firstName: data.first_name || '',
          middleName: data.middle_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          age: calculatedAge,
          dateOfBirth: data.tenant_profile?.date_of_birth || '',
          bio: data.tenant_profile?.notes || '',
          profileImage: data.profile_image || null,
          preferences: data.tenant_profile?.preference 
            ? (typeof data.tenant_profile.preference === 'string' ? JSON.parse(data.tenant_profile.preference) : data.tenant_profile.preference)
            : prev.preferences,
        }));
      } else {
        // Fallback to local storage
        const userString = await AsyncStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          setProfileData(prev => ({
            ...prev,
            firstName: user.first_name || '',
            middleName: user.middle_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
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

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || (profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : new Date());
    setShowDatePicker(Platform.OS === 'ios');
    
    if (event.type === 'set' || Platform.OS === 'ios') {
        const age = calculateAge(currentDate);
        if (age < 18) {
             Alert.alert('Age Restriction', 'You must be at least 18 years old.');
             return;
        }
        
        const formattedDate = currentDate.toISOString().split('T')[0];
        setProfileData(prev => ({
            ...prev,
            dateOfBirth: formattedDate,
            age: String(age)
        }));
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
      
      const updateData = {
        first_name: profileData.firstName,
        middle_name: profileData.middleName,
        last_name: profileData.lastName,
        phone: profileData.phone || '',
        notes: profileData.bio || '',
        preference: profileData.preferences,
        date_of_birth: profileData.dateOfBirth || null,
      };

      const res = await ProfileService.updateProfile(updateData);

      if (res.success) {
        const u = res.data;
        const tp = u.tenant_profile || {};
        
        setProfileData(prev => ({
          ...prev,
          firstName: u.first_name || '',
          middleName: u.middle_name || '',
          lastName: u.last_name || '',
          phone: u.phone || '',
          bio: tp.notes || '',
          dateOfBirth: tp.date_of_birth || '',
          preferences: typeof tp.preference === 'string' ? JSON.parse(tp.preference) : (tp.preference || prev.preferences)
        }));

        await AsyncStorage.setItem('user', JSON.stringify(u));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', res.error || 'Failed to update profile');
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your photo.');
        return;
      }

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
      
      const updateData = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
      };

      const res = await ProfileService.updateProfile(updateData, imageAsset);

      if (res.success) {
        const u = res.data;
        setProfileData(prev => ({
          ...prev,
          profileImage: u.profile_image || imageAsset.uri,
        }));

        await AsyncStorage.setItem('user', JSON.stringify(u));
        Alert.alert('Success', 'Profile photo updated!');
      } else {
        Alert.alert('Error', res.error || 'Failed to upload photo');
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
      if (typeof profileData.profileImage === 'string' && (profileData.profileImage.startsWith('http') || profileData.profileImage.startsWith('file://'))) {
        return { uri: profileData.profileImage };
      }
      return { uri: profileData.profileImage };
    }
    return null;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ backgroundColor: theme.colors.primary }} edges={['top']}>
          <View style={[homeStyles.header, { backgroundColor: theme.colors.primary }]}> 
            <View style={homeStyles.headerSide}>
              <TouchableOpacity style={homeStyles.headerIcon} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
              </TouchableOpacity>
            </View>
            <View style={homeStyles.headerCenter}>
              <Text style={[homeStyles.headerTitle, { color: theme.colors.textInverse }]}>Profile</Text>
            </View>
            <View style={homeStyles.headerSide} />
          </View>
        </SafeAreaView>
        <View style={localStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[localStyles.loadingText, { color: theme.colors.textSecondary }]}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header wrapped in its own SafeAreaView to ensure full width and correct positioning */}
      <SafeAreaView style={{ backgroundColor: theme.colors.primary }} edges={['top']}>
        <View style={[homeStyles.header, { backgroundColor: theme.colors.primary }]}> 
          <View style={homeStyles.headerSide}>
            <TouchableOpacity 
              style={homeStyles.headerIcon}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
          <View style={homeStyles.headerCenter}>
            <Text style={[homeStyles.headerTitle, { color: theme.colors.textInverse }]}>Profile</Text>
          </View>
          <View style={homeStyles.headerSide}>
            <TouchableOpacity 
              style={homeStyles.headerIcon}
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
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <Ionicons name={isEditing ? "save-outline" : "create-outline"} size={22} color={theme.colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={[styles.photoSection, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={styles.photoContainer}>
            {getProfileImageSource() ? (
              <Image source={getProfileImageSource()} style={[styles.profilePhoto, { borderColor: theme.colors.primary }]} />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderColor: theme.colors.primary }]}>
                <Ionicons name="person" size={60} color={theme.colors.primary} />
              </View>
            )}
            {isEditing && (
              <TouchableOpacity 
                style={[styles.changePhotoButton, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]}
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
            <Text style={[styles.userName, { color: theme.colors.text }]}>
                {[profileData.firstName, profileData.lastName].filter(Boolean).join(' ')}
            </Text>
          )}
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>First Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !isEditing && styles.inputDisabled]}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                editable={isEditing}
                placeholder="First Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          {/* Middle Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Middle Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !isEditing && styles.inputDisabled]}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.middleName}
                onChangeText={(text) => handleInputChange('middleName', text)}
                editable={isEditing}
                placeholder="Middle Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Last Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !isEditing && styles.inputDisabled]}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                editable={isEditing}
                placeholder="Last Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled, { borderColor: theme.colors.border }]}>
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

          {/* Date of Birth & Age */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Date of Birth</Text>
            <TouchableOpacity
              onPress={() => isEditing && setShowDatePicker(true)}
              style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !isEditing && styles.inputDisabled]}
              disabled={!isEditing}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <Text style={[styles.input, { color: theme.colors.text, paddingTop: Platform.OS === 'ios' ? 0 : 4 }]}>
                {profileData.dateOfBirth ? profileData.dateOfBirth : 'Select Date of Birth'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker
                    value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Age</Text>
            <View style={[styles.inputContainer, styles.inputDisabled, { borderColor: theme.colors.border }]}>
              <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.age}
                editable={false}
                placeholder="Age"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !isEditing && styles.inputDisabled]}>
              <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
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
            <Text style={[styles.label, { color: theme.colors.text }]}>About Me</Text>
            <View style={[styles.textAreaContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, !isEditing && styles.inputDisabled]}>
              <TextInput
                style={[styles.textArea, { color: theme.colors.text }]}
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferences</Text>
            
            <View style={[styles.preferenceItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="volume-mute" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text style={[styles.preferenceTitle, { color: theme.colors.text }]}>Quiet Environment</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>I prefer a peaceful place</Text>
                </View>
              </View>
              <Switch
                value={profileData.preferences.quiet}
                onValueChange={() => handlePreferenceToggle('quiet')}
                disabled={!isEditing}
                trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (profileData.preferences.quiet ? '#FFFFFF' : '#F4F3F4')}
              />
            </View>

            <View style={[styles.preferenceItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="paw" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text style={[styles.preferenceTitle, { color: theme.colors.text }]}>Pet Friendly</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>I have or plan to have pets</Text>
                </View>
              </View>
              <Switch
                value={profileData.preferences.petFriendly}
                onValueChange={() => handlePreferenceToggle('petFriendly')}
                disabled={!isEditing}
                trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (profileData.preferences.petFriendly ? '#FFFFFF' : '#F4F3F4')}
              />
            </View>

            <View style={[styles.preferenceItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="ban" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text style={[styles.preferenceTitle, { color: theme.colors.text }]}>No Smoking</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>I prefer smoke-free areas</Text>
                </View>
              </View>
              <Switch
                value={profileData.preferences.smoking}
                onValueChange={() => handlePreferenceToggle('smoking')}
                disabled={!isEditing}
                trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (profileData.preferences.smoking ? '#FFFFFF' : '#F4F3F4')}
              />
            </View>

            <View style={[styles.preferenceItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="restaurant" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text style={[styles.preferenceTitle, { color: theme.colors.text }]}>Cooking Allowed</Text>
                  <Text style={[styles.preferenceDescription, { color: theme.colors.textSecondary }]}>I like to cook my own meals</Text>
                </View>
              </View>
              <Switch
                value={profileData.preferences.cooking}
                onValueChange={() => handlePreferenceToggle('cooking')}
                disabled={!isEditing}
                trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : (profileData.preferences.cooking ? '#FFFFFF' : '#F4F3F4')}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
    },
});
