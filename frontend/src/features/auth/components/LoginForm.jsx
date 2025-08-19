import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../authSlice';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  EnvelopeIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../../app/DarkModeContext';

function LoginForm() {
  const dispatch = useDispatch();
  const authStatus = useSelector(state => state.auth.status);
  const error = useSelector(state => state.auth.error);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useContext(DarkModeContext);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Get the intended destination from location state
  const from = location.state?.from?.pathname || '/dashboard';

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form validation
  useEffect(() => {
    const errors = {};
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (password && password.length < 1) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    setIsFormValid(email && password && Object.keys(errors).length === 0);
  }, [email, password]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setIsLoading(true);
    dispatch(login({ email, password, rememberMe }))
      .unwrap()
      .then((result) => {
        console.log('Login successful:', result);
        if (result.requiresTwoFactor) {
          navigate('/verify-2fa');
        } else {
          navigate(from, { replace: true });
        }
      })
      .catch((err) => {
        console.error('Login failed:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const InputField = ({ 
    icon: Icon, 
    type = "text", 
    placeholder, 
    value, 
    onChange, 
    error, 
    required = false,
    showPasswordToggle = false,
    showPassword = false,
    onTogglePassword
  }) => (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
        <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors duration-300" />
      </div>
      <input
        type={showPasswordToggle ? (showPassword ? "text" : "password") : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full pl-12 pr-${showPasswordToggle ? '12' : '4'} py-4 
          border-2 rounded-2xl transition-all duration-300
          focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/50 
          focus:border-emerald-500 dark:focus:border-emerald-400
          hover:border-gray-300 dark:hover:border-gray-600 
          bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
          border-gray-200 dark:border-gray-700
          ${error ? 'border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-900/50' : ''}
          placeholder:text-gray-400 dark:placeholder:text-gray-500 
          text-gray-900 dark:text-gray-100
          shadow-sm hover:shadow-md focus:shadow-lg
          dark:shadow-gray-900/20 dark:hover:shadow-gray-900/30 dark:focus:shadow-gray-900/40
        `}
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-r-2xl transition-colors z-10"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          ) : (
            <EyeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          )}
        </button>
      )}
      {error && (
        <div className="flex items-center mt-2 text-red-600 dark:text-red-400 text-sm animate-bounce">
          <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-8 w-80 h-80 bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-3xl animate-bounce"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-cyan-400/20 dark:bg-cyan-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className={`max-w-md w-full transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/30 overflow-hidden relative">
          {/* Decorative gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl opacity-75 blur-lg"></div>
          <div className="relative bg-white/95 dark:bg-gray-800/95 rounded-3xl m-0.5">
            <div className="px-8 py-12">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative group">
                  <HeartIcon className="h-10 w-10 text-white drop-shadow-lg" />
                  <SparklesIcon className="h-6 w-6 text-white/80 absolute -top-2 -right-2 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent mb-3">
                  Welcome Back
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Sign in to your healthcare account</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl animate-slideDown">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <InputField
                    icon={EnvelopeIcon}
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={formErrors.email}
                    required
                  />

                  <InputField
                    icon={ShieldCheckIcon}
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={formErrors.password}
                    required
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 dark:text-emerald-500 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-2 transition-all bg-white dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors font-medium">
                      Remember me
                    </span>
                  </label>
                  
                  <Link
                    to="/forgot-password"
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold hover:underline transition-all duration-300"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={!isFormValid || authStatus === 'loading'}
                  className={`
                    w-full py-4 rounded-2xl font-bold transition-all duration-300 
                    flex items-center justify-center space-x-3 shadow-xl
                    ${isFormValid && authStatus !== 'loading'
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white transform hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] dark:shadow-gray-900/50'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {authStatus === 'loading' || isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-6 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">Don't have an account?</span>
                  </div>
                </div>

                {/* Register Link */}
                <Link
                  to="/register"
                  className="w-full py-4 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-2xl font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-300 flex items-center justify-center space-x-3 group shadow-lg dark:shadow-gray-900/30"
                >
                  <span>Create new account</span>
                  <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </form>

              {/* Security Note */}
              <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-emerald-800 dark:text-emerald-300">
                    <p className="font-bold mb-1">Secure Login</p>
                    <p>Your data is protected with end-to-end encryption and two-factor authentication.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 PharmaConnect Healthcare Platform. All rights reserved.</p>
          <div className="mt-3 space-x-6">
            <Link to="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">Terms of Service</Link>
            <span>•</span>
            <Link to="/help" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">Help</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
