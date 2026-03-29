import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, ShieldCheck, Clock, ShieldAlert, X, Upload } from 'lucide-react';
import { authService } from '../../services/authService';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function SwitchRoleTab({ user: userProp }) {
  const user = userProp || authService.getCurrentUser();
  const currentRole = user?.role || 'tenant';

  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [idTypes, setIdTypes] = useState([]);
  const [idTypesLoading, setIdTypesLoading] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    first_name: user?.first_name || '',
    middle_name: user?.middle_name || '',
    last_name: user?.last_name || '',
    dob: user?.date_of_birth || '',
    phone: user?.phone || '',
    valid_id_type: '',
    valid_id_other: '',
    valid_id: null,
    permit: null,
    agree: false,
  });
  const [registrationErrors, setRegistrationErrors] = useState({});

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      if (currentRole !== 'tenant') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get('/landlord/my-verification');
        setVerificationStatus(res.data?.status || 'not_submitted');
      } catch (err) {
        if (err.response?.status === 404) {
          setVerificationStatus('not_submitted');
        } else {
          console.error('Failed to fetch verification status:', err);
          setVerificationStatus('not_submitted');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationStatus();
  }, [currentRole]);

  useEffect(() => {
    if (!showRegistrationModal || idTypes.length > 0 || idTypesLoading) {
      return;
    }

    const loadIdTypes = async () => {
      try {
        setIdTypesLoading(true);
        const res = await api.get('/valid-id-types');
        const resolved = Array.isArray(res.data) ? res.data : [];
        setIdTypes(resolved);
      } catch (err) {
        console.error('Failed to fetch valid ID types:', err);
        setIdTypes([
          'Philippine Passport',
          "Driver's License",
          'PhilSys ID (National ID)',
          'Unified Multi-Purpose ID (UMID)',
          'Postal ID (Digitized)',
        ]);
      } finally {
        setIdTypesLoading(false);
      }
    };

    loadIdTypes();
  }, [showRegistrationModal, idTypes.length, idTypesLoading]);

  useEffect(() => {
    setRegistrationForm((prev) => ({
      ...prev,
      first_name: user?.first_name || prev.first_name,
      middle_name: user?.middle_name || prev.middle_name,
      last_name: user?.last_name || prev.last_name,
      dob: user?.date_of_birth || prev.dob,
      phone: user?.phone || prev.phone,
    }));
  }, [user?.first_name, user?.middle_name, user?.last_name, user?.date_of_birth, user?.phone]);

  const getSwitchButtonLabel = () => {
    if (currentRole === 'landlord') {
      return 'Switch to Tenant Mode';
    }

    if (verificationStatus === 'approved') {
      return 'Switch to Landlord Mode';
    }

    return 'Register as Landlord';
  };

  const getVerificationInfo = () => {
    if (loading || currentRole === 'landlord') {
      return null;
    }

    switch (verificationStatus) {
      case 'approved':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-green-500" />,
          text: 'Your landlord registration is approved. You can switch to landlord mode anytime.',
        };
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          text: 'Your landlord registration is currently under review. This process typically takes 1-3 working days.',
        };
      case 'rejected':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
          text: 'Your previous landlord registration was rejected. Submit a new application to continue.',
        };
      default:
        return {
          icon: <ShieldAlert className="w-5 h-5 text-orange-500" />,
          text: 'To become a landlord, submit your registration details and verification documents.',
        };
    }
  };

  const performRoleSwitch = async (targetRole) => {
    try {
      setIsSwitching(true);
      const response = await authService.switchRole(targetRole);

      if (response.user) {
        localStorage.setItem('userData', JSON.stringify(response.user));
      }

      toast.success(response.message || `Switched to ${targetRole} mode.`);
      window.location.href = '/dashboard';
      return true;
    } catch (error) {
      console.error('Failed to switch role:', error);
      toast.error(error.response?.data?.message || 'Failed to switch role. Please try again.');
      return false;
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSwitchRole = async () => {
    if (currentRole === 'landlord') {
      if (window.confirm('Are you sure you want to switch to Tenant mode?')) {
        await performRoleSwitch('tenant');
      }
      return;
    }

    if (verificationStatus === 'approved') {
      if (window.confirm('Your landlord registration is approved. Switch to Landlord mode now?')) {
        await performRoleSwitch('landlord');
      }
      return;
    }

    if (verificationStatus === 'pending') {
      toast.error('Your landlord registration is still under review. Please wait for approval before switching.');
      return;
    }

    setRegistrationErrors({});
    setShowRegistrationModal(true);
  };

  const handleRegistrationChange = (field, value) => {
    setRegistrationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setRegistrationErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const handleRegistrationFile = (field, file) => {
    if (!file) {
      return;
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowedMime.includes(file.type)) {
      setRegistrationErrors((prev) => ({
        ...prev,
        [field]: 'Invalid file type. Please upload JPG, PNG, or PDF.',
      }));
      return;
    }

    if (file.size > maxSizeBytes) {
      setRegistrationErrors((prev) => ({
        ...prev,
        [field]: 'File size exceeds 5MB limit.',
      }));
      return;
    }

    setRegistrationForm((prev) => ({
      ...prev,
      [field]: file,
    }));
    setRegistrationErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const validateRegistrationForm = () => {
    const errors = {};

    if (!registrationForm.first_name?.trim()) {
      errors.first_name = 'First name is required.';
    }

    if (!registrationForm.last_name?.trim()) {
      errors.last_name = 'Last name is required.';
    }

    if (!registrationForm.dob) {
      errors.dob = 'Date of birth is required.';
    } else {
      const dob = new Date(registrationForm.dob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
      }

      if (age < 21) {
        errors.dob = 'You must be at least 21 years old to register as a landlord.';
      }
    }

    if (registrationForm.phone?.trim()) {
      const digits = registrationForm.phone.replace(/\D/g, '');
      if (!(digits.length === 11 && digits.startsWith('09'))) {
        errors.phone = 'Phone must be 11 digits and start with 09.';
      }
    }

    if (!registrationForm.valid_id_type) {
      errors.valid_id_type = 'Please select a valid ID type.';
    }

    if (registrationForm.valid_id_type === 'Other' && !registrationForm.valid_id_other?.trim()) {
      errors.valid_id_other = 'Please specify the type of ID.';
    }

    if (!registrationForm.valid_id) {
      errors.valid_id = 'Please upload your valid ID.';
    }

    if (!registrationForm.permit) {
      errors.permit = 'Please upload your business/accommodation permit.';
    }

    if (!registrationForm.agree) {
      errors.agree = 'You must agree to the terms and conditions.';
    }

    setRegistrationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitLandlordRegistration = async () => {
    if (!validateRegistrationForm()) {
      return;
    }

    try {
      setIsSubmittingRegistration(true);

      const formData = new FormData();
      formData.append('first_name', registrationForm.first_name.trim());
      if (registrationForm.middle_name?.trim()) {
        formData.append('middle_name', registrationForm.middle_name.trim());
      }
      formData.append('last_name', registrationForm.last_name.trim());
      formData.append('dob', registrationForm.dob);
      if (registrationForm.phone?.trim()) {
        formData.append('phone', registrationForm.phone.trim());
      }
      formData.append('valid_id_type', registrationForm.valid_id_type);
      if (registrationForm.valid_id_type === 'Other') {
        formData.append('valid_id_other', registrationForm.valid_id_other.trim());
      }
      formData.append('valid_id', registrationForm.valid_id);
      formData.append('permit', registrationForm.permit);
      formData.append('agree', registrationForm.agree ? '1' : '0');

      const res = await api.post('/tenant/register-landlord', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setVerificationStatus('pending');
      setShowRegistrationModal(false);
      toast.success(res.data?.message || 'Landlord registration submitted. Please wait for admin review.');
    } catch (error) {
      if (error.response?.data?.errors) {
        const mappedErrors = {};
        const keyMap = {
          first_name: 'first_name',
          middle_name: 'middle_name',
          last_name: 'last_name',
          dob: 'dob',
          phone: 'phone',
          valid_id_type: 'valid_id_type',
          valid_id_other: 'valid_id_other',
          valid_id: 'valid_id',
          permit: 'permit',
          agree: 'agree',
        };

        Object.keys(error.response.data.errors).forEach((key) => {
          const localKey = keyMap[key] || key;
          const value = error.response.data.errors[key];
          mappedErrors[localKey] = Array.isArray(value) ? value[0] : value;
        });

        setRegistrationErrors((prev) => ({
          ...prev,
          ...mappedErrors,
        }));
      }

      toast.error(error.response?.data?.message || 'Failed to submit landlord registration.');
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const verificationInfo = getVerificationInfo();

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-all">
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-green-600 dark:text-green-400" />
              Role Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Switch to tenant mode instantly, or complete landlord registration requirements before enabling landlord mode.
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-4 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              Current Mode: <span className="font-bold capitalize">{currentRole}</span>
            </p>
          </div>

          {verificationInfo && (
            <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              {verificationInfo.icon}
              <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">{verificationInfo.text}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleSwitchRole}
              disabled={loading || isSwitching}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-green-500/20 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ArrowLeftRight className="w-5 h-5" />
              {loading || isSwitching ? 'Loading...' : getSwitchButtonLabel()}
            </button>
          </div>
        </div>
      </div>

      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register as Landlord</h3>
              <button
                type="button"
                onClick={() => setShowRegistrationModal(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Fill out this form to register your account as a landlord. Your account will remain in tenant mode until admin approval.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={registrationForm.first_name}
                    onChange={(e) => handleRegistrationChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {registrationErrors.first_name && <p className="text-xs text-red-500 mt-1">{registrationErrors.first_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Name (optional)</label>
                  <input
                    type="text"
                    value={registrationForm.middle_name}
                    onChange={(e) => handleRegistrationChange('middle_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {registrationErrors.middle_name && <p className="text-xs text-red-500 mt-1">{registrationErrors.middle_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={registrationForm.last_name}
                    onChange={(e) => handleRegistrationChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {registrationErrors.last_name && <p className="text-xs text-red-500 mt-1">{registrationErrors.last_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={registrationForm.dob}
                    onChange={(e) => handleRegistrationChange('dob', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {registrationErrors.dob && <p className="text-xs text-red-500 mt-1">{registrationErrors.dob}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (optional)</label>
                  <input
                    type="text"
                    value={registrationForm.phone}
                    onChange={(e) => handleRegistrationChange('phone', e.target.value)}
                    placeholder="09XXXXXXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {registrationErrors.phone && <p className="text-xs text-red-500 mt-1">{registrationErrors.phone}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid ID Type</label>
                  <select
                    value={registrationForm.valid_id_type}
                    onChange={(e) => handleRegistrationChange('valid_id_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select ID type</option>
                    {idTypes.map((idType) => (
                      <option key={idType} value={idType}>{idType}</option>
                    ))}
                    {!idTypesLoading && <option value="Other">Other</option>}
                  </select>
                  {registrationErrors.valid_id_type && <p className="text-xs text-red-500 mt-1">{registrationErrors.valid_id_type}</p>}
                </div>

                {registrationForm.valid_id_type === 'Other' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specify ID Type</label>
                    <input
                      type="text"
                      value={registrationForm.valid_id_other}
                      onChange={(e) => handleRegistrationChange('valid_id_other', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {registrationErrors.valid_id_other && <p className="text-xs text-red-500 mt-1">{registrationErrors.valid_id_other}</p>}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Valid ID</label>
                  <label className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {registrationForm.valid_id ? registrationForm.valid_id.name : 'Choose file (JPG, PNG, PDF, max 5MB)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleRegistrationFile('valid_id', e.target.files?.[0] || null)}
                    />
                  </label>
                  {registrationErrors.valid_id && <p className="text-xs text-red-500 mt-1">{registrationErrors.valid_id}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Business/Accommodation Permit</label>
                  <label className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {registrationForm.permit ? registrationForm.permit.name : 'Choose file (JPG, PNG, PDF, max 5MB)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleRegistrationFile('permit', e.target.files?.[0] || null)}
                    />
                  </label>
                  {registrationErrors.permit && <p className="text-xs text-red-500 mt-1">{registrationErrors.permit}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={registrationForm.agree}
                      onChange={(e) => handleRegistrationChange('agree', e.target.checked)}
                      className="mt-1"
                    />
                    <span>I agree to the terms and conditions for landlord registration.</span>
                  </label>
                  {registrationErrors.agree && <p className="text-xs text-red-500 mt-1">{registrationErrors.agree}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegistrationModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLandlordRegistration}
                disabled={isSubmittingRegistration}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
              >
                {isSubmittingRegistration ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
