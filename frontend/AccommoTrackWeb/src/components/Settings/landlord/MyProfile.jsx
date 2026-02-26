
import React from 'react';

export default function MyProfile({ user, profileData, setProfileData, isEditingProfile, setIsEditingProfile, handleSaveProfile, profilePhoto, setProfilePhoto, photoPreview, setPhotoPreview, isUploadingPhoto, setIsUploadingPhoto, fileInputRef, handlePhotoSelect, handlePhotoUpload, handleRemovePhoto }) {
  // Helper to get initials for avatar fallback
  const getUserInitials = () => {
    if (!profileData.firstName && !profileData.lastName) return '?';
    return `${(profileData.firstName?.[0] || '').toUpperCase()}${(profileData.lastName?.[0] || '').toUpperCase()}`;
  };
  const getImageUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('http')) return img;
    return img;
  };
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 transition-all ${isEditingProfile ? 'border-green-300 dark:border-green-600 ring-2 ring-green-100 dark:ring-green-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        {!isEditingProfile && (
          <button
            onClick={() => setIsEditingProfile(true)}
            className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Avatar Only */}
        <div className="md:col-span-1">
          <div className={`flex flex-col items-center justify-center h-full p-6 rounded-xl border transition-all ${isEditingProfile ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'}`}> 
            {/* Profile Photo */}
            <div className="relative mb-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden transition-all ${isEditingProfile ? 'ring-4 ring-green-300 dark:ring-green-600' : ''} ${(photoPreview || profilePhoto) ? '' : (isEditingProfile ? 'bg-green-200 dark:bg-green-800' : 'bg-green-100 dark:bg-green-900')}`}> 
                {photoPreview || profilePhoto ? (
                  <img 
                    src={photoPreview || getImageUrl(profilePhoto)} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-green-600 font-semibold">{getUserInitials()}</span>
                )}
              </div>
              {/* Remove photo button */}
              {isEditingProfile && (photoPreview || profilePhoto) && (
                <button
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                  title="Remove photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
              {profileData.firstName} {profileData.lastName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'Landlord'}</p>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />
            {isEditingProfile && (
              <div className="mt-4 flex flex-col gap-2 w-full">
                {photoPreview ? (
                  <>
                    <button
                      onClick={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Upload Photo
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setPhotoPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="w-full px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium text-sm"
                  >
                    {profilePhoto ? 'Change Photo' : 'Add Photo'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right Column - Profile Details */}
        <div className="md:col-span-2">
          <div className="space-y-4">
            {isEditingProfile ? (
              // Edit Mode - Form inputs with green accent
              <>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit your profile information below
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={e => setProfileData({ ...profileData, firstName: e.target.value })}
                          className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={e => setProfileData({ ...profileData, lastName: e.target.value })}
                          className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                        placeholder="+63 XXX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>
                {/* Account Info Card */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Account Information</p>
                  <div className="flex gap-6">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Role: <span className="font-semibold capitalize">{user?.role || 'Landlord'}</span>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Member since: <span className="font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-2">
                  <button 
                    onClick={() => {
                      setProfileData({
                        firstName: user.first_name || '',
                        lastName: user.last_name || '',
                        email: user.email || '',
                        phone: user.phone || ''
                      });
                      setIsEditingProfile(false);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleSaveProfile();
                      setIsEditingProfile(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              // View Mode - Clean read-only display
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">First Name</label>
                    <p className="text-gray-900 dark:text-white font-medium text-lg">{profileData.firstName || '-'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Last Name</label>
                    <p className="text-gray-900 dark:text-white font-medium text-lg">{profileData.lastName || '-'}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
                  <p className="text-gray-900 dark:text-white font-medium text-lg">{profileData.email || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Phone Number</label>
                  <p className="text-gray-900 dark:text-white font-medium text-lg">
                    {(!profileData.phone || profileData.phone === '-') ? (
                      <button
                        type="button"
                        className="text-green-600 hover:underline font-medium"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        + Add phone number
                      </button>
                    ) : profileData.phone}
                  </p>
                </div>
                {/* Account Info Card */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Account Information</p>
                  <div className="flex gap-6">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Role: <span className="font-semibold capitalize">{user?.role || 'Landlord'}</span>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Member since: <span className="font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
