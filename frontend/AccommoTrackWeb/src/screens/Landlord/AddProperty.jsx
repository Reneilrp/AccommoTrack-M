import { useEffect, useRef } from 'react';
import { useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  MapPin,
  FileText,
  Plus,
  CheckCircle,
  Upload,
  Check,
  Loader2,
  ArrowRight,
  X,
  ShieldAlert,
  Clock
} from 'lucide-react';

// Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
// Toast
import toast from 'react-hot-toast';

import api from '../../utils/api';


export default function AddProperty({ onBack, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [isVerified, setIsVerified] = useState(null); // null = loading, true/false = loaded
  const formContentRef = useRef(null);

  // Fix Leaflet marker icon issue
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
  });


  function DraggableMarker({ position, setPosition }) {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });
    return (
      <Marker
        position={position}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const latLng = marker.getLatLng();
            setPosition([latLng.lat, latLng.lng]);
          },
        }}
      />
    );
  }

  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: '',
    otherPropertyType: '',
    currentStatus: 'pending',
    streetAddress: '',
    city: '',
    provinceRegion: 'Zamboanga Del Sur',
    postalCode: '',
    country: 'Philippines',
    barangay: '',
    latitude: '',
    longitude: '',
    nearbyLandmarks: '',
    maxTenants: '',
    totalRooms: '',
    amenities: [],
    rules: [],
    // New: eligibility flag and credential files for admin approval
    isEligible: false,
    credentials: [],
    monthlyPrice: '',
    securityDeposit: '',
    utilitiesIncluded: 'none',
    minimumLease: 'monthly',
    description: '',
    images: []
  });

  // Auto-fill address fields when latitude/longitude changes
  useEffect(() => {
    // Check verification status
    const checkVerification = async () => {
      try {
        const res = await api.get('/landlord/my-verification');
        setIsVerified(res.data?.status === 'approved' || res.data?.user?.is_verified === true);
      } catch (err) {
        // If 404 or error, assume not verified
        setIsVerified(false);
      }
    };
    checkVerification();
  }, []);

  // Auto-fill address fields when latitude/longitude changes
  useEffect(() => {
    const lat = formData.latitude;
    const lng = formData.longitude;
    if (lat && lng) {
      (async () => {
        try {
          const res = await api.get(`/reverse-geocode?lat=${lat}&lon=${lng}`);
          const data = res.data;
          if (data && data.address) {
            setFormData((prev) => ({
              ...prev,
              streetAddress: data.address.road || prev.streetAddress,
              city: data.address.city || data.address.town || data.address.village || prev.city,
              provinceRegion: data.address.state || prev.provinceRegion,
              postalCode: data.address.postcode || prev.postalCode,
              country: data.address.country || prev.country,
              barangay: data.address.suburb || data.address.neighbourhood || prev.barangay,
            }));
          }
        } catch (err) {
          // Optionally handle error
        }
      })();
    }
  }, [formData.latitude, formData.longitude]);

  const amenitiesList = [
    'WiFi', 'Air Conditioning', 'Furnished',
    'Parking', 'Security',
    'Water Heater', 'Kitchen', 'Balcony'
  ];

  const steps = [
    { number: 1, title: 'Property Information', description: 'Basic details & photos' },
    { number: 2, title: 'Location Details', description: 'Address & coordinates' },
    { number: 3, title: 'Rules & Amenities', description: 'House rules & features' },
    { number: 4, title: 'Credentials', description: 'Submit documents for approval' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      let updated = { ...prev, [field]: value };
      // If city is Zamboanga City, lock province and country
      if (
        (field === 'city' && value.trim().toLowerCase() === 'zamboanga city') ||
        (field !== 'city' && prev.city.trim().toLowerCase() === 'zamboanga city')
      ) {
        updated.provinceRegion = 'Zamboanga Del Sur';
        updated.country = 'Philippines';
      }
      return updated;
    });
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addRule = () => {
    try {
      if (newRule.trim()) {
        setFormData(prev => ({
          ...prev,
          rules: Array.isArray(prev.rules) ? [...prev.rules, newRule.trim()] : [newRule.trim()]
        }));
        setNewRule('');
      }
    } catch (err) {
      setError('Failed to add rule. Please try again.');
    }
  };

  const removeRule = (index) => {
    try {
      setFormData(prev => ({
        ...prev,
        rules: Array.isArray(prev.rules) ? prev.rules.filter((_, i) => i !== index) : []
      }));
    } catch (err) {
      setError('Failed to remove rule. Please try again.');
    }
  };

  const addAmenity = () => {
    try {
      if (newAmenity.trim()) {
        setFormData(prev => ({
          ...prev,
          amenities: Array.isArray(prev.amenities) ? [...prev.amenities, newAmenity.trim()] : [newAmenity.trim()]
        }));
        setNewAmenity('');
      }
    } catch (err) {
      setError('Failed to add amenity. Please try again.');
    }
  };

  const removeAmenity = (index) => {
    try {
      setFormData(prev => ({
        ...prev,
        amenities: Array.isArray(prev.amenities) ? prev.amenities.filter((_, i) => i !== index) : []
      }));
    } catch (err) {
      setError('Failed to remove amenity. Please try again.');
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setTimeout(() => {
        formContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setTimeout(() => {
        formContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Credential handlers
  const handleCredentialUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      credentials: [...prev.credentials, ...files]
    }));
  };

  const removeCredential = (index) => {
    setFormData(prev => ({
      ...prev,
      credentials: prev.credentials.filter((_, i) => i !== index)
    }));
  };

  const mapPropertyToBackend = (isDraft = false) => {
    return {
      title: formData.propertyName,
      description: formData.description || null,
      property_type: formData.propertyType === 'others' ? formData.otherPropertyType : formData.propertyType,
      // If saving as draft, mark draft; otherwise default to pending
      current_status: isDraft ? 'draft' : 'pending',
      street_address: formData.streetAddress,
      city: formData.city,
      province: formData.provinceRegion,
      postal_code: formData.postalCode || null,
      country: formData.country || 'Philippines',
      barangay: formData.barangay || null,
      latitude: parseFloat(formData.latitude) || null,
      longitude: parseFloat(formData.longitude) || null,
      nearby_landmarks: formData.nearbyLandmarks || null,
      max_occupants: parseInt(formData.maxTenants) || 1,
      property_rules: formData.rules.length > 0 ? JSON.stringify(formData.rules) : null,
      is_published: false,
      is_available: false,
      // Indicate whether landlord marked property eligible for approval
      is_eligible: formData.isEligible ? '1' : '0',
      // Explicit flag to indicate draft from frontend
      is_draft: isDraft ? '1' : '0',
    };
  };

  const validateForm = (isDraft = false) => {
    const errors = [];

    if (!formData.propertyName) errors.push('Property name is required');
    if (!formData.propertyType) errors.push('Property type is required');
    if (formData.propertyType === 'others' && !formData.otherPropertyType) errors.push('Please specify the property type');
    if (!formData.streetAddress) errors.push('Street address is required');
    if (!formData.city) errors.push('City is required');
    if (!formData.provinceRegion) errors.push('Province is required');

    // If property is marked eligible and we're submitting (not saving draft), credentials are required
    if (!isDraft && formData.isEligible && (!Array.isArray(formData.credentials) || formData.credentials.length === 0)) {
      errors.push('Credentials are required for eligible properties');
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      return false;
    }

    return true;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !validateForm(isDraft)) return;

    setLoading(true);
    setError('');

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setError('Authentication token missing');
      setLoading(false);
      return;
    }

    // Use FormData (multipart/form-data)
    const payload = new FormData();  // ← Renamed to avoid confusion

    // Append text fields
    const mapped = mapPropertyToBackend(isDraft);
    Object.entries(mapped).forEach(([key, value]) => {
      if (key === 'is_published' || key === 'is_available') {
        payload.append(key, value ? '1' : '0');  // Send as '1' or '0'
      } else if (value !== null && value !== undefined) {
        payload.append(key, value.toString());  // Ensure everything is string
      }
    });

    // Append amenities as array
    formData.amenities.forEach((amenity, index) => {
      payload.append(`amenities[${index}]`, amenity);
    });

    formData.images.forEach((file, index) => {
      if (file instanceof File) {
        payload.append(`images[${index}]`, file);
      }
    });

    // Append credential documents if any
    formData.credentials.forEach((file, index) => {
      if (file instanceof File) {
        payload.append(`credentials[${index}]`, file);
      }
    });

    try {
      const result = await api.post('/landlord/properties', payload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data'
        }
      });
      const data = result.data;
      toast.success(isDraft ? 'Draft saved!' : 'Property submitted for admin approval!');
      if (onSave) onSave(result, 'pending');
      if (onBack) onBack();

    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-3 items-center">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-green-600 hover:text-green-800"
                aria-label="Back to Properties"
              >
                <ArrowLeft className="w-5 h-5 text-green-600" />
                <span className="sr-only">Back to Properties</span>
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
            </div>

            <div />
          </div>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Verification Warning Banner */}
      {isVerified === false && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-yellow-800 font-semibold">Account Verification Required</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Your account is pending verification. You can create and save properties as drafts, 
                but you won't be able to submit them for approval or publish until your documents are verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= step.number
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                    }`}>
                    {step.number}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`text-sm font-medium ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-4 ${currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div ref={formContentRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Property Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Basic Information</h2>
                <p className="text-sm text-gray-600">Property will be pending until approved by admin</p>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sunset Apartments"
                    value={formData.propertyName}
                    onChange={(e) => handleInputChange('propertyName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>

                <div className={formData.propertyType === 'others' ? 'col-span-1' : 'col-span-2'}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  >
                    <option value="" disabled hidden>Select type</option>
                    <option value="dormitory">Dormitory</option>
                    <option value="apartment">Apartment</option>
                    <option value="boardingHouse">Boarding House</option>
                    <option value="bedSpacer">Bed Spacer</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                {formData.propertyType === 'others' && (
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specify <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Studio"
                      value={formData.otherPropertyType}
                      onChange={(e) => handleInputChange('otherPropertyType', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Provide a detailed description of the property, including any special features, nearby conveniences, and other relevant info"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                />
              </div>
            </div>

            {/* Property Images */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Images</h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                
                {formData.images.length === 0 ? (
                  <label htmlFor="image-upload" className="cursor-pointer block text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      {formData.images.map((img, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                          <img
                            src={typeof img === 'string' ? img : URL.createObjectURL(img)}
                            alt={`Property ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {formData.images.length < 10 && (
                        <label htmlFor="image-upload" className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                          <Plus className="w-8 h-8 text-gray-400" />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location & Specifications */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Map Section */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-start gap-2 mb-4">
                <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Set Property Coordinates</h3>
                  <p className="text-sm text-gray-600">Drag or click on the map below to set the exact location of your property</p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-4" style={{ position: 'relative', height: '300px' }}>
                <MapContainer
                  center={[
                    formData.latitude ? parseFloat(formData.latitude) : 6.912559646590693,
                    formData.longitude ? parseFloat(formData.longitude) : 122.06180691719057,
                  ]}
                  zoom={16}
                  style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <DraggableMarker
                    position={[
                      formData.latitude ? parseFloat(formData.latitude) : 6.9147,
                      formData.longitude ? parseFloat(formData.longitude) : 122.0781,
                    ]}
                    setPosition={([lat, lng]) => {
                      setFormData((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                      }));
                    }}
                  />

                </MapContainer>
              </div>

              {/* <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g., 6.9147"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g., 122.0781"
                  />
                </div>
              </div> */}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Location Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 123 Main Street"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barangay
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Barangay 123"
                    value={formData.barangay}
                    onChange={(e) => handleInputChange('barangay', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Manila"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province/Region <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Metro Manila"
                    value={formData.provinceRegion}
                    onChange={(e) => handleInputChange('provinceRegion', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    readOnly={formData.city.trim().toLowerCase() === 'zamboanga city'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1000"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Philippines"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    readOnly={formData.city.trim().toLowerCase() === 'zamboanga city'}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nearby Landmarks</label>
              <textarea
                placeholder="e.g., Near SM Mall, 5 minutes from LRT Station"
                value={formData.nearbyLandmarks}
                onChange={(e) => handleInputChange('nearbyLandmarks', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
              />
            </div>
          </div>
        )}

        {/* Step 3: Rules & Amenities */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Amenities */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Amenity</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="e.g., Water Heater"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAmenity();
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                  <button
                    onClick={addAmenity}
                    disabled={!newAmenity.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Press Enter or click Add to include a custom amenity</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Common Amenities:</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {amenitiesList.map((amenity) => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${formData.amenities.includes(amenity)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current selected amenities (added + selected) */}
              {Array.isArray(formData.amenities) && formData.amenities.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Your Amenities:</p>
                  <div className="grid grid-cols-3 gap-3">
                    {formData.amenities.map((amenity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="flex-1 text-sm text-gray-700">{amenity}</p>
                        <button
                          onClick={() => removeAmenity(index)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Property Rules */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Property Rules</h2>
                <p className="text-sm text-gray-600">Add house rules and policies for your property</p>
              </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Rule
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g., No smoking inside the premises"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRule();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                />
                <button
                  onClick={addRule}
                  disabled={!newRule.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter or click Add to include the rule</p>
            </div>

            {/* Common Rules Suggestions */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Common Rules:</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  'No smoking',
                  'No pets allowed',
                  'No visitors after 10 PM',
                  'Quiet hours: 10 PM - 6 AM',
                  'Keep common areas clean',
                  'Respect other tenants',
                  'No cooking in rooms'
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setFormData(prev => {
                        const isSelected = prev.rules.includes(suggestion);

                        return {
                          ...prev,
                          rules: isSelected
                            ? prev.rules.filter(rule => rule !== suggestion)  // Remove
                            : [...prev.rules, suggestion]                     // Add
                        };
                      });
                    }}
                    className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${formData.rules.includes(suggestion)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules List */}
            {Array.isArray(formData.rules) && formData.rules.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Your Property Rules:</p>
                <div className="grid grid-cols-3 gap-3">
                  {formData.rules.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="flex-1 text-sm text-gray-700">{rule}</p>
                      <button
                        onClick={() => removeRule(index)}
                        className="flex-shrink-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!Array.isArray(formData.rules) || formData.rules.length === 0) && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No rules added yet</p>
                <p className="text-gray-500 text-xs mt-1">Add rules to help tenants understand your property policies</p>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Step 4: Credentials (Eligibility + Documents) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Credentials for Approval</h2>
              <p className="text-sm text-gray-600 mb-4">If your property is eligible for direct admin approval, upload supporting documents (e.g., proof of ownership, permits).</p>

              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isEligible}
                    onChange={(e) => setFormData(prev => ({ ...prev, isEligible: e.target.checked }))}
                    className="form-checkbox h-4 w-4 text-green-600"
                  />
                  <span className="text-sm text-gray-700">Mark property as eligible for admin approval</span>
                </label>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleCredentialUpload}
                  className="hidden"
                  id="credential-upload"
                />

                {formData.credentials.length === 0 ? (
                  <label htmlFor="credential-upload" className="cursor-pointer block text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-1">Click to upload credential documents</p>
                    <p className="text-sm text-gray-500">PDF, PNG, JPG</p>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      {formData.credentials.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <p className="text-sm text-gray-700">{file.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor="credential-upload" className="text-sm text-gray-500 cursor-pointer mr-2">Add more</label>
                            <button onClick={() => removeCredential(index)} className="text-red-500 hover:text-red-700">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${currentStep === 1 || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {currentStep === steps.length ? (
              <>
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save as Draft'}
                  </button>
                {isVerified ? (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Submit for Approval
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800 font-medium">Verify account to submit</span>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                Next
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}