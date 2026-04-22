import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { ArrowLeftRight, ShieldCheck, Clock, ShieldAlert } from 'lucide-react';
import { authService } from '../../services/authService';
import api from '../../utils/api';
import { showSuccess, showError } from '../../utils/toast';
import RoleConfirmModal from './SwitchRole/RoleConfirmModal';
import LandlordRegistrationModal from './SwitchRole/LandlordRegistrationModal';

const SwitchRoleTab = ({ user: userProp }) => {
  const user = useMemo(() => userProp || authService.getCurrentUser(), [userProp]);
  const currentRole = user?.role || 'tenant';

  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({ title: '', message: '', targetRole: null });
  const [hasShownApprovalMessage, setHasShownApprovalMessage] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [idTypes, setIdTypes] = useState([]);
  const [idTypesLoading, setIdTypesLoading] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    valid_id_type: '',
    valid_id_other: '',
    valid_id_front: null,
    valid_id_back: null,
    permit: null,
  });
  const [registrationErrors, setRegistrationErrors] = useState({});
  const canSwitchToLandlord = useMemo(() => ['partial_verified', 'pending_documents_review', 'approved'].includes(verificationStatus), [verificationStatus]);
  const isWaitingForPartial = verificationStatus === 'pending';

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
        console.error('Failed to fetch verification status:', err);
        setVerificationStatus('not_submitted');
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
        setIdTypes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch valid ID types:', err);
        setIdTypes([
          'Philippine Passport',
          "Driver's License",
          'PhilSys ID (National ID)',
          'Unified Multi-Purpose ID (UMID)',
          'Postal ID (Digitized)',
          'Other',
        ]);
      } finally {
        setIdTypesLoading(false);
      }
    };

    loadIdTypes();
  }, [showRegistrationModal, idTypes.length, idTypesLoading]);

  const getSwitchButtonLabel = useCallback(() => {
    if (currentRole === 'landlord') {
      return 'Switch to Tenant Mode';
    }

    if (canSwitchToLandlord) {
      return 'Switch to Landlord Mode';
    }

    if (isWaitingForPartial) {
      return 'Awaiting Admin Partial Verification';
    }

    return 'Register as Landlord';
  }, [currentRole, canSwitchToLandlord, isWaitingForPartial]);

  const verificationInfo = useMemo(() => {
    if (loading || currentRole === 'landlord') {
      return null;
    }

    switch (verificationStatus) {
      case 'approved':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-green-500" />,
          text: 'Your landlord registration is approved. You can switch to landlord mode anytime.',
        };
      case 'partial_verified':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
          text: 'Your account is partially verified. You can switch to landlord mode now and submit required documents before the deadline.',
        };
      case 'pending_documents_review':
        return {
          icon: <Clock className="w-5 h-5 text-indigo-500" />,
          text: 'Your documents are now under admin review. You can still switch to landlord mode while waiting for final approval.',
        };
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          text: 'Your registration is waiting for admin to start partial verification before document submission.',
        };
      case 'rejected':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
          text: 'Your previous landlord registration was rejected. Submit a new application to continue.',
        };
      default:
        return {
          icon: <ShieldAlert className="w-5 h-5 text-orange-500" />,
          text: 'To become a landlord, select a valid ID type and submit front/back ID images plus your business permit.',
        };
    }
  }, [loading, currentRole, verificationStatus]);

  const performRoleSwitch = async (targetRole) => {
    try {
      setIsSwitching(true);
      const response = await authService.switchRole(targetRole);

      if (response.user) {
        localStorage.setItem('userData', JSON.stringify(response.user));
      }

      showSuccess(response.message || `Switched to ${targetRole} mode.`);
      window.location.href = '/dashboard';
      return true;
    } catch (error) {
      console.error('Failed to switch role:', error);
      if (error.response?.status === 401) {
        showError('Your session has expired. Please log in again, then retry role switch.');
        return false;
      }
      showError(error.response?.data?.message || 'Failed to switch role. Please try again.');
      return false;
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSwitchRole = async () => {
    if (currentRole === 'landlord') {
      setConfirmModalConfig({
        title: 'Switch to Tenant Mode',
        message: 'Are you sure you want to switch to Tenant mode?',
        targetRole: 'tenant',
      });
      setShowConfirmModal(true);
      return;
    }

    if (canSwitchToLandlord) {
      setConfirmModalConfig({
        title: 'Switch to Landlord Mode',
        message: hasShownApprovalMessage 
          ? 'Are you sure you want to switch to Landlord mode?'
          : verificationStatus === 'approved'
            ? 'Your landlord registration is approved. Switch to Landlord mode now?'
            : 'Your landlord access is active. Switch to Landlord mode now?',
        targetRole: 'landlord',
      });
      setShowConfirmModal(true);
      if (!hasShownApprovalMessage) {
        setHasShownApprovalMessage(true);
      }
      return;
    }

    if (isWaitingForPartial) {
      showError('Your registration is waiting for admin partial verification. You can switch once that step is completed.');
      return;
    }

    setRegistrationErrors({});
    setRegistrationForm({
      valid_id_type: '',
      valid_id_other: '',
      valid_id_front: null,
      valid_id_back: null,
      permit: null,
    });
    setShowRegistrationModal(true);
  };

  const handleRegistrationChange = useCallback((field, value) => {
    setRegistrationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setRegistrationErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  }, []);

  const handleRegistrationFile = useCallback((field, file) => {
    if (!file) {
      return;
    }

    const imageMime = ['image/jpeg', 'image/png', 'image/jpg'];
    const permitMime = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const allowedMime = field === 'permit' ? permitMime : imageMime;
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowedMime.includes(file.type)) {
      setRegistrationErrors((prev) => ({
        ...prev,
        [field]: field === 'permit'
          ? 'Invalid file type. Permit must be JPG, PNG, or PDF.'
          : 'Invalid file type. Valid ID images must be JPG or PNG.',
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
  }, []);

  const validateRegistrationForm = () => {
    const errors = {};

    if (!registrationForm.valid_id_type) {
      errors.valid_id_type = 'Please select a valid ID type.';
    }

    if (registrationForm.valid_id_type === 'Other' && !registrationForm.valid_id_other?.trim()) {
      errors.valid_id_other = 'Please specify the ID type.';
    }

    if (!registrationForm.valid_id_front) {
      errors.valid_id_front = 'Please upload the front image of your valid ID.';
    }

    if (!registrationForm.permit) {
      errors.permit = 'Please upload your business/accommodation permit.';
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
      formData.append('valid_id_type', registrationForm.valid_id_type);
      if (registrationForm.valid_id_type === 'Other') {
        formData.append('valid_id_other', registrationForm.valid_id_other.trim());
      }
      formData.append('valid_id_front', registrationForm.valid_id_front);
      if (registrationForm.valid_id_back) {
        formData.append('valid_id_back', registrationForm.valid_id_back);
      }
      formData.append('permit', registrationForm.permit);

      const res = await api.post('/tenant/register-landlord', formData);

      setVerificationStatus('pending');
      setShowRegistrationModal(false);
      showSuccess(res.data?.message || 'Landlord registration submitted. Please wait for admin review.');
    } catch (error) {
      if (error.response?.data?.errors) {
        const mappedErrors = {};

        Object.keys(error.response.data.errors).forEach((key) => {
          const value = error.response.data.errors[key];
          mappedErrors[key] = Array.isArray(value) ? value[0] : value;
        });

        setRegistrationErrors((prev) => ({
          ...prev,
          ...mappedErrors,
        }));
      }

      showError(error.response?.data?.message || 'Failed to submit landlord registration.');
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const handleConfirmSwitch = async () => {
    setShowConfirmModal(false);
    if (confirmModalConfig.targetRole) {
      await performRoleSwitch(confirmModalConfig.targetRole);
    }
  };

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
              Switch to tenant mode instantly, or register as landlord by selecting a valid ID type and submitting ID front/back images with your business permit.
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
              disabled={loading || isSwitching || isWaitingForPartial}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-green-500/20 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ArrowLeftRight className="w-5 h-5" />
              {loading || isSwitching ? 'Loading...' : getSwitchButtonLabel()}
            </button>
          </div>
        </div>
      </div>

      <RoleConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSwitch}
        config={confirmModalConfig}
        isSwitching={isSwitching}
      />

      <LandlordRegistrationModal 
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        idTypes={idTypes}
        form={registrationForm}
        errors={registrationErrors}
        onChange={handleRegistrationChange}
        onFileChange={handleRegistrationFile}
        onSubmit={submitLandlordRegistration}
        isSubmitting={isSubmittingRegistration}
      />
    </>
  );
};

export default memo(SwitchRoleTab);