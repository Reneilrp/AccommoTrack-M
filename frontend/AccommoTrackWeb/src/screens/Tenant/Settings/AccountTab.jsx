import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';

const AccountTab = ({ user }) => {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isEditing, setIsEditing] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Check mismatch on typing
  useEffect(() => {
    if (passwordData.confirm_password) {
      setPasswordsMatch(passwordData.new_password === passwordData.confirm_password);
    } else {
      setPasswordsMatch(true); // Reset to true if confirm is empty to hide error
    }
  }, [passwordData.new_password, passwordData.confirm_password]);

  const toggleEdit = () => {
    if (isEditing) {
      // Cancelled: Clear password fields
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setMessage({ type: '', text: '' });
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      setSaving(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      setSaving(false);
      return;
    }

    try {
      await tenantService.changePassword(
        passwordData.current_password,
        passwordData.new_password,
        passwordData.confirm_password
      );
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setIsEditing(false);
    } catch (error) {
      console.error('Password change failed', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to change password. Please check your current password.' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Account Security</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Edit Security
          </button>
        )}
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Container restricted to ~40% width on md screens */}
      <div className="w-full md:w-[40%] min-w-[300px] space-y-8">
        
        {/* Email Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Email Address</h3>
          <p className="text-xs text-gray-500 mb-4">Used for login and notifications.</p>
          <div className="flex flex-col gap-2">
             <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 border-none rounded-lg bg-gray-100 text-gray-600 outline-none ring-0"
            />
          </div>
        </div>

        {/* Change Password Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                name="current_password"
                value={passwordData.current_password}
                onChange={handleChange}
                required
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                name="new_password"
                value={passwordData.new_password}
                onChange={handleChange}
                required
                minLength={8}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handleChange}
                required
                minLength={8}
                disabled={!isEditing}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500 ${
                  !passwordsMatch && passwordData.confirm_password 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:border-brand-500 focus:ring-brand-200'
                }`}
              />
              {/* Match Indicator */}
              <div className="mt-2 h-5">
                {passwordData.confirm_password && (
                  passwordsMatch ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Passwords match
                    </p>
                  ) : (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      Passwords do not match
                    </p>
                  )
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end pt-2 gap-3">
                <button
                  type="button"
                  onClick={toggleEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !passwordsMatch}
                  className={`px-6 py-2 bg-brand-600 text-white rounded-lg font-medium shadow-sm hover:bg-brand-700 transition-colors ${
                    (saving || !passwordsMatch) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountTab;
