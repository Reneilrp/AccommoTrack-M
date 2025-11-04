import React, { useState } from 'react';

export default function DormProfileSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const [dormData, setDormData] = useState({
    name: 'Q&M Dormitory',
    type: 'Dormitory',
    description: 'A comfortable and safe dormitory near the university. Perfect for students looking for a quiet place to study and rest. We provide 24/7 security, fast WiFi, and a friendly community atmosphere.',
    address: {
      street: 'Amethyst St. San Jose',
      barangay: 'Cawa-cawa',
      city: 'Zamboanga City',
      zipCode: '7000'
    },
    contact: {
      phone: '+63 912 345 6789',
      email: 'qmdormitory@gmail.com'
    },
    amenities: {
      wifi: true,
      parking: true,
      kitchen: true,
      laundry: true,
      aircon: true,
      security: true,
      studyArea: true,
      commonRoom: false
    },
    rules: [
      'No smoking inside the premises',
      'Quiet hours from 10 PM to 6 AM',
      'Guests must register at the front desk',
      'Keep common areas clean',
      'No pets allowed'
    ],
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'
    ]
  });

  const [newRule, setNewRule] = useState('');

  const handleInputChange = (field, value) => {
    setDormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setDormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleContactChange = (field, value) => {
    setDormData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
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

  const handleSave = () => {
    // API call to save data
    console.log('Saving dorm data:', dormData);
    setIsEditing(false);
    alert('Dorm information updated successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dorm Profile & Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your dormitory information</p>
            </div>
            <div className="flex items-center gap-3">
              {isEditing && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dorm Name</label>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="Dormitory">Dormitory</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Boarding House">Boarding House</option>
                    <option value="Bed Spacer">Bed Spacer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={dormData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={!isEditing}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                    placeholder="Describe your dormitory..."
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
              
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
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={dormData.contact.phone}
                    onChange={(e) => handleContactChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={dormData.contact.email}
                    onChange={(e) => handleContactChange('email', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Dorm Rules */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dorm Rules</h2>
              
              <div className="space-y-3 mb-4">
                {dormData.rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span className="flex-1 text-sm text-gray-700">{rule}</span>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveRule(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
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
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Property Images Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Images</h2>
              
              <div className="space-y-3">
                {dormData.images.map((image, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                    <img src={image} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {isEditing && (
                  <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors">
                    + Add Image
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-sm p-6 text-white">
              <h3 className="font-semibold mb-4">Profile Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-green-100">Profile Completeness</span>
                  <span className="font-semibold">95%</span>
                </div>
                <div className="w-full bg-green-800 rounded-full h-2">
                  <div className="bg-white rounded-full h-2" style={{ width: '95%' }}></div>
                </div>
                <p className="text-xs text-green-100 mt-3">
                  Your profile is looking great! Complete information helps attract more tenants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}