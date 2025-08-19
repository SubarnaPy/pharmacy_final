import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Consultation from '../models/Consultation.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
      }
    });

    this.consultationRooms = new Map(); // Store active consultation rooms
    this.userSocketMap = new Map(); // Map user IDs to socket IDs
    
    this.initializeHandlers();
  }

  initializeHandlers() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      this.userSocketMap.set(socket.userId, socket.id);

      // Join user's personal room for notifications
      socket.join(`user-${socket.userId}`);

      // Handle consultation room join
      socket.on('join-consultation', async (data) => {
        await this.handleJoinConsultation(socket, data);
      });

      // Handle video call signaling
      socket.on('video-offer', (data) => {
        this.handleVideoOffer(socket, data);
      });

      socket.on('video-answer', (data) => {
        this.handleVideoAnswer(socket, data);
      });

      socket.on('ice-candidate', (data) => {
        this.handleIceCandidate(socket, data);
      });

      // Handle chat messages
      socket.on('send-message', async (data) => {
        await this.handleChatMessage(socket, data);
      });

      socket.on('typing', (data) => {
        this.handleTyping(socket, data);
      });

      socket.on('stop-typing', (data) => {
        this.handleStopTyping(socket, data);
      });

      // Handle call controls
      socket.on('toggle-audio', (data) => {
        this.handleToggleAudio(socket, data);
      });

      socket.on('toggle-video', (data) => {
        this.handleToggleVideo(socket, data);
      });

      socket.on('screen-share', (data) => {
        this.handleScreenShare(socket, data);
      });

      // Handle consultation end
      socket.on('end-consultation', async (data) => {
        await this.handleEndConsultation(socket, data);
      });

      socket.on('leave-consultation', (data) => {
        this.handleLeaveConsultation(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async handleJoinConsultation(socket, { consultationId }) {
    try {
      const consultation = await Consultation.findById(consultationId)
        .populate('doctorId patientId');

      if (!consultation) {
        socket.emit('error', { message: 'Consultation not found' });
        return;
      }

      // Verify user is part of this consultation
      const isDoctorId = consultation.doctorId._id.toString();
      const isPatientId = consultation.patientId._id.toString();
      
      if (socket.userId !== isDoctorId && socket.userId !== isPatientId) {
        socket.emit('error', { message: 'Unauthorized access to consultation' });
        return;
      }

      const roomId = `consultation-${consultationId}`;
      socket.join(roomId);

      // Track room participants
      if (!this.consultationRooms.has(roomId)) {
        this.consultationRooms.set(roomId, new Set());
      }
      this.consultationRooms.get(roomId).add(socket.userId);

      // Notify other participants
      socket.to(roomId).emit('user-joined', {
        userId: socket.userId,
        userName: socket.user.name,
        userRole: socket.userId === isDoctorId ? 'doctor' : 'patient'
      });

      // Send existing participants to the new user
      const participants = Array.from(this.consultationRooms.get(roomId))
        .filter(id => id !== socket.userId);
      
      socket.emit('consultation-joined', {
        consultationId,
        participants,
        consultation: {
          id: consultation._id,
          doctorName: consultation.doctorId.user?.name || 'Doctor',
          patientName: consultation.patientId.name,
          type: consultation.consultationType,
          status: consultation.status
        }
      });

      // Load and send chat history
      const chatHistory = await ChatMessage.find({ consultationId })
        .sort({ createdAt: 1 })
        .limit(100);
      
      socket.emit('chat-history', chatHistory);
    } catch (error) {
      console.error('Error joining consultation:', error);
      socket.emit('error', { message: 'Failed to join consultation' });
    }
  }

  handleVideoOffer(socket, { consultationId, offer, to }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('video-offer', {
      offer,
      from: socket.userId,
      fromName: socket.user.name
    });
  }

  handleVideoAnswer(socket, { consultationId, answer, to }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('video-answer', {
      answer,
      from: socket.userId
    });
  }

  handleIceCandidate(socket, { consultationId, candidate, to }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.userId
    });
  }

  async handleChatMessage(socket, { consultationId, message, type = 'text' }) {
    try {
      const roomId = `consultation-${consultationId}`;
      
      // Save message to database
      const chatMessage = new ChatMessage({
        consultationId,
        senderId: socket.userId,
        senderName: socket.user.name,
        message,
        type,
        timestamp: new Date()
      });
      
      await chatMessage.save();

      // Broadcast message to all participants
      this.io.to(roomId).emit('new-message', {
        id: chatMessage._id,
        senderId: socket.userId,
        senderName: socket.user.name,
        message,
        type,
        timestamp: chatMessage.timestamp
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  handleTyping(socket, { consultationId }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user.name
    });
  }

  handleStopTyping(socket, { consultationId }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('user-stop-typing', {
      userId: socket.userId
    });
  }

  handleToggleAudio(socket, { consultationId, isEnabled }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('user-toggle-audio', {
      userId: socket.userId,
      isEnabled
    });
  }

  handleToggleVideo(socket, { consultationId, isEnabled }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('user-toggle-video', {
      userId: socket.userId,
      isEnabled
    });
  }

  handleScreenShare(socket, { consultationId, isSharing }) {
    const roomId = `consultation-${consultationId}`;
    socket.to(roomId).emit('user-screen-share', {
      userId: socket.userId,
      isSharing
    });
  }

  async handleEndConsultation(socket, { consultationId }) {
    try {
      const roomId = `consultation-${consultationId}`;
      
      // Update consultation status
      await Consultation.findByIdAndUpdate(consultationId, {
        status: 'completed',
        endedAt: new Date()
      });

      // Notify all participants
      this.io.to(roomId).emit('consultation-ended', {
        endedBy: socket.userId,
        endedByName: socket.user.name
      });

      // Remove room
      this.consultationRooms.delete(roomId);
    } catch (error) {
      console.error('Error ending consultation:', error);
      socket.emit('error', { message: 'Failed to end consultation' });
    }
  }

  handleLeaveConsultation(socket, { consultationId }) {
    const roomId = `consultation-${consultationId}`;
    socket.leave(roomId);
    
    // Remove from room participants
    if (this.consultationRooms.has(roomId)) {
      this.consultationRooms.get(roomId).delete(socket.userId);
      
      // If room is empty, delete it
      if (this.consultationRooms.get(roomId).size === 0) {
        this.consultationRooms.delete(roomId);
      }
    }

    // Notify others
    socket.to(roomId).emit('user-left', {
      userId: socket.userId,
      userName: socket.user.name
    });
  }

  handleDisconnect(socket) {
    console.log(`User ${socket.userId} disconnected`);
    this.userSocketMap.delete(socket.userId);
    
    // Remove from all consultation rooms
    this.consultationRooms.forEach((participants, roomId) => {
      if (participants.has(socket.userId)) {
        participants.delete(socket.userId);
        
        // Notify others in the room
        socket.to(roomId).emit('user-disconnected', {
          userId: socket.userId,
          userName: socket.user.name
        });
        
        // Clean up empty rooms
        if (participants.size === 0) {
          this.consultationRooms.delete(roomId);
        }
      }
    });
  }

  // Send notification to specific user
  sendNotification(userId, notification) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  // Get online status of a user
  isUserOnline(userId) {
    return this.userSocketMap.has(userId);
  }
}

export default SocketServer;
