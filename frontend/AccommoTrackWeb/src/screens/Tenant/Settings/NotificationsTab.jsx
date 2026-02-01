import React, { useState } from 'react';

const NotificationsTab = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedSettings, setSavedSettings] = useState({
    email_booking_updates: true,
    email_payment_reminders: true,
    email_marketing: false,
    push_messages: true,
    push_booking_updates: true,
  });
  
  // Temporary state for editing
  const [settings, setSettings] = useState(savedSettings);

  const handleToggle = (key) => {
    if (!isEditing) return;
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Sync current settings to edit state just in case
    setSettings(savedSettings);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Revert to saved settings
    setSettings(savedSettings);
  };

  const handleSave = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setSavedSettings(settings); // Persist changes
      setIsEditing(false);
      setLoading(false);
    }, 800);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Edit Preferences
          </button>
        )}
      </div>
      
      <div className="space-y-8">
        {/* Email Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Email Notifications</h3>
          <div className="space-y-4">
            <ToggleItem 
              label="Booking Updates"
              description="Receive emails when your booking status changes."
              checked={settings.email_booking_updates}
              disabled={!isEditing}
              onChange={() => handleToggle('email_booking_updates')}
            />
            <ToggleItem 
              label="Payment Reminders"
              description="Get reminded before your rent is due."
              checked={settings.email_payment_reminders}
              disabled={!isEditing}
              onChange={() => handleToggle('email_payment_reminders')}
            />
             <ToggleItem 
              label="Marketing & Promos"
              description="Receive news about new properties and features."
              checked={settings.email_marketing}
              disabled={!isEditing}
              onChange={() => handleToggle('email_marketing')}
            />
          </div>
        </div>

        {/* Push Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Push Notifications</h3>
          <div className="space-y-4">
            <ToggleItem 
              label="New Messages"
              description="Get notified when a landlord messages you."
              checked={settings.push_messages}
              disabled={!isEditing}
              onChange={() => handleToggle('push_messages')}
            />
            <ToggleItem 
              label="Booking Status"
              description="Instant alerts for booking confirmations."
              checked={settings.push_booking_updates}
              disabled={!isEditing}
              onChange={() => handleToggle('push_booking_updates')}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ToggleItem = ({ label, description, checked, disabled, onChange }) => (
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    {disabled ? (
      <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${checked ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
        {checked ? 'Enabled' : 'Disabled'}
      </span>
    ) : (
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${
          checked ? 'bg-brand-600' : 'bg-gray-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    )}
  </div>
);

export default NotificationsTab;
