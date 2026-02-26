import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Shield, 
  Trash2, 
  Mail, 
  Phone, 
  Building2, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CareTakerAccess({
  caretakers,
  setCaretakers,
  caretakerForm,
  setCaretakerForm,
  caretakerPermissions,
  setCaretakerPermissions,
  landlordProperties,
  selectedPropertyIds,
  setSelectedPropertyIds,
  caretakerState,
  setCaretakerState,
  handleCreateCaretaker,
  handleRevokeCaretaker,
  fetchCaretakers,
  resetCaretakerPermissions,
  handlePermissionToggle
}) {
  const [roomPermissionPrompt, setRoomPermissionPrompt] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [selectedCaretaker, setSelectedCaretaker] = useState(null);
  const [revocationModal, setRevocationModal] = useState({ show: false, caretaker: null, reason: '' });
  const [fieldErrors, setFieldErrors] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const navigate = useNavigate();

  // Safe access to props
  const safeCaretakers = caretakers || [];
  const safeProperties = landlordProperties || [];
  const safeSelectedIds = selectedPropertyIds || [];
  const safePermissions = caretakerPermissions || {};
  const safeForm = caretakerForm || { first_name: '', last_name: '', email: '', password: '', password_confirmation: '', phone: '' };
  const safeState = caretakerState || { loading: false, error: '' };

  useEffect(() => {
    if (typeof fetchCaretakers === 'function') {
      fetchCaretakers();
    }
  }, []);

  const CARETAKER_PERMISSION_FIELDS = [
    {
      key: 'bookings',
      label: 'Bookings',
      description: 'View and manage reservation requests.',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      key: 'tenants',
      label: 'Tenants',
      description: 'Access profiles and room assignments.',
      icon: <Users className="w-4 h-4" />,
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'Chat with prospects and residents.',
      icon: <Mail className="w-4 h-4" />,
    },
    {
      key: 'rooms',
      label: 'Room Management',
      description: 'Full control over room availability.',
      icon: <Building2 className="w-4 h-4" />,
    },
  ];

  const validateField = (name, value) => {
    let error = '';
    if (name === 'first_name' || name === 'last_name') {
      if (/\d/.test(value)) error = 'Names cannot contain numbers';
    }
    if (name === 'phone') {
      if (/[a-zA-Z]/.test(value)) error = 'Phone must contain only numbers';
      else if (value && value.length < 10) error = 'Phone number is too short';
    }
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) error = 'Please enter a valid email address';
    }
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (typeof setCaretakerForm === 'function') {
      setCaretakerForm(prev => ({ ...prev, [name]: value }));
    }
    validateField(name, value);
  };

  const handleRevokeConfirm = async () => {
    if (!revocationModal.reason.trim()) {
      toast.error('Please provide a reason for revocation');
      return;
    }
    
    try {
      await handleRevokeCaretaker(revocationModal.caretaker.id, revocationModal.reason);
      setRevocationModal({ show: false, caretaker: null, reason: '' });
      setSelectedCaretaker(null);
      toast.success('Access revoked successfully');
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  const handlePermissionFieldToggle = (key) => {
    if (key === 'rooms' && !caretakerPermissions.rooms) {
      setRoomPermissionPrompt(true);
    } else {
      if (typeof handlePermissionToggle === 'function') {
        handlePermissionToggle(key);
      }
    }
  };

  const confirmRoomPermission = () => {
    setRoomPermissionPrompt(false);
    handlePermissionToggle('rooms');
  };

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Final check for errors
    const errors = {
      first_name: validateField('first_name', safeForm.first_name),
      last_name: validateField('last_name', safeForm.last_name),
      email: validateField('email', safeForm.email),
      phone: validateField('phone', safeForm.phone),
    };

    if (Object.values(errors).some(err => err !== '')) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    if (!safeForm.first_name || !safeForm.last_name || !safeForm.email || !safeForm.password) {
      toast.error('Please fill in all required fields including password');
      return;
    }

    if (safeForm.password !== safeForm.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await handleCreateCaretaker();
    } catch (err) {
      // Error handled by parent
    }
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Creation Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Caretaker</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Grant property management access to a trusted person.</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
                      {/* Details Section */}
                      <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4" /> Personal Information
                        </h3>
            
                        {/* Centralized Error Summary */}
                        {Object.values(fieldErrors).some(err => err !== '') && (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                            <div className="flex gap-3">
                              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">Please correct the following:</p>
                                <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-400 space-y-0.5">
                                  {Object.entries(fieldErrors).map(([key, err]) => err && (
                                    <li key={key}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
            
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">First Name</label>
                            <input
                              name="first_name"
                              type="text"
                              placeholder="e.g. John"
                              value={safeForm.first_name}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 transition-all ${fieldErrors.first_name ? 'border-red-500 ring-red-50' : 'border-gray-200 dark:border-gray-600 focus:ring-green-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">Last Name</label>
                            <input
                              name="last_name"
                              type="text"
                              placeholder="e.g. Doe"
                              value={safeForm.last_name}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 transition-all ${fieldErrors.last_name ? 'border-red-500 ring-red-50' : 'border-gray-200 dark:border-gray-600 focus:ring-green-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">Email Address</label>
                            <input
                              name="email"
                              type="email"
                              placeholder="caretaker@example.com"
                              value={safeForm.email}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 transition-all ${fieldErrors.email ? 'border-red-500 ring-red-50' : 'border-gray-200 dark:border-gray-600 focus:ring-green-500'}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">Phone (Optional)</label>
                            <input
                              name="phone"
                              type="text"
                              placeholder="09123456789"
                              value={safeForm.phone}
                              onChange={handleInputChange}
                              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 transition-all ${fieldErrors.phone ? 'border-red-500 ring-red-50' : 'border-gray-200 dark:border-gray-600 focus:ring-green-500'}`}
                            />
                          </div>                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">Account Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? "text" : "password"}
                      placeholder="••••••••"
                      value={safeForm.password}
                      onChange={(e) => setCaretakerForm && setCaretakerForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? "text" : "password"}
                      placeholder="••••••••"
                      value={safeForm.password_confirmation}
                      onChange={(e) => setCaretakerForm && setCaretakerForm(f => ({ ...f, password_confirmation: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-green-500 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Permissions Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" /> Module Permissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {CARETAKER_PERMISSION_FIELDS.map((field) => (
                  <label
                    key={field.key}
                    className={`flex flex-col p-4 rounded-2xl border transition-all cursor-pointer group ${
                      safePermissions[field.key] 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-1 ring-green-100 dark:ring-green-900/30' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${safePermissions[field.key] ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                        {field.icon}
                      </div>
                      <input
                        type="checkbox"
                        checked={!!safePermissions[field.key]}
                        onChange={() => handlePermissionFieldToggle(field.key)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{field.label}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-1">{field.description}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Properties Section */}
            {safeProperties.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Assigned Properties
                </h3>
                <div className="flex flex-wrap gap-2">
                  {safeProperties.map((property) => (
                    <label 
                      key={property.id} 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                        safeSelectedIds.includes(property.id)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={safeSelectedIds.includes(property.id)}
                        onChange={e => {
                          if (typeof setSelectedPropertyIds === 'function') {
                            if (e.target.checked) setSelectedPropertyIds(ids => [...(ids || []), property.id]);
                            else setSelectedPropertyIds(ids => (ids || []).filter(id => id !== property.id));
                          }
                        }}
                        className="hidden"
                      />
                      <span>{property.name}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-50 dark:border-gray-700">
              <button
                className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={handleRegister}
                disabled={safeState.loading}
              >
                {safeState.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {safeState.loading ? 'Creating Account...' : 'Confirm & Add Caretaker'}
              </button>
              <button
                className="px-6 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all"
                onClick={resetCaretakerPermissions}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* List Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Current Caretakers</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{safeCaretakers.length} active staff members</p>
              </div>
            </div>
          </div>

          <div className="p-0">
            {safeState.loading && safeCaretakers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="font-medium">Fetching team members...</p>
              </div>
            ) : safeCaretakers.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <Users className="w-16 h-16 text-gray-200" />
                <p className="font-medium text-lg">No caretakers assigned yet</p>
                <p className="text-sm max-w-xs">Once you add staff members, they will appear here with their assigned properties.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 dark:bg-gray-700/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">Assigned to</th>
                      <th className="px-6 py-4">Permissions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {safeCaretakers.map((c) => {
                      const obj = c?.caretaker || {};
                      const name = `${obj.first_name || ''} ${obj.last_name || ''}`.trim() || 'Staff Member';
                      const assigned = c?.assigned_properties || [];
                      const profileImage = obj.profile_image;
                      
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {profileImage ? (
                                <img 
                                  src={profileImage} 
                                  alt={name} 
                                  className="w-10 h-10 rounded-full object-cover border-2 border-green-100 dark:border-green-900"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {name[0] || 'S'}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{name}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{obj.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {assigned.length > 0 ? assigned.map(p => (
                                <span key={p.id} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold border border-gray-200 dark:border-gray-600">
                                  {p.name || p.title}
                                </span>
                              )) : (
                                <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> No assignment
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1.5">
                              {Object.entries(c.permissions || {}).map(([key, val]) => (
                                <div key={key} title={key} className={`w-2 h-2 rounded-full ${val ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedCaretaker(c)}
                              className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-green-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Caretaker Details Modal */}
      {selectedCaretaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Caretaker Details</h3>
              <button 
                onClick={() => setSelectedCaretaker(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              {/* Identity Section - Vertical Split with 2 column base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-gray-50/50 dark:bg-gray-700/30 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700">
                
                {/* Left Column: Picture & Name (Stacked) */}
                <div className="flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="relative group">
                    {selectedCaretaker.caretaker?.profile_image ? (
                      <img 
                        src={selectedCaretaker.caretaker.profile_image} 
                        className="w-56 h-56 rounded-[2rem] object-cover border-4 border-white dark:border-gray-800 shadow-2xl"
                        alt="Profile"
                      />
                    ) : (
                      <div className="w-56 h-56 bg-green-600 rounded-[2rem] flex items-center justify-center text-white text-8xl font-bold shadow-2xl shadow-green-200 dark:shadow-none border-4 border-white dark:border-gray-800">
                        {selectedCaretaker.caretaker?.first_name?.[0] || 'S'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.2em] mb-1">Caretaker Account</p>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                      {selectedCaretaker.caretaker?.first_name} {selectedCaretaker.caretaker?.last_name}
                    </h3>
                  </div>
                </div>

                {/* Right Column: Key Details */}
                <div className="flex flex-col justify-center space-y-5 border-l border-gray-200 dark:border-gray-600 md:pl-10">
                  <div className="flex items-center gap-4 group">
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                      <Mail className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{selectedCaretaker.caretaker?.email}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 group">
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                      <Phone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedCaretaker.caretaker?.phone || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gender</p>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200 capitalize">{selectedCaretaker.caretaker?.gender || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Age</p>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {selectedCaretaker.caretaker?.date_of_birth 
                          ? `${Math.floor((new Date() - new Date(selectedCaretaker.caretaker.date_of_birth)) / 31557600000)} Years Old`
                          : 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Module Permissions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedCaretaker.permissions || {})
                    .filter(([key]) => key !== 'properties')
                    .map(([key, val]) => (
                    <div 
                      key={key} 
                      className={`flex items-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
                        val 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-400' 
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700 text-gray-400'
                      }`}
                    >
                      {val ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span className="capitalize">{key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Properties Section in Modal */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Managed Properties
                </p>
                <div className="space-y-2">
                  {(selectedCaretaker.assigned_properties || []).length > 0 ? (
                    (selectedCaretaker.assigned_properties || []).map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-2xl">
                        <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                          {p.name || p.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-bold italic text-center">No properties assigned to this caretaker.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 grid grid-cols-2 gap-3">
              <button
                onClick={() => setRevocationModal({ show: true, caretaker: selectedCaretaker, reason: '' })}
                className="py-3 px-4 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Revoke Access
              </button>
              <button
                onClick={() => setSelectedCaretaker(null)}
                className="py-3 px-4 rounded-2xl bg-gray-900 dark:bg-green-600 text-white font-bold hover:bg-black dark:hover:bg-green-700 transition-all shadow-lg shadow-gray-200 dark:shadow-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Reason Modal */}
      {revocationModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Revoke Access</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to remove <span className="font-bold text-gray-900 dark:text-white">{revocationModal.caretaker?.caretaker?.first_name}</span>? This action is permanent.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Reason for Revocation</label>
                <textarea
                  value={revocationModal.reason}
                  onChange={(e) => setRevocationModal({ ...revocationModal, reason: e.target.value })}
                  placeholder="e.g. End of contract, Security concerns..."
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-red-500 transition-all min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setRevocationModal({ show: false, caretaker: null, reason: '' })}
                  className="py-3 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeConfirm}
                  className="py-3 px-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {roomPermissionPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security Alert</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enabling <span className="font-bold text-gray-900 dark:text-white">Room Management</span> allows caretakers to modify availability and tenant placements. Are you sure?
              </p>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => setRoomPermissionPrompt(false)}
                  className="py-3 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRoomPermission}
                  className="py-3 px-4 rounded-2xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
                >
                  Grant Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
