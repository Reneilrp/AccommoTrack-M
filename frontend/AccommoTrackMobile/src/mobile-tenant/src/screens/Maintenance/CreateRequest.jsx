import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';

export default function CreateRequest() {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId = null, propertyId = null, roomId = null } = route.params || {};
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      // Lazy import to avoid hard dependency failing at runtime if package not installed
      const ImagePicker = require('react-native-image-picker');
      ImagePicker.launchImageLibrary({ mediaType: 'photo', selectionLimit: 3 }, (res) => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Image Error', res.errorMessage || 'Unable to pick image');
          return;
        }

        const assets = res.assets || [];
        setImages((prev) => [...prev, ...assets]);
      });
    } catch (err) {
      Alert.alert('Missing Dependency', 'Image picker not installed. Install `react-native-image-picker` to attach photos.');
    }
  };

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation', 'Please provide a title and description for the maintenance request.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { title, description, priority };
      if (bookingId) payload.booking_id = bookingId;
      if (propertyId) payload.property_id = propertyId;
      if (roomId) payload.room_id = roomId;

      // If images exist, send as FormData
      if (images.length > 0) {
        const form = new FormData();
        form.append('title', title);
        form.append('description', description);
        form.append('priority', priority);
        if (bookingId) form.append('booking_id', bookingId);
        if (propertyId) form.append('property_id', propertyId);
        if (roomId) form.append('room_id', roomId);
        images.forEach((img, idx) => {
          // img.uri, img.fileName, img.type
          form.append('images[]', {
            uri: img.uri,
            name: img.fileName || `photo_${idx}.jpg`,
            type: img.type || 'image/jpeg'
          });
        });

        const res = await tenantService.submitMaintenanceRequest(form, true);
        if (res.success) {
          Alert.alert('Request Sent', 'Maintenance request submitted successfully.');
          navigation.goBack();
        } else {
          Alert.alert('Error', res.error || 'Failed to submit request');
        }
      } else {
        const res = await tenantService.submitMaintenanceRequest(payload, false);
        if (res.success) {
          Alert.alert('Request Sent', 'Maintenance request submitted successfully.');
          navigation.goBack();
        } else {
          Alert.alert('Error', res.error || 'Failed to submit request');
        }
      }
    } catch (error) {
      console.error('Submit maintenance error:', error);
      Alert.alert('Error', 'Unexpected error while submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', marginLeft: 8, color: theme.colors.text }}>New Maintenance Request</Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>Title</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Leaking faucet" style={{ backgroundColor: theme.colors.surface, padding: 10, borderRadius: 8, color: theme.colors.text }} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Describe the issue" multiline numberOfLines={4} style={{ backgroundColor: theme.colors.surface, padding: 10, borderRadius: 8, minHeight: 100, textAlignVertical: 'top', color: theme.colors.text }} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>Priority</Text>
        <View style={{ flexDirection: 'row' }}>
          {['low', 'normal', 'high'].map((p) => (
            <TouchableOpacity key={p} onPress={() => setPriority(p)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, backgroundColor: priority === p ? theme.colors.primary : theme.colors.surface }}>
              <Text style={{ color: priority === p ? theme.colors.textInverse : theme.colors.text }}>{p.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>Photos (optional)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={pickImage} style={{ padding: 10, backgroundColor: theme.colors.surface, borderRadius: 8, marginRight: 12 }}>
            <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row' }}>
            {images.map((img, idx) => (
              <Image key={idx} source={{ uri: img.uri }} style={{ width: 56, height: 56, borderRadius: 6, marginRight: 8 }} />
            ))}
          </View>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <TouchableOpacity onPress={onSubmit} disabled={submitting} style={{ padding: 14, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center' }}>
          {submitting ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={{ color: theme.colors.textInverse, fontWeight: '600' }}>Submit Request</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
