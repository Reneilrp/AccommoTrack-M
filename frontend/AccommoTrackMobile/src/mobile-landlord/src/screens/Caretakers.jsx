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
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getStyles } from '../../../styles/Landlord/Caretakers';
import CaretakerService from '../../../services/CaretakerService';
import { useTheme } from '../../../contexts/ThemeContext';
import { ListItemSkeleton } from '../../../components/Skeletons/index';

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
      properties: false
    },
    propertyIds: []
  });

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
      Alert.alert('Error', res.error);
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
        properties: false
      },
      propertyIds: []
    });
    setIsEditing(false);
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
        properties: permMap.properties || permMap.can_view_properties || false,
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
              Alert.alert('Password Reset', `New temporary password: ${res.data.temporary_password}`);
            } else {
              Alert.alert('Error', res.error);
            }
          } 
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!isEditing && (!formData.firstName || !formData.lastName || !formData.email)) {
      Alert.alert('Error', 'Please fill in all required fields');
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
        can_view_properties: formData.permissions.properties,
      }
    };

    if (!isEditing) {
      // Create
      payload.first_name = formData.firstName;
      payload.last_name = formData.lastName;
      payload.email = formData.email;
      payload.phone = formData.phone;
      if (formData.password) {
        payload.password = formData.password;
        payload.password_confirmation = formData.passwordConfirmation;
      }
      
      const res = await CaretakerService.createCaretaker(payload);
      if (res.success) {
        Alert.alert('Success', `Caretaker created! Temp password: ${res.data.temporary_password || 'As set'}`);
        setModalVisible(false);
        fetchData();
      } else {
        Alert.alert('Error', res.error);
      }
    } else {
      // Update
      const res = await CaretakerService.updateCaretaker(formData.assignmentId, payload);
      if (res.success) {
        Alert.alert('Success', 'Caretaker updated');
        setModalVisible(false);
        fetchData();
      } else {
        Alert.alert('Error', res.error);
      }
    }
    setSubmitting(false);
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Caretaker', 'Are you sure? This will revoke their access.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const res = await CaretakerService.deleteCaretaker(item.id);
          if (res.success) {
            fetchData();
          } else {
            Alert.alert('Error', res.error);
          }
        }
      }
    ]);
  };

  const togglePermission = (key) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
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
          <TouchableOpacity onPress={() => handleResetPassword(item)} style={styles.editButton} title="Reset Password">
            <Ionicons name="key-outline" size={20} color={theme.colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 12 }]}>Properties</Text>
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

      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 12 }]}>Permissions</Text>
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
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{isEditing ? 'Edit Caretaker' : 'Add Caretaker'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formScroll}>
            {!isEditing && (
              <>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>First Name</Text>
                <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={formData.firstName} onChangeText={(t) => setFormData(prev => ({...prev, firstName: t}))} />
                
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last Name</Text>
                <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={formData.lastName} onChangeText={(t) => setFormData(prev => ({...prev, lastName: t}))} />
                
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email</Text>
                <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={formData.email} onChangeText={(t) => setFormData(prev => ({...prev, email: t}))} autoCapitalize="none" keyboardType="email-address" />
                
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone (Optional)</Text>
                <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={formData.phone} onChangeText={(t) => setFormData(prev => ({...prev, phone: t}))} keyboardType="phone-pad" />
              </>
            )}

            <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>Permissions</Text>
            {Object.keys(formData.permissions).map(key => (
              <View key={key} style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.colors.text }]}>View {key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <Switch
                  value={formData.permissions[key]}
                  onValueChange={() => togglePermission(key)}
                  trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                />
              </View>
            ))}

            <Text style={[styles.sectionHeader, { color: theme.colors.primary, marginTop: 24 }]}>Assign Properties</Text>
            {landlordProperties.map(prop => (
              <TouchableOpacity key={prop.id} style={styles.checkRow} onPress={() => toggleProperty(prop.id)}>
                <Ionicons name={formData.propertyIds.includes(prop.id) ? "checkbox" : "square-outline"} size={24} color={formData.propertyIds.includes(prop.id) ? theme.colors.primary : theme.colors.textTertiary} />
                <Text style={[styles.checkLabel, { color: theme.colors.text }]}>{prop.name}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
