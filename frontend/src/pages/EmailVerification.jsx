import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ArrowPathIcon,
  EnvelopeIcon,
  HomeIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import apiClient from '../api/apiClient';

function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState('');
  const [showResendForm, setShowResendForm] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (token && !verificationAttempted) {
      setVerificationAttempted(true);
      verifyEmail(token);
    } else if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token, verificationAttempted]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await apiClient.get(`/auth/verify-email?token=${verificationToken}`);
      
      if (response.data.success) {
        setStatus('success');
        // Handle both new verifications and already verified cases
        if (response.data.message.includes('already verified')) {
          setMessage('Your email was already verified! You can now log in to your account.');
        } else {
          setMessage('Your email has been successfully verified! You can now log in to your account.');
        }
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Email verified successfully! Please log in with your credentials.' 
            }
          });
        }, 3000);
      }
    } catch (error) {
      setStatus('error');
      if (error.response?.data?.message) {
        // Handle specific error messages
        const errorMessage = error.response.data.message;
        if (errorMessage.includes('already verified')) {
          setStatus('success');
          setMessage('Your email was already verified! You can now log in to your account.');
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Email verified successfully! Please log in with your credentials.' 
              }
            });
          }, 3000);
        } else {
          setMessage(errorMessage);
          setShowResendForm(true);
        }
      } else {
        setMessage('Email verification failed. The token may be invalid or expired.');
        setShowResendForm(true);
      }
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      const response = await apiClient.post('/auth/resend-verification', { email });
      
      if (response.data.success) {
        alert('Verification email sent! Please check your inbox.');
        setShowResendForm(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const StatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <ArrowPathIcon className="h-16 w-16 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-16 w-16 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-16 w-16 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying': return 'from-blue-500 to-indigo-600';
      case 'success': return 'from-green-500 to-emerald-600';
      case 'error': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'verifying': return 'from-blue-50 via-white to-indigo-50';
      case 'success': return 'from-green-50 via-white to-emerald-50';
      case 'error': return 'from-red-50 via-white to-pink-50';
      default: return 'from-gray-50 via-white to-gray-50';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBackgroundColor()} flex items-center justify-center py-12 px-4 relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-8 w-80 h-80 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-bounce"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-gradient-to-r from-pink-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-md w-full relative">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="px-8 py-12 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full bg-gradient-to-r ${getStatusColor()} shadow-2xl`}>
                <StatusIcon />
              </div>
            </div>

            {/* Title */}
            <h1 className={`text-3xl font-bold bg-gradient-to-r ${getStatusColor()} bg-clip-text text-transparent mb-4`}>
              {status === 'verifying' && 'Verifying Email'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </h1>

            {/* Message */}
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              {message}
            </p>

            {/* Success Actions */}
            {status === 'success' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <p className="text-green-800 text-sm font-medium">
                    Redirecting to login page in 3 seconds...
                  </p>
                </div>
                
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-medium shadow-lg transform hover:scale-105"
                >
                  <span>Login Now</span>
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
              </div>
            )}

            {/* Error Actions */}
            {status === 'error' && (
              <div className="space-y-6">
                {showResendForm && (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Resend Verification Email
                    </h3>
                    <form onSubmit={handleResendVerification} className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isResending}
                        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isResending ? (
                          <>
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <EnvelopeIcon className="h-5 w-5" />
                            <span>Resend Verification</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                <div className="flex flex-col space-y-3">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center space-x-2 px-6 py-3 border-2 border-blue-300 text-blue-700 rounded-2xl hover:bg-blue-50 hover:border-blue-400 transition-all duration-300 font-medium"
                  >
                    <span>Register Again</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                  
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                  >
                    <HomeIcon className="h-5 w-5" />
                    <span>Back to Home</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Verifying State */}
            {status === 'verifying' && (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-2 bg-blue-200 rounded-full">
                    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Having trouble? <Link to="/help" className="text-blue-600 hover:text-blue-800 font-medium">Contact Support</Link></p>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification;
