import React, { useState, useEffect } from "react";
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
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../../../contexts/ThemeContext.jsx";
import { getStyles } from "../../../../styles/Tenant/ProfilePage.js";
import ProfileService from "../../../../services/ProfileService.js";
import Header from "../../components/Header.jsx";

export default function ProfilePage() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    age: "",
    phone: "",
    bio: "",
    gender: "",
    identifiedAs: "",
    dateOfBirth: "",
    currentAddress: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    preferences: {
      room_preference: "",
      lifestyle_notes: "",
      smoking: "no",
      pets: "no",
      budget_range: "",
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
        let calculatedAge = data.age ? String(data.age) : "";
        if (!calculatedAge && data.date_of_birth) {
          calculatedAge = String(
            calculateAge(new Date(data.date_of_birth)),
          );
        }

        setProfileData((prev) => ({
          ...prev,
          firstName: data.first_name || "",
          middleName: data.middle_name || "",
          lastName: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          gender: data.gender || "",
          identifiedAs: data.identified_as || "",
          age: calculatedAge,
          dateOfBirth: data.date_of_birth || "",
          bio: data.tenant_profile?.notes || "",
          currentAddress: data.tenant_profile?.current_address || "",
          emergencyContactName:
            data.tenant_profile?.emergency_contact_name || "",
          emergencyContactPhone:
            data.tenant_profile?.emergency_contact_phone || "",
          emergencyContactRelationship:
            data.tenant_profile?.emergency_contact_relationship || "",
          profileImage: data.profile_image || null,
          preferences: (() => {
            const raw = data.tenant_profile?.preference;
            if (!raw) return prev.preferences;
            const p = typeof raw === "string" ? JSON.parse(raw) : raw;
            return {
              room_preference: p.room_preference || "",
              budget_range: p.budget_range || "",
              lifestyle_notes: p.lifestyle_notes || p.lifestyle || "",
              // Canonical 'yes'/'no'; fall back from old boolean web keys
              smoking: p.smoking || (p.no_smoking ? "yes" : "no"),
              pets: p.pets || (p.pet_friendly ? "yes" : "no"),
            };
          })(),
        }));
      } else {
        // Fallback to local storage
        const userString = await AsyncStorage.getItem("user");
        if (userString) {
          const user = JSON.parse(userString);
          setProfileData((prev) => ({
            ...prev,
            firstName: user.first_name || "",
            middleName: user.middle_name || "",
            lastName: user.last_name || "",
            email: user.email || "",
            phone: user.phone || "",
          }));
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
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
    const currentDate =
      selectedDate ||
      (profileData.dateOfBirth
        ? new Date(profileData.dateOfBirth)
        : new Date());
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "set" || Platform.OS === "ios") {
      const age = calculateAge(currentDate);
      if (age < 18) {
        Alert.alert("Age Restriction", "You must be at least 18 years old.");
        return;
      }

      const formattedDate = currentDate.toISOString().split("T")[0];
      setProfileData((prev) => ({
        ...prev,
        dateOfBirth: formattedDate,
        age: String(age),
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!profileData.firstName?.trim() || !profileData.lastName?.trim()) {
      Alert.alert("Validation Error", "First and Last name are required.");
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        first_name: profileData.firstName.trim(),
        middle_name: profileData.middleName?.trim() || null,
        last_name: profileData.lastName.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone?.trim() || "",
        notes: profileData.bio?.trim() || "",
        gender: profileData.gender || null,
        identified_as: profileData.identifiedAs?.trim() || null,
        preference: profileData.preferences,
        date_of_birth: profileData.dateOfBirth || null,
        current_address: profileData.currentAddress?.trim() || null,
        emergency_contact_name:
          profileData.emergencyContactName?.trim() || null,
        emergency_contact_phone:
          profileData.emergencyContactPhone?.trim() || null,
        emergency_contact_relationship:
          profileData.emergencyContactRelationship?.trim() || null,
      };

      const res = await ProfileService.updateProfile(updateData);

      if (res.success) {
        const u = res.data;
        const tp = u.tenant_profile || {};

        setProfileData((prev) => ({
          ...prev,
          firstName: u.first_name || "",
          middleName: u.middle_name || "",
          lastName: u.last_name || "",
          phone: u.phone || "",
          gender: u.gender || "",
          identifiedAs: u.identified_as || "",
          bio: tp.notes || "",
          dateOfBirth: u.date_of_birth || "",
          preferences: (() => {
            const raw = tp.preference;
            if (!raw) return prev.preferences;
            const p = typeof raw === "string" ? JSON.parse(raw) : raw;
            return {
              room_preference: p.room_preference || "",
              budget_range: p.budget_range || "",
              lifestyle_notes: p.lifestyle_notes || p.lifestyle || "",
              smoking: p.smoking || (p.no_smoking ? "yes" : "no"),
              pets: p.pets || (p.pet_friendly ? "yes" : "no"),
            };
          })(),
        }));

        await AsyncStorage.setItem("user", JSON.stringify(u));
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Error", res.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera roll permissions to change your photo.",
        );
        return;
      }

      Alert.alert("Change Profile Photo", "Choose an option", [
        {
          text: "Take Photo",
          onPress: async () => {
            const { status: cameraStatus } =
              await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus !== "granted") {
              Alert.alert(
                "Permission Denied",
                "We need camera permissions to take a photo.",
              );
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
          text: "Choose from Library",
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
          text: "Cancel",
          style: "cancel",
        },
      ]);
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
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
        setProfileData((prev) => ({
          ...prev,
          profileImage: u.profile_image || imageAsset.uri,
        }));

        await AsyncStorage.setItem("user", JSON.stringify(u));
        Alert.alert("Success", "Profile photo updated!");
      } else {
        Alert.alert("Error", res.error || "Failed to upload photo");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload photo");
    } finally {
      setSaving(false);
    }
  };

  const getProfileImageSource = () => {
    if (profileData.profileImage) {
      if (
        typeof profileData.profileImage === "string" &&
        (profileData.profileImage.startsWith("http") ||
          profileData.profileImage.startsWith("file://"))
      ) {
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
        <Header
          title="Profile"
          onBack={() => navigation.goBack()}
          showRightIcon={false}
        />
        <View style={localStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              localStyles.loadingText,
              { color: theme.colors.textSecondary },
            ]}
          >
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  const profileImageSource = getProfileImageSource();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />

      <Header
        title="Profile"
        onBack={() => navigation.goBack()}
        showRightIcon={true}
        rightIcon={isEditing ? "save-outline" : "create-outline"}
        onRightPress={() => {
          if (isEditing) {
            handleSave();
          } else {
            setIsEditing(true);
          }
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View
          style={[
            styles.photoSection,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.photoContainer}>
            {profileImageSource ? (
              <Image
                source={profileImageSource}
                style={[
                  styles.profilePhoto,
                  { borderColor: theme.colors.primary },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.profilePhoto,
                  {
                    backgroundColor: theme.colors.primaryLight,
                    justifyContent: "center",
                    alignItems: "center",
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={60}
                  color={theme.colors.primary}
                />
              </View>
            )}
            {isEditing && (
              <TouchableOpacity
                style={[
                  styles.changePhotoButton,
                  {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.surface,
                  },
                ]}
                onPress={handleChangePhoto}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <Ionicons
                    name="camera"
                    size={24}
                    color={theme.colors.textInverse}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
          {!isEditing && (
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {[profileData.firstName, profileData.middleName, profileData.lastName]
                .filter(Boolean)
                .join(" ")}
            </Text>
          )}
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* PERSONAL INFORMATION SECTION */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, marginBottom: 15 },
            ]}
          >
            Personal Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              First Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.firstName}
                onChangeText={(text) => handleInputChange("firstName", text)}
                editable={isEditing}
                placeholder="First Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Middle Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.middleName}
                onChangeText={(text) => handleInputChange("middleName", text)}
                editable={isEditing}
                placeholder="Middle Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Last Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.lastName}
                onChangeText={(text) => handleInputChange("lastName", text)}
                editable={isEditing}
                placeholder="Last Name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.email}
                onChangeText={(text) => handleInputChange("email", text)}
                editable={isEditing}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email Address"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Phone Number
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.phone}
                onChangeText={(text) => handleInputChange("phone", text)}
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="Phone Number"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Gender
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (!isEditing) return;
                Alert.alert("Select Gender", "Choose your gender", [
                  { text: "Male", onPress: () => handleInputChange("gender", "male") },
                  { text: "Female", onPress: () => handleInputChange("gender", "female") },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
              disabled={!isEditing}
            >
              <Ionicons
                name="transgender-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    paddingTop: 4,
                    textTransform: "capitalize",
                  },
                ]}
              >
                {profileData.gender || "Select Gender"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Pronouns <Text style={{fontSize: 12, color: theme.colors.textSecondary, fontWeight: "normal"}}>(Optionals, e.g., He/Him)</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.identifiedAs}
                onChangeText={(text) => handleInputChange("identifiedAs", text)}
                editable={isEditing}
                placeholder="How do you identify?"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={50}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Date of Birth
            </Text>
            <TouchableOpacity
              onPress={() => isEditing && setShowDatePicker(true)}
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
              disabled={!isEditing}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <Text
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    paddingTop: Platform.OS === "ios" ? 0 : 4,
                  },
                ]}
              >
                {profileData.dateOfBirth
                  ? profileData.dateOfBirth
                  : "Select Date of Birth"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={
                  profileData.dateOfBirth
                    ? new Date(profileData.dateOfBirth)
                    : new Date(
                        new Date().setFullYear(new Date().getFullYear() - 18),
                      )
                }
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={
                  new Date(
                    new Date().setFullYear(new Date().getFullYear() - 18),
                  )
                }
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Current Address
            </Text>
            <View
              style={[
                styles.textAreaContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <TextInput
                style={[styles.textArea, { color: theme.colors.text }]}
                value={profileData.currentAddress}
                onChangeText={(text) =>
                  handleInputChange("currentAddress", text)
                }
                editable={isEditing}
                multiline
                numberOfLines={3}
                placeholder="Your permanent address (hometown)"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.border, marginVertical: 20 },
            ]}
          />

          {/* EMERGENCY CONTACT SECTION */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, marginBottom: 15 },
            ]}
          >
            Emergency Contact
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Contact Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.emergencyContactName}
                onChangeText={(text) =>
                  handleInputChange("emergencyContactName", text)
                }
                editable={isEditing}
                placeholder="Emergency contact name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Relationship
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.emergencyContactRelationship}
                onChangeText={(text) =>
                  handleInputChange("emergencyContactRelationship", text)
                }
                editable={isEditing}
                placeholder="e.g. Parent, Sibling"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Contact Phone
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.emergencyContactPhone}
                onChangeText={(text) =>
                  handleInputChange("emergencyContactPhone", text)
                }
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="Emergency contact phone"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.border, marginVertical: 20 },
            ]}
          />

          {/* PREFERENCES & LIFESTYLE SECTION */}
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.text, marginBottom: 15 },
            ]}
          >
            Preferences & Lifestyle
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Preferred Room Type
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="bed-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              {isEditing ? (
                <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
                  {["Single", "Double", "Suite"].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() =>
                        setProfileData((p) => ({
                          ...p,
                          preferences: {
                            ...p.preferences,
                            room_preference: opt,
                          },
                        }))
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor:
                          profileData.preferences.room_preference === opt
                            ? theme.colors.primary
                            : theme.colors.backgroundSecondary,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            profileData.preferences.room_preference === opt
                              ? theme.colors.textInverse
                              : theme.colors.textSecondary,
                          fontSize: 12,
                        }}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text
                  style={[
                    styles.input,
                    { color: theme.colors.text, paddingTop: 4 },
                  ]}
                >
                  {profileData.preferences.room_preference || "Not specified"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Budget Range (Monthly)
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={20}
                color={theme.colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={profileData.preferences.budget_range}
                onChangeText={(text) =>
                  setProfileData((p) => ({
                    ...p,
                    preferences: { ...p.preferences, budget_range: text },
                  }))
                }
                editable={isEditing}
                placeholder="e.g. 5000-8000"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Behaviour & About Me
            </Text>
            <View
              style={[
                styles.textAreaContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                !isEditing && styles.inputDisabled,
              ]}
            >
              <TextInput
                style={[styles.textArea, { color: theme.colors.text }]}
                value={profileData.preferences.lifestyle_notes}
                onChangeText={(text) =>
                  setProfileData((p) => ({
                    ...p,
                    preferences: { ...p.preferences, lifestyle_notes: text },
                  }))
                }
                editable={isEditing}
                multiline
                numberOfLines={4}
                placeholder="Describe your lifestyle, study habits..."
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.preferencesSection}>
            <View
              style={[
                styles.preferenceItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons name="ban" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text
                    style={[
                      styles.preferenceTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    No Smoking
                  </Text>
                </View>
              </View>
              <Switch
                value={profileData.preferences.smoking === "yes"}
                onValueChange={(val) =>
                  setProfileData((p) => ({
                    ...p,
                    preferences: {
                      ...p.preferences,
                      smoking: val ? "yes" : "no",
                    },
                  }))
                }
                disabled={!isEditing}
                trackColor={{ false: "#D1D5DB", true: theme.colors.primary }}
              />
            </View>

            <View
              style={[
                styles.preferenceItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.preferenceLeft}>
                <Ionicons name="paw" size={24} color={theme.colors.primary} />
                <View style={styles.preferenceText}>
                  <Text
                    style={[
                      styles.preferenceTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    Pets
                  </Text>
                </View>
              </View>
              <Switch
                value={profileData.preferences.pets === "yes"}
                onValueChange={(val) =>
                  setProfileData((p) => ({
                    ...p,
                    preferences: { ...p.preferences, pets: val ? "yes" : "no" },
                  }))
                }
                disabled={!isEditing}
                trackColor={{ false: "#D1D5DB", true: theme.colors.primary }}
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
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
  },
});
