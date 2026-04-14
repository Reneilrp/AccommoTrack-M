import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
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
import { showError, showSuccess } from '../../../../utils/toast.js';
import { getStyles } from '../../../../styles/Landlord/AddBooking.js';
import {
  landlordQueryKeys,
  useLandlordFocusRefetch,
} from '../../hooks/useLandlordQueryHelpers.js';

const EMPTY_PROPERTIES = [];
const EMPTY_ROOMS = [];

const getRoomBillingPolicy = (room) =>
  String(room?.billing_policy || room?.contract_mode || 'monthly').toLowerCase();

const resolveFirstValidationError = (details) => {
  if (!details || typeof details !== 'object') return null;
  const firstFieldErrors = Object.values(details).find((value) => Array.isArray(value) && value.length > 0);
  if (!firstFieldErrors) return null;
  return firstFieldErrors[0] || null;
};

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
    bedCount: 1,
    checkIn: new Date(),
    checkOut: null,
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
  const selectedRoom = useMemo(
    () => rooms.find((room) => String(room.id) === String(formData.roomId)),
    [rooms, formData.roomId],
  );
  const selectedRoomBillingPolicy = useMemo(
    () => getRoomBillingPolicy(selectedRoom),
    [selectedRoom],
  );
  const requiresCheckOut = !selectedRoom || selectedRoomBillingPolicy === 'daily';
  const selectedRoomType = String(selectedRoom?.room_type || selectedRoom?.type_label || '').toLowerCase();
  const isBedSpacerRoom = selectedRoomType.replace(/[\s_-]/g, '') === 'bedspacer';
  const maxSelectableBeds = Math.max(
    1,
    Number(selectedRoom?.available_slots ?? selectedRoom?.capacity ?? 1),
  );
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
        prev.roomId || prev.amount || prev.bedCount !== 1
          ? { ...prev, roomId: '', amount: '', bedCount: 1 }
          : prev,
      );
      return;
    }

    if (rooms.length === 0) {
      setFormData((prev) =>
        prev.roomId || prev.amount || prev.bedCount !== 1
          ? { ...prev, roomId: '', amount: '', bedCount: 1 }
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
      const nextMaxBeds = Math.max(1, Number(activeRoom?.available_slots ?? activeRoom?.capacity ?? 1));
      const nextBedCount = Math.min(Math.max(1, Number(prev.bedCount || 1)), nextMaxBeds);

      if (
        String(prev.roomId) === String(nextRoomId)
        && prev.amount === nextAmount
        && prev.bedCount === nextBedCount
      ) {
        return prev;
      }

      return {
        ...prev,
        roomId: nextRoomId,
        amount: nextAmount,
        bedCount: nextBedCount,
      };
    });
  }, [formData.propertyId, rooms]);

  useEffect(() => {
    if (!selectedRoom) return;
    if (formData.bedCount > maxSelectableBeds) {
      setFormData((prev) => ({
        ...prev,
        bedCount: maxSelectableBeds,
      }));
    }
  }, [formData.bedCount, maxSelectableBeds, selectedRoom]);

  useEffect(() => {
    if (!selectedRoom || selectedRoomBillingPolicy !== 'daily') return;
    if (formData.checkOut) return;

    const nextDay = new Date(formData.checkIn);
    nextDay.setDate(nextDay.getDate() + 1);
    setFormData((prev) => ({
      ...prev,
      checkOut: nextDay,
    }));
  }, [selectedRoom, selectedRoomBillingPolicy, formData.checkIn, formData.checkOut]);

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
      bedCount: 1,
    }));
  };

  const handleRoomChange = (roomId) => {
    const selectedRoom = rooms.find((room) => String(room.id) === String(roomId));
    const nextMaxBeds = Math.max(1, Number(selectedRoom?.available_slots ?? selectedRoom?.capacity ?? 1));
    setFormData(prev => ({
      ...prev,
      roomId: roomId,
      amount: selectedRoom?.monthly_rate?.toString() || prev.amount,
      bedCount: Math.min(Math.max(1, Number(prev.bedCount || 1)), nextMaxBeds),
    }));
  };

  const onCheckInChange = (event, selectedDate) => {
    setShowCheckIn(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => {
        const next = { ...prev, checkIn: selectedDate };
        if (prev.checkOut && prev.checkOut <= selectedDate) {
          if (selectedRoomBillingPolicy === 'daily') {
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            next.checkOut = nextDay;
          } else {
            next.checkOut = null;
          }
        }
        return next;
      });
    }
  };

  const onCheckOutChange = (event, selectedDate) => {
    setShowCheckOut(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({ ...prev, checkOut: selectedDate }));
    }
  };

  const handleSubmit = async () => {
    if ((!selectedGuest && !formData.guestName.trim()) || !formData.propertyId || !formData.roomId) {
      showError('Validation', 'Please fill in all required fields.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(formData.checkIn);
    checkInDate.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      showError('Validation', 'Check-in date cannot be in the past.');
      return;
    }

    if (requiresCheckOut && !formData.checkOut) {
      showError('Validation', 'Check-out date is required for daily bookings.');
      return;
    }

    if (formData.checkOut && formData.checkOut <= formData.checkIn) {
      showError('Validation', 'Check-out date must be after check-in date.');
      return;
    }

    if (isBedSpacerRoom && formData.bedCount > maxSelectableBeds) {
      showError('Validation', `This room only allows up to ${maxSelectableBeds} bed${maxSelectableBeds > 1 ? 's' : ''}.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        property_id: formData.propertyId,
        room_id: formData.roomId,
        bed_count: isBedSpacerRoom ? formData.bedCount : 1,
        start_date: formData.checkIn.toISOString().split('T')[0],
        end_date: formData.checkOut ? formData.checkOut.toISOString().split('T')[0] : null,
        payment_plan: formData.paymentPlan,
      };

      if (selectedGuest) {
        payload.tenant_id = selectedGuest.id;
      } else {
        payload.guest_name = formData.guestName.trim();
      }

      const res = await BookingService.createBooking(payload);
      if (res.success) {
        showSuccess('Success', 'Booking created successfully!');
        navigation.goBack();
      } else {
        const detailsMessage = resolveFirstValidationError(res.details);
        showError('Error', detailsMessage || res.error || 'Failed to create booking');
      }
    } catch (error) {
      showError('Error', error?.message || 'Failed to create booking');
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
        <Text style={styles.requiredHint}>
          Fields marked with <Text style={styles.requiredAsterisk}>*</Text> are required.
        </Text>

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
                testID="add-booking-property-picker"
                selectedValue={formData.propertyId}
                onValueChange={(value) => handlePropertyChange(value)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor={theme.colors.textSecondary}
                mode="dropdown"
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
                  testID="add-booking-room-picker"
                  selectedValue={formData.roomId}
                  onValueChange={(value) => handleRoomChange(value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  dropdownIconColor={theme.colors.textSecondary}
                  mode="dropdown"
                  enabled={formData.propertyId !== ''}
                >
                  <Picker.Item label={rooms.length === 0 ? "No available rooms" : "Select a room"} value="" />
                  {rooms.map((room) => (
                    <Picker.Item
                      key={room.id}
                      label={`Room ${room.room_number} (${room.type_label})${room.gender_restriction && room.gender_restriction !== 'mixed' ? ` - ${String(room.gender_restriction).toUpperCase()} ONLY` : ''}`}
                      value={room.id}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          {selectedRoom && isBedSpacerRoom && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Beds <Text style={styles.requiredAsterisk}>*</Text></Text>
              {maxSelectableBeds > 1 ? (
                <View style={styles.pickerWrapper}>
                  <Picker
                    testID="add-booking-bed-count-picker"
                    selectedValue={formData.bedCount}
                    onValueChange={(value) => setFormData((prev) => ({
                      ...prev,
                      bedCount: Number(value),
                    }))}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                    dropdownIconColor={theme.colors.textSecondary}
                    mode="dropdown"
                  >
                    {[...Array(maxSelectableBeds)].map((_, index) => (
                      <Picker.Item
                        key={`bed-count-${index + 1}`}
                        label={`${index + 1} ${index === 0 ? 'Bed' : 'Beds'}`}
                        value={index + 1}
                      />
                    ))}
                  </Picker>
                </View>
              ) : (
                <View testID="add-booking-bed-count-static" style={styles.staticInfoBox}>
                  <Text style={styles.staticInfoText}>1 Bed</Text>
                </View>
              )}
              <Text style={styles.fieldHelpText}>
                Available: {selectedRoom.available_slots ?? selectedRoom.capacity ?? 1} / {selectedRoom.capacity ?? selectedRoom.available_slots ?? 1}
              </Text>
            </View>
          )}
        </View>

        {/* Schedule & Payment */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Schedule & Payment</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Check-in Date <Text style={styles.requiredAsterisk}>*</Text></Text>
              <TouchableOpacity
                testID="add-booking-checkin-button"
                style={styles.dateButton}
                onPress={() => setShowCheckIn(true)}
              >
                <Text style={styles.dateButtonText}>{formData.checkIn.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color="#16a34a" />
              </TouchableOpacity>
              {showCheckIn && (
                <DateTimePicker
                  testID="add-booking-checkin-picker"
                  value={formData.checkIn}
                  mode="date"
                  display="default"
                  onChange={onCheckInChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>
                Check-out Date{requiresCheckOut ? <Text style={styles.requiredAsterisk}> *</Text> : ' (Optional)'}
              </Text>
              <TouchableOpacity
                testID="add-booking-checkout-button"
                style={styles.dateButton}
                onPress={() => setShowCheckOut(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formData.checkOut
                    ? formData.checkOut.toLocaleDateString()
                    : (requiresCheckOut ? 'Select check-out date' : 'No check-out (open-ended)')}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#16a34a" />
              </TouchableOpacity>
              {showCheckOut && (
                <DateTimePicker
                  testID="add-booking-checkout-picker"
                  value={formData.checkOut || formData.checkIn}
                  mode="date"
                  display="default"
                  onChange={onCheckOutChange}
                  minimumDate={formData.checkIn}
                />
              )}
              {!requiresCheckOut && formData.checkOut ? (
                <TouchableOpacity
                  onPress={() => setFormData((prev) => ({ ...prev, checkOut: null }))}
                  style={{ marginTop: 8 }}
                >
                  <Text style={[styles.fieldHelpText, { color: theme.colors.primary }]}>Clear check-out (open-ended monthly)</Text>
                </TouchableOpacity>
              ) : null}
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
                itemStyle={styles.pickerItem}
                dropdownIconColor={theme.colors.textSecondary}
                mode="dropdown"
              >
                <Picker.Item label="Full Payment (Total Stay)" value="full" />
                <Picker.Item label="Monthly Installments" value="monthly" />
              </Picker>
            </View>
          </View>
        </View>

        <TouchableOpacity
          testID="add-booking-submit-button"
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
