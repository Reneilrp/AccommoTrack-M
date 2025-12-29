        // ...existing code...
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/Logo.png';
import api from '../utils/api';
import { getDefaultLandingRoute } from '../utils/userRoutes';
import toast, { Toaster } from 'react-hot-toast';

function AuthScreen({ onLogin = () => {} }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPlatformChoice, setShowPlatformChoice] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobileDevice(isMobile || isSmallScreen);
    };
    
    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    return () => window.removeEventListener('resize', checkMobileDevice);
  }, []);

  // Live email check state (should NOT be inside formData)
  const [emailAvailable, setEmailAvailable] = useState(null); // null = untouched, true = available, false = taken
  const [emailCheckMsg, setEmailCheckMsg] = useState('');
  const emailCheckTimeout = useRef(null);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'tenant', // Registration is tenant-only
    phone: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    // Live email uniqueness check
    if (field === 'email') {
      setEmailAvailable(null);
      setEmailCheckMsg('');
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
      // Only check if valid email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (emailRegex.test(value)) {
        emailCheckTimeout.current = setTimeout(async () => {
          try {
            const res = await api.get('/check-email', { params: { email: value } });
            setEmailAvailable(res.data.available);
            setEmailCheckMsg(res.data.message);
          } catch (err) {
            setEmailAvailable(false);
            setEmailCheckMsg('This email is already taken');
          }
        }, 500); // debounce 500ms
      }
    }
  };

  const validateLoginForm = () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return false;
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const validateRegisterForm = () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password || !formData.password_confirmation) {
      setError('Please fill in all required fields');
      return false;
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    return true;
  };

  const handleLogin = async (e) => {
    e?.preventDefault();

    if (!validateLoginForm()) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.post('/login', {
        email: formData.email,
        password: formData.password
      });

      const data = result.data;

      // Allow all roles to log in (tenant, landlord, admin, caretaker)
      // If you want to restrict access to certain routes after login, do it in routing logic

      localStorage.setItem('auth_token', data.token);
      onLogin(data.user, data.token);

      // Clear sensitive form fields
      setFormData({ ...formData, email: '', password: '' });

      const landingRoute = getDefaultLandingRoute(data.user);
      navigate(landingRoute);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Network error. Please check your connection.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();

    if (!validateRegisterForm()) return;

    setLoading(true);
    setError('');

    try {
      const result = await api.post('/register', formData);
      const data = result.data;

      // Store email for platform choice modal
      setRegisteredEmail(formData.email);

      // Check if user is on mobile device
      if (isMobileDevice) {
        // Show platform choice modal for mobile users
        setShowPlatformChoice(true);
      } else {
        // Desktop users get normal flow
        toast.success('Registration successful! Please login with your credentials.');
        setIsLogin(true);
      }

      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: formData.email,
        password: '',
        password_confirmation: '',
        role: 'tenant',
        phone: '',
      });
    } catch (err) {
      // Try to extract Laravel validation errors
      let errorMsg = 'Registration failed. Please try again.';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.message) {
          errorMsg = data.message;
        }
        if (data.errors) {
          // Show the first error message from the errors object
          const firstField = Object.keys(data.errors)[0];
          if (firstField && data.errors[firstField][0]) {
            errorMsg = data.errors[firstField][0];
          }
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle platform choice - continue on web
  const handleContinueOnWeb = () => {
    setShowPlatformChoice(false);
    setIsLogin(true);
  };

  // Handle platform choice - go back to mobile app
  const handleGoToMobileApp = () => {
    setShowPlatformChoice(false);
    // Show instructions to return to mobile app
    toast.success('Please return to your AccommoTrack mobile app and login with your new landlord account.');
    setIsLogin(true);
  };

  const toggleScreen = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: 'tenant',
      phone: '',
    });
  };

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-white border border-green-200 text-black placeholder:text-gray-400 placeholder:opacity-80 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300 transition-all";
  const labelClasses = "block text-sm font-semibold text-black mb-2";
  const iconClasses = "w-5 h-5 text-green-400";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
      <Toaster />
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-green-100 relative">
        {/* Back/Sign In Button */}
        {isLogin ? (
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
        ) : (
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className="absolute top-4 left-4 text-green-700 hover:text-green-900 font-semibold text-lg z-10 bg-transparent p-0 border-0 shadow-none"
            aria-label="Back to Sign In"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {/* Logo and Header */}
        <div className="flex flex-col items-center justify-center mb-4">
          <img src={Logo} alt="AccommoTrack Logo" className="h-14 w-auto mb-2" />
          <span className="text-2xl font-extrabold text-green-700 tracking-tight">AccommoTrack</span>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-green-900/90">
            {isLogin
              ? 'Access your account and discover accommodations.'
              : 'Sign up to get started and look for accommodations.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* LOGIN FORM (all users) */}
        {isLogin && (
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className={labelClasses}>
                Email Address
                {emailAvailable === false && (
                  <span className="ml-2 text-red-400 text-xs font-semibold">*</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClasses + (emailAvailable === false ? ' border-red-400' : emailAvailable === true ? ' border-green-400' : '')}
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                />
                {/* Live email check message */}
                {formData.email && emailCheckMsg && (
                  <span className={
                    'absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold ' +
                    (emailAvailable === false ? 'text-red-400' : emailAvailable === true ? 'text-green-400' : 'text-gray-300')
                  }>
                    {emailCheckMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className={labelClasses}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={inputClasses + " pr-12"}
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                 className="text-sm text-black/70 hover:text-black font-semibold transition-colors"
              >
                 Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}
        {/* TENANT SIGN UP ONLY (role is fixed to tenant) */}
        {!isLogin && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* First Name */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>First Name</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your first name"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Middle Name */}
            <div>
              <label className={labelClasses}>
                Middle Name <span className="text-black/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={(e) => handleInputChange('middle_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your middle name"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Last Name</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your last name"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Email Address</span>
                <span className="text-red-400 text-xs font-bold">*</span>
                {/* Show live email check or backend error as a red span next to label */}
                {(formData.email && (emailCheckMsg || (error && error.toLowerCase().includes('email')))) && (
                  <span className="text-red-400 text-xs font-semibold ml-2">
                    {emailCheckMsg ? emailCheckMsg : error}
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClasses + (emailAvailable === false ? ' border-red-400' : emailAvailable === true ? ' border-green-400' : '')}
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={labelClasses}>
                Phone Number <span className="text-black/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your phone number"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Password</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={inputClasses + " pr-12"}
                  placeholder="Create a password"
                  disabled={loading}
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-green-700/70 mt-1">Minimum 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Confirm Password</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className={iconClasses} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={(e) => handleInputChange('password_confirmation', e.target.value)}
                  className={inputClasses + " pr-12"}
                  placeholder="Confirm your password"
                  disabled={loading}
                  required
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Hidden Role Field (always tenant) */}
            <input type="hidden" name="role" value="tenant" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center">
          <span className="text-green-700/80">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={toggleScreen}
            className="text-green-700 font-semibold hover:text-green-900 transition-colors underline"
            disabled={loading}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>

      {/* Platform Choice Modal - Shows for mobile users after registration */}
      {showPlatformChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-green-100 animate-in fade-in zoom-in duration-200">
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-green-700 text-center mb-2">
              Registration Successful!
            </h3>
            
            {/* Description */}
            <p className="text-green-900/90 text-center mb-6">
              Your tenant account has been created. How would you like to continue?
            </p>

            {/* Registered Email Display */}
            <div className="bg-green-50 rounded-lg p-3 mb-6 border border-green-100">
              <p className="text-sm text-green-700 text-center">Registered as:</p>
              <p className="text-sm font-medium text-green-900 text-center">{registeredEmail}</p>
            </div>

            {/* Choice Buttons */}
            <div className="space-y-3">
              <Toaster />
              {/* Continue on Web */}
              <button
                onClick={handleContinueOnWeb}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Continue on Web
              </button>

              {/* Return to Mobile App */}
              <button
                onClick={handleGoToMobileApp}
                className="w-full bg-green-50 text-green-900 font-semibold py-3 px-4 rounded-xl hover:bg-green-100 transition-all duration-200 flex items-center justify-center gap-2 border border-green-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Go Back to Mobile App
              </button>
            </div>

            {/* Note */}
            <p className="text-xs text-green-700/70 text-center mt-4">
              You can access your tenant account from any device
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthScreen;