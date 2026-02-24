import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  Image,
  Upload,
  FileText,
  Loader2,
  Edit,
  Plus,
  Trash,
  Save,
  GripVertical,
  Star,
  Home,
  Users,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api from '../../utils/api';
import { usePreferences } from '../../contexts/PreferencesContext';

// Editable map (react-leaflet)
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Create a specific icon instance to ensure Vite/Bundlers resolve URLs correctly
const defaultMarkerIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Create a green SVG marker icon (data URL) so it's bundled reliably and appears green
const greenMarkerSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path fill="#10B981" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="3" fill="#ffffff" />
  </svg>
`);
const greenMarkerUrl = `data:image/svg+xml;utf8,${greenMarkerSvg}`;
const greenMarkerIcon = new L.Icon({
  iconUrl: greenMarkerUrl,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -36]
});

export default function DormProfileSettings({ propertyId, onBack, onDeleteRequested }) {
  const { effectiveTheme } = usePreferences();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dormData, setDormData] = useState(null);
  const [newRule, setNewRule] = useState('');
  const [newCustomAmenity, setNewCustomAmenity] = useState('');
  // Deletion flow state (copied from MyProperties for local handling)
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, property: null });
  const [passwordModal, setPasswordModal] = useState({ show: false, property: null });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [deletedCredentialIds, setDeletedCredentialIds] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);

  // Map tiles based on theme
  const tileUrl = effectiveTheme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/landlord/properties/${propertyId}`);
      const data = res.data;

      // Parse amenities from relationship or amenities_list
      const amenitiesData = data.amenities_list || data.amenities || [];
      const parsedAmenities = parseAmenities(amenitiesData);

      // Parse images - backend returns objects with image_url property that's already a full URL
      // Keep full image objects to preserve id, is_primary, and display_order
      const images = (data.images || []).map((img, idx) => {
        // If it's already a string URL, convert to object format
        if (typeof img === 'string') {
          return { id: null, url: img, is_primary: idx === 0, display_order: idx };
        }
        // If it's an object with image_url property, normalize structure
        if (img && typeof img === 'object' && img.image_url) {
          return {
            id: img.id || null,
            url: img.image_url,
            is_primary: Boolean(img.is_primary),
            display_order: img.display_order ?? idx
          };
        }
        // Fallback
        return null;
      }).filter(Boolean).sort((a, b) => a.display_order - b.display_order);

      setDormData({
        id: data.id,
        name: data.title,
        type: data.property_type,
        description: data.description || '',
        address: {
          street: data.street_address,
          barangay: data.barangay || '',
          city: data.city,
          province: data.province,
          zipCode: data.postal_code || '',
          country: data.country || 'Philippines'
        },
        specifications: {
          bedrooms: data.number_of_bedrooms,
          bathrooms: data.number_of_bathrooms,
          maxOccupants: data.max_occupants,
          totalRooms: data.total_rooms,
          availableRooms: data.available_rooms
        },
        amenities: parsedAmenities,
        customAmenities: data.customAmenities || data.additional_amenities || [],
        credentials: (data.credentials || []).map(c => ({
          id: c.id ?? null,
          original_name: c.original_name ?? (c.originalName ?? (c.name ?? 'Document')),
          file_url: c.file_url ?? c.file_path ?? c.url ?? null,
          mime: c.mime ?? null,
          created_at: c.created_at ?? null,
        })),
        rules: data.property_rules ? (typeof data.property_rules === 'string' ? JSON.parse(data.property_rules) : data.property_rules) : [],
        status: data.current_status,
        nearbyLandmarks: data.nearby_landmarks || '',
        latitude: data.latitude,
        longitude: data.longitude,
        images: images
      });
      // Reset any staged deletions when reloading from server
      setDeletedCredentialIds([]);
      setDeletedImageIds([]);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deletion handlers (copied/adapted from MyProperties.jsx)
  const handleDeleteProperty = async (propertyId) => {
    // When invoked from this page, we already have dormData available
    const property = dormData && dormData.id === propertyId ? dormData : { id: propertyId, title: dormData?.name };
    setPasswordModal({ show: true, property });
    setPassword('');
    setPasswordError('');
  };

  const verifyPassword = async () => {
    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    try {
      setVerifying(true);
      setPasswordError('');

      const response = await api.post('/landlord/properties/verify-password', {
        password: password
      });

      if (response.data.verified) {
        // Password verified, show confirmation modal (keep password for final deletion)
        setPasswordModal({ show: false, property: passwordModal.property });
        setDeleteConfirm({ show: true, property: passwordModal.property });
        setPasswordError('');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Incorrect password';
      setPasswordError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.property) return;
    try {
      setLoading(true);
      // Show a persistent loading toast and navigate immediately
      const toastId = toast.loading('Deleting property...');
      if (onBack) onBack();

      // Send password in request body for DELETE request
      const response = await api.delete(`/landlord/properties/${deleteConfirm.property.id}`, {
        data: { password: password }
      });

      if (response.status === 200) {
        toast.success(response.data.message || 'Property deleted successfully', { id: toastId });
      } else {
        toast.error('Failed to delete property', { id: toastId });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete property';
      // update the loading toast if it exists
      toast.error(errorMessage);
      // If password is wrong, re-open the password modal so user can retry
      if (err.response?.data?.error === 'password_incorrect') {
        setDeleteConfirm({ show: false, property: null });
        setPasswordModal({ show: true, property: deleteConfirm.property });
        setPassword('');
        setPasswordError(err.response?.data?.message || 'Incorrect password');
      }
    } finally {
      setLoading(false);
      setDeleteConfirm({ show: false, property: null });
      setPassword('');
    }
  };

  const parseAmenities = (amenitiesData) => {
    // Return only the amenities that were actually added to the property
    if (!amenitiesData || (Array.isArray(amenitiesData) && amenitiesData.length === 0)) {
      return [];
    }

    // If it's an array of strings (amenity names), return as-is
    if (Array.isArray(amenitiesData)) {
      return amenitiesData.map(a => (typeof a === 'string' ? a : String(a)).trim()).filter(Boolean);
    }

    // If it's a string, try to parse as JSON
    if (typeof amenitiesData === 'string') {
      try {
        const parsed = JSON.parse(amenitiesData);
        if (Array.isArray(parsed)) {
          return parsed.map(a => (typeof a === 'string' ? a : String(a)).trim()).filter(Boolean);
        }
        // If it's an object with boolean values, extract enabled ones
        return Object.entries(parsed)
          .filter(([key, value]) => value === true)
          .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());
      } catch {
        return [];
      }
    }

    // If it's an object with boolean values, extract enabled ones
    if (typeof amenitiesData === 'object') {
      return Object.entries(amenitiesData)
        .filter(([key, value]) => value === true)
        .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());
    }

    return [];
  };

  const handleInputChange = (field, value) => {
    setDormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setDormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  // Update coordinates from the map
  const handleMapChange = (lat, lng) => {
    setDormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSpecificationChange = (field, value) => {
    setDormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, [field]: value }
    }));
  };

  const handleRemoveAmenity = (index) => {
    setDormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setDormData(prev => ({
        ...prev,
        rules: [...prev.rules, newRule]
      }));
      setNewRule('');
    }
  };

  const handleRemoveRule = (index) => {
    setDormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Store File objects so they can be uploaded when user saves
    setDormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...files]
    }));
  };

  const handleCredentialUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Store File objects as credential entries so they can be uploaded on save
    const newCreds = files.map(f => ({ file: f, original_name: f.name }));
    setDormData(prev => ({
      ...prev,
      credentials: [...(prev.credentials || []), ...newCreds]
    }));
  };

  const handleRemoveCredential = (index) => {
    setDormData(prev => {
      const creds = Array.isArray(prev.credentials) ? [...prev.credentials] : [];
      if (index < 0 || index >= creds.length) return prev;
      const removed = creds[index];
      const newCreds = creds.filter((_, i) => i !== index);
      // If it was an existing credential with an id, mark it for deletion
      if (removed && removed.id) {
        setDeletedCredentialIds(prevIds => {
          // avoid duplicates
          if (prevIds.includes(removed.id)) return prevIds;
          return [...prevIds, removed.id];
        });
      }
      return { ...prev, credentials: newCreds };
    });
  };

  const handleAddCustomAmenity = (amenity) => {
    const value = (amenity || '').trim();
    if (!value) return;
    // Check if amenity already exists (case-insensitive)
    const exists = dormData.amenities.some(a => a.toLowerCase() === value.toLowerCase());
    if (exists) return;
    setDormData(prev => ({
      ...prev,
      amenities: [...(prev.amenities || []), value]
    }));
    setNewCustomAmenity('');
  };

  const handleRemoveCustomAmenity = (index) => {
    setDormData(prev => ({
      ...prev,
      customAmenities: (prev.customAmenities || []).filter((_, i) => i !== index)
    }));
  };

  const handleRemoveImage = (index) => {
    setDormData(prev => {
      const images = Array.isArray(prev.images) ? [...prev.images] : [];
      
      // Enforce minimum 1 image rule
      const existingImages = images.filter(img => img && (img.id || (typeof img !== 'object' || !img.file)));
      const newFiles = images.filter(img => img instanceof File || (img && img.file));
      const totalAfterRemove = images.length - 1;
      
      if (totalAfterRemove < 1) {
        toast.error('Property must have at least 1 image');
        return prev;
      }
      
      const removed = images[index];
      const newImages = images.filter((_, i) => i !== index);
      
      // If removed image was an existing one with ID, mark for deletion
      if (removed && removed.id) {
        setDeletedImageIds(prevIds => {
          if (prevIds.includes(removed.id)) return prevIds;
          return [...prevIds, removed.id];
        });
      }
      
      // If we removed the primary image, set the first remaining as primary
      if (removed && removed.is_primary && newImages.length > 0) {
        newImages[0] = { ...newImages[0], is_primary: true };
      }
      
      return { ...prev, images: newImages };
    });
  };

  const handleSetPrimaryImage = (index) => {
    setDormData(prev => {
      const images = (prev.images || []).map((img, i) => ({
        ...img,
        is_primary: i === index
      }));
      return { ...prev, images };
    });
  };

  // Drag and drop handlers for image reordering
  const handleDragStart = (e, index) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === index) return;
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null);
      return;
    }
    
    setDormData(prev => {
      const images = [...(prev.images || [])];
      const [draggedItem] = images.splice(draggedImageIndex, 1);
      images.splice(dropIndex, 0, draggedItem);
      
      // Update display_order for all images
      const reorderedImages = images.map((img, idx) => ({
        ...img,
        display_order: idx
      }));
      
      return { ...prev, images: reorderedImages };
    });
    
    setDraggedImageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');

      // Amenities is now just an array of strings
      const amenitiesArray = Array.isArray(dormData.amenities) ? dormData.amenities : [];

      // Include custom amenities (if any) and merge with the amenities
      const customAmenities = Array.isArray(dormData.customAmenities) ? dormData.customAmenities.map(a => (a || '').trim()).filter(Boolean) : [];
      const merged = Array.from(new Set([...amenitiesArray, ...customAmenities]));

      const updateData = {
        title: dormData.name,
        description: dormData.description,
        property_type: dormData.type,
        street_address: dormData.address.street,
        barangay: dormData.address.barangay,
        city: dormData.address.city,
        province: dormData.address.province,
        postal_code: dormData.address.zipCode,
        country: dormData.address.country,
        max_occupants: parseInt(dormData.specifications.maxOccupants) || 1,
        total_rooms: parseInt(dormData.specifications.totalRooms) || 1,
        amenities: merged,
        property_rules: JSON.stringify(dormData.rules),
        nearby_landmarks: dormData.nearbyLandmarks,
        latitude: parseFloat(dormData.latitude) || null,
        longitude: parseFloat(dormData.longitude) || null,
        current_status: dormData.status
      };

      // If there are any new File objects in images, send multipart/form-data
      const imageFiles = (dormData.images || []).filter((i) => i instanceof File);
      const credentialFiles = (dormData.credentials || []).filter((c) => c && c.file instanceof File).map(c => c.file);
      
      // Get primary image ID (if it's an existing image)
      const primaryImage = (dormData.images || []).find(img => img && img.is_primary && img.id);
      const primaryImageId = primaryImage?.id || null;
      
      // Get image order for existing images (id -> display_order)
      const imageOrder = (dormData.images || [])
        .filter(img => img && img.id)
        .map(img => ({ id: img.id, display_order: img.display_order }));

      let response;
      // Use multipart if we have any new images or credential files to upload
      if (imageFiles.length > 0 || credentialFiles.length > 0) {
        const fd = new FormData();

        // Append updateData fields. Arrays should be appended as indexed entries.
        Object.entries(updateData).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          if (Array.isArray(value)) {
            value.forEach((v, idx) => {
              fd.append(`${key}[${idx}]`, v);
            });
          } else {
            fd.append(key, String(value));
          }
        });

        // Append image files (only File instances). Use `images[]` keys so PHP
        // receives them as an array of uploaded files. This avoids potential
        // interpretation differences with indexed bracket keys.
        imageFiles.forEach((file) => {
          fd.append('images[]', file);
        });

        // Append credential files (only new File instances). Use `credentials[]` keys
        // so Laravel receives them as an array of uploaded files.
        credentialFiles.forEach((file) => {
          fd.append('credentials[]', file);
        });

        // Append ids of credentials the user removed so backend can delete them
        if (deletedCredentialIds.length > 0) {
          deletedCredentialIds.forEach((id) => fd.append('deleted_credentials[]', String(id)));
        }
        
        // Append ids of images the user removed so backend can delete them
        if (deletedImageIds.length > 0) {
          deletedImageIds.forEach((id) => fd.append('deleted_images[]', String(id)));
        }
        
        // Append primary image ID if set
        if (primaryImageId) {
          fd.append('primary_image_id', String(primaryImageId));
        }
        
        // Append image order
        if (imageOrder.length > 0) {
          fd.append('image_order', JSON.stringify(imageOrder));
        }

        // Log form data entries for debugging (will print File objects too)
        for (const entry of fd.entries()) {
          console.log('FormData entry:', entry[0], entry[1]);
        }

        // Use POST with method override when sending multipart FormData because
        // PHP (and therefore Laravel) doesn't populate $_FILES for PUT requests
        // reliably. Append _method=PUT so Laravel treats this as an update.
        fd.append('_method', 'PUT');
        response = await api.post(`/landlord/properties/${propertyId}`, fd, {
          headers: {
            'Accept': 'application/json',
            // Ensure we don't send an explicit Content-Type from our axios
            // defaults. Setting it to `undefined` lets the browser add the
            // proper multipart/form-data boundary so PHP can parse the files.
            'Content-Type': undefined
          }
        });
      } else {
        // If there are deleted credential IDs but no file uploads, include them
        const payload = { ...updateData };
        if (deletedCredentialIds.length > 0) {
          payload.deleted_credentials = deletedCredentialIds;
        }
        if (deletedImageIds.length > 0) {
          payload.deleted_images = deletedImageIds;
        }
        if (primaryImageId) {
          payload.primary_image_id = primaryImageId;
        }
        if (imageOrder.length > 0) {
          payload.image_order = imageOrder;
        }
        response = await api.put(`/landlord/properties/${propertyId}`, payload);
      }

      toast.success('Property updated successfully!');
      // alert('Property updated successfully!');
      setIsEditing(false);
      // Clear staged deletions after successful save
      setDeletedCredentialIds([]);
      setDeletedImageIds([]);
      fetchPropertyDetails();
    } catch (err) {
      console.error('Error updating property:', err);
      // If server responded with validation errors (Laravel returns 422),
      // surface the messages to the user and log the full response for debugging.
      if (err.response) {
        const data = err.response.data || {};
        console.error('Server response:', data);
        let msg = data.message || 'Validation error';
        if (data.errors && typeof data.errors === 'object') {
          const fieldMsgs = Object.values(data.errors).flat().filter(Boolean);
          if (fieldMsgs.length) {
            msg = `${msg}: ${fieldMsgs.join(' ; ')}`;
          }
        }
        setError(msg);
        toast.error('Failed to update property: ' + msg);
      } else {
        setError(err.message || 'Failed to update property');
        toast.error('Failed to update property: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraft = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.put(`/landlord/properties/${propertyId}`, {
        current_status: 'pending',
        is_draft: false
      });

      if (response.status === 200) {
        toast.success('Property submitted for admin approval');
        fetchPropertyDetails();
      } else {
        setError('Failed to submit draft');
      }
    } catch (err) {
      console.error('Error submitting draft:', err);
      setError(err.message || 'Failed to submit draft');
      toast.error('Failed to submit draft: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dormData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error && !dormData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Back to Properties
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dormData) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-[1100] bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-3 items-center">
            {/* Left: Back button */}
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-green-600 hover:text-green-800 dark:text-green-500 dark:hover:text-green-400"
                aria-label="Back to Properties"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="sr-only">Back to Properties</span>
              </button>
            </div>

            {/* Center: Title */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Property Profile & Settings</h1>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3">
              <Toaster/>
              {isEditing && (
                <>
                  <button
                    onClick={() => handleDeleteProperty(dormData?.id)}
                    disabled={loading}
                    className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors disabled:opacity-50 mr-2 shadow-lg shadow-red-500/20"
                    title="Delete Property"
                    aria-label="Delete Property"
                  >
                    <Trash className="w-4 h-4" />
                    <span className="sr-only">Delete property</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchPropertyDetails();
                    }}
                    disabled={loading}
                    className="w-10 h-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Cancel</span>
                  </button>
                </>
              )}

              {!isEditing && dormData?.status === 'draft' && (
                <button
                  onClick={handleSubmitDraft}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-green-600 transition-colors font-bold shadow-md shadow-yellow-500/20 disabled:opacity-50 mr-2"
                >
                  {loading ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}

              {isEditing ? (
                <button
                  onClick={() => handleSave()}
                  disabled={loading}
                  className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors font-medium disabled:opacity-50 shadow-lg shadow-green-500/20"
                  title="Save Changes"
                  aria-label="Save Changes"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="sr-only">Save changes</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  aria-label="Edit Property"
                  className="w-10 h-10 bg-white dark:bg-gray-700 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 shadow-md border border-gray-100 dark:border-gray-700"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Name</label>
                  <input
                    type="text"
                    value={dormData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Type</label>
                  <select
                    value={dormData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400 capitalize"
                  >
                    <option value="dormitory">Dormitory</option>
                    <option value="apartment">Apartment</option>
                    <option value="boardingHouse">Boarding House</option>
                    <option value="bedSpacer">Bed Spacer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={dormData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400 capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={dormData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={!isEditing}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={dormData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Barangay</label>
                    <input
                      type="text"
                      value={dormData.address.barangay}
                      onChange={(e) => handleAddressChange('barangay', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                    <input
                      type="text"
                      value={dormData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Province</label>
                    <input
                      type="text"
                      value={dormData.address.province}
                      onChange={(e) => handleAddressChange('province', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zip Code</label>
                    <input
                      type="text"
                      value={dormData.address.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nearby Landmarks</label>
                  <textarea
                    value={dormData.nearbyLandmarks}
                    onChange={(e) => handleInputChange('nearbyLandmarks', e.target.value)}
                    disabled={!isEditing}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    placeholder="e.g., Near SM Mall, 5 minutes from LRT Station"
                  />
                </div>

                {/* Editable Map */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Map (drag marker or click map to set location)</label>
                  <div className="w-full h-72 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <MapContainer
                      center={[dormData.latitude ?? 14.5995, dormData.longitude ?? 120.9842]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      whenCreated={(map) => setTimeout(() => map.invalidateSize(), 200)}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url={tileUrl}
                      />
                      <Marker
                        position={[dormData.latitude ?? 14.5995, dormData.longitude ?? 120.9842]}
                        draggable={isEditing}
                        icon={greenMarkerIcon}
                        eventHandlers={{
                          dragend: (e) => {
                            const p = e.target.getLatLng();
                            handleMapChange(p.lat, p.lng);
                          }
                        }}
                      />
                      <MapClickHandler onMapClick={handleMapChange} />
                    </MapContainer>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latitude</label>
                    <input
                      type="text"
                      value={dormData.latitude || ''}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Longitude</label>
                    <input
                      type="text"
                      value={dormData.longitude || ''}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Specifications</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Total Rooms</label>
                  <input
                    type="number"
                    value={dormData.specifications.totalRooms}
                    onChange={(e) => handleSpecificationChange('totalRooms', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Rooms</label>
                  <input
                    type="number"
                    value={dormData.specifications.availableRooms}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Property Images */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Images</h2>

              {dormData.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {dormData.images.map((img, index) => {
                    // Handle both File objects and image objects from server
                    const isFile = img instanceof File;
                    const imageUrl = isFile ? URL.createObjectURL(img) : (img?.url || img);
                    const isPrimary = !isFile && img?.is_primary;
                    const imageId = !isFile ? img?.id : null;
                    
                    return (
                      <div
                        key={imageId || `new-${index}`}
                        className={`relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group ${
                          isEditing ? 'cursor-move' : ''
                        } ${draggedImageIndex === index ? 'opacity-50 ring-2 ring-green-500' : ''} ${
                          isPrimary ? 'ring-2 ring-yellow-400' : ''
                        }`}
                        draggable={isEditing}
                        onDragStart={(e) => isEditing && handleDragStart(e, index)}
                        onDragOver={(e) => isEditing && handleDragOver(e, index)}
                        onDrop={(e) => isEditing && handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <img
                          src={imageUrl}
                          alt={`Property ${index + 1}`}
                          className="w-full h-full object-cover pointer-events-none"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x400?text=Image+Not+Found';
                          }}
                        />
                        
                        {/* Primary badge */}
                        {isPrimary && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            Cover
                          </div>
                        )}
                        
                        {/* Drag handle indicator */}
                        {isEditing && (
                          <div className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}
                        
                        {/* Action buttons on hover */}
                        {isEditing && (
                          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Set as primary button (only for non-primary, non-File images) */}
                            {!isPrimary && !isFile && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSetPrimaryImage(index); }}
                                className="p-1.5 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                                title="Set as cover image"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                            )}
                            {/* Delete button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                              className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              title="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {isEditing && dormData.images.length < 10 && (
                    <label htmlFor="image-upload-edit" className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </label>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No images added yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">At least 1 image is required</p>
                </div>
              )}

              {isEditing && (
                <div className="mt-4">
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload-edit"
                  />
                  <label htmlFor="image-upload-edit" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    <Upload className="w-5 h-5" />
                    Upload Images
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Amenities */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Amenities</h2>

              <div className="space-y-3 mb-4">
                {(!dormData.amenities || dormData.amenities.length === 0) ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No amenities added yet</p>
                ) : (
                  dormData.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{amenity}</span>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveAmenity(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomAmenity}
                    onChange={(e) => setNewCustomAmenity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomAmenity(newCustomAmenity)}
                    placeholder="Add an amenity..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={() => handleAddCustomAmenity(newCustomAmenity)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Property Rules */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Property Rules</h2>

              <div className="space-y-3 mb-4">
                {dormData.rules.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No rules added yet</p>
                ) : (
                  dormData.rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{rule}</span>
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveRule(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="Add a new rule..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
                  />
                  <button
                    onClick={handleAddRule}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Credentials (Read-only view) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Credentials</h2>
              {(!dormData.credentials || dormData.credentials.length === 0) ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No credential documents uploaded</p>
              ) : (
                <div className="space-y-3">
                  {dormData.credentials.map((cred, idx) => {
                    const name = cred.original_name || cred.originalName || cred.file?.name || `Document ${idx + 1}`;
                    const url = cred.file_url || cred.file_path || (cred.file ? URL.createObjectURL(cred.file) : null);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div className="text-sm text-gray-700 dark:text-gray-300">{name}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:underline">View</a>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">Unavailable</span>
                          )}
                          {isEditing && (
                            <button onClick={() => handleRemoveCredential(idx)} title="Remove" className="p-1 text-red-600 hover:text-red-800">
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isEditing && (
                <div className="mt-4">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={handleCredentialUpload}
                    className="hidden"
                    id="credential-upload-edit"
                  />
                  <label htmlFor="credential-upload-edit" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium">
                    <Upload className="w-4 h-4" />
                    Upload Documents
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Password Verification Modal */}
      {passwordModal.show && passwordModal.property && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verify Password</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please enter your password to confirm deletion of "{passwordModal.property.title || passwordModal.property.name}".
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !verifying) {
                    verifyPassword();
                  }
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white ${
                  passwordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter your password"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setPasswordModal({ show: false, property: null });
                  setPassword('');
                  setPasswordError('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={verifying}
              >
                Cancel
              </button>
              <button
                onClick={verifyPassword}
                disabled={verifying || !password}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.property && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm Deletion</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{deleteConfirm.property.title || deleteConfirm.property.name}"?
              {deleteConfirm.property.total_rooms > 0 && (
                <span className="block mt-2 text-red-600 dark:text-red-400 font-medium">
                  This will also delete all {deleteConfirm.property.total_rooms} associated room(s).
                </span>
              )}
              <span className="block mt-2 dark:text-gray-400">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteConfirm({ show: false, property: null });
                  setPassword('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component to capture map clicks and forward coordinates
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}