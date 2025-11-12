import { useState } from 'react';

export default function AddProperty({ onBack, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Basic Information
    propertyName: '',
    propertyType: '',
    currentStatus: '',

    // Location
    streetAddress: '',
    city: '',
    provinceRegion: '',
    postalCode: '',
    country: 'Philippines',
    barangay: '',
    latitude: '',
    longitude: '',
    nearbyLandmarks: '',

    // Specifications
    total_rooms: '',
    bathrooms: '',
    floorArea: '',
    parkingSpaces: '',
    floorLevel: '',
    maxTenants: '',
    amenities: [],

    // Rental Info
    monthlyPrice: '',
    securityDeposit: '',
    utilitiesIncluded: '',
    minimumLease: '',

    // Description & Images
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
    { number: 4, title: 'Rental Info', description: 'Pricing & terms' },
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
    // In a real app, you'd upload these to a server
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files.map(f => URL.createObjectURL(f))]
    }));
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: formData.propertyName,
          description: formData.description || null,
          property_type: formData.propertyType,
          current_status: 'inactive', // Draft = inactive

          // Location
          street_address: formData.streetAddress,
          city: formData.city,
          province: formData.provinceRegion,
          postal_code: formData.postalCode || null,
          country: formData.country || 'Philippines',
          barangay: formData.barangay || null,
          latitude: parseFloat(formData.latitude) || null,
          longitude: parseFloat(formData.longitude) || null,
          nearby_landmarks: formData.nearbyLandmarks || null,

          // Specifications - ⭐ FIXED: Changed field names to match backend
          number_of_bedrooms: parseInt(formData.total_rooms) || 1,  // Backend expects 'number_of_bedrooms' not 'number_of_total_rooms'
          number_of_bathrooms: parseInt(formData.bathrooms) || 1,
          floor_area: parseFloat(formData.floorArea) || null,
          parking_spaces: parseInt(formData.parkingSpaces) || 0,
          floor_level: formData.floorLevel || null,
          max_occupants: parseInt(formData.maxTenants) || 1,

          // Room Management - ⭐ FIXED: Must be at least 1
          total_rooms: parseInt(formData.total_rooms) || 1,
          available_rooms: parseInt(formData.total_rooms) || 1,

          // Rental Info
          price_per_month: parseFloat(formData.monthlyPrice),
          security_deposit: parseFloat(formData.securityDeposit) || null,
          utilities_included: formData.utilitiesIncluded || 'none',
          minimum_lease_term: formData.minimumLease || 'monthly',  // ⭐ FIXED: Added fallback

          // Status
          is_published: false,
          is_available: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Validation errors:', errorData);
        throw new Error(errorData.message || 'Failed to save property');
      }

      const savedProperty = await response.json();
      alert('Property saved as draft successfully!');

      if (onSave) onSave(savedProperty, 'draft');
      if (onBack) onBack();

    } catch (err) {
      console.error('Error saving draft:', err);
      setError(err.message);
      alert('Error saving property: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    // Debug: Check token
    const token = localStorage.getItem('auth_token');
    console.log('Token exists:', !!token);
    console.log('Token value:', token);

    if (!token) {
      alert('You are not logged in. Please log in again.');
      return;
    }

    // Validate required fields - ⭐ ADDED: Check total_rooms
    if (!formData.propertyName || !formData.propertyType || !formData.streetAddress ||
      !formData.city || !formData.provinceRegion || !formData.monthlyPrice || !formData.total_rooms) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/properties`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: formData.propertyName,
          description: formData.description || null,
          property_type: formData.propertyType,
          current_status: 'active',

          // Location
          street_address: formData.streetAddress,
          city: formData.city,
          province: formData.provinceRegion,
          postal_code: formData.postalCode || null,
          country: formData.country || 'Philippines',
          barangay: formData.barangay || null,
          latitude: parseFloat(formData.latitude) || null,
          longitude: parseFloat(formData.longitude) || null,
          nearby_landmarks: formData.nearbyLandmarks || null,

          // Specifications - ⭐ FIXED: Changed field names to match backend
          number_of_bedrooms: parseInt(formData.total_rooms) || 1,  // Backend expects 'number_of_bedrooms' not 'number_of_total_rooms'
          number_of_bathrooms: parseInt(formData.bathrooms) || 1,
          floor_area: parseFloat(formData.floorArea) || null,
          parking_spaces: parseInt(formData.parkingSpaces) || 0,
          floor_level: formData.floorLevel || null,
          max_occupants: parseInt(formData.maxTenants) || 1,

          // Room Management - ⭐ FIXED: Must be at least 1
          total_rooms: parseInt(formData.total_rooms) || 1,
          available_rooms: parseInt(formData.total_rooms) || 1,

          // Rental Info
          price_per_month: parseFloat(formData.monthlyPrice),
          security_deposit: parseFloat(formData.securityDeposit) || null,
          utilities_included: formData.utilitiesIncluded || 'none',
          minimum_lease_term: formData.minimumLease || 'monthly', 

          // Status
          is_published: true,
          is_available: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Validation errors:', errorData);
        throw new Error(errorData.message || 'Failed to publish property');
      }

      const publishedProperty = await response.json();
      alert('Property published successfully!');

      if (onSave) onSave(publishedProperty, 'active');
      if (onBack) onBack();

    } catch (err) {
      console.error('Error publishing property:', err);
      setError(err.message);
      alert('Error publishing property: ' + err.message);
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
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
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
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
                  <option value="boarding-house">Boarding House</option>
                  <option value="bed-spacer">Bed Spacer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.currentStatus}
                  onChange={(e) => handleInputChange('currentStatus', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                >
                  <option value="">Select status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
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
                    Country <span className="text-red-500">*</span>
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
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900">Set Property Coordinates</h3>
                  <p className="text-sm text-gray-600">Click on the map below to set the exact location of your property</p>
                </div>
              </div>

              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-4">
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
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
                    Number of Rooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2"
                    value={formData.total_rooms}
                    onChange={(e) => handleInputChange('total_rooms', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor Area (sqm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 45"
                    value={formData.floorArea}
                    onChange={(e) => handleInputChange('floorArea', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Spaces
                  </label>
                  <input
                    type="string"
                    placeholder="e.g., 1"
                    value={formData.parkingSpaces}
                    onChange={(e) => handleInputChange('parkingSpaces', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>

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
                    Max Tenants
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 4"
                    value={formData.maxTenants}
                    onChange={(e) => handleInputChange('maxTenants', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
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

        {/* Step 4: Rental Information */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Rental Information</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rental Price (₱) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 12000"
                    value={formData.monthlyPrice}
                    onChange={(e) => handleInputChange('monthlyPrice', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Deposit (₱)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 24000"
                    value={formData.securityDeposit}
                    onChange={(e) => handleInputChange('securityDeposit', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Utilities Included
                  </label>
                  <select
                    value={formData.utilitiesIncluded}
                    onChange={(e) => handleInputChange('utilitiesIncluded', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  >
                    <option value="">Select option</option>
                    <option value="all">All Utilities Included</option>
                    <option value="partial">Partially Included</option>
                    <option value="none">Not Included</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Lease Term
                  </label>
                  <select
                    value={formData.minimumLease}
                    onChange={(e) => handleInputChange('minimumLease', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                  >
                    <option value="">Select term</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="1_year">1 Year</option>
                  </select>
                </div>
              </div>
            </div>
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
                  Description <span className="text-red-500">*</span>
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
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                </label>
              </div>

              {formData.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                      <img src={img} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 10 && (
                    <label htmlFor="image-upload" className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between pt-6">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${currentStep === 1 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentStep === 5 ? (
                <>
                  <button
                    onClick={handleSaveDraft}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}