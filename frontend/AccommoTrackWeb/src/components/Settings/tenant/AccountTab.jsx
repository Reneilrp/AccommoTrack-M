import React, { useState, useEffect } from 'react';
import { tenantService } from '../../../services/tenantService';
import { SkeletonAccountTab } from '../../Shared/Skeleton';
import { CheckCircle2, XCircle } from 'lucide-react';

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

	useEffect(() => {
		if (passwordData.confirm_password) {
			setPasswordsMatch(passwordData.new_password === passwordData.confirm_password);
		} else {
			setPasswordsMatch(true);
		}
	}, [passwordData.new_password, passwordData.confirm_password]);

	const toggleEdit = () => {
		if (isEditing) {
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

			{message.text && (
				<div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
					{message.text}
				</div>
			)}

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
								minLength={8}
								disabled={!isEditing}
								className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Confirm New Password</label>
							<input
								type="password"
								name="confirm_password"
								value={passwordData.confirm_password}
								onChange={handleChange}
								required
								minLength={8}
								disabled={!isEditing}
								className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 ${
									!passwordsMatch && passwordData.confirm_password 
										? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' 
										: 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-200 dark:focus:ring-green-800'
								}`}
							/>
							<div className="mt-2 h-5">
								{passwordData.confirm_password && (
									passwordsMatch ? (
										<p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
											<CheckCircle2 className="w-4 h-4" />
											Passwords match
										</p>
									) : (
										<p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
											<XCircle className="w-4 h-4" />
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
									className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving || !passwordsMatch}
									className={`px-6 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors ${
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
			</>
			)}
		</div>
	);
};

export default AccountTab;
