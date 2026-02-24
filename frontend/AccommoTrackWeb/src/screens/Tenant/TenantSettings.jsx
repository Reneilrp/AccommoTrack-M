import React, { useState } from 'react';
import ProfileTab from '../../components/Settings/tenant/ProfileTab';
import PreferencesTab from '../../components/Settings/tenant/PreferencesTab';
import AccountTab from '../../components/Settings/tenant/AccountTab';
import NotificationsTab from '../../components/Settings/tenant/NotificationsTab';
import AppearanceTab from '../../components/Settings/AppearanceTab';
import { User, Sliders, Shield, Bell, Palette } from 'lucide-react';

const TenantSettings = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'preferences', label: 'Preferences & Lifestyle', icon: 'Sliders' },
    { id: 'account', label: 'Account Security', icon: 'Shield' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell' },
    { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
            <nav className="flex flex-col">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left border-l-4 ${
                    activeTab === tab.id
                      ? 'border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon name={tab.icon} className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-300 dark:border-gray-700 p-6 md:p-8">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'preferences' && <PreferencesTab />}
            {activeTab === 'account' && <AccountTab user={user} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

const Icon = ({ name, className }) => {
  switch (name) {
    case 'User': return <User className={className} />;
    case 'Sliders': return <Sliders className={className} />;
    case 'Shield': return <Shield className={className} />;
    case 'Bell': return <Bell className={className} />;
    case 'Palette': return <Palette className={className} />;
    default: return null;
  }
};

export default TenantSettings;
