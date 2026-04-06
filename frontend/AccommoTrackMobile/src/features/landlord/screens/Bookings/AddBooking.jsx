import React, { useState, useEffect, useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import BookingService from '../../../../services/BookingService.js';
import { getStyles } from '../../../../styles/Landlord/AddBooking.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
} from '../../hooks/useLandlordQueryHelpers.js';

const EMPTY_PROPERTIES = [];
const EMPTY_ROOMS = [];

export default function AddBooking({ navigation }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    propertyId: '',
    roomId: '',
    checkIn: new Date(),
    checkOut: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    amount: '',
    paymentPlan: 'full',
  });

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);

  const propertiesQuery = useQuery({
    queryKey: landlordQueryKeys.properties(),
    queryFn: async () => {
      const response = await PropertyService.getMyProperties();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load properties');
      }

      return Array.isArray(response.data) ? response.data : EMPTY_PROPERTIES;
    },
    placeholderData: (previousData) => previousData,
  });

  const roomsQuery = useQuery({
    queryKey: landlordQueryKeys.roomsByProperty(formData.propertyId),
    enabled: Boolean(formData.propertyId),
    queryFn: async () => {
      const response = await PropertyService.getRooms(formData.propertyId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load rooms');
      }

      const data = response.data;
      const roomList = Array.isArray(data)
        ? data
        : (Array.isArray(data?.data) ? data.data : EMPTY_ROOMS);
      return roomList.filter((room) => room.status === 'available');
    },
    placeholderData: (previousData) => previousData,
  });

  const properties = propertiesQuery.data || EMPTY_PROPERTIES;
  const rooms = roomsQuery.data || EMPTY_ROOMS;
  const loading = propertiesQuery.isPending && properties.length === 0;
  const loadingRooms = Boolean(formData.propertyId) && roomsQuery.isFetching;
  const fetchError = propertiesQuery.error?.message || roomsQuery.error?.message || '';

  const refetchProperties = propertiesQuery.refetch;
  const refetchRooms = roomsQuery.refetch;
  const addBookingRefetchers = useMemo(
    () => (formData.propertyId ? [refetchProperties, refetchRooms] : [refetchProperties]),
    [formData.propertyId, refetchProperties, refetchRooms],
  );
  useLandlordFocusRefetch({ refetchers: addBookingRefetchers });

  useEffect(() => {
    if (formData.propertyId || properties.length === 0) return;
    setFormData((prev) => ({ ...prev, propertyId: properties[0].id }));
  }, [formData.propertyId, properties]);

  useEffect(() => {
    if (!formData.propertyId) {
      setFormData((prev) =>
        prev.roomId || prev.amount
          ? { ...prev, roomId: '', amount: '' }
          : prev,
      );
      return;
    }

    if (rooms.length === 0) {
      setFormData((prev) =>
        prev.roomId || prev.amount
          ? { ...prev, roomId: '', amount: '' }
          : prev,
      );
      return;
    }

    setFormData((prev) => {
      const selectedRoom = rooms.find((room) => String(room.id) === String(prev.roomId));
      const fallbackRoom = rooms[0];
      const activeRoom = selectedRoom || fallbackRoom;
      const nextRoomId = activeRoom?.id ?? '';
      const nextAmount = activeRoom?.monthly_rate?.toString() || '';

      if (String(prev.roomId) === String(nextRoomId) && prev.amount === nextAmount) {
        return prev;
      }

      return {
        ...prev,
        roomId: nextRoomId,
        amount: nextAmount,
      };
    });
  }, [formData.propertyId, rooms]);

  useEffect(() => {
    if (!guestSearch || guestSearch.trim().length < 2 || selectedGuest) {
      setGuestResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGuests(true);
      try {
        const res = await BookingService.searchGuests(guestSearch.trim());
        setGuestResults(res.success ? res.data : []);
      } catch (_error) {
        setGuestResults([]);
      } finally {
        setIsSearchingGuests(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [guestSearch, selectedGuest]);

  const handlePropertyChange = (propId) => {
    setFormData((prev) => ({
      ...prev,
      propertyId: propId,
      roomId: '',
      amount: '',
    }));
  };

  const handleRoomChange = (roomId) => {
    const selectedRoom = rooms.find((room) => String(room.id) === String(roomId));
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
    if ((!selectedGuest && !formData.guestName) || !formData.propertyId || !formData.roomId) {
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
        property_id: formData.propertyId,
        room_id: formData.roomId,
        start_date: formData.checkIn.toISOString().split('T')[0],
        end_date: formData.checkOut.toISOString().split('T')[0],
        payment_plan: formData.paymentPlan,
      };

      if (selectedGuest) {
        payload.tenant_id = selectedGuest.id;
      } else {
        payload.guest_name = formData.guestName.trim();
      }

      const res = await BookingService.createBooking(payload);
      if (res.success) {
        Alert.alert('Success', 'Booking created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.error || 'Failed to create booking');
      }
    } catch (_error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Manual Booking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {fetchError ? (
          <View
            style={{
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.isDark ? '#7F1D1D' : '#FECACA',
              backgroundColor: theme.isDark ? 'rgba(127,29,29,0.32)' : '#FEF2F2',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: theme.isDark ? '#FCA5A5' : '#B91C1C', fontSize: 12, fontWeight: '600' }}>
              {fetchError}
            </Text>
          </View>
        ) : null}

        {/* Guest Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Guest Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={guestSearch}
              onChangeText={(text) => {
                setGuestSearch(text);
                setSelectedGuest(null);
                setFormData(prev => ({ ...prev, guestName: text }));
              }}
              placeholder="Search existing tenant or enter new name"
            />
            {isSearchingGuests && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" color="#16a34a" />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}
            {!selectedGuest && guestResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                {guestResults.slice(0, 5).map((guest) => (
                  <TouchableOpacity
                    key={guest.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSelectedGuest(guest);
                      setGuestSearch(guest.name || '');
                      setGuestResults([]);
                    }}
                  >
                    <Text style={styles.searchResultTitle}>{guest.name}</Text>
                    {!!guest.email && <Text style={styles.searchResultSub}>{guest.email}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedGuest && (
              <Text style={styles.selectedGuestText}>Using existing tenant: {selectedGuest.name}</Text>
            )}
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
                <ActivityIndicator size="small" color="#16a34a" style={{ padding: 8 }} />
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
                <Ionicons name="calendar-outline" size={20} color="#16a34a" />
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
                <Ionicons name="calendar-outline" size={20} color="#16a34a" />
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
            <Text style={styles.label}>Estimated Amount (₱)</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              placeholder="Auto-calculated from room rate"
              keyboardType="numeric"
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Plan</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.paymentPlan}
                onValueChange={(value) => setFormData({ ...formData, paymentPlan: value })}
                style={styles.picker}
              >
                <Picker.Item label="Full Payment (Total Stay)" value="full" />
                <Picker.Item label="Monthly Installments" value="monthly" />
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
