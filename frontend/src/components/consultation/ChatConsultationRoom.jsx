import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  UserIcon,
  PhoneXMarkIcon,
  DocumentTextIcon,
  PhotoIcon,
  FaceSmileIcon,
  InformationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useConsultationSocket } from '../../hooks/useConsultationSocket';
import consultationManagementService from '../../services/consultationManagementService';

const ChatConsultationRoom = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [consultationStatus, setConsultationStatus] = useState('waiting');
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [consultationDetails, setConsultationDetails] = useState(null);
  
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const durationTimerRef = useRef(null);
  
  // Initialize socket connection
  const {
    socket,
    isConnected,
    participants,
    messages,
    typingUsers,
    consultationInfo,
    sendMessage,
    startTyping,
    stopTyping,
    startConsultation,
    endConsultation
  } = useConsultationSocket(consultationId);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch consultation details
  useEffect(() => {
    const fetchConsultationDetails = async () => {
      try {
        const response = await consultationManagementService.getConsultationDetails(consultationId);
        if (response.success) {
          setConsultationDetails(response.data);
          setConsultationStatus(response.data.status);
        }
      } catch (error) {
        console.error('Error fetching consultation details:', error);
        toast.error('Failed to load consultation details');
      }
    };

    fetchConsultationDetails();
  }, [consultationId]);

  // Handle consultation status changes
  useEffect(() => {
    if (consultationStatus === 'active' && !startTime) {
      setStartTime(new Date());
      durationTimerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [consultationStatus, startTime]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      startTyping();
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, 1000);
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
      setIsTyping(false);
      stopTyping();
    }
  };

  // Start consultation
  const handleStartConsultation = async () => {
    try {
      await consultationManagementService.startConsultation(consultationId);
      setConsultationStatus('active');
      startConsultation();
      toast.success('Consultation started');
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Failed to start consultation');
    }
  };

  // End consultation
  const handleEndConsultation = async () => {
    if (!confirm('Are you sure you want to end this consultation?')) return;

    try {
      await consultationManagementService.endConsultation(consultationId);
      endConsultation();
      setConsultationStatus('completed');
      toast.success('Consultation ended');
      navigate(user.role === 'doctor' ? '/doctor' : '/patient');
    } catch (error) {
      console.error('Error ending consultation:', error);
      toast.error('Failed to end consultation');
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getParticipantName = (role) => {
    if (!consultationDetails) return 'Loading...';
    
    if (role === 'doctor') {
      return consultationDetails.doctorId?.name ? `Dr. ${consultationDetails.doctorId.name}` : 'Doctor';
    } else {
      return consultationDetails.patientId?.name || 'Patient';
    }
  };

  const otherParticipant = user.role === 'doctor' ? 'patient' : 'doctor';

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Chat with {getParticipantName(otherParticipant)}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Connecting...</span>
                    </>
                  )}
                </div>
                
                {consultationStatus === 'active' && (
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4" />
                    <span className="font-mono">{formatDuration(duration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              consultationStatus === 'active' 
                ? 'bg-green-100 text-green-800'
                : consultationStatus === 'pending' || consultationStatus === 'confirmed'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="flex items-center space-x-1">
                {consultationStatus === 'active' && <CheckCircleIcon className="h-3 w-3" />}
                {(consultationStatus === 'pending' || consultationStatus === 'confirmed') && <ClockIcon className="h-3 w-3" />}
                <span className="capitalize">{consultationStatus}</span>
              </div>
            </div>

            {/* Start/End buttons */}
            {consultationStatus === 'confirmed' && user.role === 'doctor' && (
              <button
                onClick={handleStartConsultation}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Consultation
              </button>
            )}

            {consultationStatus === 'active' && (
              <button
                onClick={handleEndConsultation}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <PhoneXMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={chatContainerRef}
          className="h-full overflow-y-auto p-6 space-y-4"
        >
          {/* System Messages */}
          {consultationStatus === 'pending' && (
            <div className="flex justify-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center max-w-md">
                <InformationCircleIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-blue-800 text-sm">
                  Waiting for the consultation to start. The doctor will begin the session shortly.
                </p>
              </div>
            </div>
          )}

          {consultationStatus === 'active' && startTime && (
            <div className="flex justify-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-green-800 text-sm">
                  Consultation started at {startTime.toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${
                msg.senderId === user._id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-900 shadow-sm border'
              } rounded-lg px-4 py-3`}>
                {msg.senderId !== user._id && (
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {msg.senderRole === 'doctor' ? 'Dr. ' : ''}{msg.senderName}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <div className={`flex items-center justify-between mt-2 text-xs ${
                  msg.senderId === user._id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                  {msg.senderId === user._id && (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-[70%]">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {typingUsers[0]?.name} is typing...
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* End of consultation message */}
          {consultationStatus === 'completed' && (
            <div className="flex justify-center">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center max-w-md">
                <CheckCircleIcon className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-800 text-sm">
                  Consultation has ended. Thank you for using our service.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Input */}
      {consultationStatus === 'active' && (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <PaperClipIcon className="h-5 w-5" />
            </button>
            
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <PhotoIcon className="h-5 w-5" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type your message..."
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                disabled={consultationStatus !== 'active'}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <FaceSmileIcon className="h-5 w-5" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!message.trim() || consultationStatus !== 'active'}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>
              {consultationStatus !== 'active' ? 'Consultation not active' : 'Press Enter to send'}
            </span>
            <span>{participants.length} participant{participants.length !== 1 ? 's' : ''} online</span>
          </div>
        </div>
      )}

      {/* Waiting for consultation to start */}
      {(consultationStatus === 'pending' || consultationStatus === 'confirmed') && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-4">
          <div className="flex items-center justify-center space-x-2 text-yellow-800">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span className="text-sm">
              {user.role === 'patient' 
                ? 'Waiting for doctor to start the consultation...' 
                : 'Click "Start Consultation" to begin the session'
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatConsultationRoom;
