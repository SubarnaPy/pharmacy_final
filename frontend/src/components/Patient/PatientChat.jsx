import React, { useState, useEffect, useContext, useRef } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import io from 'socket.io-client';
import apiClient from '../../api/apiClient';
import useChatNotifications from '../../hooks/useChatNotifications';
import '../../styles/chat-notifications.css';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  VideoCameraIcon,
  PaperClipIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  ExclamationCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

function PatientChat({ 
  isEmbedded = false, 
  orderId = null, 
  orderNumber = null,
  conversationId = null,
  pharmacyId = null, 
  pharmacyName = null, 
  onClose = null 
}) {
  const { isDarkMode } = useContext(DarkModeContext);
  const [activeConversations, setActiveConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedConversationRef = useRef(null);

  // Use chat notifications hook
  const {
    unreadCounts,
    totalUnread,
    markConversationAsRead,
    getConversationUnreadCount,
    hasNewMessages
  } = useChatNotifications('patient');

  useEffect(() => {
    console.log('🚀 PatientChat - Component initialized with props:', {
      isEmbedded,
      orderId,
      orderNumber,
      conversationId,
      pharmacyId,
      pharmacyName
    });
    
    if (isEmbedded) {
      if (conversationId) {
        // Select by explicit conversation id when provided
        fetchConversationById(conversationId);
      } else if (orderId) {
        // In embedded mode, fetch the specific order conversation
        fetchOrderConversation();
      } else {
        fetchActiveConversations();
      }
    } else {
      // In standalone mode, fetch all conversations
      fetchActiveConversations();
    }
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isEmbedded, orderId, conversationId]);

  useEffect(() => {
    console.log('📨 PatientChat - Messages state changed:', messages);
    scrollToBottom();
  }, [messages]);

  // Keep a ref of the selected conversation id to avoid stale closures in socket handlers
  useEffect(() => {
    selectedConversationRef.current = selectedConversation?._id || null;
  }, [selectedConversation]);

  // Ensure we join the room whenever socket or selection changes (covers embedded mode)
  useEffect(() => {
    if (socket && selectedConversation?._id) {
      socket.emit('join_room', { roomId: selectedConversation._id });
    }
  }, [socket, selectedConversation]);

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to chat server');
    });

    newSocket.on('new_message', (messageData) => {
      if (selectedConversationRef.current && messageData.roomId === selectedConversationRef.current) {
        setMessages(prev => {
          // Avoid duplicates if we already appended optimistically
          if (prev.some(m => m._id === messageData._id)) return prev;
          return [
            ...prev,
            {
              _id: messageData._id || messageData.id,
              content: messageData.content,
              sender: messageData.sender.role === 'patient' ? 'patient' : 'pharmacy',
              senderId: messageData.sender,
              timestamp: messageData.timestamp,
              type: messageData.type,
              metadata: messageData.metadata,
              status: 'delivered'
            }
          ];
        });
      }

      // Update conversation list
      setActiveConversations(prev =>
        prev.map(conv =>
          conv._id === messageData.roomId
            ? {
                ...conv,
                lastMessage: {
                  content: messageData.content,
                  timestamp: messageData.timestamp,
                  sender: messageData.sender.role === 'patient' ? 'patient' : 'pharmacy'
                },
                unreadCount: selectedConversation?._id === messageData.roomId ? 0 : conv.unreadCount + 1
              }
            : conv
        )
      );
    });

    newSocket.on('user_typing', (data) => {
      if (selectedConversationRef.current && data.roomId === selectedConversationRef.current && data.isTyping) {
        setTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      } else {
        setTyping(false);
      }
    });

    newSocket.on('message_read', (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === data.messageId 
            ? { ...msg, status: 'read' }
            : msg
        )
      );
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
    });

    setSocket(newSocket);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchActiveConversations = async () => {
    setLoading(true);
    console.log('🔍 PatientChat - Fetching order chats...');
    try {
      const response = await apiClient.get('/order-chat/user/conversations');
      console.log('📋 PatientChat - Order chats API Response:', response.data);

      if (response.data.success) {
        const orderChats = response.data.data?.conversations || [];
        console.log('✅ PatientChat - Setting order chats:', orderChats);

        // Transform order chats to match the expected conversation format
        const transformedConversations = orderChats.map(orderChat => ({
          _id: orderChat._id,
          type: 'order',
          orderId: orderChat.orderId,
          order: orderChat.orderId,
          patientId: orderChat.patientId,
          pharmacy: {
            _id: orderChat.otherParticipant?.userId,
            name: orderChat.otherParticipant?.name,
            contact: { phone: orderChat.otherParticipant?.phone },
            address: orderChat.otherParticipant?.address
          },
          status: orderChat.isActive ? 'active' : 'inactive',
          lastMessage: orderChat.lastMessage,
          unreadCount: orderChat.unreadCount || 0, // Will be updated by notifications hook
          roomId: orderChat.roomId,
          createdAt: orderChat.createdAt,
          updatedAt: orderChat.updatedAt,
          orderInfo: orderChat.orderInfo
        }));

        setActiveConversations(transformedConversations);
      } else {
        console.error('❌ PatientChat - API returned success=false:', response.data);
        throw new Error('Failed to fetch order chats');
      }
    } catch (error) {
      console.error('❌ PatientChat - Error fetching order chats:', error);
      toast.error('Failed to load order chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationById = async (id) => {
    setLoading(true);
    try {
      // Get or create order chat using the new endpoint
      const response = await apiClient.get(`/order-chat/${id}`);
      if (response.data.success) {
        const orderChat = response.data.data.orderChat;
        console.log('🎯 PatientChat - Found order chat by id:', id, orderChat);

        // Transform order chat to match conversation format
        const transformedConversation = {
          _id: orderChat._id,
          type: 'order',
          orderId: orderChat.orderId,
          order: orderChat.orderId,
          patientId: orderChat.patientId,
          pharmacy: {
            _id: orderChat.pharmacyId?._id,
            name: orderChat.pharmacyId?.name,
            contact: { phone: orderChat.pharmacyId?.phone },
            address: orderChat.pharmacyId?.address
          },
          status: orderChat.isActive ? 'active' : 'inactive',
          lastMessage: orderChat.lastMessage,
          unreadCount: orderChat.unreadCount || 0,
          roomId: orderChat.roomId,
          createdAt: orderChat.createdAt,
          updatedAt: orderChat.updatedAt
        };

        setActiveConversations([transformedConversation]);
        setSelectedConversation(transformedConversation);
        fetchMessages(orderChat.orderId);
      } else {
        throw new Error('Failed to fetch order chat');
      }
    } catch (error) {
      console.error('❌ PatientChat - Error fetching order chat by id:', error);
      toast.error('Failed to load order chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderConversation = async () => {
    setLoading(true);
    try {
      // Try to get or create order chat using the new endpoint
      console.log('🔍 PatientChat - Looking for order chat. orderId:', orderId, 'orderNumber:', orderNumber);
      const response = await apiClient.get(`/order-chat/${orderId}`);

      if (response.data.success) {
        const orderChat = response.data.data.orderChat;
        console.log('✅ PatientChat - Found order chat:', orderChat);

        // Transform order chat to match conversation format
        const transformedConversation = {
          _id: orderChat._id,
          type: 'order',
          orderId: orderChat.orderId,
          order: orderChat.orderId,
          patientId: orderChat.patientId,
          pharmacy: {
            _id: orderChat.pharmacyId?._id,
            name: orderChat.pharmacyId?.name,
            contact: { phone: orderChat.pharmacyId?.phone },
            address: orderChat.pharmacyId?.address
          },
          status: orderChat.isActive ? 'active' : 'inactive',
          lastMessage: orderChat.lastMessage,
          unreadCount: orderChat.unreadCount || 0,
          roomId: orderChat.roomId,
          createdAt: orderChat.createdAt,
          updatedAt: orderChat.updatedAt
        };

        setActiveConversations([transformedConversation]);
        setSelectedConversation(transformedConversation);
        fetchMessages(orderChat.orderId);
      } else {
        console.log('❌ PatientChat - No order chat found for orderId:', orderId);
        console.log('❌ PatientChat - Order chats are created automatically when orders are placed');
        // Show appropriate message since order chats are created automatically
        toast.error('Order chat not found. Please ensure your order has been placed successfully.');
      }
    } catch (error) {
      console.error('Error fetching order conversation:', error);
      toast.error('Failed to load order conversation');
      setActiveConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const createOrderConversation = async () => {
    try {
      // Since we're using the new OrderChat system, we can't create conversations from the frontend
      // The order chats are created automatically when orders are placed
      // For now, we'll just show an error message
      console.error('Cannot create order chat from frontend - order chats are created automatically');
      toast.error('Order chat not found. Please contact support if this issue persists.');
    } catch (error) {
      console.error('Error creating order conversation:', error);
      toast.error('Failed to create order conversation');
    }
  };

  const fetchMessages = async (orderId) => {
    setLoading(true);
    console.log('🔍 PatientChat - Fetching messages for order:', orderId);
    try {
      const response = await apiClient.get(`/order-chat/${orderId}/messages`);
      console.log('📨 PatientChat - Order chat messages API Response:', response.data);

      if (response.data.success) {
        const rawMessages = response.data.data?.messages || [];
        console.log('📋 PatientChat - Raw messages from API:', rawMessages);

        const formattedMessages = rawMessages.map(msg => {
          console.log('📝 PatientChat - Processing message:', {
            id: msg._id,
            content: msg.content,
            senderId: msg.senderId,
            senderRole: msg.senderRole,
            timestamp: msg.timestamp
          });

          return {
            _id: msg._id,
            content: msg.content,
            sender: msg.senderRole === 'patient' ? 'patient' : 'pharmacy',
            senderId: { role: msg.senderRole, id: msg.senderId },
            timestamp: msg.timestamp,
            type: msg.type,
            metadata: msg.metadata,
            status: msg.readBy && msg.readBy.some(read => read.userId === getCurrentUserId()) ? 'read' : 'delivered'
          };
        });

        console.log('✅ PatientChat - Formatted messages:', formattedMessages);
        setMessages(formattedMessages);
      } else {
        console.error('❌ PatientChat - API returned success=false:', response.data);
        throw new Error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('❌ PatientChat - Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conversation) => {
    console.log('🎯 PatientChat - Selecting conversation:', conversation);
    setSelectedConversation(conversation);
    fetchMessages(conversation.orderId);

    // Join room for real-time updates
    if (socket) {
      socket.emit('join_room', { roomId: conversation.roomId });
    }

    // Mark as read using enhanced notification system
    if (getConversationUnreadCount(conversation._id) > 0) {
      markAsRead(conversation.orderId);

      // Update local conversation state to remove unread count
      setActiveConversations(prev =>
        prev.map(conv =>
          conv._id === conversation._id
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      await apiClient.post(`/order-chat/${conversationId}/read`);

      // Update local state
      setActiveConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.userId || payload._id;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageData = {
      content: newMessage.trim(),
      type: 'text'
    };

    try {
      const response = await apiClient.post(`/order-chat/${selectedConversation.orderId}/messages`, messageData);

      if (response.data.success) {
        setNewMessage('');
        // Optimistically append the message so the patient sees it immediately
        const saved = response.data.data?.message || {};
        const optimisticMsg = {
          _id: saved._id || `temp-${Date.now()}`,
          content: saved.content || messageData.content,
          sender: 'patient',
          senderId: { role: 'patient', id: getCurrentUserId() },
          timestamp: saved.timestamp || new Date().toISOString(),
          type: saved.type || 'text',
          metadata: saved.metadata,
          status: 'delivered'
        };
        setMessages(prev => {
          if (prev.some(m => m._id === optimisticMsg._id)) return prev;
          return [...prev, optimisticMsg];
        });

        // Update conversation last message
        setActiveConversations(prev =>
          prev.map(conv =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  lastMessage: {
                    content: messageData.content,
                    timestamp: new Date().toISOString(),
                    sender: 'patient'
                  }
                }
              : conv
          )
        );
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (isTyping) => {
    if (socket && selectedConversation) {
      if (isTyping) {
        socket.emit('typing_start', { roomId: selectedConversation._id });
      } else {
        socket.emit('typing_stop', { roomId: selectedConversation._id });
      }
    }
  };

  const handleFileUpload = async (files) => {
    if (!selectedConversation) return;

    for (let file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', selectedConversation._id);

        const response = await apiClient.post('/chat/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.success) {
          toast.success('File uploaded successfully');
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const startVideoCall = async () => {
    if (!selectedConversation) return;

    try {
      const response = await apiClient.post('/video/initiate', {
        pharmacyId: selectedConversation.pharmacy._id,
        conversationId: selectedConversation._id
      });

      if (response.data.success) {
        // Open video call interface
        window.open(`/video-call/${response.data.data.roomId}`, '_blank');
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('Failed to start video call');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const ConversationItem = ({ conversation }) => {
    const conversationUnreadCount = getConversationUnreadCount(conversation._id);
    const hasUnreadMessages = conversationUnreadCount > 0 || hasNewMessages(conversation._id);
    {conversation.metadata?.orderNumber && (
    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
      Order: {conversation.metadata.orderNumber}
    </p>
  )}
    return (
      <div
        onClick={() => selectConversation(conversation)}
        className={`
          relative p-4 cursor-pointer transition-all duration-300 border-b border-gray-200 dark:border-gray-700
          ${selectedConversation?._id === conversation._id 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }
          ${hasUnreadMessages ? 'bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10' : ''}
        `}
      >
        {/* Red dot indicator for new messages */}
        {hasUnreadMessages && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse">
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full opacity-75 animate-ping"></div>
          </div>
        )}
        {conversation.metadata?.orderNumber && (
    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
      Order: {conversation.metadata.orderNumber}
    </p>
  )}
        
        <div className="flex items-start space-x-3">
          <div className={`
            relative w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0
            ${hasUnreadMessages ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800' : ''}`}>
            <BuildingStorefrontIcon className="w-6 h-6 text-white" />
            {/* Small notification badge on avatar */}
            {conversationUnreadCount > 0 && (
              <div className="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {conversationUnreadCount > 9 ? '9+' : conversationUnreadCount}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className={`
                text-sm font-semibold truncate
                ${hasUnreadMessages 
                  ? 'text-blue-700 dark:text-blue-300' 
                  : 'text-gray-900 dark:text-white'
                }
              `}>
                {conversation.pharmacy.name}
                {hasUnreadMessages && (
                  <span className="inline-block ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {conversation.lastMessage ? formatTime(conversation.lastMessage.timestamp) : ''}
              </span>
            </div>
            
            <div className="flex items-center mb-1 space-x-2 text-xs text-gray-600 dark:text-gray-400">
              <MapPinIcon className="w-3 h-3" />
              <span>{conversation.pharmacy.address?.city || 'Location'}</span>
              {conversation.type === 'order' && conversation.metadata?.orderId && (
                <>
                  <span>•</span>
                  <DocumentTextIcon className="w-3 h-3" />
                  <span>Order Chat</span>
                </>
              )}
              {conversation.prescriptionRequest && (
                <>
                  <span>•</span>
                  <span>{conversation.prescriptionRequest.requestNumber}</span>
                </>
              )}
            </div>
            
            {conversation.lastMessage && (
              <p className={`
                text-sm truncate
                ${hasUnreadMessages 
                  ? 'font-medium text-gray-900 dark:text-gray-100' 
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}>
                {conversation.lastMessage.sender === 'patient' ? 'You: ' : ''}
                {conversation.lastMessage.content}
              </p>
            )}
            
            <div className="flex justify-between items-center mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                conversation.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
              }`}>
                {conversation.status}
              </span>
              
              {conversationUnreadCount > 0 && (
                <div className="flex items-center space-x-1">
                  <span className="flex justify-center items-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                    {conversationUnreadCount > 99 ? '99+' : conversationUnreadCount}
                  </span>
                  <span className="text-xs font-medium text-red-500">
                    new
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MessageBubble = ({ message }) => {
    console.log('💬 PatientChat - Rendering MessageBubble:', message);
    const isPatient = message.sender === 'patient';
    console.log('👤 PatientChat - Message sender check:', { 
      sender: message.sender, 
      isPatient,
      senderId: message.senderId,
      senderRole: message.senderId?.role 
    });
    
    return (
      <div className={`flex ${isPatient ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`
          max-w-xs lg:max-w-md px-4 py-2 rounded-2xl
          ${isPatient 
            ? 'text-white bg-blue-500 rounded-br-sm' 
            : 'text-gray-900 bg-gray-200 rounded-bl-sm dark:bg-gray-700 dark:text-white'
          }
        `}>
          {message.type === 'file' && (
            <div className="mb-2">
              <div className="flex items-center space-x-2">
                <PaperClipIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {message.metadata?.fileName || 'File'}
                </span>
              </div>
              {message.metadata?.fileSize && (
                <span className="text-xs opacity-75">
                  {(message.metadata.fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          )}
          
          <p className="text-sm">{message.content}</p>
          
          <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
            isPatient ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            <span>{formatMessageTime(message.timestamp)}</span>
            {isPatient && (
              <div className="flex">
                {message.status === 'delivered' && <CheckIcon className="w-3 h-3" />}
                {message.status === 'read' && <CheckIcon className="-ml-1 w-3 h-3" />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Embedded mode - show only the chat interface for the specific order
  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-800">
        {selectedConversation ? (
          <>
            {/* Chat Header for embedded mode */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="flex justify-center items-center w-10 h-10 bg-green-500 rounded-full">
                    <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {pharmacyName || selectedConversation.pharmacy?.name || 'Pharmacy'}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      {orderNumber && (
                        <span className="flex items-center">
                          <DocumentTextIcon className="mr-1 w-4 h-4" />
                          Order #{orderNumber}
                        </span>
                      )}
                      <span className="flex items-center">
                        <PhoneIcon className="mr-1 w-4 h-4" />
                        {selectedConversation.pharmacy?.contact?.phone || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={startVideoCall}
                    className="p-2 text-blue-600 rounded-lg transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Start Video Call"
                  >
                    <VideoCameraIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {messages.map((message) => (
                <MessageBubble key={message._id} message={message} />
              ))}
              
              {typing && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 bg-gray-200 rounded-2xl rounded-bl-sm dark:bg-gray-700">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-end space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                        handleTyping(false);
                      }
                    }}
                    onBlur={() => handleTyping(false)}
                    placeholder="Type your message about this order..."
                    rows={1}
                    className="px-4 py-3 w-full placeholder-gray-500 text-gray-900 bg-white rounded-xl border border-gray-300 resize-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 text-white bg-blue-500 rounded-xl transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Loading or no conversation in embedded mode
          <div className="flex flex-1 justify-center items-center">
            <div className="text-center">
              {loading ? (
                <>
                  <div className="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading conversation...</p>
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    Conversation Not Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Unable to load the conversation for this order
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard mode - show full interface with sidebar
  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="flex flex-col w-1/3 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <ChatBubbleLeftRightIcon className="mr-2 w-6 h-6" />
            Pharmacy Conversations
            {totalUnread > 0 && (
              <span className="flex justify-center items-center ml-2 w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </h2>
          <p className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
            {totalUnread > 0 ? (
              <>
                <span className="inline-block mr-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                {totalUnread} unread messages
              </>
            ) : (
              'All conversations read'
            )}
          </p>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          ) : activeConversations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <ChatBubbleLeftRightIcon className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">No Conversations</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Conversations will appear here when pharmacies accept your prescriptions
              </p>
            </div>
          ) : (
            activeConversations.map((conversation) => (
              <ConversationItem key={conversation._id} conversation={conversation} />
            ))
          )}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex flex-col flex-1">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="flex justify-center items-center w-10 h-10 bg-green-500 rounded-full">
                    <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.pharmacy.name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <PhoneIcon className="mr-1 w-4 h-4" />
                        {selectedConversation.pharmacy.contact?.phone || 'N/A'}
                      </span>
                      <span className="flex items-center">
                        <MapPinIcon className="mr-1 w-4 h-4" />
                        {selectedConversation.pharmacy.address?.city || 'Location'}
                      </span>
                      {selectedConversation.prescriptionRequest && (
                        <span>{selectedConversation.prescriptionRequest.requestNumber}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={startVideoCall}
                    className="p-2 text-blue-600 rounded-lg transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Start Video Call"
                  >
                    <VideoCameraIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {messages.map((message) => (
                <MessageBubble key={message._id} message={message} />
              ))}
              
              {typing && (
                <div className="flex justify-start">
                  <div className="px-4 py-2 bg-gray-200 rounded-2xl rounded-bl-sm dark:bg-gray-700">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-end space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                        handleTyping(false);
                      }
                    }}
                    onBlur={() => handleTyping(false)}
                    placeholder="Type your message..."
                    rows={1}
                    className="px-4 py-3 w-full placeholder-gray-500 text-gray-900 bg-white rounded-xl border border-gray-300 resize-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 text-white bg-blue-500 rounded-xl transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          // No conversation selected
          <div className="flex flex-1 justify-center items-center">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="mx-auto mb-4 w-16 h-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                Select a Conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a pharmacy conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientChat;
