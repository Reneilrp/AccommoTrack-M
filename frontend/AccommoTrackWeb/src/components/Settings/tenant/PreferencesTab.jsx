import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { SkeletonPreferencesTab } from '../../Shared/Skeleton';

const PreferencesTab = () => {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState({ type: '', text: '' });
	const [isEditing, setIsEditing] = useState(false);

	const [formData, setFormData] = useState({
		room_preference: '',
		budget_range: '',
		attitude: '',
		behavior: '',
		lifestyle: '',
	});

	useEffect(() => {
		fetchPreferences();
	}, []);

	const fetchPreferences = async () => {
		try {
			setLoading(true);
			const data = await tenantService.getProfile();
			let prefs = data.tenant_profile?.preference || {};
      
			if (typeof prefs === 'string') {
				try {
					prefs = JSON.parse(prefs);
				} catch (e) {
					prefs = {};
				}
			}

			setFormData({
				room_preference: prefs.room_preference || '',
				budget_range: prefs.budget_range || '',
				attitude: prefs.attitude || '',
				behavior: prefs.behavior || '',
				lifestyle: prefs.lifestyle || (prefs.lifestyle_notes || ''),
			});
		} catch (error) {
			console.error('Failed to load preferences', error);
			setMessage({ type: 'error', text: 'Failed to load preferences.' });
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);
		setMessage({ type: '', text: '' });

		try {
			const data = new FormData();
			data.append('preference[room_preference]', formData.room_preference);
			data.append('preference[budget_range]', formData.budget_range);
			data.append('preference[attitude]', formData.attitude);
			data.append('preference[behavior]', formData.behavior);
			data.append('preference[lifestyle]', formData.lifestyle);
			data.append('preference[lifestyle_notes]', formData.lifestyle);
      
			await tenantService.updateProfile(data);
			setMessage({ type: 'success', text: 'Preferences updated successfully!' });
		} catch (error) {
			console.error('Update failed', error);
			setMessage({ type: 'error', text: 'Failed to update preferences.' });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <SkeletonPreferencesTab />;

	const toggleEdit = () => {
		if (isEditing) {
			fetchPreferences();
		}
		setIsEditing(!isEditing);
		setMessage({ type: '', text: '' });
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-bold text-gray-900 dark:text-white">Preferences & Lifestyle</h2>
				{!isEditing && (
						<button
						onClick={() => setIsEditing(true)}
						className="px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
						>
						Edit Preferences
						</button>
				)}
			</div>
      
			{message.text && (
				<div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
					{message.text}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Room Preference</label>
						<select
							name="room_preference"
							value={formData.room_preference}
							onChange={handleChange}
							disabled={!isEditing}
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
						>
							<option value="">Select preference</option>
							<option value="Single">Single Room</option>
							<option value="Double">Double Room</option>
							<option value="Dormitory">Dormitory</option>
							<option value="Any">Any</option>
						</select>
					</div>
          
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Budget Range (Monthly)</label>
						<select
							name="budget_range"
							value={formData.budget_range}
							onChange={handleChange}
							disabled={!isEditing}
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
						>
							<option value="">Select budget</option>
							<option value="<2000">Below ₱2,000</option>
							<option value="2000-4000">₱2,000 - ₱4,000</option>
							<option value="4000-6000">₱4,000 - ₱6,000</option>
							<option value="6000+">Above ₱6,000</option>
						</select>
					</div>
				</div>

				<div className="border-t border-gray-200 dark:border-gray-700 pt-6">
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Traits (Optional)</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
						Help landlords get to know you better by describing your habits and personality.
					</p>

					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Attitude</label>
							<input
								type="text"
								name="attitude"
								value={formData.attitude}
								onChange={handleChange}
								disabled={!isEditing}
								placeholder="e.g., Friendly, Introverted, Outgoing"
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Behavior</label>
							<input
								type="text"
								name="behavior"
								value={formData.behavior}
								onChange={handleChange}
								disabled={!isEditing}
								placeholder="e.g., Quiet, Clean, Early Riser"
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Lifestyle</label>
							<textarea
								name="lifestyle"
								value={formData.lifestyle}
								onChange={handleChange}
								disabled={!isEditing}
								rows={4}
								placeholder="Tell us about your daily routine, work/study schedule, or hobbies..."
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
							/>
						</div>
					</div>
				</div>

				{isEditing && (
						<div className="flex justify-end pt-4 gap-3">
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
								disabled={saving}
								className={`px-6 py-2 bg-brand-600 text-white rounded-lg font-medium shadow-sm hover:bg-brand-700 transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
						>
								{saving ? 'Saving...' : 'Save Preferences'}
						</button>
						</div>
				)}
			</form>
		</div>
	);
};

export default PreferencesTab;
