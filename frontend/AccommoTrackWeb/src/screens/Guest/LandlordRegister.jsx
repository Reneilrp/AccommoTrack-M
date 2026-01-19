import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/Logo.png';

const LandlordRegister = () => {
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Fetch ID types from backend
  useEffect(() => {
    if (step === 3 && idTypes.length === 0 && !idTypesLoading) {
      setIdTypesLoading(true);
      setIdTypesError('');
      axios.get('/api/valid-id-types')
        .then(res => {
          setIdTypes(Array.isArray(res.data) ? res.data : []);
          setIdTypesLoading(false);
        })
        .catch(() => {
          setIdTypesError('Failed to load ID types. Please try again.');
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
    }
    setError('');
    setSuccess('');
  };


  // Step validation
  const validateStep = () => {
    if (step === 1) {
      if (!form.firstName || !form.lastName) {
        setError('First and last name are required.');
        return false;
      }
    } else if (step === 2) {
      if (!form.email || !form.password || !form.confirmPassword) {
        setError('Email, password, and confirm password are required.');
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters.');
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
      // You may need to append user_id if required by backend
      // formData.append('user_id', ...);

      await axios.post('/api/landlord-verification', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Registration submitted! Our team will review your documents.');
      setForm({ firstName: '', middleName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', validIdType: '', validIdOther: '', validId: null, permit: null, agree: false });
      setStep(1);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-green-100 text-center">
            {/* Removed logo from modal */}
            <h2 className="text-2xl font-bold text-green-700 mb-2 drop-shadow-lg">Landlord registration will require verification.</h2>
            <p className="text-green-900/90 mb-2">Please prepare the following documents for a higher chance of approval:</p>
            <ul className="list-disc list-inside text-left mt-2 mb-2 text-green-900">
              <li>Valid Government-issued ID (e.g., Passport, Driver's License, National ID)</li>
              <li>Accommodation Permit or Business Permit</li>
            </ul>
            <span className="text-xs text-gray-500 block mb-2">Your documents will be reviewed by our team for verification and approval.<br/>Verification may take 1-3 work days.</span>
            <button
              className="mt-4 bg-green-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:bg-green-800 transition"
              onClick={() => setShowModal(false)}
            >
              Proceed
            </button>
          </div>
        </div>
      )}
      {/* Stepper Form */}
      {!showModal && (
        <div className="bg-white/90 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-green-100 relative backdrop-blur-sm">
          {/* Back Arrow */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 text-green-700 hover:text-green-900 font-semibold text-lg z-10 bg-transparent p-0 border-0 shadow-none"
            aria-label="Back to Landing Page"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex flex-col items-center justify-center mb-4">
            <img src={logo} alt="AccommoTrack Logo" className="h-14 w-auto mb-2" />
            <span className="text-2xl font-extrabold text-green-700 drop-shadow-lg tracking-tight">AccommoTrack</span>
          </div>
          <div className="flex justify-center mb-6">
            <div className="flex gap-2">
              {[1,2,3].map((s) => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${step === s ? 'bg-green-700' : 'bg-green-200'}`}>{s}</div>
              ))}
            </div>
          </div>
          <form className="space-y-4" onSubmit={step === 3 ? handleSubmit : handleNext}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-semibold">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm font-semibold">{success}</div>
            )}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Enter your first name"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Middle Name <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="text"
                    name="middleName"
                    value={form.middleName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Enter your middle name"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Enter your last name"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <button type="button" className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold" onClick={handleNext} disabled={submitting}>Next</button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Enter your email"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Phone Number <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Enter your phone number"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Create a password"
                    required
                    disabled={submitting}
                    minLength="8"
                  />
                  <p className="text-xs text-green-700/70 mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Confirm Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                    placeholder="Confirm your password"
                    required
                    disabled={submitting}
                    minLength="8"
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <button type="button" className="bg-gray-300 text-green-800 px-6 py-2 rounded-lg font-semibold" onClick={handleBack} disabled={submitting}>Back</button>
                  <button type="button" className="bg-green-700 text-white px-6 py-2 rounded-lg font-semibold" onClick={handleNext} disabled={submitting}>Next</button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Valid ID Type <span className="text-red-500">*</span></label>
                  {idTypesLoading ? (
                    <div className="text-green-700 text-sm">Loading ID types...</div>
                  ) : idTypesError ? (
                    <div className="text-red-600 text-sm mb-2">{idTypesError} <button type="button" className="underline" onClick={() => { setIdTypes([]); setIdTypesError(''); setIdTypesLoading(false); }}>Retry</button></div>
                  ) : (
                    <select
                      name="validIdType"
                      value={form.validIdType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 bg-white"
                      required
                      disabled={submitting}
                    >
                      <option value="">Select ID type</option>
                      {idTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      <option value="other">Other (specify below)</option>
                    </select>
                  )}
                </div>
                {form.validIdType === 'other' && (
                  <div>
                    <label className="block text-sm font-semibold text-green-800 mb-2">Specify ID Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="validIdOther"
                      value={form.validIdOther}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200"
                      placeholder="Enter your ID type"
                      required
                      disabled={submitting}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Upload Valid ID <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    name="validId"
                    accept="image/*,.pdf"
                    onChange={handleChange}
                    className="w-full px-2 py-2 border border-green-200 rounded-lg bg-white"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">Upload Accommodation/Business Permit <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    name="permit"
                    accept="image/*,.pdf"
                    onChange={handleChange}
                    className="w-full px-2 py-2 border border-green-200 rounded-lg bg-white"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    name="agree"
                    checked={form.agree}
                    onChange={handleChange}
                    className="mr-2"
                    disabled={submitting}
                    required
                  />
                  <label className="text-sm text-green-800">I agree to the <a href="/terms" className="underline text-green-700">terms and conditions</a>.</label>
                </div>
                <div className="flex justify-between mt-4">
                  <button type="button" className="bg-gray-300 text-green-800 px-6 py-2 rounded-lg font-semibold" onClick={handleBack} disabled={submitting}>Back</button>
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
