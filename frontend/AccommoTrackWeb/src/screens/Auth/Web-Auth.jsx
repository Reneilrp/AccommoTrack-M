import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  AlertCircle, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  Check, 
  Monitor, 
  Smartphone, 
  Loader2 
} from 'lucide-react';
import Logo from '../../assets/Logo.png';
import api, { isCancel, rootApi } from '../../utils/api';
import { getDefaultLandingRoute } from '../../utils/userRoutes';
import toast, { Toaster } from 'react-hot-toast';
import { usePreferences } from '../../contexts/PreferencesContext';

function AuthScreen({ onLogin = () => {} }) {
  const navigate = useNavigate();
  const { effectiveTheme } = usePreferences();
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
  const [passwordChecks, setPasswordChecks] = useState({ minLen: false, hasUpper: false, numCount: false, hasSpecial: false });
  const [fieldErrors, setFieldErrors] = useState({});
  const emailCheckTimeout = useRef(null);
  const emailCheckAbortController = useRef(null);
  const fieldRefs = useRef({});
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
    // clear field error when user types
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    // Live email uniqueness check
    if (field === 'email' && !isLogin) {
      setEmailAvailable(null);
      setEmailCheckMsg('');
      
      // Cancel pending timeout
      if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
      
      // Cancel pending request
      if (emailCheckAbortController.current) {
        emailCheckAbortController.current.abort();
      }

      // Only check if valid email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (emailRegex.test(value)) {
        emailCheckTimeout.current = setTimeout(async () => {
          try {
            emailCheckAbortController.current = new AbortController();
            const res = await api.get('/check-email', { 
              params: { email: value },
              signal: emailCheckAbortController.current.signal
            });
            
            setEmailAvailable(res.data.available);
            if (!res.data.available) {
              setEmailCheckMsg(res.data.message);
            } else {
              setEmailCheckMsg('');
            }
          } catch (err) {
            if (isCancel(err)) {
              return;
            }
            
            // Handle actual errors
            console.error('Email check error:', err);
            
            // Only show error if it's a validation error (422) or if we want to default to "taken" for safety
            // But defaulting to "taken" for network errors confuses users. 
            // Better to show nothing (assume available until proven otherwise) or a generic warning.
            
            if (err.response && err.response.status === 422) {
              // Invalid email format according to backend
              setEmailAvailable(false);
              setEmailCheckMsg('Invalid email format');
            } else {
              // Network error or server error - don't block user with "Taken" message
              // Just reset to neutral state
              setEmailAvailable(null);
              setEmailCheckMsg('');
            }
          }
        }, 500); // debounce 500ms
      }
    }

    // Live password check when typing on register screen
    if (field === 'password') {
      const pwd = value || '';
      const checks = {
        minLen: pwd.length >= 8,
        hasUpper: /[A-Z]/.test(pwd),
        numCount: (pwd.match(/\d/g) || []).length >= 2,
        hasSpecial: /[!@#$%^&*(),.?":{}|<>\[\]\\/~`_+=;'-]/.test(pwd),
      };
      setPasswordChecks(checks);
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
    const errors = {};

    // Required fields
    if (!formData.first_name) errors.first_name = 'First name is required';
    if (!formData.last_name) errors.last_name = 'Last name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.password_confirmation) errors.password_confirmation = 'Please confirm your password';

    // Name validation (allow letters, spaces, hyphens, apostrophes, ñ)
    const nameRegex = /^[\p{L} '\-]+$/u;
    if (formData.first_name && !nameRegex.test(formData.first_name)) {
      errors.first_name = 'First name contains invalid characters';
    }
    if (formData.middle_name && formData.middle_name.trim() !== '' && !nameRegex.test(formData.middle_name)) {
      errors.middle_name = 'Middle name contains invalid characters';
    }
    if (formData.last_name && !nameRegex.test(formData.last_name)) {
      errors.last_name = 'Last name contains invalid characters';
    }

    // Email format: keep basic check + ensure domain has at least one letter (helps avoid garbage domains)
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password rules
    if (formData.password && formData.password_confirmation && formData.password !== formData.password_confirmation) {
      errors.password_confirmation = 'Passwords do not match';
    }

    const pwd = formData.password || '';
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

    // Phone number (optional) - if provided, must be 11 digits and start with 09
    if (formData.phone && formData.phone.trim() !== '') {
      const digits = (formData.phone || '').replace(/\D/g, '');
      if (!(digits.length === 11 && digits.startsWith('09'))) {
        errors.phone = 'Phone must be 11 digits and start with 09';
      }
    }

    setFieldErrors(errors);

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      setError('Please fix the highlighted fields');
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
      await rootApi.get('/sanctum/csrf-cookie');

      const result = await api.post('/login', {
        email: formData.email,
        password: formData.password
      });

      const data = result.data;

      // If server returned a token, set it on the API instance so subsequent
      // protected requests include the bearer token and don't trigger 401.
      if (data && data.token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('lastLoginAt', Date.now().toString());
        } catch (e) {
          console.warn('Failed to persist auth token', e);
        }
      }

      // If the login response already contains the user, use it immediately.
      if (data && data.user) {
        const me = data.user;
        localStorage.setItem('userData', JSON.stringify(me));
        onLogin(me);
        setFormData({ ...formData, email: '', password: '' });
        const landingRoute = getDefaultLandingRoute(me);
        navigate(landingRoute);
        return;
      }

      // Otherwise, fall back to querying the authenticated user endpoints.
      try {
        const endpoints = ['/api/me', '/api/auth/me', '/me', '/auth/me'];
        let me = null;
        for (const ep of endpoints) {
          try {
            const res = await rootApi.get(ep);
            if (res?.data) {
              me = res.data.user || res.data;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (me) {
          localStorage.setItem('userData', JSON.stringify(me));
          onLogin(me);
          setFormData({ ...formData, email: '', password: '' });
          const landingRoute = getDefaultLandingRoute(me);
          navigate(landingRoute);
        } else {
          console.error('Failed to fetch authenticated user after login');
          setError('Login succeeded but fetching account failed. Please refresh.');
        }
      } catch (err) {
        console.error('Failed to fetch authenticated user after login', err);
        setError('Login succeeded but fetching account failed. Please refresh.');
      }
    } catch (err) {
      let errorMsg = err.response?.data?.message || err.message || 'Network error. Please check your connection.';

      if (err.response?.data?.errors) {
        // Get the first error message from the validation errors object
        const firstField = Object.keys(err.response.data.errors)[0];
        if (firstField && err.response.data.errors[firstField][0]) {
          errorMsg = err.response.data.errors[firstField][0];
        }
      }

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

    // Run server-side email check (DNS/MX) before submitting to give immediate feedback
    try {
      // Abort any pending check from live validation
      if (emailCheckAbortController.current) emailCheckAbortController.current.abort();
      emailCheckAbortController.current = new AbortController();
      const checkRes = await api.get('/check-email', {
        params: { email: formData.email },
        signal: emailCheckAbortController.current.signal,
      });

      // If server says not available or invalid (e.g., DNS/MX failure), surface inline error
      if (checkRes.data && checkRes.data.available === false) {
        const msg = checkRes.data.message || 'Email address is invalid';
        setFieldErrors(prev => ({ ...prev, email: msg }));
        setError('Please fix the highlighted fields');
        setLoading(false);
        return;
      }
    } catch (err) {
      if (isCancel(err)) {
        // Request was cancelled; allow submit to continue and let backend validate
      } else {
        // Network/server error while checking email: don't block the user, backend will validate on submit
      }
    }

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
      // Try to extract Laravel validation errors and map them to fieldErrors
      let errorMsg = 'Registration failed. Please try again.';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.message) {
          errorMsg = data.message;
        }

        if (data.errors) {
            const serverFieldErrors = {};
            Object.keys(data.errors).forEach((f) => {
              if (Array.isArray(data.errors[f]) && data.errors[f].length) {
                serverFieldErrors[f] = data.errors[f][0];
              }
            });
            // Show inline field errors (this will surface DNS/MX email failures next to the email input)
            setFieldErrors(prev => ({ ...prev, ...serverFieldErrors }));
            setError('Please fix the highlighted fields');

            // Autofocus first invalid field in a predictable order
            const order = ['first_name','middle_name','last_name','email','phone','password','password_confirmation'];
            const firstInvalid = order.find(k => serverFieldErrors[k]);
            if (firstInvalid) {
              setTimeout(() => {
                const el = fieldRefs.current[firstInvalid];
                if (el && typeof el.focus === 'function') {
                  try { el.focus(); } catch(e) { /* ignore */ }
                }
              }, 0);
            }
        } else {
          setError(errorMsg);
        }
      } else if (err.message) {
        setError(err.message);
      }
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
    setEmailAvailable(null);
    setEmailCheckMsg('');
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

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-green-200 dark:border-gray-600 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 placeholder:opacity-80 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-500 focus:border-green-300 dark:focus:border-green-400 transition-all";
  const labelClasses = "block text-sm font-semibold text-black dark:text-gray-200 mb-2";
  const iconClasses = "w-5 h-5 text-green-400 dark:text-green-500";

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Toaster />
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-green-100 dark:border-gray-700 relative">
        {/* Back/Sign In Button */}
        {isLogin ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold text-lg z-10 bg-transparent p-0 border-0 shadow-none"
            aria-label="Back to Landing Page"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className="absolute top-4 left-4 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 font-semibold text-lg z-10 bg-transparent p-0 border-0 shadow-none"
            aria-label="Back to Sign In"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}
        {/* Logo and Header */}
        <div className="flex flex-col items-center justify-center mb-4">
          <img src={Logo} alt="AccommoTrack Logo" className="h-12 w-auto mb-2" />
          <span className="no-scale text-2xl md:text-3xl lg:text-3xl font-extrabold text-green-700 dark:text-green-400 tracking-tight">AccommoTrack</span>
        </div>
        <div className="text-center mb-8">
          <h2 className="no-scale text-2xl md:text-3xl lg:text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-green-900/90 dark:text-gray-300">
            {isLogin
              ? 'Access your account and discover accommodations.'
              : 'Sign up to get started and look for accommodations.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 dark:text-red-300 text-sm font-semibold">{error}</span>
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
                  <Mail className={iconClasses} />
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
                  <Lock className={iconClasses} />
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
                  tabIndex="-1"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors opacity-50" />
                  ) : (
                    <Eye className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors opacity-50" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                 className="text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white font-semibold transition-colors opacity-50 hover:opacity-80"
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
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
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
                  <User className={iconClasses} />
                </div>
                <input
                  type="text"
                  name="first_name"
                  ref={el => fieldRefs.current.first_name = el}
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your first name"
                  disabled={loading}
                  required
                />
              </div>
              {fieldErrors.first_name && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.first_name}</p>
              )}
            </div>

            {/* Middle Name */}
            <div>
              <label className={labelClasses}>
                Middle Name <span className="text-black/50 dark:text-white/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className={iconClasses} />
                </div>
                <input
                  type="text"
                  name="middle_name"
                  ref={el => fieldRefs.current.middle_name = el}
                  value={formData.middle_name}
                  onChange={(e) => handleInputChange('middle_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your middle name"
                  disabled={loading}
                />
              </div>
              {fieldErrors.middle_name && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.middle_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Last Name</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className={iconClasses} />
                </div>
                <input
                  type="text"
                  name="last_name"
                  ref={el => fieldRefs.current.last_name = el}
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your last name"
                  disabled={loading}
                  required
                />
              </div>
              {fieldErrors.last_name && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.last_name}</p>
              )}
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
                  <Mail className={iconClasses} />
                </div>
                <input
                  type="email"
                  name="email"
                  ref={el => fieldRefs.current.email = el}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={inputClasses + (emailAvailable === false ? ' border-red-400' : emailAvailable === true ? ' border-green-400' : '')}
                  placeholder="Enter your email"
                  disabled={loading}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={labelClasses}>
                Phone Number <span className="text-black/50 dark:text-white/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className={iconClasses} />
                </div>
                <input
                  type="tel"
                  name="phone"
                  ref={el => fieldRefs.current.phone = el}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={inputClasses}
                  placeholder="Enter your phone number"
                  disabled={loading}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Password</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={iconClasses} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  ref={el => fieldRefs.current.password = el}
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
                  tabIndex="-1"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors opacity-50" />
                  ) : (
                    <Eye className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors opacity-50" />
                  )}
                </button>
              </div>
              <div className="mt-2">
                <ul className="text-xs space-y-1">
                  {!passwordChecks.minLen && (
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">--Minimum 8 characters</span>
                    </li>
                  )}
                  {!passwordChecks.hasUpper && (
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">--At least 1 uppercase letter</span>
                    </li>
                  )}
                  {!passwordChecks.numCount && (
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">--At least 2 numbers</span>
                    </li>
                  )}
                  {!passwordChecks.hasSpecial && (
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 text-gray-300" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">--At least 1 special character</span>
                    </li>
                  )}
                </ul>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className={labelClasses + " flex items-center gap-2"}>
                <span>Confirm Password</span>
                <span className="text-red-400 text-xs font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={iconClasses} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="password_confirmation"
                  ref={el => fieldRefs.current.password_confirmation = el}
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
                  tabIndex="-1"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors opacity-50" />
                  ) : (
                    <Eye className="w-5 h-5 text-green-400 hover:text-green-700 transition-colors opacity-50" />
                  )}
                </button>
              </div>
              {fieldErrors.password_confirmation && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password_confirmation}</p>
              )}
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
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
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
                <Check className="w-10 h-10 text-green-500" />
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
                <Monitor className="w-5 h-5" />
                Continue on Web
              </button>

              {/* Return to Mobile App */}
              <button
                onClick={handleGoToMobileApp}
                className="w-full bg-green-50 text-green-900 font-semibold py-3 px-4 rounded-xl hover:bg-green-100 transition-all duration-200 flex items-center justify-center gap-2 border border-green-100"
              >
                <Smartphone className="w-5 h-5" />
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