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
import api, { isCancel } from '../../utils/api';
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
  const emailCheckTimeout = useRef(null);
  const emailCheckAbortController = useRef(null);
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
          <img src={Logo} alt="AccommoTrack Logo" className="h-14 w-auto mb-2" />
          <span className="text-2xl font-extrabold text-green-700 dark:text-green-400 tracking-tight">AccommoTrack</span>
        </div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
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
                 className="text-sm text-black/70 hover:text-black font-semibold transition-colors opacity-50 hover:opacity-80"
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
                  <User className={iconClasses} />
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
                  <User className={iconClasses} />
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
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className={labelClasses}>
                Phone Number <span className="text-black/50 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className={iconClasses} />
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
                  <Lock className={iconClasses} />
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
                  <Lock className={iconClasses} />
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