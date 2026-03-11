import React, { useEffect, useState } from 'react';
import { SkeletonNotificationsTab } from '../../Shared/Skeleton';
import { tenantService } from '../../../services/tenantService';
import { useUIState } from '../../../contexts/UIStateContext';
import toast from 'react-hot-toast';

const NotificationsTab = ({ loading: initialLoading = false }) => {
	const { uiState, updateData } = useUIState();
	const cachedProfile = uiState.data?.profile;

	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(!cachedProfile && (initialLoading || true));
	
	const [savedSettings, setSavedSettings] = useState({
		email_booking_updates: true,
		email_payment_reminders: true,
		email_maintenance: false,
		push_messages: true,
		push_booking_updates: true,
	});

	const [settings, setSettings] = useState(savedSettings);

	// Load prefs from backend on mount
	useEffect(() => {
		if (cachedProfile) {
			mapDataToSettings(cachedProfile);
		}
		loadPrefs();
	}, []); // Run once on mount

	const mapDataToSettings = (profile) => {
		if (profile.notification_preferences) {
			const backendPrefs = profile.notification_preferences;
			// Normalize string '1'/'0' values (from old FormData saves) to proper booleans
			// so that '0' doesn't appear truthy and toggle incorrectly as ON.
			const normalized = {};
			Object.keys(backendPrefs).forEach(k => {
				const v = backendPrefs[k];
				normalized[k] = v === true || v === 1 || v === '1';
			});
			const merged = { ...savedSettings, ...normalized };
			setSavedSettings(merged);
			setSettings(merged);
		}
	};

	const loadPrefs = async () => {
		try {
			if (!cachedProfile) setLoading(true);
			const profile = await tenantService.getProfile();
			
			mapDataToSettings(profile);
			updateData('profile', profile);

		} catch (error) {
			console.error('Failed to load notification prefs', error);
		} finally {
			setLoading(false);
		}
	};

	const handleToggle = (key) => {
		if (!isEditing) return;
		setSettings(prev => ({ ...prev, [key]: !prev[key] }));
	};

	const handleEdit = () => {
		setIsEditing(true);
		setSettings(savedSettings);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setSettings(savedSettings);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			// Send as a JSON string so boolean values are preserved correctly.
			// Using `notification_preferences[key] = '1'` via FormData stores strings;
			// '0' is truthy in JS and breaks toggle display. JSON preserves real booleans.
			const formData = new FormData();
			formData.append('notification_preferences', JSON.stringify(settings));

			await tenantService.updateProfile(formData);

			setSavedSettings({ ...settings });
			setIsEditing(false);
			toast.success('Preferences saved successfully');
		} catch (error) {
			console.error('Failed to save notification prefs', error);
			toast.error('Failed to save preferences');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
			{loading ? <SkeletonNotificationsTab /> : null}
			{!loading && (
			<>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
				{!isEditing && (
					<button
						onClick={handleEdit}
						className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
					>
						Edit Preferences
					</button>
				)}
			</div>
      
			<div className="space-y-8">
				<div>
					{/* <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">Email Notifications</h3> */}
					{/* <div className="space-y-4">
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
							label="Maintenance requests"
							description="Receive updates about maintenance requests."
							checked={settings.email_maintenance}
							disabled={!isEditing}
							onChange={() => handleToggle('email_maintenance')}
						/>
					</div> */}
				</div>

				<div>
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">Push Notifications</h3>
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
        
				{isEditing && (
					<div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
						<button
							onClick={handleCancel}
							disabled={saving}
							className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={saving}
							className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70"
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				)}
			</div>
			</>
			)}
		</div>
	);
};

const ToggleItem = ({ label, description, checked, disabled, onChange }) => (
	<div className="flex items-start justify-between">
		<div>
			<p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
			<p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
		</div>
		{disabled ? (
			<span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${checked ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'}`}>
				{checked ? 'Enabled' : 'Disabled'}
			</span>
		) : (
			<button
				onClick={onChange}
				className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
					checked ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
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
