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
  UserIcon,
  PhoneIcon,
  VideoCameraIcon,
  PaperClipIcon,
  FaceSmileIcon,
  ClockIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

function PharmacyChat() {
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

  // Use chat notifications hook
  const {
    unreadCounts,
    totalUnread,
    markConversationAsRead,
    getConversationUnreadCount,
    hasNewMessages
  } = useChatNotifications('pharmacy');

  useEffect(() => {
    fetchActiveConversations();
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      if (selectedConversation && messageData.roomId === selectedConversation._id) {
        setMessages(prev => [...prev, {
          _id: messageData._id || messageData.id,
          content: messageData.content,
          sender: messageData.sender.role === 'pharmacy' ? 'pharmacy' : 'patient',
          senderId: messageData.sender,
          timestamp: messageData.timestamp,
          type: messageData.type,
          metadata: messageData.metadata,
          status: 'delivered'
        }]);
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
                  sender: messageData.sender.role === 'pharmacy' ? 'pharmacy' : 'patient'
                },
                unreadCount: selectedConversation?._id === messageData.roomId ? 0 : conv.unreadCount + 1
              }
            : conv
        )
      );
    });

    newSocket.on('user_typing', (data) => {
      if (selectedConversation && data.roomId === selectedConversation._id && data.isTyping) {
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
    console.log('🔍 PharmacyChat - Fetching order chats...');
    try {
      const response = await apiClient.get('/order-chat/user/conversations');
      console.log('📋 PharmacyChat - Order chats API Response:', response.data);

      if (response.data.success) {
        const orderChats = response.data.data?.conversations || [];
        console.log('✅ PharmacyChat - Setting order chats:', orderChats);

        // Transform order chats to match the expected conversation format
        const transformedConversations = orderChats.map(orderChat => ({
          _id: orderChat._id,
          type: 'order',
          orderId: orderChat.orderId,
          patientId: orderChat.patientId,
          patient: {
            _id: orderChat.otherParticipant?.userId || 'unknown',
            profile: {
              firstName: orderChat.otherParticipant?.name?.split(' ')[0] || 'Patient',
              lastName: orderChat.otherParticipant?.name?.split(' ').slice(1).join(' ') || ''
            },
            contact: {
              phone: orderChat.otherParticipant?.phone || 'N/A'
            }
          },
          status: orderChat.isActive ? 'active' : 'inactive',
          lastMessage: orderChat.lastMessage,
          unreadCount: orderChat.unreadCount || 0, // Will be updated by notifications hook
          roomId: orderChat.roomId,
          createdAt: orderChat.createdAt,
          updatedAt: orderChat.updatedAt,
          orderInfo: orderChat.orderInfo,
          prescriptionRequest: {
            requestNumber: orderChat.orderInfo?.orderNumber || 'N/A'
          }
        }));

        setActiveConversations(transformedConversations);
      } else {
        console.error('❌ PharmacyChat - API returned success=false:', response.data);
        throw new Error('Failed to fetch order chats');
      }
    } catch (error) {
      console.error('❌ PharmacyChat - Error fetching order chats:', error);
      toast.error('Failed to load order chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (orderId) => {
    setLoading(true);
    console.log('🔍 PharmacyChat - Fetching messages for order:', orderId);
    try {
      const response = await apiClient.get(`/order-chat/${orderId}/messages`);
      console.log('📨 PharmacyChat - Order chat messages API Response:', response.data);

      if (response.data.success) {
        const rawMessages = response.data.data?.messages || [];
        console.log('📋 PharmacyChat - Raw messages from API:', rawMessages);

        const formattedMessages = rawMessages.map(msg => {
          console.log('📝 PharmacyChat - Processing message:', {
            id: msg._id,
            content: msg.content,
            senderId: msg.senderId,
            senderRole: msg.senderRole,
            timestamp: msg.timestamp
          });

          return {
            _id: msg._id,
            content: msg.content,
            sender: msg.senderRole === 'pharmacy' ? 'pharmacy' : 'patient',
            senderId: {
              _id: msg.senderId,
              role: msg.senderRole,
              name: msg.senderRole === 'pharmacy' ? 'Pharmacy' : 'Patient'
            },
            timestamp: msg.timestamp,
            type: msg.type,
            metadata: msg.metadata,
            status: msg.readBy && msg.readBy.some(read => read.userId === getCurrentUserId()) ? 'read' : 'delivered'
          };
        });

        console.log('✅ PharmacyChat - Formatted messages:', formattedMessages);
        setMessages(formattedMessages);
      } else {
        console.error('❌ PharmacyChat - API returned success=false:', response.data);
        throw new Error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('❌ PharmacyChat - Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (conversation) => {
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

  const markAsRead = async (orderId) => {
    try {
      await apiClient.post(`/order-chat/${orderId}/read`);

      // Update local state
      setActiveConversations(prev =>
        prev.map(conv =>
          conv.orderId === orderId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
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

        // Optimistically add the message to the UI
        const saved = response.data.data?.message || {};
        const newMessageObj = {
          _id: saved._id || `temp_${Date.now()}`,
          content: saved.content || messageData.content,
          sender: 'pharmacy',
          senderId: {
            _id: saved.senderId || 'current_user',
            role: 'pharmacy',
            name: 'Pharmacy'
          },
          timestamp: saved.timestamp || new Date().toISOString(),
          type: 'text',
          status: 'delivered'
        };

        setMessages(prev => [...prev, newMessageObj]);

        // Update conversation last message
        setActiveConversations(prev =>
          prev.map(conv =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  lastMessage: {
                    content: messageData.content,
                    timestamp: new Date().toISOString(),
                    sender: 'pharmacy'
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
        patientId: selectedConversation.patient._id,
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

  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return null;
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
        {conversation.orderInfo?.orderNumber && (
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Order: {conversation.orderInfo.orderNumber}
          </p>
        )}
        {/* Red dot indicator for new messages */}
        {hasUnreadMessages && (
          <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse">
            <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full opacity-75 animate-ping"></div>
          </div>
        )}
        
        <div className="flex items-start space-x-3">
          <div className={`
            relative w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0
            ${hasUnreadMessages ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800' : ''}`}>
            <UserIcon className="w-6 h-6 text-white" />
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
                {conversation.patient.profile.firstName} {conversation.patient.profile.lastName}
                {hasUnreadMessages && (
                  <span className="inline-block ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {conversation.lastMessage ? formatTime(conversation.lastMessage.timestamp) : ''}
              </span>
            </div>
            
            <p className="mb-1 text-xs text-gray-600 dark:text-gray-400">
              {conversation.prescriptionRequest?.requestNumber || 'General Chat'}
            </p>
            
            {conversation.lastMessage && (
              <p className={`
                text-sm truncate
                ${hasUnreadMessages 
                  ? 'font-medium text-gray-900 dark:text-gray-100' 
                  : 'text-gray-600 dark:text-gray-400'
                }
              `}>
                {conversation.lastMessage.sender === 'pharmacy' ? 'You: ' : ''}
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
    const isPharmacy = message.sender === 'pharmacy';
    
    return (
      <div className={`flex ${isPharmacy ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`
          max-w-xs lg:max-w-md px-4 py-2 rounded-2xl
          ${isPharmacy 
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
            isPharmacy ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            <span>{formatMessageTime(message.timestamp)}</span>
            {isPharmacy && (
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

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="flex flex-col w-1/3 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <ChatBubbleLeftRightIcon className="mr-2 w-6 h-6" />
            Patient Conversations
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
                Conversations will appear here when patients message you
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
                  <div className="flex justify-center items-center w-10 h-10 bg-blue-500 rounded-full">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.patient.profile.firstName} {selectedConversation.patient.profile.lastName}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center">
                        <PhoneIcon className="mr-1 w-4 h-4" />
                        {selectedConversation.patient.contact.phone}
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
                Choose a patient conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PharmacyChat;
