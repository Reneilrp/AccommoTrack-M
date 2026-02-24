import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/Logo.png';
import api, { isCancel } from '../../utils/api';

const LandlordRegister = () => {
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    validIdType: '',
    validIdOther: '',
    validId: null,
    permit: null,
    agree: false,
  });
  const [idTypes, setIdTypes] = useState([]);
  const [idTypesLoading, setIdTypesLoading] = useState(false);
  const [idTypesError, setIdTypesError] = useState('');
  const [isIdDropdownOpen, setIsIdDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fieldRefs = useRef({});
  const fileInputRefs = useRef({ validId: null, permit: null });

  // Email live-check state + refs for debounce/abort
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [emailCheckMsg, setEmailCheckMsg] = useState('');
  const emailCheckTimeout = useRef(null);
  const emailCheckAbortController = useRef(null);
  // import isCancel from api for consistent cancellation handling
  // (we import below alongside api)

  // Field level server errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Live password checks
  const [passwordChecks, setPasswordChecks] = useState({ minLen: false, hasUpper: false, numCount: false, hasSpecial: false });

  // Fetch ID types from backend
  useEffect(() => {
    if (step === 3 && idTypes.length === 0 && !idTypesLoading) {
      setIdTypesLoading(true);
      setIdTypesError('');
      // Use configured api client
      api.get('/valid-id-types')
        .then(res => {
          setIdTypes(Array.isArray(res.data) ? res.data : []);
          setIdTypesLoading(false);
        })
        .catch(() => {
          setIdTypesError('Failed to load ID types. Please try again.');
          // Fallback static types if API fails
          setIdTypes(['Passport', 'Driver\'s License', 'National ID', 'SSS UMID', 'PhilHealth ID', 'Other']);
          setIdTypesLoading(false);
        });
    }
  }, [step, idTypes.length, idTypesLoading]);


  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      // Live behaviors
      if (name === 'email') {
        setEmailAvailable(null);
        setEmailCheckMsg('');
        // debounce email check
        if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
        emailCheckTimeout.current = setTimeout(() => {
          runEmailCheck(value);
        }, 500);
      }
      if (name === 'password') {
        const pwd = value || '';
        setPasswordChecks({
          minLen: pwd.length >= 8,
          hasUpper: /[A-Z]/.test(pwd),
          numCount: (pwd.match(/\d/g) || []).length >= 2,
          hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(pwd),
        });
      }
    }
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
    setError('');
    setSuccess('');
  };

  const runEmailCheck = async (value) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!value || !emailRegex.test(value)) return;
    try {
      if (emailCheckAbortController.current) {
        try { emailCheckAbortController.current.abort(); } catch (e) { }
      }
      emailCheckAbortController.current = new AbortController();
      const res = await api.get('/check-email', { params: { email: value }, signal: emailCheckAbortController.current.signal });
      setEmailAvailable(res.data?.available);
      if (!res.data?.available) {
        setEmailCheckMsg(res.data?.message || 'Email is already taken');
      } else {
        setEmailCheckMsg('');
      }
    } catch (err) {
      if (typeof isCancel === 'function' && isCancel(err)) return;
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      if (err.response && err.response.status === 422) {
        setEmailAvailable(false);
        setEmailCheckMsg('Invalid email format');
        return;
      }
      setEmailAvailable(null);
      setEmailCheckMsg('');
    }
  };

  const handleEmailBlur = () => {
    if (emailCheckTimeout.current) { clearTimeout(emailCheckTimeout.current); emailCheckTimeout.current = null; }
    runEmailCheck(form.email);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const { name, type } = e.target;

      // Allow default behavior for submit buttons or if it's not a named field we track
      if (type === 'submit') return;

      const fieldsByStep = {
        1: ['firstName', 'middleName', 'lastName'],
        2: ['dob', 'email', 'phone', 'password', 'confirmPassword'],
        3: ['validIdOther', 'agree']
      };

      const currentFields = fieldsByStep[step];
      if (!currentFields) return;

      const currentIndex = currentFields.indexOf(name);
      if (currentIndex === -1) return;

      const isLastField = currentIndex === currentFields.length - 1;

      // Quick check if all required fields in the current step are filled
      const isStepFilled = () => {
        if (step === 1) {
          return form.firstName.trim() !== '' && form.lastName.trim() !== '';
        }
        if (step === 2) {
          return form.dob !== '' && form.email.trim() !== '' && form.password !== '' && form.confirmPassword !== '';
        }
        if (step === 3) {
          return form.validIdType !== '' && (form.validIdType !== 'other' || form.validIdOther.trim() !== '') && form.validId && form.permit && form.agree;
        }
        return false;
      };

      if (isLastField || isStepFilled()) {
        // If it's the last field or everything is filled, try to go to the next step or submit
        if (step === 3) {
          handleSubmit(e);
        } else {
          handleNext(e);
        }
      } else {
        // Otherwise, focus the next field in the sequence
        e.preventDefault();
        const nextField = currentFields[currentIndex + 1];
        if (nextField && fieldRefs.current[nextField]) {
          fieldRefs.current[nextField].focus();
        }
      }
    }
  };


  // Step validation
  const validateStep = () => {
    if (step === 1) {
      const errors = {};
      const nameRegex = /^[\p{L} '\-]+$/u;

      if (!form.firstName) {
        errors.firstName = 'First name is required';
      } else if (!nameRegex.test(form.firstName)) {
        errors.firstName = 'First name contains invalid characters';
      }

      if (form.middleName && form.middleName.trim() !== '' && !nameRegex.test(form.middleName)) {
        errors.middleName = 'Middle name contains invalid characters';
      }

      if (!form.lastName) {
        errors.lastName = 'Last name is required';
      } else if (!nameRegex.test(form.lastName)) {
        errors.lastName = 'Last name contains invalid characters';
      }

      setFieldErrors(errors);
      if (Object.keys(errors).length) {
        setError('Please fix the highlighted fields');
        return false;
      }
    } else if (step === 2) {
      const errors = {};
      // DOB required + age >= 20
      if (!form.dob) {
        errors.dob = 'Date of birth is required';
      } else {
        const bd = new Date(form.dob);
        if (isNaN(bd)) {
          errors.dob = 'Invalid date of birth';
        } else {
          const today = new Date();
          let age = today.getFullYear() - bd.getFullYear();
          const m = today.getMonth() - bd.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
          if (age < 20) errors.dob = 'You must be at least 20 years old to register';
        }
      }

      // Required email/password
      if (!form.email) errors.email = 'Email is required';
      if (!form.password) errors.password = 'Password is required';
      if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';

      // Passwords match
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      // Password complexity checks
      const pwd = form.password || '';
      const pwdChecks = {
        minLen: pwd.length >= 8,
        hasUpper: /[A-Z]/.test(pwd),
        numCount: (pwd.match(/\d/g) || []).length >= 2,
        hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(pwd),
      };
      setPasswordChecks(pwdChecks);
      if (!pwdChecks.minLen || !pwdChecks.hasUpper || !pwdChecks.numCount || !pwdChecks.hasSpecial) {
        errors.password = 'Password does not meet complexity requirements';
      }

      // Phone validation (optional)
      if (form.phone && form.phone.trim() !== '') {
        const digits = (form.phone || '').replace(/\D/g, '');
        if (!(digits.length === 11 && digits.startsWith('09'))) {
          errors.phone = 'Phone must be 11 digits and start with 09';
        }
      }

      setFieldErrors(errors);
      if (Object.keys(errors).length) {
        setError('Please fix the highlighted fields');
        return false;
      }
    } else if (step === 3) {
      if (!form.validIdType || (form.validIdType === 'other' && !form.validIdOther)) {
        setError('Please select or specify a valid ID type.');
        return false;
      }
      if (!form.validId || !form.permit) {
        setError('Please upload all required documents.');
        return false;
      }
      if (!form.agree) {
        setError('You must agree to the terms and conditions.');
        return false;
      }
    }
    setError('');
    return true;
  };



  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep()) setStep((prev) => prev + 1);
  };

  const handleBack = (e) => {
    e.preventDefault();
    setError('');
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('first_name', form.firstName);
      formData.append('middle_name', form.middleName);
      formData.append('last_name', form.lastName);
      formData.append('dob', form.dob);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      formData.append('password', form.password);
      formData.append('valid_id_type', form.validIdType);
      if (form.validIdType === 'other') {
        formData.append('valid_id_other', form.validIdOther);
      }
      formData.append('valid_id', form.validId);
      formData.append('permit', form.permit);
      formData.append('agree', form.agree);
      // formData.append('user_id', ...);

      // Pre-submit: ensure email availability
      try {
        if (emailCheckAbortController.current) { try { emailCheckAbortController.current.abort(); } catch (e) { } }
        emailCheckAbortController.current = new AbortController();
        const chk = await api.get('/check-email', { params: { email: form.email }, signal: emailCheckAbortController.current.signal });
        if (chk.data?.available === false) {
          setFieldErrors({ email: chk.data?.message || 'Email is already taken' });
          setError('Please fix the highlighted fields.');
          setSubmitting(false);
          return;
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          // ignore
        }
      }

      await api.post('/landlord-verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Registration submitted! Our team will review your documents.');
      setForm({ firstName: '', middleName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', validIdType: '', validIdOther: '', validId: null, permit: null, agree: false });
      setStep(1);
      setShowModal(true);
    } catch (err) {
      const srvErrs = err.response?.data?.errors;
      if (srvErrs) {
        const map = {};
        const keyMap = { first_name: 'firstName', middle_name: 'middleName', last_name: 'lastName', email: 'email', phone: 'phone', password: 'password', password_confirmation: 'confirmPassword', dob: 'dob' };
        for (const k in srvErrs) {
          const local = keyMap[k] || k;
          map[local] = srvErrs[k][0];
        }
        setFieldErrors(map);
        // focus first invalid
        const order = ['firstName', 'middleName', 'lastName', 'dob', 'email', 'phone', 'password', 'confirmPassword'];
        const firstInvalid = order.find(o => map[o]);
        if (firstInvalid && fieldRefs.current[firstInvalid] && typeof fieldRefs.current[firstInvalid].focus === 'function') {
          setTimeout(() => { try { fieldRefs.current[firstInvalid].focus(); } catch (e) { } }, 0);
        }
        setError(err.response?.data?.message || 'Please fix highlighted fields.');
      } else {
        setError(err.response?.data?.message || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-green-100 dark:border-gray-700 text-center">
            {success ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2 drop-shadow-lg">Application Submitted!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Your landlord registration has been successfully submitted. Our administrators will review your documents within 1-3 business days. You will receive an email once your account is verified.
                </p>
                <button
                  className="w-full bg-green-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-green-800 transition"
                  onClick={() => navigate('/')}
                >
                  Return to Home
                </button>
              </>
            ) : (
              <>
                {/* Removed logo from modal */}
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2 drop-shadow-lg">Landlord registration will require verification.</h2>
                <p className="text-green-900/90 dark:text-green-300 mb-2">Please prepare the following documents for a higher chance of approval:</p>
                <ul className="list-disc list-inside text-left mt-2 mb-2 text-green-900 dark:text-green-200">
                  <li>Valid Government-issued ID (e.g., Passport, Driver's License, National ID)</li>
                  <li>Accommodation Permit or Business Permit</li>
                </ul>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Your documents will be reviewed by our team for verification and approval.<br />Verification may take 1-3 work days.</span>
                <button
                  className="mt-4 bg-green-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-green-800 transition"
                  onClick={() => setShowModal(false)}
                >
                  Proceed
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Stepper Form */}
      {!showModal && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-green-100 dark:border-gray-700 relative backdrop-blur-sm">
          {/* Back Arrow */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold text-lg z-10 bg-transparent p-0 border-0 shadow-none"
            aria-label="Back to Landing Page"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex flex-col items-center justify-center mb-4">
            <img src={logo} alt="AccommoTrack Logo" className="h-14 w-auto mb-2" />
            <span className="text-2xl font-extrabold text-green-700 dark:text-green-400 drop-shadow-lg tracking-tight">AccommoTrack</span>
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${step === s ? 'bg-green-700' : 'bg-green-200 dark:bg-green-900/50'}`}>{s}</div>
              ))}
            </div>
          </div>
          <form className="space-y-4" onSubmit={step === 3 ? handleSubmit : handleNext}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm font-semibold">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm font-semibold">{success}</div>
            )}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.firstName = el}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your first name"
                    required
                    disabled={submitting}
                  />
                  {fieldErrors.firstName && <div className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</div>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Middle Name <span className="text-gray-400 dark:text-gray-500">(optional)</span></label>
                  <input
                    type="text"
                    name="middleName"
                    value={form.middleName}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.middleName = el}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your middle name"
                    disabled={submitting}
                  />
                  {fieldErrors.middleName && <div className="text-xs text-red-600 mt-1">{fieldErrors.middleName}</div>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.lastName = el}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your last name"
                    required
                    disabled={submitting}
                  />
                  {fieldErrors.lastName && <div className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</div>}
                </div>
                <div className="flex justify-end mt-4">
                  <button type="button" className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold" onClick={handleNext} disabled={submitting}>Next</button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => {
                      const el = fieldRefs.current.dob;
                      if (el && typeof el.showPicker === 'function') {
                        try { el.showPicker(); } catch (e) { }
                      }
                    }}
                  >
                    <input
                      type="date"
                      name="dob"
                      value={form.dob}
                      onChange={handleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleKeyDown(e);
                        } else {
                          e.preventDefault();
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof e.target.showPicker === 'function') {
                          try { e.target.showPicker(); } catch (err) { }
                        }
                      }}
                      max={new Date(new Date().getFullYear() - 20, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                      ref={el => fieldRefs.current.dob = el}
                      className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                      required
                      disabled={submitting}
                    />
                  </div>
                  {fieldErrors.dob && <div className="text-xs text-red-600 mt-1">{fieldErrors.dob}</div>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    <span>Email Address</span>
                    <span className="text-red-500">*</span>
                    {(form.email && (emailCheckMsg || (error && error.toLowerCase().includes('email')))) && (
                      <span className="text-red-400 text-xs font-normal ml-2">{emailCheckMsg ? emailCheckMsg : error}</span>
                    )}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.email = el}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your email"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Phone Number <span className="text-gray-400 dark:text-gray-500">(optional)</span></label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.phone = el}
                    onBlur={() => {
                      // normalize phone on blur
                      setForm(prev => ({ ...prev, phone: (prev.phone || '').replace(/[^0-9]/g, '') }));
                    }}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your phone number"
                    disabled={submitting}
                  />
                  {fieldErrors.phone && <div className="text-xs text-red-600 mt-1">{fieldErrors.phone}</div>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.password = el}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Create a password"
                    required
                    disabled={submitting}
                    minLength="8"
                  />
                  {form.password && (
                    <div className="mt-1 text-xs">
                      {!passwordChecks.minLen && <div className="text-red-600">• Minimum 8 characters</div>}
                      {!passwordChecks.hasUpper && <div className="text-red-600">• At least one uppercase letter</div>}
                      {!passwordChecks.numCount && <div className="text-red-600">• At least two numbers</div>}
                      {!passwordChecks.hasSpecial && <div className="text-red-600">• At least one special character</div>}
                    </div>
                  )}
                  {fieldErrors.password && <div className="text-xs text-red-600 mt-1">{fieldErrors.password}</div>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    ref={el => fieldRefs.current.confirmPassword = el}
                    className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Confirm your password"
                    required
                    disabled={submitting}
                    minLength="8"
                  />
                  {fieldErrors.confirmPassword && <div className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</div>}
                </div>
                <div className="flex justify-between mt-4">
                  <button type="button" className="bg-gray-300 dark:bg-gray-600 text-green-800 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={handleBack} disabled={submitting}>Back</button>
                  <button type="button" className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold" onClick={handleNext} disabled={submitting}>Next</button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Valid ID Type <span className="text-red-500">*</span></label>
                  {idTypesLoading ? (
                    <div className="text-green-700 dark:text-green-400 text-sm">Loading ID types...</div>
                  ) : idTypesError ? (
                    <div className="text-red-600 dark:text-red-400 text-sm mb-2">{idTypesError} <button type="button" className="underline" onClick={() => { setIdTypes([]); setIdTypesError(''); setIdTypesLoading(false); }}>Retry</button></div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !submitting && setIsIdDropdownOpen(!isIdDropdownOpen)}
                        className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-left flex justify-between items-center"
                        disabled={submitting}
                      >
                        <span className={form.validIdType ? "text-green-900 dark:text-green-200" : "text-gray-400 dark:text-gray-500"}>
                          {
                            [
                              { value: "Philippine Passport", label: "Philippine Passport" },
                              { value: "Driver’s License", label: "Driver’s License" },
                              { value: "PhilSys ID (National ID)", label: "PhilSys ID (National ID)" },
                              { value: "UMID", label: "Unified Multi-Purpose ID (UMID)" },
                              { value: "PRC ID", label: "Professional Regulation Commission (PRC) ID" },
                              { value: "Postal ID", label: "Postal ID (Digitized)" },
                              { value: "Voter’s ID", label: "Voter’s ID" },
                              { value: "TIN ID", label: "Taxpayer Identification Number (TIN) ID" },
                              { value: "PhilHealth ID", label: "PhilHealth ID" },
                              { value: "Senior Citizen ID", label: "Senior Citizen ID" },
                              { value: "OFW ID", label: "Overseas Workers Welfare Administration (OWWA) / OFW ID" },
                              ...idTypes.map(t => ({ value: t, label: t })),
                              { value: "other", label: "Other (specify below)" }
                            ].find(opt => opt.value === form.validIdType)?.label || "Select ID type"
                          }
                        </span>
                        <svg className={`w-5 h-5 text-green-700 dark:text-green-400 transition-transform ${isIdDropdownOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isIdDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsIdDropdownOpen(false)}></div>
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-green-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto text-sm">
                            {[
                              { value: "Philippine Passport", label: "Philippine Passport" },
                              { value: "Driver’s License", label: "Driver’s License" },
                              { value: "PhilSys ID (National ID)", label: "PhilSys ID (National ID)" },
                              { value: "UMID", label: "Unified Multi-Purpose ID (UMID)" },
                              { value: "PRC ID", label: "Professional Regulation Commission (PRC) ID" },
                              { value: "Postal ID", label: "Postal ID (Digitized)" },
                              { value: "Voter’s ID", label: "Voter’s ID" },
                              { value: "TIN ID", label: "Taxpayer Identification Number (TIN) ID" },
                              { value: "PhilHealth ID", label: "PhilHealth ID" },
                              { value: "Senior Citizen ID", label: "Senior Citizen ID" },
                              { value: "OFW ID", label: "Overseas Workers Welfare Administration (OWWA) / OFW ID" },
                              ...idTypes.map(t => ({ value: t, label: t })),
                              { value: "other", label: "Other (specify below)" }
                            ].map((option) => (
                              <div
                                key={option.value}
                                className={`px-4 py-3 cursor-pointer transition-colors ${form.validIdType === option.value ? 'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-200 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600'}`}
                                onClick={() => {
                                  setForm(prev => ({ ...prev, validIdType: option.value }));
                                  setIsIdDropdownOpen(false);
                                  setError('');
                                }}
                              >
                                {option.label}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {form.validIdType === 'other' && (
                  <div>
                    <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Specify ID Type <span className="text-red-500">*</span></label>
                                      <input
                                        type="text"
                                        name="validIdOther"
                                        value={form.validIdOther}
                                        onChange={handleChange}
                                        onKeyDown={handleKeyDown}
                                        ref={el => fieldRefs.current.validIdOther = el}
                                        className="w-full px-4 py-3 border border-green-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter your ID type"
                                        required
                                        disabled={submitting}
                                      />                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Upload Valid ID <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="file"
                      name="validId"
                      accept="image/*,.pdf"
                      onChange={handleChange}
                      ref={el => { fileInputRefs.current.validId = el; }}
                      className="w-full pr-20 px-2 py-2 border border-green-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required={!form.validId}
                      disabled={submitting}
                    />
                    {form.validId && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <button
                          type="button"
                          className="text-red-600 dark:text-red-400 text-xs bg-transparent px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            try { if (fileInputRefs.current.validId) fileInputRefs.current.validId.value = ''; } catch (e) {}
                            setForm(prev => ({ ...prev, validId: null }));
                          }}
                          disabled={submitting}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">Upload Accommodation/Business Permit <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="file"
                      name="permit"
                      accept="image/*,.pdf"
                      onChange={handleChange}
                      ref={el => { fileInputRefs.current.permit = el; }}
                      className="w-full pr-20 px-2 py-2 border border-green-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required={!form.permit}
                      disabled={submitting}
                    />
                    {form.permit && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <button
                          type="button"
                          className="text-red-600 dark:text-red-400 text-xs bg-transparent px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => {
                            try { if (fileInputRefs.current.permit) fileInputRefs.current.permit.value = ''; } catch (e) {}
                            setForm(prev => ({ ...prev, permit: null }));
                          }}
                          disabled={submitting}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="mr-2"
                    disabled={submitting}
                    required
                  />
                  <label className="text-sm text-green-800 dark:text-green-300">I agree to the <a href="/terms" className="underline text-green-700 dark:text-green-400">terms and conditions</a>.</label>
                </div>
                <div className="flex justify-between mt-4">
                  <button type="button" className="bg-gray-300 dark:bg-gray-600 text-green-800 dark:text-gray-200 px-6 py-2 rounded-lg font-semibold" onClick={handleBack} disabled={submitting}>Back</button>
                  <button
                    type="submit"
                    className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Register as Landlord'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default LandlordRegister;
