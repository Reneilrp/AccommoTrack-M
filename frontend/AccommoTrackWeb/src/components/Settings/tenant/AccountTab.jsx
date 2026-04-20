import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { showSuccess, showError } from '../../../utils/toast';
import { tenantService } from '../../../services/tenantService';
import { SkeletonAccountTab } from '../../Shared/Skeleton';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const AccountTab = ({ user, onUserUpdate }) => {
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [twoFactorOtpCode, setTwoFactorOtpCode] = useState('');
    const [twoFactorState, setTwoFactorState] = useState({
        enabled: false,
        verifiedAt: null,
        enrollmentPending: false,
    });
    const [isRefreshingTwoFactor, setIsRefreshingTwoFactor] = useState(false);
    const [isSendingTwoFactorOtp, setIsSendingTwoFactorOtp] = useState(false);
    const [isVerifyingTwoFactorOtp, setIsVerifyingTwoFactorOtp] = useState(false);
    const [isDisablingTwoFactor, setIsDisablingTwoFactor] = useState(false);

    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [passwordsMatch, setPasswordsMatch] = useState(true);

    const complexity = useMemo(() => {
        const pw = passwordData.new_password;
        return {
            minLength: pw.length >= 8,
            hasUppercase: /[A-Z]/.test(pw),
            hasLowercase: /[a-z]/.test(pw),
            hasNumber: /[0-9]/.test(pw),
        };
    }, [passwordData.new_password]);

    const allComplexityMet =
        complexity.minLength &&
        complexity.hasUppercase &&
        complexity.hasLowercase &&
        complexity.hasNumber;

    const isSameAsOld =
        passwordData.new_password.length > 0 &&
        passwordData.current_password.length > 0 &&
        passwordData.new_password === passwordData.current_password;

    const parseTwoFactorState = useCallback((sourceUser) => {
        const security = sourceUser?.preferences?.security;
        if (!security || typeof security !== 'object') {
            return {
                enabled: false,
                verifiedAt: null,
                enrollmentPending: false,
            };
        }

        return {
            enabled: Boolean(security.twoFactorAuth),
            verifiedAt: security.twoFactorVerifiedAt || null,
            enrollmentPending: Boolean(security.twoFactorEnrollmentPending),
        };
    }, []);

    const applyStatusPayload = useCallback((payload) => {
        if (!payload || typeof payload !== 'object') return;

        setTwoFactorState({
            enabled: Boolean(payload.enabled),
            verifiedAt: payload.verified_at || null,
            enrollmentPending: Boolean(payload.enrollment_pending),
        });
    }, []);

    const applyUserUpdate = useCallback(
        (nextUser) => {
            if (!nextUser) return;
            setTwoFactorState(parseTwoFactorState(nextUser));
            if (onUserUpdate) {
                onUserUpdate(nextUser);
            }
        },
        [onUserUpdate, parseTwoFactorState],
    );

    const formatVerifiedAt = (timestamp) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return timestamp;
        return date.toLocaleString();
    };

    const refreshTwoFactorStatus = useCallback(async () => {
        if (!user) return;

        setIsRefreshingTwoFactor(true);
        try {
            const response = await tenantService.getTenantTwoFactorStatus();
            if (response.success && response.twoFactor) {
                applyStatusPayload(response.twoFactor);
            }
        } finally {
            setIsRefreshingTwoFactor(false);
        }
    }, [applyStatusPayload, user]);

    const handleSendTwoFactorOtp = async () => {
        setIsSendingTwoFactorOtp(true);
        try {
            const response = await tenantService.sendTenantTwoFactorOtp();
            if (!response.success) {
                showError(response.error || 'Failed to send verification code.');
                return;
            }

            setTwoFactorOtpCode('');
            if (response.data) {
                applyUserUpdate(response.data);
            }
            if (response.twoFactor) {
                applyStatusPayload(response.twoFactor);
            }

            showSuccess(response.message || 'Verification code sent to your email address.');
        } finally {
            setIsSendingTwoFactorOtp(false);
        }
    };

    const handleVerifyTwoFactorOtp = async () => {
        const normalizedCode = (twoFactorOtpCode || '').trim();
        if (!/^\d{6}$/.test(normalizedCode)) {
            showError('Please enter the 6-digit verification code.');
            return;
        }

        setIsVerifyingTwoFactorOtp(true);
        try {
            const response = await tenantService.verifyTenantTwoFactorOtp(normalizedCode);
            if (!response.success) {
                showError(response.error || 'Failed to verify code.');
                return;
            }

            setTwoFactorOtpCode('');
            if (response.data) {
                applyUserUpdate(response.data);
            }
            if (response.twoFactor) {
                applyStatusPayload(response.twoFactor);
            }

            showSuccess(response.message || 'Two-factor authentication enabled successfully.');
        } finally {
            setIsVerifyingTwoFactorOtp(false);
        }
    };

    const handleDisableTwoFactor = async () => {
        setIsDisablingTwoFactor(true);
        try {
            const response = await tenantService.disableTenantTwoFactor();
            if (!response.success) {
                showError(response.error || 'Failed to disable two-factor authentication.');
                return;
            }

            setTwoFactorOtpCode('');
            if (response.data) {
                applyUserUpdate(response.data);
            }
            if (response.twoFactor) {
                applyStatusPayload(response.twoFactor);
            }

            showSuccess(response.message || 'Two-factor authentication has been disabled.');
        } finally {
            setIsDisablingTwoFactor(false);
        }
    };

    const canSubmit =
        !saving &&
        passwordsMatch &&
        allComplexityMet &&
        !isSameAsOld &&
        passwordData.current_password.length > 0 &&
        passwordData.new_password.length > 0 &&
        passwordData.confirm_password.length > 0;

    const isTwoFactorEnabled = Boolean(twoFactorState.enabled);
    const isTwoFactorVerified = isTwoFactorEnabled && Boolean(twoFactorState.verifiedAt);
    const isTwoFactorPending = !isTwoFactorVerified && Boolean(twoFactorState.enrollmentPending);
    const isTwoFactorActionLoading =
        isSendingTwoFactorOtp || isVerifyingTwoFactorOtp || isDisablingTwoFactor;

    const toggleEdit = () => {
        if (isEditing) {
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: '',
            });
        }
        setIsEditing(!isEditing);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswordData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        if (passwordData.new_password !== passwordData.confirm_password) {
            showError('New passwords do not match.');
            setSaving(false);
            return;
        }

        if (!allComplexityMet) {
            showError('Password does not meet complexity requirements.');
            setSaving(false);
            return;
        }

        if (isSameAsOld) {
            showError('New password must be different from current password.');
            setSaving(false);
            return;
        }

        try {
            const response = await tenantService.changePassword(
                passwordData.current_password,
                passwordData.new_password,
                passwordData.confirm_password,
            );

            if (!response.success) {
                showError(response.error || 'Failed to change password. Please check your current password.');
                return;
            }

            showSuccess('Password changed successfully!');
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
            setIsEditing(false);
        } catch (error) {
            console.error('Password change failed', error);
            showError(error.response?.data?.message || 'Failed to change password. Please check your current password.');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (passwordData.confirm_password) {
            setPasswordsMatch(passwordData.new_password === passwordData.confirm_password);
        } else {
            setPasswordsMatch(true);
        }
    }, [passwordData.new_password, passwordData.confirm_password]);

    useEffect(() => {
        setTwoFactorState(parseTwoFactorState(user));
    }, [parseTwoFactorState, user]);

    useEffect(() => {
        if (!user) return;
        refreshTwoFactorStatus();
    }, [refreshTwoFactorStatus, user]);

    const ComplexityItem = ({ met, label }) => (
        <li
            className={`flex items-center gap-2.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'
                }`}
        >
            {met ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {label}
        </li>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
            {!user && <SkeletonAccountTab />}
            {user && (
                <>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Security</h2>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                            >
                                Edit Security
                            </button>
                        )}
                    </div>

                    <div className="w-full md:w-[40%] min-w-[300px] space-y-8">
                        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Email Address</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Used for login and notifications.</p>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 border-none rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 outline-none ring-0"
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        name="current_password"
                                        value={passwordData.current_password}
                                        onChange={handleChange}
                                        required
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        name="new_password"
                                        value={passwordData.new_password}
                                        onChange={handleChange}
                                        required
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
                                    />

                                    {isSameAsOld && (
                                        <p className="mt-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            New password must be different from your current password
                                        </p>
                                    )}

                                    {isEditing && passwordData.new_password.length > 0 && (
                                        <ul className="mt-2 space-y-2">
                                            <ComplexityItem met={complexity.minLength} label="At least 8 characters" />
                                            <ComplexityItem met={complexity.hasUppercase} label="One uppercase letter" />
                                            <ComplexityItem met={complexity.hasLowercase} label="One lowercase letter" />
                                            <ComplexityItem met={complexity.hasNumber} label="One number" />
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        value={passwordData.confirm_password}
                                        onChange={handleChange}
                                        required
                                        disabled={!isEditing}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 ${!passwordsMatch && passwordData.confirm_password
                                                ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800'
                                                : 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-200 dark:focus:ring-green-800'
                                            }`}
                                    />
                                    <div className="mt-2 h-5">
                                        {passwordData.confirm_password &&
                                            (passwordsMatch ? (
                                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Passwords match
                                                </p>
                                            ) : (
                                                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                                    <XCircle className="w-4 h-4" />
                                                    Passwords do not match
                                                </p>
                                            ))}
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex justify-end pt-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={toggleEdit}
                                            disabled={saving}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!canSubmit}
                                            className={`px-6 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors ${!canSubmit ? 'opacity-70 cursor-not-allowed' : ''
                                                }`}
                                        >
                                            {saving ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Requires an email code when login is from a new IP or incognito/new session.
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 text-xs font-semibold rounded-full ${isTwoFactorVerified
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : isTwoFactorPending
                                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {isTwoFactorVerified ? 'Enabled' : isTwoFactorPending ? 'Pending Verification' : 'Disabled'}
                                </span>
                            </div>

                            {isTwoFactorVerified && twoFactorState.verifiedAt && (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Verified on {formatVerifiedAt(twoFactorState.verifiedAt)}
                                </p>
                            )}

                            {!isTwoFactorEnabled && !isTwoFactorPending && (
                                <button
                                    type="button"
                                    onClick={handleSendTwoFactorOtp}
                                    disabled={isTwoFactorActionLoading || isRefreshingTwoFactor}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSendingTwoFactorOtp ? 'Sending OTP...' : 'Enable and Send OTP'}
                                </button>
                            )}

                            {isTwoFactorPending && (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={twoFactorOtpCode}
                                        onChange={(e) => setTwoFactorOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter 6-digit OTP"
                                    />

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleVerifyTwoFactorOtp}
                                            disabled={isTwoFactorActionLoading || (twoFactorOtpCode || '').length !== 6}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isVerifyingTwoFactorOtp ? 'Verifying...' : 'Verify OTP'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSendTwoFactorOtp}
                                            disabled={isTwoFactorActionLoading || isRefreshingTwoFactor}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isSendingTwoFactorOtp ? 'Sending...' : 'Resend OTP'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(isTwoFactorEnabled || isTwoFactorPending) && (
                                <button
                                    type="button"
                                    onClick={handleDisableTwoFactor}
                                    disabled={isTwoFactorActionLoading || isRefreshingTwoFactor}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isDisablingTwoFactor ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AccountTab;
