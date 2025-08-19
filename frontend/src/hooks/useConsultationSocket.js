import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useConsultationSocket = (consultationId) => {
  const { token, user } = useSelector(state => state.auth);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [consultationInfo, setConsultationInfo] = useState(null);

  useEffect(() => {
    if (!consultationId || !token) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to consultation socket');
      setIsConnected(true);
      
      // Join consultation room
      socket.emit('join-consultation', { consultationId });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from consultation socket');
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error');
    });

    // Consultation events
    socket.on('consultation-joined', (data) => {
      setConsultationInfo(data.consultation);
      setParticipants(data.participants);
    });

    socket.on('user-joined', (data) => {
      setParticipants(prev => [...prev, data.userId]);
      toast.success(`${data.userName} joined the consultation`);
    });

    socket.on('user-left', (data) => {
      setParticipants(prev => prev.filter(id => id !== data.userId));
      toast.info(`${data.userName} left the consultation`);
    });

    socket.on('user-disconnected', (data) => {
      setParticipants(prev => prev.filter(id => id !== data.userId));
      toast.warning(`${data.userName} disconnected`);
    });

    // Chat events
    socket.on('chat-history', (history) => {
      setMessages(history);
    });

    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user-typing', (data) => {
      setTypingUsers(prev => [...prev, data.userId]);
    });

    socket.on('user-stop-typing', (data) => {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    });

    // Consultation end event
    socket.on('consultation-ended', (data) => {
      toast.info(`Consultation ended by ${data.endedByName}`);
      // Handle consultation end (e.g., redirect)
    });

    return () => {
      if (socket) {
        socket.emit('leave-consultation', { consultationId });
        socket.disconnect();
      }
    };
  }, [consultationId, token]);

  // Send message
  const sendMessage = (message, type = 'text') => {
    if (!socketRef.current || !message.trim()) return;
    
    socketRef.current.emit('send-message', {
      consultationId,
      message,
      type
    });
  };

  // Typing indicators
  const startTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { consultationId });
  };

  const stopTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('stop-typing', { consultationId });
  };

  // Call controls
  const toggleAudio = (isEnabled) => {
    if (!socketRef.current) return;
    socketRef.current.emit('toggle-audio', { consultationId, isEnabled });
  };

  const toggleVideo = (isEnabled) => {
    if (!socketRef.current) return;
    socketRef.current.emit('toggle-video', { consultationId, isEnabled });
  };

  const toggleScreenShare = (isSharing) => {
    if (!socketRef.current) return;
    socketRef.current.emit('screen-share', { consultationId, isSharing });
  };

  // End consultation
  const endConsultation = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('end-consultation', { consultationId });
  };

  return {
    socket: socketRef.current,
    isConnected,
    participants,
    messages,
    typingUsers,
    consultationInfo,
    sendMessage,
    startTyping,
    stopTyping,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endConsultation
  };
};
