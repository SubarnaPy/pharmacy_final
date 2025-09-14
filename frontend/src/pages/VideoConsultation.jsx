import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import io from 'socket.io-client';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ClockIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CogIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import { VideoCameraSlashIcon, MicrophoneIcon as MicrophoneSlashIcon } from '@heroicons/react/24/solid';
import { joinConsultation, startConsultation, endConsultation } from '../api/consultationAPI';

const VideoConsultation = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [consultation, setConsultation] = useState(null);
  const [showChat, setShowChat] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [networkQuality, setNetworkQuality] = useState('good');
  const [participantCount, setParticipantCount] = useState(1);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callTimerRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Helper function to get appropriate dashboard path based on user role
  const getDashboardPath = () => {
    switch (user?.role) {
      case 'patient':
        return '/patient';
      case 'doctor':
        return '/doctor';
      case 'pharmacy':
        return '/pharmacy';
      case 'admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    loadConsultation();
    initializeSocket();
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [consultationId]);
  
  const initializeSocket = () => {
    socketRef.current = io('http://localhost:5000/consultation');
    
    socketRef.current.on('connect', () => {
      console.log('🔌 Connected to consultation socket');
      socketRef.current.emit('join-consultation', consultationId);
    });
    
    socketRef.current.on('consultation-message', (messageData) => {
      if (messageData.senderId !== user._id) {
        setMessages(prev => [...prev, messageData]);
      }
    });
    
    socketRef.current.on('webrtc-offer', async (data) => {
      console.log('📞 Received WebRTC offer');
      await handleReceiveOffer(data.offer);
    });
    
    socketRef.current.on('webrtc-answer', async (data) => {
      console.log('📞 Received WebRTC answer');
      if (peerConnectionRef.current) {
        await handleReceiveAnswer(data.answer);
      }
    });
    
    socketRef.current.on('webrtc-ice-candidate', async (data) => {
      console.log('🧊 Received ICE candidate');
      if (peerConnectionRef.current) {
        await handleReceiveIceCandidate(data.candidate);
      }
    });
    
    socketRef.current.on('user-joined', (data) => {
      console.log('👥 User joined:', data);
      if (data.userId !== user._id && connectionState === 'connected') {
        // Another user joined, they will send an offer
      }
    });
  };
  
  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(configuration);
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('🧊 Sending ICE candidate');
        socketRef.current.emit('webrtc-ice-candidate', {
          consultationId,
          candidate: event.candidate
        });
      }
    };
    
    peerConnection.ontrack = (event) => {
      console.log('📺 Received remote stream:', event.streams[0]);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        // Ensure audio is enabled
        remoteVideoRef.current.volume = 1.0;
        remoteVideoRef.current.muted = false;
        console.log('📺 Remote video and audio set');
      }
    };
    
    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setConnectionState('connected');
      } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        setConnectionState('disconnected');
      }
    };
    
    return peerConnection;
  };
  
  const handleReceiveOffer = async (offer) => {
    try {
      console.log('📞 Handling received offer');
      
      if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection();
        
        // Ensure we have local stream before creating peer connection
        if (!localStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
        
        // Add local stream tracks only once when creating peer connection
        localStreamRef.current.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        });
      }
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      socketRef.current.emit('webrtc-answer', {
        consultationId,
        answer
      });
      
      setConnectionState('connected');
      console.log('📞 Sent WebRTC answer');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  };
  
  const handleReceiveAnswer = async (answer) => {
    try {
      console.log('📞 Handling received answer');
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ WebRTC connection established');
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  };
  
  const handleReceiveIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 Added ICE candidate');
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  };

  const loadConsultation = async () => {
    console.log('🔄 Loading consultation:', consultationId);
    try {
      setLoading(true);
      const response = await joinConsultation(consultationId);
      console.log('🔄 Join consultation response:', response);
      if (response.success) {
        setConsultation(response.data);
        console.log('🔄 Consultation loaded:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading consultation:', error);
      navigate(getDashboardPath());
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    console.log('🎥 Starting call for user:', user.role, user._id);
    try {
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Create peer connection only if it doesn't exist
      if (!peerConnectionRef.current) {
        peerConnectionRef.current = createPeerConnection();
        
        // Add stream tracks to peer connection
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      }
      
      setConnectionState('connected');
      
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      // Start consultation and create offer
      await startConsultation(consultationId);
      
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      socketRef.current.emit('webrtc-offer', {
        consultationId,
        offer
      });
      
      console.log('📞 Sent WebRTC offer');
      
      // Also emit user-joined event
      socketRef.current.emit('user-joined', {
        consultationId,
        userId: user._id,
        userRole: user.role
      });
      
      // Update participant count
      setParticipantCount(2);
      
      // Simulate network quality (in real app, this would be calculated)
      setTimeout(() => setNetworkQuality('excellent'), 2000);
    } catch (error) {
      console.error('❌ Error starting call:', error);
      alert('Failed to access camera/microphone: ' + error.message);
    }
  };

  const endCall = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      
      setConnectionState('disconnected');
      await endConsultation(consultationId);
      navigate(getDashboardPath());
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socketRef.current) {
      const newMessage = {
        id: Date.now(),
        senderId: user._id,
        senderName: user.profile?.firstName || user.name || 'You',
        message: message.trim(),
        timestamp: new Date(),
        consultationId
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      socketRef.current.emit('consultation-message', newMessage);
      
      setMessage('');
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading consultation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Enhanced Header */}
        <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                {connectionState === 'connected' ? (
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <span className="text-emerald-400 text-sm font-medium">Live</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-400 text-sm font-medium">Connecting...</span>
                  </div>
                )}
              </div>
              
              {/* Network Quality */}
              <div className="flex items-center space-x-1">
                <SignalIcon className={`h-4 w-4 ${
                  networkQuality === 'excellent' ? 'text-emerald-400' :
                  networkQuality === 'good' ? 'text-yellow-400' : 'text-red-400'
                }`} />
                <span className="text-xs text-gray-300 capitalize">{networkQuality}</span>
              </div>
            </div>
            
            {/* Call Duration */}
            {connectionState === 'connected' && (
              <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
                <ClockIcon className="h-4 w-4 text-blue-400" />
                <span className="font-mono text-sm text-white">{formatDuration(callDuration)}</span>
              </div>
            )}
            
            {/* Participant Count */}
            <div className="flex items-center space-x-2 bg-white/10 rounded-full px-3 py-1">
              <UserIcon className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-white">{participantCount}</span>
            </div>
          </div>

          {/* Participant Info */}
          <div className="text-center">
            <h3 className="font-semibold text-white text-lg">
              {user.role === 'patient' 
                ? `Dr. ${consultation?.doctorId?.user?.name || 'Doctor'}`
                : consultation?.patientId?.name || 'Patient'
              }
            </h3>
            <p className="text-xs text-gray-300">
              {user.role === 'patient' ? 'Medical Consultation' : 'Patient Consultation'}
            </p>
          </div>
          
          {/* Header Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 text-white"
            >
              {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 text-white"
            >
              <CogIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Enhanced Video Container */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-black overflow-hidden">
          {/* Remote Video (Main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover transition-all duration-300"
          />
          
          {/* Waiting State */}
          {connectionState !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <UserIcon className="h-16 w-16 text-white" />
                  </div>
                  <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full animate-ping opacity-20 mx-auto"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-white text-lg font-medium">Waiting for connection...</p>
                  <p className="text-gray-300 text-sm">Click "Start Call" to begin your consultation</p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-6 right-6 w-56 h-40 bg-black/20 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 hover:scale-105">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Local Video Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
              <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-medium">You</span>
              </div>
              
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <VideoCameraSlashIcon className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-400">Camera Off</p>
                  </div>
                </div>
              )}
              
              {!isAudioEnabled && (
                <div className="absolute top-2 right-2">
                  <div className="bg-red-500 rounded-full p-1">
                    <MicrophoneSlashIcon className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Connection Quality Indicator */}
          {connectionState === 'connected' && (
            <div className="absolute top-6 left-6 bg-black/20 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  networkQuality === 'excellent' ? 'bg-emerald-400' :
                  networkQuality === 'good' ? 'bg-yellow-400' : 'bg-red-400'
                } animate-pulse`}></div>
                <span className="text-white text-sm font-medium capitalize">{networkQuality} Quality</span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Controls */}
        <div className="bg-black/20 backdrop-blur-xl border-t border-white/10 px-6 py-6">
          <div className="flex items-center justify-center space-x-6">
            {connectionState === 'disconnected' && (
              <button
                onClick={startCall}
                className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-2xl hover:from-emerald-600 hover:to-blue-600 transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <VideoCameraIcon className="h-6 w-6" />
                <span className="font-semibold">Start Consultation</span>
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            )}

            {connectionState === 'connected' && (
              <>
                {/* Audio Control */}
                <div className="relative group">
                  <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                      isAudioEnabled 
                        ? 'bg-white/10 hover:bg-white/20 text-white shadow-lg' 
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                    }`}
                  >
                    {isAudioEnabled ? <MicrophoneIcon className="h-6 w-6" /> : <MicrophoneSlashIcon className="h-6 w-6" />}
                  </button>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isAudioEnabled ? 'Mute' : 'Unmute'}
                  </div>
                </div>

                {/* Video Control */}
                <div className="relative group">
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                      isVideoEnabled 
                        ? 'bg-white/10 hover:bg-white/20 text-white shadow-lg' 
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                    }`}
                  >
                    {isVideoEnabled ? <VideoCameraIcon className="h-6 w-6" /> : <VideoCameraSlashIcon className="h-6 w-6" />}
                  </button>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                  </div>
                </div>

                {/* Speaker Control */}
                <div className="relative group">
                  <button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                      isSpeakerOn 
                        ? 'bg-white/10 hover:bg-white/20 text-white shadow-lg' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                    }`}
                  >
                    {isSpeakerOn ? <SpeakerWaveIcon className="h-6 w-6" /> : <SpeakerXMarkIcon className="h-6 w-6" />}
                  </button>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {isSpeakerOn ? 'Mute Speaker' : 'Unmute Speaker'}
                  </div>
                </div>

                {/* Chat Control */}
                <div className="relative group">
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
                      showChat 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'bg-white/10 hover:bg-white/20 text-white shadow-lg'
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="h-6 w-6" />
                  </button>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {showChat ? 'Hide Chat' : 'Show Chat'}
                  </div>
                </div>

                {/* End Call */}
                <div className="relative group">
                  <button
                    onClick={endCall}
                    className="p-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-lg shadow-red-500/25"
                  >
                    <PhoneXMarkIcon className="h-6 w-6" />
                  </button>
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    End Call
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Chat Sidebar */}
      {showChat && (
        <div className="w-80 bg-black/20 backdrop-blur-xl border-l border-white/10 flex flex-col transition-all duration-300">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-semibold text-white text-lg">Live Chat</h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 text-gray-300 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No messages yet</p>
                <p className="text-gray-500 text-xs">Start the conversation!</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[75%] group ${
                  msg.senderId === user._id 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                } rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200`}>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={`text-xs mt-2 opacity-70 ${
                    msg.senderId === user._id ? 'text-blue-100' : 'text-gray-300'
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
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                />
              </div>
              
              <button
                type="submit"
                disabled={!message.trim()}
                className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg"
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

// Add custom CSS for animations
const styles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  .scrollbar-thin {
    scrollbar-width: thin;
  }
  
  .scrollbar-thumb-white\/20::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 9999px;
  }
  
  .scrollbar-track-transparent::-webkit-scrollbar-track {
    background-color: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}


export default VideoConsultation;