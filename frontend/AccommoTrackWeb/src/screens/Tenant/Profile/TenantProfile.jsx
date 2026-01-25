import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { CircleUser, Camera, CheckCircle, AlertCircle } from 'lucide-react';

const TenantProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    profile_image: null,
    profile_image_url: null,
    
    // Tenant Profile Fields
    date_of_birth: '',
    current_address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    
    // Preferences (JSON structure)
    room_preference: '',
    lifestyle_notes: '', // Behavior/Attitude
    smoking: 'no',
    pets: 'no',
    budget_range: '',
  });

  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getProfile();
      
      // Parse preference if it's a string, or use it if object
      let prefs = data.tenant_profile?.preference || {};
      if (typeof prefs === 'string') {
        try {
          prefs = JSON.parse(prefs);
        } catch (e) {
          prefs = {};
        }
      }

      setFormData({
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        profile_image_url: data.profile_image || null,
        
        date_of_birth: data.tenant_profile?.date_of_birth || '',
        current_address: data.tenant_profile?.current_address || '',
        emergency_contact_name: data.tenant_profile?.emergency_contact_name || '',
        emergency_contact_phone: data.tenant_profile?.emergency_contact_phone || '',
        emergency_contact_relationship: data.tenant_profile?.emergency_contact_relationship || '',
        
        room_preference: prefs.room_preference || '',
        lifestyle_notes: prefs.lifestyle_notes || '',
        smoking: prefs.smoking || 'no',
        pets: prefs.pets || 'no',
        budget_range: prefs.budget_range || '',
      });
      
      if (data.profile_image) {
        setImagePreview(data.profile_image);
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profile_image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const formPayload = new FormData();
      
      // Basic Info
      formPayload.append('first_name', formData.first_name);
      if (formData.middle_name) formPayload.append('middle_name', formData.middle_name);
      formPayload.append('last_name', formData.last_name);
      formPayload.append('phone', formData.phone);
      if (formData.profile_image) {
        formPayload.append('profile_image', formData.profile_image);
      }

      // Tenant Profile Info
      if (formData.date_of_birth) formPayload.append('date_of_birth', formData.date_of_birth);
      if (formData.current_address) formPayload.append('current_address', formData.current_address);
      if (formData.emergency_contact_name) formPayload.append('emergency_contact_name', formData.emergency_contact_name);
      if (formData.emergency_contact_phone) formPayload.append('emergency_contact_phone', formData.emergency_contact_phone);
      if (formData.emergency_contact_relationship) formPayload.append('emergency_contact_relationship', formData.emergency_contact_relationship);

      // Construct Preferences JSON
      // We send as nested array fields for Laravel to pick up as array
      formPayload.append('preference[room_preference]', formData.room_preference);
      formPayload.append('preference[lifestyle_notes]', formData.lifestyle_notes);
      formPayload.append('preference[smoking]', formData.smoking);
      formPayload.append('preference[pets]', formData.pets);
      formPayload.append('preference[budget_range]', formData.budget_range);

      await tenantService.updateProfile(formPayload);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      // Reload profile to ensure consistency
       fetchProfile();
      
    } catch (error) {
      console.error('Update failed', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Tenant Profile</h1>
        <p className="text-gray-500 text-sm">Update your personal information and preferences.</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="relative group">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <CircleUser className="w-32 h-32 text-gray-300" />
              )}
              
              <label className="absolute bottom-0 right-0 bg-green-600 p-2 rounded-full text-white cursor-pointer hover:bg-green-700 transition shadow-sm">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>
            </div>
            
            <h2 className="mt-4 font-semibold text-lg text-gray-800">
              {formData.first_name} {formData.last_name}
            </h2>
            <p className="text-gray-500 text-sm">{formData.email}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-md font-semibold text-gray-800 mb-4 border-b pb-2">Account Info</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email (Read-only)</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  disabled 
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Change Password</label>
                <button type="button" className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline">
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Personal Information Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-green-500 rounded-full"></span>
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                <input 
                  type="text" 
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              
              <div>
                 <label className="block text-xs font-medium text-gray-700 mb-1">Middle Name</label>
                <input 
                  type="text" 
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input 
                  type="text" 
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                <input 
                  type="date" 
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              
               <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Address</label>
                <textarea 
                  name="current_address"
                  value={formData.current_address}
                  onChange={handleChange}
                  rows="2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Your permanent address (hometown)"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-red-400 rounded-full"></span>
              Emergency Contact
            </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name</label>
                <input 
                  type="text" 
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
              
               <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Relationship</label>
                <input 
                  type="text" 
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="e.g. Parent, Sibling"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone</label>
                <input 
                  type="tel" 
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                />
              </div>
             </div>
          </div>

          {/* Preferences & Lifestyle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              Preferences & Lifestyle
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Room Type</label>
                   <select 
                     name="room_preference" 
                     value={formData.room_preference} 
                     onChange={handleChange}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                   >
                     <option value="">Select preference...</option>
                     <option value="Single">Single Room</option>
                     <option value="Double">Double / Shared</option>
                     <option value="Suite">Suite / Apartment</option>
                   </select>
                </div>
                
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Budget Range (Monthly)</label>
                   <input 
                      type="text"
                      name="budget_range"
                      value={formData.budget_range}
                      onChange={handleChange}
                      placeholder="e.g. 5000-8000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Smoking?</label>
                   <select 
                     name="smoking" 
                     value={formData.smoking} 
                     onChange={handleChange}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                   >
                     <option value="no">No</option>
                     <option value="yes">Yes</option>
                   </select>
                </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Pets?</label>
                   <select 
                     name="pets" 
                     value={formData.pets} 
                     onChange={handleChange}
                     className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                   >
                     <option value="no">No</option>
                     <option value="yes">Yes</option>
                   </select>
                </div>
              </div>

               <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Behaviour & Attitude / About Me
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <textarea 
                  name="lifestyle_notes"
                  value={formData.lifestyle_notes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="Describe your lifestyle, study habits, or any preferences for roommates..."
                ></textarea>
                <p className="text-xs text-gray-400 mt-1">Helps landlords or potential roommates understand your compatibility.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
             <button
               type="submit"
               disabled={saving}
               className={`px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition shadow-lg ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
             >
               {saving ? 'Saving Changes...' : 'Save Profile'}
             </button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default TenantProfile;
