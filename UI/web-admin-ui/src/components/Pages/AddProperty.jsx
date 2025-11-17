import { useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  X,
  MapPin,
  FileText,
  Plus,
  CheckCircle,
  Upload,
  Check,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function AddProperty({ onBack, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newRule, setNewRule] = useState('');

  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: '',
    currentStatus: 'active',
    streetAddress: '',
    city: '',
    provinceRegion: '',
    postalCode: '',
    country: 'Philippines',
    barangay: '',
    latitude: '',
    longitude: '',
    nearbyLandmarks: '',
    bedrooms: '',
    bathrooms: '',
    floorArea: '',
    floorLevel: '',
    maxTenants: '',
    totalRooms: '',
    amenities: [],
    rules: [],
    monthlyPrice: '',
    securityDeposit: '',
    utilitiesIncluded: 'none',
    minimumLease: 'monthly',
    description: '',
    images: []
  });

  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const amenitiesList = [
    'WiFi', 'Air Conditioning', 'Furnished',
    'Parking', 'Security', 'Generator',
    'Water Heater', 'Kitchen', 'Balcony',
    'Elevator', 'Pet Friendly', 'Gym Access'
  ];

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Property details' },
    { number: 2, title: 'Location', description: 'Address & coordinates' },
    { number: 3, title: 'Specifications', description: 'Property features' },
    { number: 4, title: 'Property Rules', description: 'House rules' },
    { number: 5, title: 'Description & Images', description: 'Details & photos' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    if (newRule.trim()) {
      setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()]
      }));
      setNewRule('');
    }
  };

  const removeRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const mapPropertyToBackend = (isDraft = false) => {
    return {
      title: formData.propertyName,
      description: formData.description || null,
      property_type: formData.propertyType,
      current_status: isDraft ? 'inactive' : 'active',
      street_address: formData.streetAddress,
      city: formData.city,
      province: formData.provinceRegion,
      postal_code: formData.postalCode || null,
      country: formData.country || 'Philippines',
      barangay: formData.barangay || null,
      latitude: parseFloat(formData.latitude) || null,
      longitude: parseFloat(formData.longitude) || null,
      nearby_landmarks: formData.nearbyLandmarks || null,
      number_of_bedrooms: parseInt(formData.bedrooms) || 1,
      number_of_bathrooms: parseInt(formData.bathrooms) || 1,
      floor_area: parseFloat(formData.floorArea) || null,
      floor_level: formData.floorLevel || null,
      max_occupants: parseInt(formData.maxTenants) || 1,
      property_rules: formData.rules.length > 0 ? JSON.stringify(formData.rules) : null,
      is_published: !isDraft ? true : false,
      is_available: !isDraft ? true : false,
    };
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.propertyName) errors.push('Property name is required');
    if (!formData.propertyType) errors.push('Property type is required');
    if (!formData.streetAddress) errors.push('Street address is required');
    if (!formData.city) errors.push('City is required');
    if (!formData.provinceRegion) errors.push('Province is required');
    if (!formData.totalRooms) errors.push('Total rooms is required');

    if (errors.length > 0) {
      setError(errors.join(', '));
      return false;
    }

    return true;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !validateForm()) return;

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

    formData.images.forEach((file, index) => {
      if (file instanceof File) {
        payload.append(`images[${index}]`, file);
      }
    });

    try {
      const response = await fetch(`${API_URL}/landlord/properties`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: payload
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to save property');
      }

      const result = await response.json();
      alert(isDraft ? 'Draft saved!' : 'Property published successfully!');
      if (onSave) onSave(result, isDraft ? 'draft' : 'active');
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
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Properties
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
            <p className="text-gray-600 mt-1">List your property to reach potential tenants</p>
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Basic Information</h2>
            </div>

            <div>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                >
                  <option value="">Select type</option>
                  <option value="dormitory">Dormitory</option>
                  <option value="apartment">Apartment</option>
                  <option value="boardingHouse">Boarding House</option>
                  <option value="bedSpacer">Bed Spacer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <select
                  value={formData.currentStatus}
                  onChange={(e) => handleInputChange('currentStatus', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
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
                  />
                </div>
              </div>
            </div>

            {/* Map Section */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-start gap-2 mb-4">
                <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Set Property Coordinates</h3>
                  <p className="text-sm text-gray-600">Click on the map below to set the exact location of your property</p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-4">
                <div className="text-center text-gray-500">
                  <MapPin className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Interactive map would appear here</p>
                  <p className="text-xs mt-1">Click to set location pin</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g., 14.5995"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    placeholder="e.g., 120.9842"
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

        {/* Step 3: Property Specifications */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Property Specifications</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Rooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.totalRooms}
                    onChange={(e) => handleInputChange('totalRooms', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Bathrooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 1"
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor Area (sqm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 45"
                    value={formData.floorArea}
                    onChange={(e) => handleInputChange('floorArea', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 3rd Floor"
                    value={formData.floorLevel}
                    onChange={(e) => handleInputChange('floorLevel', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Occupants
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 4"
                    value={formData.maxTenants}
                    onChange={(e) => handleInputChange('maxTenants', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities & Features</h2>
              <div className="grid grid-cols-3 gap-3">
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
          </div>
        )}

        {/* Step 4: Property Rules */}
        {currentStep === 4 && (
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
              <p className="text-sm font-medium text-gray-700 mb-3">Common Rules (Click to add):</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'No smoking',
                  'No pets allowed',
                  'No visitors after 10 PM',
                  'Quiet hours: 10 PM - 6 AM',
                  'No illegal activities',
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
                    className={`px-3 py-1.5 text-sm border rounded-full transition-all duration-200 font-medium
    ${formData.rules.includes(suggestion)
                        ? 'border-green-500 bg-green-500 bg-opacity-50 text-green-800 shadow-sm'
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      }`}
                  >
                    {formData.rules.includes(suggestion) ? '✓' : '+'} {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules List */}
            {formData.rules.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Your Property Rules:</p>
                <div className="space-y-2">
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

            {formData.rules.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No rules added yet</p>
                <p className="text-gray-500 text-xs mt-1">Add rules to help tenants understand your property policies</p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Description & Images */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Property Description</h2>
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

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                </label>
              </div>

              {formData.images.length > 0 && (
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
              )}
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
            {currentStep === 5 ? (
              <>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 text-white" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Publish Property
                    </>
                  )}
                </button>
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