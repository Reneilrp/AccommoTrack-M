import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/MyProfile';
import Button from '../components/ui/Button';

export default function MyProfileScreen({ navigation }) {
  // Sample Data, no API yet
  const [user, setUser] = useState({
    firstName: 'Neal',
    lastName: 'Jean',
    email: 'NealJeanClaro@gmail.com',
    phoneNumber: '+63 912 345 6789',
    address: '123 Dormitory Lane, City',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempUser, setTempUser] = useState(user);

  // Function to handle saving changes
  const handleSave = () => {
    // 1. Typically, you'd send an API request here to update the user data
    // 2. If successful:
    setUser(tempUser);
    setIsEditing(false);
    Alert.alert("Success", "Your profile has been updated!");
  };

  // Function to cancel editing
  const handleCancel = () => {
    setTempUser(user); // Reset temporary state
    setIsEditing(false);
  };

  // Custom back button handler
  const handleBack = () => {
    if (isEditing) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Do you want to discard them?",
        [
          { text: "No", style: "cancel" },
          { text: "Yes", onPress: handleCancel }
        ]
      );
    } else {
      navigation.goBack();
    }
  }

  // Define a reusable component for profile fields
  const ProfileField = ({ label, value, editable, onChangeText, iconName }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelContainer}>
        <Ionicons name={iconName} size={20} color={styles.fieldLabel.color} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.fieldValue, editable && styles.fieldValueEditable]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={label}
        keyboardType={label === 'Phone Number' ? 'phone-pad' : 'default'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>

        {isEditing ? (
          <Button onPress={handleSave} style={styles.editButton}>
            <Text style={styles.editText}>Save</Text>
          </Button>
        ) : (
          <Button onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </Button>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{user.firstName[0]}{user.lastName[0]}</Text>
          </View>
          <Text style={styles.profileName}>{user.firstName} {user.lastName}</Text>
          {isEditing && (
            <Button style={styles.changePictureButton} type="transparent">
              <Text style={styles.changePictureText}>Change Profile Picture</Text>
            </Button>
          )}
        </View>

        {/* Profile Details Card */}
        <View style={styles.detailsCard}>
          <ProfileField
            label="First Name"
            value={tempUser.firstName}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, firstName: text })}
            iconName="person-outline"
          />
          <ProfileField
            label="Last Name"
            value={tempUser.lastName}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, lastName: text })}
            iconName="person-outline"
          />
          <ProfileField
            label="Email"
            value={tempUser.email}
            editable={false} // Email is often not editable
            iconName="mail-outline"
          />
          <ProfileField
            label="Phone Number"
            value={tempUser.phoneNumber}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, phoneNumber: text })}
            iconName="call-outline"
          />
          <ProfileField
            label="Address"
            value={tempUser.address}
            editable={isEditing}
            onChangeText={(text) => setTempUser({ ...tempUser, address: text })}
            iconName="location-outline"
          />
        </View>

        {isEditing && (
          <Button onPress={handleCancel} style={styles.cancelButton} type="transparent">
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Button>
        )}

      </ScrollView>
    </View>
  );
}