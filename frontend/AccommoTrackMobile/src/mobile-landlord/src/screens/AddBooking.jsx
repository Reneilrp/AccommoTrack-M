import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../../contexts/ThemeContext';
import PropertyService from '../../../services/PropertyServices';
import BookingService from '../../../services/BookingServices';
import { styles } from '../../../styles/Landlord/AddBooking';

export default function AddBooking({ navigation }) {
  const { theme } = useTheme();
  
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    propertyId: '',
    roomId: '',
    checkIn: new Date(),
    checkOut: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    amount: '',
    paymentStatus: 'unpaid',
  });

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await PropertyService.getMyProperties();
      if (res.success) {
        const props = Array.isArray(res.data) ? res.data : [];
        setProperties(props);
        if (props.length > 0) {
          handlePropertyChange(props[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (propId) => {
    setLoadingRooms(true);
    try {
      const res = await PropertyService.getRooms(propId);
      if (res.success) {
        const availableRooms = (Array.isArray(res.data) ? res.data : [])
          .filter(room => room.status === 'available');
        setRooms(availableRooms);
        if (availableRooms.length > 0) {
          setFormData(prev => ({ ...prev, roomId: availableRooms[0].id, amount: availableRooms[0].monthly_rate?.toString() || '' }));
        } else {
          setFormData(prev => ({ ...prev, roomId: '', amount: '' }));
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handlePropertyChange = (propId) => {
    setFormData(prev => ({ ...prev, propertyId: propId }));
    fetchRooms(propId);
  };

  const handleRoomChange = (roomId) => {
    const selectedRoom = rooms.find(r => r.id === roomId);
    setFormData(prev => ({ 
      ...prev, 
      roomId: roomId, 
      amount: selectedRoom?.monthly_rate?.toString() || prev.amount 
    }));
  };

  const onCheckInChange = (event, selectedDate) => {
    setShowCheckIn(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({ ...prev, checkIn: selectedDate }));
    }
  };

  const onCheckOutChange = (event, selectedDate) => {
    setShowCheckOut(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({ ...prev, checkOut: selectedDate }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.guestName || !formData.propertyId || !formData.roomId || !formData.amount) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }

    if (formData.checkOut <= formData.checkIn) {
      Alert.alert('Validation', 'Check-out date must be after check-in date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        guest_name: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        property_id: formData.propertyId,
        room_id: formData.roomId,
        check_in: formData.checkIn.toISOString().split('T')[0],
        check_out: formData.checkOut.toISOString().split('T')[0],
        amount: parseFloat(formData.amount),
        payment_status: formData.paymentStatus,
      };

      const res = await BookingService.createBooking(payload);
      if (res.success) {
        Alert.alert('Success', 'Booking created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.error || 'Failed to create booking');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Manual Booking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Guest Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Guest Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.guestName}
              onChangeText={(text) => setFormData({ ...formData, guestName: text })}
              placeholder="Enter guest's full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="guest@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Property & Room */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Room Selection</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Property <Text style={styles.requiredAsterisk}>*</Text></Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.propertyId}
                onValueChange={(value) => handlePropertyChange(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a property" value="" />
                {properties.map((prop) => (
                  <Picker.Item key={prop.id} label={prop.title} value={prop.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Room <Text style={styles.requiredAsterisk}>*</Text></Text>
            <View style={styles.pickerWrapper}>
              {loadingRooms ? (
                <ActivityIndicator size="small" color="#10b981" style={{ padding: 10 }} />
              ) : (
                <Picker
                  selectedValue={formData.roomId}
                  onValueChange={(value) => handleRoomChange(value)}
                  style={styles.picker}
                  enabled={formData.propertyId !== ''}
                >
                  <Picker.Item label={rooms.length === 0 ? "No available rooms" : "Select a room"} value="" />
                  {rooms.map((room) => (
                    <Picker.Item 
                      key={room.id} 
                      label={`Room ${room.room_number} (${room.type_label})`} 
                      value={room.id} 
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>
        </View>

        {/* Schedule & Payment */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Schedule & Payment</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Check-in Date <Text style={styles.requiredAsterisk}>*</Text></Text>
              <TouchableOpacity 
                style={styles.dateButton} 
                onPress={() => setShowCheckIn(true)}
              >
                <Text style={styles.dateButtonText}>{formData.checkIn.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color="#10b981" />
              </TouchableOpacity>
              {showCheckIn && (
                <DateTimePicker
                  value={formData.checkIn}
                  mode="date"
                  display="default"
                  onChange={onCheckInChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Check-out Date <Text style={styles.requiredAsterisk}>*</Text></Text>
              <TouchableOpacity 
                style={styles.dateButton} 
                onPress={() => setShowCheckOut(true)}
              >
                <Text style={styles.dateButtonText}>{formData.checkOut.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color="#10b981" />
              </TouchableOpacity>
              {showCheckOut && (
                <DateTimePicker
                  value={formData.checkOut}
                  mode="date"
                  display="default"
                  onChange={onCheckOutChange}
                  minimumDate={formData.checkIn}
                />
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Booking Amount (₱) <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.paymentStatus}
                onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                style={styles.picker}
              >
                <Picker.Item label="Unpaid" value="unpaid" />
                <Picker.Item label="Partial" value="partial" />
                <Picker.Item label="Paid" value="paid" />
              </Picker>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Booking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
