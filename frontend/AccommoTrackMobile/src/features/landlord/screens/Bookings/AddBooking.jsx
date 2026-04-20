import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import PropertyService from '../../../../services/PropertyService.js';
import BookingService from '../../../../services/BookingService.js';
import { showError, showSuccess } from '../../../../utils/toast.js';
import { normalizeActionError } from '../../../../utils/error.js';
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

const isValidEmailAddress = (value) => /^\S+@\S+\.\S+$/.test(String(value || '').trim());
const isValidPhoneNumber = (value) => /^\+?\d{10,15}$/.test(String(value || '').replace(/\s+/g, ''));

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

  const [propertyModalVisible, setPropertyModalVisible] = useState(false);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [bedCountModalVisible, setBedCountModalVisible] = useState(false);
  const [paymentPlanModalVisible, setPaymentPlanModalVisible] = useState(false);

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

    setFormData((prev) => {
      if (prev.checkOut) return prev;
      const nextDay = new Date(prev.checkIn);
      nextDay.setDate(nextDay.getDate() + 1);
      return {
        ...prev,
        checkOut: nextDay,
      };
    });
  }, [selectedRoom, selectedRoomBillingPolicy]);

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

    if (!selectedGuest) {
      const guestEmail = formData.email.trim();
      const guestPhone = formData.phone.trim();

      if (guestEmail && !isValidEmailAddress(guestEmail)) {
        showError('Validation', 'Please enter a valid guest email address.');
        return;
      }

      if (guestPhone && !isValidPhoneNumber(guestPhone)) {
        showError('Validation', 'Please enter a valid guest phone number (10-15 digits).');
        return;
      }
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
        const guestEmail = formData.email.trim();
        const guestPhone = formData.phone.trim();
        payload.guest_name = formData.guestName.trim();
        const guestContactNotes = [];
        if (guestEmail) guestContactNotes.push(`Guest email: ${guestEmail}`);
        if (guestPhone) guestContactNotes.push(`Guest phone: ${guestPhone}`);
        if (guestContactNotes.length > 0) {
          payload.notes = guestContactNotes.join(' | ');
        }
      }

      const res = await BookingService.createBooking(payload);
      if (res.success) {
        showSuccess('Success', 'Booking created successfully!');
        navigation.goBack();
      } else {
        const detailsMessage = resolveFirstValidationError(res.details);
        showError(
          'Error',
          normalizeActionError(detailsMessage || res.error, 'Unable to create booking right now.'),
        );
      }
    } catch (error) {
      showError('Error', normalizeActionError(error, 'Unable to create booking right now.'));
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
              editable={!selectedGuest}
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
              editable={!selectedGuest}
            />
            <Text style={styles.fieldHelpText}>
              {selectedGuest
                ? 'Existing tenant selected: contact details come from tenant profile.'
                : 'Optional contact details are saved in booking notes.'}
            </Text>
          </View>
        </View>

        {/* Property & Room */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Room Selection</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Property <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TouchableOpacity
              testID="add-booking-property-picker"
              style={styles.selectTrigger}
              onPress={() => setPropertyModalVisible(true)}
            >
              <Text style={styles.selectTriggerText}>
                {properties.find(p => String(p.id) === String(formData.propertyId))?.title || 'Select a property'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Room <Text style={styles.requiredAsterisk}>*</Text></Text>
            {loadingRooms ? (
              <View style={[styles.selectTrigger, { justifyContent: 'center' }]}>
                <ActivityIndicator size="small" color="#16a34a" />
              </View>
            ) : (
              <TouchableOpacity
                testID="add-booking-room-picker"
                style={[styles.selectTrigger, formData.propertyId === '' && { opacity: 0.5 }]}
                disabled={formData.propertyId === ''}
                onPress={() => setRoomModalVisible(true)}
              >
                <Text style={styles.selectTriggerText}>
                  {selectedRoom 
                    ? `Room ${selectedRoom.room_number} (${selectedRoom.type_label})` 
                    : (rooms.length === 0 ? "No available rooms" : "Select a room")}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedRoom && isBedSpacerRoom && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Beds <Text style={styles.requiredAsterisk}>*</Text></Text>
              {maxSelectableBeds > 1 ? (
                <TouchableOpacity
                  testID="add-booking-bed-count-picker"
                  style={styles.selectTrigger}
                  onPress={() => setBedCountModalVisible(true)}
                >
                  <Text style={styles.selectTriggerText}>
                    {formData.bedCount} {formData.bedCount === 1 ? 'Bed' : 'Beds'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
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
                <Text style={styles.dateButtonText}>{formData.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
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
                    ? formData.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
            <TouchableOpacity
              style={styles.selectTrigger}
              onPress={() => setPaymentPlanModalVisible(true)}
            >
              <Text style={styles.selectTriggerText}>
                {formData.paymentPlan === 'full' ? 'Full Payment (Total Stay)' : 'Monthly Installments'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
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

      {/* Selection Modals */}
      <Modal
        visible={propertyModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setPropertyModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setPropertyModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={styles.sectionTitle}>Select Property</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {properties.map((option, index, arr) => {
                const isLast = index === arr.length - 1;
                const isActive = String(option.id) === String(formData.propertyId);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      handlePropertyChange(option.id);
                      setPropertyModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusOptionText}>{option.title}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setPropertyModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={roomModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setRoomModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setRoomModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={styles.sectionTitle}>Select Room</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {rooms.map((option, index, arr) => {
                const isLast = index === arr.length - 1;
                const isActive = String(option.id) === String(formData.roomId);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      handleRoomChange(option.id);
                      setRoomModalVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusOptionText}>Room {option.room_number} ({option.type_label})</Text>
                      {option.sex_restriction && option.sex_restriction !== 'mixed' && (
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{String(option.sex_restriction).toUpperCase()} ONLY</Text>
                      )}
                    </View>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              {rooms.length === 0 && (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.textSecondary }}>No available rooms found for this property.</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setRoomModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={bedCountModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setBedCountModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setBedCountModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={styles.sectionTitle}>Number of Beds</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[...Array(maxSelectableBeds)].map((_, index, arr) => {
                const val = index + 1;
                const isLast = index === arr.length - 1;
                const isActive = formData.bedCount === val;
                return (
                  <TouchableOpacity
                    key={`bed-count-${val}`}
                    style={[styles.statusOption, isLast && styles.statusOptionLast]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, bedCount: val }));
                      setBedCountModalVisible(false);
                    }}
                  >
                    <Text style={styles.statusOptionText}>{val} {val === 1 ? 'Bed' : 'Beds'}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setBedCountModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={paymentPlanModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => setPaymentPlanModalVisible(false)}
      >
        <Pressable style={styles.statusModalOverlay} onPress={() => setPaymentPlanModalVisible(false)}>
          <Pressable style={styles.statusSheet} onPress={() => { }}>
            <Text style={styles.sectionTitle}>Select Payment Plan</Text>
            {[
              { label: 'Full Payment (Total Stay)', value: 'full' },
              { label: 'Monthly Installments', value: 'monthly' }
            ].map((option, index, arr) => {
              const isLast = index === arr.length - 1;
              const isActive = formData.paymentPlan === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, isLast && styles.statusOptionLast]}
                  onPress={() => {
                    setFormData({ ...formData, paymentPlan: option.value });
                    setPaymentPlanModalVisible(false);
                  }}
                >
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.statusOption, styles.statusOptionLast]}
              onPress={() => setPaymentPlanModalVisible(false)}
            >
              <Text style={[styles.statusOptionText, { color: "#EF4444" }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
