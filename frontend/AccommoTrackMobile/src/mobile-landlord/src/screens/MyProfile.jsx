import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStyles } from '../../../styles/Landlord/MyProfile';
import Button from '../components/Button';
import ProfileService from '../../../services/ProfileService';
import { BASE_URL } from '../../../config';
import { useTheme } from '../../../contexts/ThemeContext';

export default function MyProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await ProfileService.getProfile();
      if (response.success) {
        setUser(response.data);
        setTempUser(response.data);
        setSelectedImage(null);
      } else {
        Alert.alert('Error', response.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
  }, [fetchProfile]);

  // Handle image picker
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  // Function to handle saving changes
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await ProfileService.updateProfile({
        first_name: tempUser.first_name,
        last_name: tempUser.last_name,
        phone: tempUser.phone,
      }, selectedImage);
      
      if (response.success) {
        setUser(response.data || tempUser);
        setSelectedImage(null);
        setIsEditing(false);
        Alert.alert('Success', 'Your profile has been updated!');
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Function to cancel editing
  const handleCancel = () => {
    setTempUser(user);
    setSelectedImage(null);
    setIsEditing(false);
  };

  // Custom back button handler
  const handleBack = () => {
    if (isEditing) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Do you want to discard them?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: handleCancel }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Get profile image URL
  const getProfileImage = () => {
    if (selectedImage) {
      return selectedImage.uri;
    }
    if (user?.profile_image) {
      // If it's a relative path, add the base URL
      if (user.profile_image.startsWith('/')) {
        return `${BASE_URL}${user.profile_image}`;
      }
      return user.profile_image;
    }
    return null;
  };

  // Get initials from user name
  const getInitials = () => {
    if (!user) return '??';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase();
  };

  // Get full name
  const getFullName = () => {
    if (!user) return '';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  };

  // Define a reusable component for profile fields
  const ProfileField = ({ label, value, editable, onChangeText, iconName, keyboardType = 'default', styles }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelContainer}>
        <Ionicons name={iconName} size={20} color="#6B7280" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.fieldValue, editable && styles.fieldValueEditable]}
        value={value || ''}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={label}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButtonBg}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>

        {isEditing ? (
          <TouchableOpacity onPress={handleSave} style={styles.headerButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="save-outline" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={isEditing ? handlePickImage : null}
            disabled={!isEditing}
            activeOpacity={isEditing ? 0.7 : 1}
          >
            {getProfileImage() ? (
              <Image 
                source={{ uri: getProfileImage() }} 
                style={styles.profileAvatarImage} 
              />
            ) : (
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>{getInitials()}</Text>
              </View>
            )}
            {isEditing && (
              <View style={styles.avatarEditOverlay}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{getFullName()}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Landlord</Text>
          </View>
        </View>

        {/* Profile Details Card */}
        <View style={styles.detailsCard}>
          <ProfileField
            label="First Name"
            value={tempUser?.first_name}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, first_name: text })}
            iconName="person-outline"
            styles={styles}
          />
          <ProfileField
            label="Last Name"
            value={tempUser?.last_name}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, last_name: text })}
            iconName="person-outline"
            styles={styles}
          />
          <ProfileField
            label="Email"
            value={tempUser?.email}
            editable={false}
            iconName="mail-outline"
            styles={styles}
          />
          <ProfileField
            label="Phone Number"
            value={tempUser?.phone}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, phone: text })}
            iconName="call-outline"
            keyboardType="phone-pad"
            styles={styles}
          />
        </View>

        {/* Account Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>Account Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Ionicons 
                name={user?.is_active ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={user?.is_active ? theme.colors.primary : "#DC2626"} 
              />
              <Text style={styles.statusLabel}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}