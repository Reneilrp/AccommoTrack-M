import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Image,
  Upload,
} from 'lucide-react';

export default function DormProfileSettings({ propertyId, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dormData, setDormData] = useState(null);
  const [newRule, setNewRule] = useState('');

  const API_URL = '/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/properties/${propertyId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch property details');
      }

      const data = await response.json();
      
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
          floorArea: data.floor_area,
          parkingSpaces: data.parking_spaces,
          floorLevel: data.floor_level,
          maxOccupants: data.max_occupants,
          totalRooms: data.total_rooms,
          availableRooms: data.available_rooms
        },
        amenities: parseAmenities(data.amenities),
        rules: data.property_rules ? (typeof data.property_rules === 'string' ? JSON.parse(data.property_rules) : data.property_rules) : [],
        status: data.current_status,
        nearbyLandmarks: data.nearby_landmarks || '',
        latitude: data.latitude,
        longitude: data.longitude,
        images: data.images || []
      });
    } catch (err) {
      console.error('Error fetching property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseAmenities = (amenitiesData) => {
    const defaultAmenities = {
      wifi: false,
      airConditioning: false,
      furnished: false,
      parking: false,
      security: false,
      generator: false,
      waterHeater: false,
      kitchen: false,
      balcony: false,
      elevator: false,
      petFriendly: false,
      gymAccess: false
    };

    if (!amenitiesData) return defaultAmenities;
    
    if (typeof amenitiesData === 'string') {
      try {
        const parsed = JSON.parse(amenitiesData);
        return { ...defaultAmenities, ...parsed };
      } catch {
        return defaultAmenities;
      }
    }
    
    return { ...defaultAmenities, ...amenitiesData };
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

  const handleSpecificationChange = (field, value) => {
    setDormData(prev => ({
      ...prev,
      specifications: { ...prev.specifications, [field]: value }
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setDormData(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [amenity]: !prev.amenities[amenity] }
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(f => URL.createObjectURL(f));
    setDormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const handleRemoveImage = (index) => {
    setDormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
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
        number_of_bedrooms: parseInt(dormData.specifications.bedrooms) || 1,
        number_of_bathrooms: parseInt(dormData.specifications.bathrooms) || 1,
        floor_area: parseFloat(dormData.specifications.floorArea) || null,
        parking_spaces: parseInt(dormData.specifications.parkingSpaces) || 0,
        floor_level: dormData.specifications.floorLevel,
        max_occupants: parseInt(dormData.specifications.maxOccupants) || 1,
        total_rooms: parseInt(dormData.specifications.totalRooms) || 1,
        amenities: JSON.stringify(dormData.amenities),
        property_rules: JSON.stringify(dormData.rules),
        nearby_landmarks: dormData.nearbyLandmarks,
        latitude: parseFloat(dormData.latitude) || null,
        longitude: parseFloat(dormData.longitude) || null,
        current_status: dormData.status
      };

      const response = await fetch(`${API_URL}/properties/${propertyId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property');
      }

      alert('Property updated successfully!');
      setIsEditing(false);
      fetchPropertyDetails();
    } catch (err) {
      console.error('Error updating property:', err);
      setError(err.message);
      alert('Failed to update property: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dormData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error && !dormData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-700 mb-4">{error}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Properties
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Property Profile & Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your property information</p>
            </div>
            <div className="flex items-center gap-3">
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    fetchPropertyDetails();
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Name</label>
                  <input
                    type="text"
                    value={dormData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                  <select
                    value={dormData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 capitalize"
                  >
                    <option value="dormitory">Dormitory</option>
                    <option value="apartment">Apartment</option>
                    <option value="boardingHouse">Boarding House</option>
                    <option value="bedSpacer">Bed Spacer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={dormData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={dormData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={!isEditing}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={dormData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
                    <input
                      type="text"
                      value={dormData.address.barangay}
                      onChange={(e) => handleAddressChange('barangay', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={dormData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                    <input
                      type="text"
                      value={dormData.address.province}
                      onChange={(e) => handleAddressChange('province', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                    <input
                      type="text"
                      value={dormData.address.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nearby Landmarks</label>
                  <textarea
                    value={dormData.nearbyLandmarks}
                    onChange={(e) => handleInputChange('nearbyLandmarks', e.target.value)}
                    disabled={!isEditing}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="e.g., Near SM Mall, 5 minutes from LRT Station"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                    <input
                      type="text"
                      value={dormData.latitude || ''}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                    <input
                      type="text"
                      value={dormData.longitude || ''}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Rooms</label>
                  <input
                    type="number"
                    value={dormData.specifications.totalRooms}
                    onChange={(e) => handleSpecificationChange('totalRooms', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Rooms</label>
                  <input
                    type="number"
                    value={dormData.specifications.availableRooms}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                  <input
                    type="number"
                    value={dormData.specifications.bathrooms}
                    onChange={(e) => handleSpecificationChange('bathrooms', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                  <input
                    type="number"
                    value={dormData.specifications.bedrooms}
                    onChange={(e) => handleSpecificationChange('bedrooms', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor Area (sqm)</label>
                  <input
                    type="number"
                    value={dormData.specifications.floorArea || ''}
                    onChange={(e) => handleSpecificationChange('floorArea', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parking Spaces</label>
                  <input
                    type="number"
                    value={dormData.specifications.parkingSpaces}
                    onChange={(e) => handleSpecificationChange('parkingSpaces', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Floor Level</label>
                  <input
                    type="text"
                    value={dormData.specifications.floorLevel || ''}
                    onChange={(e) => handleSpecificationChange('floorLevel', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Occupants</label>
                  <input
                    type="number"
                    value={dormData.specifications.maxOccupants}
                    onChange={(e) => handleSpecificationChange('maxOccupants', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Property Rules */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Rules</h2>
              
              <div className="space-y-3 mb-4">
                {dormData.rules.length === 0 ? (
                  <p className="text-gray-500 text-sm">No rules added yet</p>
                ) : (
                  dormData.rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span className="flex-1 text-sm text-gray-700">{rule}</span>
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

            {/* Property Images */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Images</h2>

              {dormData.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {dormData.images.map((img, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                      <img src={img} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">No images added yet</p>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
              
              <div className="space-y-3">
                {Object.entries(dormData.amenities).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <button
                      type="button"
                      onClick={() => isEditing && handleAmenityToggle(key)}
                      disabled={!isEditing}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-green-600' : 'bg-gray-300'
                      } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}