import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { tenantService } from '../../../services/tenantService';
import { SkeletonAccountTab } from '../../Shared/Skeleton';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const AccountTab = ({ user }) => {
	const [saving, setSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
  
	const [passwordData, setPasswordData] = useState({
		current_password: '',
		new_password: '',
		confirm_password: '',
	});

	const [passwordsMatch, setPasswordsMatch] = useState(true);

	// --- Password complexity checks (matches backend: min 8, uppercase, lowercase, number) ---
	const complexity = useMemo(() => {
		const pw = passwordData.new_password;
		return {
			minLength: pw.length >= 8,
			hasUppercase: /[A-Z]/.test(pw),
			hasLowercase: /[a-z]/.test(pw),
			hasNumber: /[0-9]/.test(pw),
		};
	}, [passwordData.new_password]);

	const allComplexityMet = complexity.minLength && complexity.hasUppercase && complexity.hasLowercase && complexity.hasNumber;

	// --- Same password check ---
	const isSameAsOld = passwordData.new_password.length > 0 && passwordData.current_password.length > 0 && passwordData.new_password === passwordData.current_password;

	useEffect(() => {
		if (passwordData.confirm_password) {
			setPasswordsMatch(passwordData.new_password === passwordData.confirm_password);
		} else {
			setPasswordsMatch(true);
		}
	}, [passwordData.new_password, passwordData.confirm_password]);

	const canSubmit = !saving && passwordsMatch && allComplexityMet && !isSameAsOld
		&& passwordData.current_password.length > 0
		&& passwordData.new_password.length > 0
		&& passwordData.confirm_password.length > 0;

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
		setPasswordData(prev => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setSaving(true);

		if (passwordData.new_password !== passwordData.confirm_password) {
			toast.error('New passwords do not match.');
			setSaving(false);
			return;
		}

		if (!allComplexityMet) {
			toast.error('Password does not meet complexity requirements.');
			setSaving(false);
			return;
		}

		if (isSameAsOld) {
			toast.error('New password must be different from current password.');
			setSaving(false);
			return;
		}

		try {
			await tenantService.changePassword(
				passwordData.current_password,
				passwordData.new_password,
				passwordData.confirm_password
			);
			toast.success('Password changed successfully!');
			setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
			setIsEditing(false);
		} catch (error) {
			console.error('Password change failed', error);
			toast.error(
				error.response?.data?.message || 'Failed to change password. Please check your current password.'
			);
		} finally {
			setSaving(false);
		}
	};

	// --- Complexity indicator item ---
	const ComplexityItem = ({ met, label }) => (
		<li className={`flex items-center gap-2.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'}`}>
			{met
				? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
				: <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
			}
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

							{/* Same-as-old warning */}
							{isSameAsOld && (
								<p className="mt-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
									<AlertTriangle className="w-3.5 h-3.5" />
									New password must be different from your current password
								</p>
							)}

							{/* Complexity indicator */}
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
								className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 ${
									!passwordsMatch && passwordData.confirm_password 
										? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' 
										: 'border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-200 dark:focus:ring-green-800'
								}`}
							/>
							<div className="mt-2 h-5">
								{passwordData.confirm_password && (
									passwordsMatch ? (
										<p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
											<CheckCircle2 className="w-4 h-4" />
											Passwords match
										</p>
									) : (
										<p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
											<XCircle className="w-4 h-4" />
											Passwords do not match
										</p>
									)
								)}
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
									className={`px-6 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition-colors ${
										!canSubmit ? 'opacity-70 cursor-not-allowed' : ''
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
