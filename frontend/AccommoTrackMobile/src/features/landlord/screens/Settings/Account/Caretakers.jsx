import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getStyles } from '../../../../../styles/Landlord/Caretakers.js';
import CaretakerService from '../../../../../services/CaretakerService.js';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import { ListItemSkeleton } from '../../../../../components/Skeletons/index.jsx';
import { showSuccess, showError } from '../../../../../utils/toast.js';

export default function Caretakers() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  const [caretakers, setCaretakers] = useState([]);
  const [landlordProperties, setLandlordProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [roomPermissionPrompt, setRoomPermissionPrompt] = useState(false);
  const [revocationModal, setRevocationModal] = useState({ show: false, caretaker: null, reason: '' });

  // Form State
  const [formData, setFormData] = useState({
    assignmentId: null,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirmation: '',
    permissions: {
      bookings: true,
      messages: true,
      tenants: true,
      rooms: false,
    },
    propertyIds: []
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await CaretakerService.getCaretakers();
    if (res.success) {
      setCaretakers(res.data.caretakers || []);
      setLandlordProperties(res.data.landlord_properties || []);
    } else {
      showError('Error', res.error);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      assignmentId: null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirmation: '',
      permissions: {
        bookings: true,
        messages: true,
        tenants: true,
        rooms: false,
      },
      propertyIds: []
    });
    setFieldErrors({});
    setIsEditing(false);
    setShowPasswords(false);
  };

  const validateField = (name, value) => {
    let error = '';
    if (name === 'firstName' || name === 'lastName') {
      if (/\d/.test(value)) error = 'Names cannot contain numbers';
    }
    if (name === 'phone') {
      if (/[a-zA-Z]/.test(value)) error = 'Phone must contain only numbers';
      else if (value && value.length < 10) error = 'Phone number is too short';
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) error = 'Invalid email address';
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleEdit = (item) => {
    const permMap = item.permissions || {};
    setFormData({
      assignmentId: item.id,
      firstName: item.caretaker.first_name,
      lastName: item.caretaker.last_name,
      email: item.caretaker.email,
      phone: item.caretaker.phone || '',
      password: '',
      passwordConfirmation: '',
      permissions: {
        bookings: permMap.bookings || permMap.can_view_bookings || false,
        messages: permMap.messages || permMap.can_view_messages || false,
        tenants: permMap.tenants || permMap.can_view_tenants || false,
        rooms: permMap.rooms || permMap.can_view_rooms || false,
      },
      propertyIds: item.assigned_property_ids || []
    });
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleResetPassword = (item) => {
    Alert.alert(
      'Reset Password',
      `Are you sure you want to reset the password for ${item.caretaker.first_name}? A temporary password will be generated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          onPress: async () => {
            const res = await CaretakerService.resetPassword(item.id);
            if (res.success) {
              Alert.alert('Password Reset', `New temporary password: ${res.data.temporary_password}\n\nPlease share this with the caretaker.`);
            } else {
              showError('Error', res.error);
            }
          } 
        }
      ]
    );
  };

  const handleSubmit = async () => {
    // Validations
    const errors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
    };

    if (Object.values(errors).some(err => err !== '')) {
      showError('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    if (!isEditing && (!formData.firstName || !formData.lastName || !formData.email || !formData.password)) {
      showError('Error', 'Please fill in all required fields including password');
      return;
    }

    if (formData.propertyIds.length === 0) {
      showError('Error', 'Please assign at least one property to the caretaker');
      return;
    }

    if (!isEditing && formData.password !== formData.passwordConfirmation) {
      showError('Error', 'Passwords do not match');
      return;
    }

    setSubmitting(true);

    const payload = {
      property_ids: formData.propertyIds,
      permissions: {
        can_view_bookings: formData.permissions.bookings,
        can_view_messages: formData.permissions.messages,
        can_view_tenants: formData.permissions.tenants,
        can_view_rooms: formData.permissions.rooms,
        can_view_properties: false, // Default to false as web version doesn't handle this
      }
    };

    if (!isEditing) {
      // Create
      payload.first_name = formData.firstName;
      payload.last_name = formData.lastName;
      payload.email = formData.email;
      payload.phone = formData.phone;
      payload.password = formData.password;
      payload.password_confirmation = formData.passwordConfirmation;
      
      const res = await CaretakerService.createCaretaker(payload);
      if (res.success) {
        showSuccess('Success', `Caretaker created! Temp password: ${res.data.temporary_password || formData.password}`);
        setModalVisible(false);
        fetchData();
      } else {
        showError('Error', res.error);
      }
    } else {
      // Update
      const res = await CaretakerService.updateCaretaker(formData.assignmentId, payload);
      if (res.success) {
        showSuccess('Success', 'Caretaker updated');
        setModalVisible(false);
        fetchData();
      } else {
        showError('Error', res.error);
      }
    }
    setSubmitting(false);
  };

  const handleRevokeConfirm = async () => {
    if (!revocationModal.reason.trim()) {
      showError('Error', 'Please provide a reason for revocation');
      return;
    }
    
    try {
      const res = await CaretakerService.deleteCaretaker(revocationModal.caretaker.id);
      if (res.success) {
        showSuccess('Success', 'Access revoked successfully');
        setRevocationModal({ show: false, caretaker: null, reason: '' });
        fetchData();
      } else {
        showError('Error', res.error);
      }
    } catch (err) {
      showError('Error', 'Failed to revoke access');
    }
  };

  const togglePermission = (key) => {
    if (key === 'rooms' && !formData.permissions.rooms) {
      setRoomPermissionPrompt(true);
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
      }));
    }
  };

  const confirmRoomPermission = () => {
    setRoomPermissionPrompt(false);
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, rooms: true }
    }));
  };

  const toggleProperty = (id) => {
    setFormData(prev => {
      const exists = prev.propertyIds.includes(id);
      if (exists) {
        return { ...prev, propertyIds: prev.propertyIds.filter(pid => pid !== id) };
      } else {
        return { ...prev, propertyIds: [...prev.propertyIds, id] };
      }
    });
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.caretaker.first_name.charAt(0)}{item.caretaker.last_name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {item.caretaker.first_name} {item.caretaker.last_name}
          </Text>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{item.caretaker.email}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity 
            onPress={() => {
              navigation.navigate('Messages', { 
                startConversation: true, 
                tenant: { ...item.caretaker, user_id: item.caretaker.id },
                propertyId: item.assigned_property_ids?.[0] || null
              });
            }} 
            style={styles.editButton}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleResetPassword(item)} style={styles.editButton}>
            <Ionicons name="key-outline" size={20} color={theme.colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRevocationModal({ show: true, caretaker: item, reason: '' })} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 12 }]}>Managed Properties</Text>
      <View style={styles.pillContainer}>
        {item.assigned_properties.length > 0 ? (
          item.assigned_properties.map(p => (
            <View key={p.id} style={[styles.pill, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.pillText, { color: theme.colors.primary }]}>{p.name}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noData, { color: theme.colors.textTertiary }]}>No properties assigned</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 12 }]}>Module Permissions</Text>
      <View style={styles.pillContainer}>
        {Object.entries(item.permissions).filter(([k, v]) => v).map(([k, v]) => (
          <View key={k} style={[styles.pill, { backgroundColor: '#E0E7FF' }]}>
            <Text style={[styles.pillText, { color: '#4338CA', textTransform: 'capitalize' }]}>{k}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Caretaker Management</Text>
        <TouchableOpacity onPress={() => { resetForm(); setModalVisible(true); }} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={caretakers}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No caretakers yet</Text>
              <TouchableOpacity 
                style={{ marginTop: 16, backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                onPress={() => { resetForm(); setModalVisible(true); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add First Caretaker</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{isEditing ? 'Edit Permissions' : 'Add New Caretaker'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              {!isEditing && (
                <>
                  <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>Personal Information</Text>
                  
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>First Name</Text>
                  <TextInput 
                    style={[styles.input, { color: theme.colors.text, borderColor: fieldErrors.firstName ? '#EF4444' : theme.colors.border }]} 
                    value={formData.firstName} 
                    onChangeText={(t) => { setFormData(prev => ({...prev, firstName: t})); validateField('firstName', t); }} 
                    placeholder="e.g. John"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  {fieldErrors.firstName ? <Text style={styles.fieldError}>{fieldErrors.firstName}</Text> : null}
                  
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last Name</Text>
                  <TextInput 
                    style={[styles.input, { color: theme.colors.text, borderColor: fieldErrors.lastName ? '#EF4444' : theme.colors.border }]} 
                    value={formData.lastName} 
                    onChangeText={(t) => { setFormData(prev => ({...prev, lastName: t})); validateField('lastName', t); }} 
                    placeholder="e.g. Doe"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  {fieldErrors.lastName ? <Text style={styles.fieldError}>{fieldErrors.lastName}</Text> : null}
                  
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email Address</Text>
                  <TextInput 
                    style={[styles.input, { color: theme.colors.text, borderColor: fieldErrors.email ? '#EF4444' : theme.colors.border }]} 
                    value={formData.email} 
                    onChangeText={(t) => { setFormData(prev => ({...prev, email: t})); validateField('email', t); }} 
                    autoCapitalize="none" 
                    keyboardType="email-address" 
                    placeholder="caretaker@example.com"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
                  
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone Number (Optional)</Text>
                  <TextInput 
                    style={[styles.input, { color: theme.colors.text, borderColor: fieldErrors.phone ? '#EF4444' : theme.colors.border }]} 
                    value={formData.phone} 
                    onChangeText={(t) => { setFormData(prev => ({...prev, phone: t})); validateField('phone', t); }} 
                    keyboardType="phone-pad" 
                    placeholder="09123456789"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  {fieldErrors.phone ? <Text style={styles.fieldError}>{fieldErrors.phone}</Text> : null}

                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Account Password</Text>
                  <View style={[styles.passwordContainer, { borderColor: theme.colors.border }]}>
                    <TextInput 
                      style={[styles.input, { flex: 1, borderBottomWidth: 0, marginBottom: 0, color: theme.colors.text }]} 
                      value={formData.password} 
                      onChangeText={(t) => setFormData(prev => ({...prev, password: t}))} 
                      secureTextEntry={!showPasswords}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                    <TouchableOpacity onPress={() => setShowPasswords(!showPasswords)} style={styles.eyeIcon}>
                      <Ionicons name={showPasswords ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Confirm Password</Text>
                  <View style={[styles.passwordContainer, { borderColor: theme.colors.border }]}>
                    <TextInput 
                      style={[styles.input, { flex: 1, borderBottomWidth: 0, marginBottom: 0, color: theme.colors.text }]} 
                      value={formData.passwordConfirmation} 
                      onChangeText={(t) => setFormData(prev => ({...prev, passwordConfirmation: t}))} 
                      secureTextEntry={!showPasswords}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                  </View>
                </>
              )}

              <Text style={[styles.sectionHeader, { color: theme.colors.primary, marginTop: isEditing ? 0 : 24 }]}>Module Permissions</Text>
              {Object.keys(formData.permissions).map(key => (
                <View key={key} style={styles.switchRow}>
                  <View>
                    <Text style={[styles.switchLabel, { color: theme.colors.text }]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
                      {key === 'bookings' ? 'View and manage reservation requests' : 
                       key === 'tenants' ? 'Access profiles and room assignments' : 
                       key === 'messages' ? 'Chat with prospects and residents' : 
                       'Full control over room availability'}
                    </Text>
                  </View>
                  <Switch
                    value={formData.permissions[key]}
                    onValueChange={() => togglePermission(key)}
                    trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                  />
                </View>
              ))}

              <Text style={[styles.sectionHeader, { color: theme.colors.primary, marginTop: 24 }]}>Assigned Properties</Text>
              {landlordProperties.length > 0 ? landlordProperties.map(prop => (
                <TouchableOpacity key={prop.id} style={styles.checkRow} onPress={() => toggleProperty(prop.id)}>
                  <Ionicons name={formData.propertyIds.includes(prop.id) ? "checkbox" : "square-outline"} size={24} color={formData.propertyIds.includes(prop.id) ? theme.colors.primary : theme.colors.textTertiary} />
                  <Text style={[styles.checkLabel, { color: theme.colors.text }]}>{prop.name}</Text>
                </TouchableOpacity>
              )) : (
                <Text style={{ color: theme.colors.error, fontSize: 12, marginLeft: 4 }}>Still didn't assign a property</Text>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>

            <SafeAreaView edges={['bottom']} style={styles.footer}>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>{isEditing ? 'Update Permissions' : 'Confirm & Add Caretaker'}</Text>}
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Security Alert Modal for Room Management */}
      <Modal visible={roomPermissionPrompt} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.alertIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#D97706" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Security Alert</Text>
            <Text style={[styles.alertMsg, { color: theme.colors.textSecondary }]}>
              Enabling <Text style={{ fontWeight: 'bold' }}>Room Management</Text> allows caretakers to modify availability and tenant placements. Are you sure?
            </Text>
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancel} onPress={() => setRoomPermissionPrompt(false)}>
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertConfirm, { backgroundColor: '#DC2626' }]} onPress={confirmRoomPermission}>
                <Text style={styles.alertConfirmText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Revoke Access Modal */}
      <Modal visible={revocationModal.show} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.alertIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash" size={32} color="#DC2626" />
            </View>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>Revoke Access</Text>
            <Text style={[styles.alertMsg, { color: theme.colors.textSecondary }]}>
              Are you sure you want to remove <Text style={{ fontWeight: 'bold' }}>{revocationModal.caretaker?.caretaker?.first_name}</Text>? This action is permanent.
            </Text>
            
            <TextInput
              style={[styles.reasonInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={revocationModal.reason}
              onChangeText={(t) => setRevocationModal(prev => ({...prev, reason: t}))}
              placeholder="Reason for Revocation (e.g. End of contract)"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />

            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertCancel} onPress={() => setRevocationModal({ show: false, caretaker: null, reason: '' })}>
                <Text style={styles.alertCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertConfirm, { backgroundColor: '#DC2626' }]} onPress={handleRevokeConfirm}>
                <Text style={styles.alertConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

