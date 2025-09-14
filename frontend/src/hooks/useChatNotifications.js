import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

/**
 * Custom hook for managing chat notifications
 */
const useChatNotifications = (userRole) => {
  const [socket, setSocket] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [newMessageNotifications, setNewMessageNotifications] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to chat notification service');
      fetchUnreadCounts();
    });

    // Listen for new chat notifications
    newSocket.on('new_chat_notification', (notification) => {
      handleNewChatNotification(notification);
    });

    // Listen for conversation notification updates
    newSocket.on('conversation_notification', (data) => {
      handleConversationNotification(data);
    });

    // Listen for unread count updates
    newSocket.on('conversation_unread_update', (data) => {
      handleUnreadCountUpdate(data);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from chat notification service');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch initial unread counts - Temporarily disabled for new OrderChat system
  const fetchUnreadCounts = useCallback(async () => {
    console.log('📊 Unread count fetching temporarily disabled for new OrderChat system');
    // TODO: Implement unread counts for OrderChat system
    // For now, return empty data to prevent errors
    setUnreadCounts({});
    setTotalUnread(0);
  }, []);

  // Handle new chat notification
  const handleNewChatNotification = useCallback((notification) => {
    console.log('📨 New chat notification:', notification);
    
    // Add to notification list
    setNewMessageNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep last 10
    
    // Show toast notification
    showChatToast(notification);
    
    // Update unread count
    setUnreadCounts(prev => ({
      ...prev,
      [notification.data.conversationId]: {
        unreadCount: (prev[notification.data.conversationId]?.unreadCount || 0) + 1,
        lastMessage: notification.data.messagePreview,
        lastSender: notification.data.senderName,
        lastTimestamp: notification.timestamp
      }
    }));
    
    // Update total unread
    setTotalUnread(prev => prev + 1);
    
    // Play notification sound
    playNotificationSound();
  }, []);

  // Handle conversation notification
  const handleConversationNotification = useCallback((data) => {
    console.log('🔔 Conversation notification:', data);
    
    if (data.hasNewMessage) {
      setUnreadCounts(prev => ({
        ...prev,
        [data.conversationId]: {
          ...prev[data.conversationId],
          hasNewMessage: true,
          lastMessage: data.lastMessagePreview,
          lastSender: data.senderName
        }
      }));
    }
  }, []);

  // Handle unread count update
  const handleUnreadCountUpdate = useCallback((data) => {
    console.log('📊 Unread count update:', data);
    
    if (data.unreadCount === 0) {
      // Conversation marked as read
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        if (newCounts[data.conversationId]) {
          const oldCount = newCounts[data.conversationId].unreadCount;
          newCounts[data.conversationId].unreadCount = 0;
          newCounts[data.conversationId].hasNewMessage = false;
          
          // Update total unread
          setTotalUnread(prevTotal => Math.max(0, prevTotal - oldCount));
        }
        return newCounts;
      });
    } else if (data.increment) {
      // New message in conversation
      setUnreadCounts(prev => ({
        ...prev,
        [data.conversationId]: {
          ...prev[data.conversationId],
          unreadCount: (prev[data.conversationId]?.unreadCount || 0) + data.increment
        }
      }));
      setTotalUnread(prev => prev + data.increment);
    }
  }, []);

  // Show toast notification for new message
  const showChatToast = (notification) => {
    const isPharmacyMessage = notification.data.senderRole === 'pharmacy';
    const icon = isPharmacyMessage ? '🏪' : '👤';
    
    toast.info(
      `${icon} ${notification.title}\n${notification.message}`,
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "chat-notification-toast"
      }
    );
  };

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create and play a subtle notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId) => {
    try {
      const response = await fetch(`/api/v1/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          if (newCounts[conversationId]) {
            const oldCount = newCounts[conversationId].unreadCount;
            newCounts[conversationId].unreadCount = 0;
            newCounts[conversationId].hasNewMessage = false;
            
            // Update total unread
            setTotalUnread(prevTotal => Math.max(0, prevTotal - oldCount));
          }
          return newCounts;
        });
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, []);

  // Get unread count for specific conversation
  const getConversationUnreadCount = useCallback((conversationId) => {
    return unreadCounts[conversationId]?.unreadCount || 0;
  }, [unreadCounts]);

  // Check if conversation has new messages
  const hasNewMessages = useCallback((conversationId) => {
    return unreadCounts[conversationId]?.hasNewMessage || false;
  }, [unreadCounts]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNewMessageNotifications([]);
  }, []);

  return {
    socket,
    unreadCounts,
    totalUnread,
    newMessageNotifications,
    markConversationAsRead,
    getConversationUnreadCount,
    hasNewMessages,
    clearAllNotifications,
    fetchUnreadCounts
  };
};

export default useChatNotifications;
