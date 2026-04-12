import React from 'react';

export default function Security({
  accessRole,
  passwordData,
  setPasswordData,
  isEditingPassword,
  setIsEditingPassword,
  handleUpdatePassword,
  security,
  setSecurity,
  isEditingSecurity,
  setIsEditingSecurity,
  handleCancelSecurityEdit,
  handleUpdateSecurity,
  isSavingSecurity,
  emailRecoveryOtpCode,
  setEmailRecoveryOtpCode,
  handleSendEmailRecoveryOtp,
  handleVerifyEmailRecoveryOtp,
  handleDisableEmailRecoveryOtp,
  isSendingEmailRecoveryOtp,
  isVerifyingEmailRecoveryOtp,
  isDisablingEmailRecoveryOtp,
}) {
  const isLandlord = accessRole === 'landlord';
  const isEmailRecoveryEnabled = Boolean(security?.emailRecoveryEnabled);
  const emailRecoveryVerifiedAt = security?.emailRecoveryVerifiedAt || null;
  const isEmailRecoveryVerified = isEmailRecoveryEnabled && Boolean(emailRecoveryVerifiedAt);
  const isEmailRecoveryLoading = isSendingEmailRecoveryOtp || isVerifyingEmailRecoveryOtp || isDisablingEmailRecoveryOtp;

  const formatVerifiedAt = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 transition-all ${isEditingPassword ? 'border-green-300 dark:border-green-600 ring-2 ring-green-100 dark:ring-green-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Password</h2>
            {isEditingPassword && (
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                Editing
              </span>
            )}
          </div>
          {!isEditingPassword && (
            <button
              onClick={() => setIsEditingPassword(true)}
              className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Change Password
            </button>
          )}
        </div>
        {isEditingPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Enter your current and new password below
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setIsEditingPassword(false);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePassword}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Password Protected</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your account is secured with a password</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6 transition-all ${isEditingSecurity ? 'border-green-300 dark:border-green-600 ring-2 ring-green-100 dark:ring-green-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security Settings</h2>
            {isEditingSecurity && (
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                Editing
              </span>
            )}
          </div>
          {!isEditingSecurity && (
            <button
              onClick={() => setIsEditingSecurity(true)}
              className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Settings
            </button>
          )}
        </div>
        {isEditingSecurity && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <p className="text-sm text-green-700 dark:text-green-400">Toggle the switches below to change your security settings</p>
          </div>
        )}
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-lg transition-all ${
            isEditingSecurity ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700'
          }`}>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
            </div>
            <button
              type="button"
              onClick={() => isEditingSecurity && setSecurity({...security, twoFactorAuth: !security.twoFactorAuth})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                security.twoFactorAuth ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${!isEditingSecurity ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!isEditingSecurity}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                security.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className={`flex items-center justify-between p-4 rounded-lg transition-all ${
            isEditingSecurity ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700'
          }`}>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Login Alerts</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified of new logins</p>
            </div>
            <button
              type="button"
              onClick={() => isEditingSecurity && setSecurity({...security, loginAlerts: !security.loginAlerts})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                security.loginAlerts ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${!isEditingSecurity ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!isEditingSecurity}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                security.loginAlerts ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
        {isEditingSecurity && (
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              onClick={handleCancelSecurityEdit}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateSecurity}
              disabled={isSavingSecurity}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingSecurity ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
      {isLandlord && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4 gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Recovery Verification</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enable this from Settings to allow landlord forgot password and reset password.
              </p>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              isEmailRecoveryVerified
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : isEmailRecoveryEnabled
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {isEmailRecoveryVerified ? 'Verified' : isEmailRecoveryEnabled ? 'Pending Verification' : 'Disabled'}
            </span>
          </div>

          {!isEmailRecoveryEnabled && (
            <button
              type="button"
              onClick={handleSendEmailRecoveryOtp}
              disabled={isEmailRecoveryLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSendingEmailRecoveryOtp ? 'Sending OTP...' : 'Enable and Send OTP'}
            </button>
          )}

          {isEmailRecoveryEnabled && !isEmailRecoveryVerified && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Enter the 6-digit code sent to your account email to finish enabling recovery.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailRecoveryOtpCode}
                onChange={(e) => setEmailRecoveryOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full md:w-64 px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 dark:text-white"
                placeholder="Enter 6-digit OTP"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleVerifyEmailRecoveryOtp}
                  disabled={isEmailRecoveryLoading || (emailRecoveryOtpCode || '').length !== 6}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isVerifyingEmailRecoveryOtp ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailRecoveryOtp}
                  disabled={isEmailRecoveryLoading}
                  className="px-4 py-2 border border-green-600 dark:border-green-500 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSendingEmailRecoveryOtp ? 'Sending...' : 'Resend OTP'}
                </button>
                <button
                  type="button"
                  onClick={handleDisableEmailRecoveryOtp}
                  disabled={isEmailRecoveryLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDisablingEmailRecoveryOtp ? 'Disabling...' : 'Disable'}
                </button>
              </div>
            </div>
          )}

          {isEmailRecoveryVerified && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Verified on {formatVerifiedAt(emailRecoveryVerifiedAt)}
              </p>
              <button
                type="button"
                onClick={handleDisableEmailRecoveryOtp}
                disabled={isEmailRecoveryLoading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDisablingEmailRecoveryOtp ? 'Disabling...' : 'Disable Email Recovery'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
