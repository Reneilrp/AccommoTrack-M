import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    Alert, 
    Image, 
    ActivityIndicator, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform,
    StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import tenantService from '../../../../services/TenantService';
import { useTheme } from '../../../../contexts/ThemeContext';
import { showSuccess, showError } from '../../../../utils/toast';
import { styles } from '../../../../styles/Tenant/MaintenanceStyles';
import Header from '../../components/Header.jsx';

export default function CreateRequest() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { bookingId = null, propertyId = null, roomId = null } = route.params || {};
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Please grant media library permissions to attach photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ 
          mediaTypes: ImagePicker.MediaTypeOptions.Images, 
          quality: 0.7,
          allowsMultipleSelection: true 
      });
      
      if (res.canceled) return;
      const assets = res.assets || [];
      setImages((prev) => [...prev, ...assets].slice(0, 5));
    } catch (err) {
      console.error('Image picker error', err);
      showError('Error', 'Unable to open image picker.');
    }
  };

  const removeImage = (index) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      showError('Validation', 'Please provide a title and description.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('priority', priority);
      if (bookingId) form.append('booking_id', bookingId);
      if (propertyId) form.append('property_id', propertyId);
      if (roomId) form.append('room_id', roomId);
      
      images.forEach((img, idx) => {
        form.append('images[]', {
          uri: img.uri,
          name: img.fileName || `photo_${idx}.jpg`,
          type: img.type || 'image/jpeg'
        });
      });

      const res = await tenantService.submitMaintenanceRequest(form, true);
      if (res.success) {
        showSuccess('Request submitted successfully');
        navigation.goBack();
      } else {
        showError('Error', res.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submit maintenance error:', error);
      showError('Error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const PriorityChip = ({ level, label }) => (
      <TouchableOpacity 
        onPress={() => setPriority(level)} 
        style={[
            styles.priorityChip, 
            { 
                backgroundColor: priority === level ? theme.colors.primary : theme.colors.surface,
                borderColor: priority === level ? theme.colors.primary : theme.colors.border,
                borderWidth: 1
            },
            priority === level && styles.priorityChipActive
        ]}
      >
        <Text style={[
            styles.priorityText, 
            { color: priority === level ? '#fff' : theme.colors.textSecondary }
        ]}>
            {label}
        </Text>
      </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <Header 
        title="Maintenance Request"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    SUBJECT <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput 
                    value={title} 
                    onChangeText={setTitle} 
                    placeholder="Brief summary of the issue" 
                    placeholderTextColor={theme.colors.textTertiary}
                    style={[
                        styles.input, 
                        { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border,
                            borderWidth: 1
                        }
                    ]} 
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    DESCRIPTION <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput 
                    value={description} 
                    onChangeText={setDescription} 
                    placeholder="Provide more details about the problem..." 
                    placeholderTextColor={theme.colors.textTertiary}
                    multiline 
                    numberOfLines={6} 
                    textAlignVertical="top"
                    style={[
                        styles.textArea, 
                        { 
                            backgroundColor: theme.colors.surface, 
                            color: theme.colors.text,
                            borderColor: theme.colors.border,
                            borderWidth: 1
                        }
                    ]} 
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>PRIORITY LEVEL</Text>
                <View style={styles.priorityRow}>
                    <PriorityChip level="low" label="Low" />
                    <PriorityChip level="normal" label="Normal" />
                    <PriorityChip level="high" label="High" />
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>ATTACHMENTS</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{images.length}/5 photos</Text>
                </View>
                
                <View style={styles.photoGrid}>
                    <TouchableOpacity 
                        onPress={pickImage} 
                        disabled={images.length >= 5}
                        style={[
                            styles.addPhotoBtn, 
                            { 
                                backgroundColor: theme.colors.surface, 
                                borderStyle: 'dashed', 
                                borderColor: theme.colors.border,
                                borderWidth: 1
                            }
                        ]}
                    >
                        <Ionicons name="camera-outline" size={28} color={theme.colors.primary} />
                        <Text style={[styles.addPhotoText, { color: theme.colors.primary }]}>Add Photo</Text>
                    </TouchableOpacity>

                    {images.map((img, idx) => (
                        <View key={idx} style={styles.photoWrapper}>
                            <Image source={{ uri: img.uri }} style={styles.photo} />
                            <TouchableOpacity 
                                onPress={() => removeImage(idx)} 
                                style={styles.removePhotoBtn}
                            >
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>

            <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                    Your request will be sent directly to the landlord. They will review and update you on the progress.
                </Text>
            </View>

        </ScrollView>

        <View style={[
            styles.footer, 
            { 
                borderTopColor: theme.colors.border, 
                backgroundColor: theme.colors.surface,
                paddingBottom: Math.max(insets.bottom, 20)
            }
        ]}>
            <TouchableOpacity 
                onPress={onSubmit} 
                disabled={submitting} 
                style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                )}
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
