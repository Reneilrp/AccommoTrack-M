import React, { useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from 'expo-image-picker';
import { getStyles } from '../../../../../styles/Landlord/MyProfile.js';
import ProfileService from '../../../../../services/ProfileService.js';
import { showError, showSuccess, showWarning } from '../../../../../utils/toast.js';
import { BASE_URL } from '../../../../../config/index.js';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import {
  landlordQueryKeys,
  refetchLandlordQueries,
  useLandlordFocusRefetch,
  useLandlordRefreshHandler,
} from '../../../hooks/useLandlordQueryHelpers.js';
import { hasAnyValidationError, normalizeNameInput, validateProfileNameField } from '../../../../../utils/nameValidation.js';

export default function MyProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [nameErrors, setNameErrors] = useState({ first_name: '', last_name: '' });
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: landlordQueryKeys.myProfile(),
    queryFn: async () => {
      const response = await ProfileService.getProfile();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load profile');
      }

      return response.data || null;
    },
    placeholderData: (previousData) => previousData,
  });

  const loading = profileQuery.isPending && !profileQuery.data;
  const fetchError = profileQuery.error?.message || '';
  const refetchProfile = profileQuery.refetch;
  const profileRefetchers = useMemo(() => [refetchProfile], [refetchProfile]);

  useLandlordFocusRefetch({ refetchers: profileRefetchers });

  const handleRefresh = useLandlordRefreshHandler({
    setRefreshing,
    refetchers: profileRefetchers,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setUser(profileQuery.data);
    setTempUser(profileQuery.data);
    setSelectedImage(null);
    setNameErrors({ first_name: '', last_name: '' });
  }, [profileQuery.data]);

  useEffect(() => {
    if (!fetchError) return;
    console.error('Error fetching profile:', fetchError);
    showError('Error', fetchError);
  }, [fetchError]);

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate =
      selectedDate ||
      (tempUser?.date_of_birth
        ? new Date(tempUser.date_of_birth)
        : new Date());
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "set" || Platform.OS === "ios") {
      const age = calculateAge(currentDate);
      if (age < 21) {
        showWarning("Age Restriction", "You must be at least 21 years old.");
        return;
      }

      const formattedDate = currentDate.toISOString().split("T")[0];
      setTempUser((prev) => ({
        ...prev,
        date_of_birth: formattedDate,
      }));
    }
  };

  // Handle image picker
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showWarning('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
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

  const handleNameChange = (field, value) => {
    const normalizedValue = normalizeNameInput(value);
    const label = field === 'first_name' ? 'First name' : 'Last name';

    setNameErrors((prev) => ({
      ...prev,
      [field]: validateProfileNameField(normalizedValue, { required: true, label }),
    }));

    setTempUser({ ...tempUser, [field]: normalizedValue });
  };

  // Function to handle saving changes
  const handleSave = async () => {
    const nextNameErrors = {
      first_name: validateProfileNameField(tempUser?.first_name, { required: true, label: 'First name' }),
      last_name: validateProfileNameField(tempUser?.last_name, { required: true, label: 'Last name' }),
    };

    setNameErrors(nextNameErrors);

    if (hasAnyValidationError(nextNameErrors)) {
      showWarning('Validation Error', 'Please fix the name fields before saving.');
      return;
    }

    const normalizedFirstName = normalizeNameInput(tempUser.first_name);
    const normalizedLastName = normalizeNameInput(tempUser.last_name);

    setSaving(true);
    try {
      const response = await ProfileService.updateProfile({
        first_name: normalizedFirstName,
        middle_name: tempUser.middle_name?.trim() || '',
        last_name: normalizedLastName,
        phone: tempUser.phone?.trim() || '',
        sex: tempUser.sex || null,
        identified_as: tempUser.identified_as || null,
        date_of_birth: tempUser.date_of_birth || null,
      }, selectedImage);

      if (response.success) {
        const updatedUser = response.data || tempUser;
        setUser(updatedUser);
        setTempUser(updatedUser);
        queryClient.setQueryData(landlordQueryKeys.myProfile(), updatedUser);

        // Persist updated user data to AsyncStorage
        try {
          const stored = await AsyncStorage.getItem('user');
          if (stored) {
            const parsed = JSON.parse(stored);
            const newUserObj = { ...parsed, ...updatedUser };
            await AsyncStorage.setItem('user', JSON.stringify(newUserObj));
          }
        } catch (e) {
          console.error('Error persisting user update:', e);
        }

        queryClient.setQueryData(landlordQueryKeys.myProfile(), updatedUser);
        setSelectedImage(null);
        setIsEditing(false);
        await refetchLandlordQueries([refetchProfile]);
        showSuccess('Success', 'Your profile has been updated!');
      } else {
        showError('Error', response.error || 'Failed to update profile');
      }
    } catch (_error) {
      showError('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Function to cancel editing
  const handleCancel = () => {
    setTempUser(user);
    setSelectedImage(null);
    setNameErrors({ first_name: '', last_name: '' });
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
  const ProfileField = ({ label, value, editable, onChangeText, iconName, keyboardType = 'default', maxLength, styles, errorText = '' }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelContainer}>
        <Ionicons name={iconName} size={20} color="#6B7280" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={[
          styles.fieldValue,
          editable && styles.fieldValueEditable,
          errorText ? styles.fieldValueError : null,
        ]}
        value={value || ''}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={label}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
      {errorText ? <Text style={styles.fieldErrorText}>{errorText}</Text> : null}
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
            onChangeText={(text) => handleNameChange('first_name', text)}
            iconName="person-outline"
            maxLength={100}
            styles={styles}
            errorText={nameErrors.first_name}
          />
          <ProfileField
            label="Last Name"
            value={tempUser?.last_name}
            editable={isEditing}
            onChangeText={(text) => handleNameChange('last_name', text)}
            iconName="person-outline"
            maxLength={100}
            styles={styles}
            errorText={nameErrors.last_name}
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
            maxLength={20}
            styles={styles}
          />

          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelContainer}>
              <Ionicons name="transgender-outline" size={20} color="#6B7280" />
              <Text style={styles.fieldLabel}>Sex</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!isEditing) return;
                Alert.alert("Sex", "Choose your sex", [
                  { text: "Male", onPress: () => setTempUser({ ...tempUser, sex: "male" }) },
                  { text: "Female", onPress: () => setTempUser({ ...tempUser, sex: "female" }) },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
              disabled={!isEditing}
              style={[styles.fieldValue, isEditing && styles.fieldValueEditable]}
            >
              <Text style={{ color: tempUser?.sex ? theme.colors.text : "#9CA3AF", fontSize: 16, textTransform: "capitalize" }}>
                {tempUser?.sex ? tempUser.sex : "Not set"}
              </Text>
            </TouchableOpacity>
          </View>

          <ProfileField
            label="Pronouns (e.g. He/Him)"
            value={tempUser?.identified_as}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, identified_as: text })}
            iconName="person-outline"
            maxLength={50}
            styles={styles}
          />

          <View style={styles.fieldContainer}>
            <View style={styles.fieldLabelContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.fieldLabel}>Date of Birth</Text>
            </View>
            <TouchableOpacity
              onPress={() => isEditing && setShowDatePicker(true)}
              disabled={!isEditing}
              style={[styles.fieldValue, isEditing && styles.fieldValueEditable]}
            >
              <Text style={{ color: tempUser?.date_of_birth ? theme.colors.text : "#9CA3AF", fontSize: 16 }}>
                {tempUser?.date_of_birth ? formatDateForDisplay(tempUser.date_of_birth) : "Select Date of Birth"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={
                  tempUser?.date_of_birth
                    ? new Date(tempUser.date_of_birth)
                    : new Date(new Date().setFullYear(new Date().getFullYear() - 20))
                }
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 20))}
              />
            )}
          </View>
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