import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ChatBubbleLeftRightIcon,
  ComputerDesktopIcon,
  CameraIcon,
  UserIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { VideoCameraSlashIcon } from '@heroicons/react/24/solid';
import { MicrophoneIcon as MicrophoneSlashIcon } from '@heroicons/react/24/outline';
import { useConsultationSocket } from '../../hooks/useConsultationSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import { toast } from 'react-hot-toast';

const VideoConsultationRoom = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [showChat, setShowChat] = useState(true);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const callTimerRef = useRef(null);
  
  // Initialize socket and WebRTC
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
    endConsultation
  } = useConsultationSocket(consultationId);
  
  const {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  } = useWebRTC(socket, consultationId, user.role === 'doctor');

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Start call timer when connected
  useEffect(() => {
    if (connectionState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [connectionState]);

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

  // Send chat message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
      setIsTyping(false);
      stopTyping();
    }
  };

  // End consultation
  const handleEndConsultation = () => {
    if (confirm('Are you sure you want to end this consultation?')) {
      endCall();
      endConsultation();
      toast.success('Consultation ended');
      navigate(user.role === 'doctor' ? '/doctor/consultations' : '/patient/consultations');
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col ${showChat ? 'mr-80' : ''}`}>
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {connectionState === 'connected' ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm">Connected</span>
                </div>
              ) : connectionState === 'connecting' ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm">Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-white text-sm">Disconnected</span>
                </div>
              )}
            </div>
            
            {connectionState === 'connected' && (
              <div className="flex items-center space-x-2 text-white">
                <ClockIcon className="h-4 w-4" />
                <span className="font-mono text-sm">{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ComputerDesktopIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-black">
          {/* Remote Video (Main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <UserIcon className="h-24 w-24 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Waiting for other participant...</p>
              </div>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {!localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <UserIcon className="h-8 w-8 text-gray-600" />
              </div>
            )}

            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <VideoCameraSlashIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-center space-x-4">
            {/* Start/Join Call Button */}
            {connectionState === 'disconnected' && (
              <button
                onClick={startCall}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <VideoCameraIcon className="h-5 w-5" />
                <span>Start Call</span>
              </button>
            )}

            {connectionState !== 'disconnected' && (
              <>
                {/* Audio Toggle */}
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full transition-colors ${
                    isAudioEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isAudioEnabled ? (
                    <MicrophoneIcon className="h-6 w-6" />
                  ) : (
                    <MicrophoneSlashIcon className="h-6 w-6" />
                  )}
                </button>

                {/* Video Toggle */}
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${
                    isVideoEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isVideoEnabled ? (
                    <CameraIcon className="h-6 w-6" />
                  ) : (
                    <VideoCameraSlashIcon className="h-6 w-6" />
                  )}
                </button>

                {/* Screen Share Toggle */}
                <button
                  onClick={toggleScreenShare}
                  className={`p-3 rounded-full transition-colors ${
                    isScreenSharing 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <ComputerDesktopIcon className="h-6 w-6" />
                </button>

                {/* Chat Toggle */}
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-6 w-6" />
                </button>

                {/* End Call */}
                <button
                  onClick={handleEndConsultation}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                >
                  <PhoneXMarkIcon className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${
                  msg.senderId === user._id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                } rounded-lg px-3 py-2`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.senderId === user._id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs">typing...</span>
              </div>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <PaperClipIcon className="h-5 w-5" />
              </button>
              
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              
              <button
                type="submit"
                disabled={!message.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VideoConsultationRoom;
