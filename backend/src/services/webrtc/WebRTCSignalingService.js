import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import ChatRoomManager from '../chat/ChatRoomManager.js';

/**
 * WebRTC Signaling Service
 * Handles WebRTC signaling for video/audio calls, screen sharing, and call recording
 */
class WebRTCSignalingService extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.chatRoomManager = new ChatRoomManager();
    this.activeCalls = new Map(); // callId -> CallSession
    this.userSockets = new Map(); // userId -> socket
    this.socketUsers = new Map(); // socketId -> userId
    
    this.setupSignalingHandlers();
  }

  /**
   * Setup Socket.io handlers for WebRTC signaling
   */
  setupSignalingHandlers() {
    // Create consultation namespace
    const consultationNamespace = this.io.of('/consultation');
    
    consultationNamespace.on('connection', (socket) => {
      console.log(`🔌 Consultation client connected: ${socket.id}`);

      // Join consultation room
      socket.on('join-consultation', (consultationId) => {
        socket.join(consultationId);
        console.log(`👥 User joined consultation: ${consultationId}`);
      });

      // Handle consultation messages
      socket.on('consultation-message', (messageData) => {
        socket.to(messageData.consultationId).emit('consultation-message', messageData);
      });

      // WebRTC signaling for consultations
      socket.on('webrtc-offer', (data) => {
        console.log('📞 Broadcasting WebRTC offer to consultation:', data.consultationId);
        socket.to(data.consultationId).emit('webrtc-offer', data);
      });

      socket.on('webrtc-answer', (data) => {
        console.log('📞 Broadcasting WebRTC answer to consultation:', data.consultationId);
        socket.to(data.consultationId).emit('webrtc-answer', data);
      });

      socket.on('webrtc-ice-candidate', (data) => {
        console.log('🧊 Broadcasting ICE candidate to consultation:', data.consultationId);
        socket.to(data.consultationId).emit('webrtc-ice-candidate', data);
      });

      socket.on('user-joined', (data) => {
        console.log('👥 User joined consultation call:', data);
        socket.to(data.consultationId).emit('user-joined', data);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Consultation client disconnected:', socket.id);
      });
    });
    
    this.io.on('connection', (socket) => {
      console.log(`WebRTC signaling client connected: ${socket.id}`);

      // Authenticate socket connection
      socket.on('webrtc_auth', async (data) => {
        try {
          const { token } = data;
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          
          if (!user) {
            socket.emit('webrtc_auth_error', { message: 'User not found' });
            return;
          }

          // Store user-socket mapping
          this.userSockets.set(user._id.toString(), socket);
          this.socketUsers.set(socket.id, user._id.toString());
          socket.userId = user._id.toString();
          socket.userRole = user.role;
          socket.userName = user.name;

          socket.emit('webrtc_auth_success', { 
            userId: user._id,
            userName: user.name,
            role: user.role
          });

          console.log(`WebRTC user authenticated: ${user.name} (${user._id})`);
        } catch (error) {
          console.error('WebRTC authentication error:', error);
          socket.emit('webrtc_auth_error', { message: 'Invalid token' });
        }
      });

      // Call initiation
      socket.on('initiate_call', async (data) => {
        await this.handleCallInitiation(socket, data);
      });

      // Call answer
      socket.on('answer_call', async (data) => {
        await this.handleCallAnswer(socket, data);
      });

      // Call rejection
      socket.on('reject_call', async (data) => {
        await this.handleCallRejection(socket, data);
      });

      // End call
      socket.on('end_call', async (data) => {
        await this.handleCallEnd(socket, data);
      });

      // WebRTC signaling messages
      socket.on('webrtc_offer', (data) => {
        this.handleWebRTCOffer(socket, data);
      });

      socket.on('webrtc_answer', (data) => {
        this.handleWebRTCAnswer(socket, data);
      });

      socket.on('webrtc_ice_candidate', (data) => {
        this.handleICECandidate(socket, data);
      });

      // Call control events
      socket.on('toggle_video', (data) => {
        this.handleToggleVideo(socket, data);
      });

      socket.on('toggle_audio', (data) => {
        this.handleToggleAudio(socket, data);
      });

      socket.on('start_screen_share', (data) => {
        this.handleStartScreenShare(socket, data);
      });

      socket.on('stop_screen_share', (data) => {
        this.handleStopScreenShare(socket, data);
      });

      // Recording controls
      socket.on('start_recording', (data) => {
        this.handleStartRecording(socket, data);
      });

      socket.on('stop_recording', (data) => {
        this.handleStopRecording(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Handle call initiation
   */
  async handleCallInitiation(socket, data) {
    try {
      const { targetUserId, callType = 'video', roomId, prescriptionId } = data;
      
      if (!socket.userId) {
        socket.emit('call_error', { message: 'Authentication required' });
        return;
      }

      // Validate target user
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        socket.emit('call_error', { message: 'Target user not found' });
        return;
      }

      // Check if target user is online
      const targetSocket = this.userSockets.get(targetUserId);
      if (!targetSocket) {
        socket.emit('call_error', { message: 'User is not online' });
        return;
      }

      // Validate room access if roomId provided
      if (roomId) {
        const hasAccess = await this.chatRoomManager.validateRoomAccess(roomId, socket.userId);
        if (!hasAccess) {
          socket.emit('call_error', { message: 'Access denied to room' });
          return;
        }
      }

      // Check if users are already in a call
      const existingCall = this.findCallByUserId(socket.userId) || this.findCallByUserId(targetUserId);
      if (existingCall) {
        socket.emit('call_error', { message: 'User is already in a call' });
        return;
      }

      // Create call session
      const callId = this.generateCallId();
      const callSession = {
        callId,
        initiatorId: socket.userId,
        targetId: targetUserId,
        callType,
        roomId,
        prescriptionId,
        status: 'ringing',
        startTime: new Date(),
        participants: new Map([
          [socket.userId, {
            socketId: socket.id,
            socket: socket,
            name: socket.userName,
            role: socket.userRole,
            videoEnabled: callType === 'video',
            audioEnabled: true,
            screenSharing: false
          }],
          [targetUserId, {
            socketId: targetSocket.id,
            socket: targetSocket,
            name: targetSocket.userName,
            role: targetSocket.userRole,
            videoEnabled: false,
            audioEnabled: false,
            screenSharing: false
          }]
        ]),
        recording: {
          isRecording: false,
          recordingId: null,
          consentGiven: false,
          startTime: null
        },
        metadata: {
          createdAt: new Date(),
          lastActivity: new Date()
        }
      };

      this.activeCalls.set(callId, callSession);

      // Join both users to call room
      socket.join(`call_${callId}`);
      targetSocket.join(`call_${callId}`);

      // Notify initiator
      socket.emit('call_initiated', {
        callId,
        targetUser: {
          id: targetUserId,
          name: targetUser.name,
          avatar: targetUser.avatar
        },
        callType,
        status: 'ringing'
      });

      // Notify target user
      targetSocket.emit('incoming_call', {
        callId,
        initiator: {
          id: socket.userId,
          name: socket.userName,
          avatar: socket.userAvatar || null
        },
        callType,
        roomId,
        prescriptionId
      });

      // Set timeout for call expiry
      setTimeout(() => {
        const call = this.activeCalls.get(callId);
        if (call && call.status === 'ringing') {
          this.handleCallTimeout(callId);
        }
      }, 30000); // 30 second timeout

      console.log(`Call initiated: ${socket.userId} -> ${targetUserId} (${callId})`);
    } catch (error) {
      console.error('Call initiation error:', error);
      socket.emit('call_error', { message: 'Failed to initiate call' });
    }
  }

  /**
   * Handle call answer
   */
  async handleCallAnswer(socket, data) {
    try {
      const { callId } = data;
      const callSession = this.activeCalls.get(callId);

      if (!callSession) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      if (callSession.targetId !== socket.userId) {
        socket.emit('call_error', { message: 'Unauthorized to answer this call' });
        return;
      }

      if (callSession.status !== 'ringing') {
        socket.emit('call_error', { message: 'Call is no longer available' });
        return;
      }

      // Update call status
      callSession.status = 'connected';
      callSession.connectTime = new Date();

      // Update target participant
      const targetParticipant = callSession.participants.get(socket.userId);
      if (targetParticipant) {
        targetParticipant.audioEnabled = true;
        targetParticipant.videoEnabled = callSession.callType === 'video';
      }

      // Notify both parties
      this.io.to(`call_${callId}`).emit('call_answered', {
        callId,
        status: 'connected',
        participants: this.getCallParticipantsInfo(callSession)
      });

      console.log(`Call answered: ${callId}`);
    } catch (error) {
      console.error('Call answer error:', error);
      socket.emit('call_error', { message: 'Failed to answer call' });
    }
  }

  /**
   * Handle call rejection
   */
  async handleCallRejection(socket, data) {
    try {
      const { callId, reason = 'declined' } = data;
      const callSession = this.activeCalls.get(callId);

      if (!callSession) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      if (callSession.targetId !== socket.userId) {
        socket.emit('call_error', { message: 'Unauthorized to reject this call' });
        return;
      }

      // Notify initiator
      const initiatorParticipant = callSession.participants.get(callSession.initiatorId);
      if (initiatorParticipant) {
        initiatorParticipant.socket.emit('call_rejected', {
          callId,
          reason,
          rejectedBy: {
            id: socket.userId,
            name: socket.userName
          }
        });
      }

      // Clean up call
      this.cleanupCall(callId);

      console.log(`Call rejected: ${callId} - ${reason}`);
    } catch (error) {
      console.error('Call rejection error:', error);
      socket.emit('call_error', { message: 'Failed to reject call' });
    }
  }

  /**
   * Handle call end
   */
  async handleCallEnd(socket, data) {
    try {
      const { callId } = data;
      const callSession = this.activeCalls.get(callId);

      if (!callSession) {
        socket.emit('call_error', { message: 'Call not found' });
        return;
      }

      // Verify user is participant
      if (!callSession.participants.has(socket.userId)) {
        socket.emit('call_error', { message: 'Not a participant in this call' });
        return;
      }

      // Stop recording if active
      if (callSession.recording.isRecording) {
        await this.stopCallRecording(callSession);
      }

      // Calculate call duration
      const duration = callSession.connectTime ? 
        Date.now() - callSession.connectTime.getTime() : 0;

      // Notify all participants
      this.io.to(`call_${callId}`).emit('call_ended', {
        callId,
        endedBy: {
          id: socket.userId,
          name: socket.userName
        },
        duration,
        endTime: new Date()
      });

      // Clean up call
      this.cleanupCall(callId);

      console.log(`Call ended: ${callId} - duration: ${duration}ms`);
    } catch (error) {
      console.error('Call end error:', error);
      socket.emit('call_error', { message: 'Failed to end call' });
    }
  }

  /**
   * Handle WebRTC offer
   */
  handleWebRTCOffer(socket, data) {
    const { callId, offer, targetUserId } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('webrtc_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    const targetParticipant = callSession.participants.get(targetUserId);
    if (targetParticipant) {
      targetParticipant.socket.emit('webrtc_offer', {
        callId,
        offer,
        fromUserId: socket.userId
      });
    }
  }

  /**
   * Handle WebRTC answer
   */
  handleWebRTCAnswer(socket, data) {
    const { callId, answer, targetUserId } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('webrtc_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    const targetParticipant = callSession.participants.get(targetUserId);
    if (targetParticipant) {
      targetParticipant.socket.emit('webrtc_answer', {
        callId,
        answer,
        fromUserId: socket.userId
      });
    }
  }

  /**
   * Handle ICE candidate
   */
  handleICECandidate(socket, data) {
    const { callId, candidate, targetUserId } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      return;
    }

    const targetParticipant = callSession.participants.get(targetUserId);
    if (targetParticipant) {
      targetParticipant.socket.emit('webrtc_ice_candidate', {
        callId,
        candidate,
        fromUserId: socket.userId
      });
    }
  }

  /**
   * Handle video toggle
   */
  handleToggleVideo(socket, data) {
    const { callId, videoEnabled } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('call_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    const participant = callSession.participants.get(socket.userId);
    participant.videoEnabled = videoEnabled;

    // Notify other participants
    this.io.to(`call_${callId}`).emit('participant_video_toggled', {
      callId,
      userId: socket.userId,
      videoEnabled
    });
  }

  /**
   * Handle audio toggle
   */
  handleToggleAudio(socket, data) {
    const { callId, audioEnabled } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('call_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    const participant = callSession.participants.get(socket.userId);
    participant.audioEnabled = audioEnabled;

    // Notify other participants
    this.io.to(`call_${callId}`).emit('participant_audio_toggled', {
      callId,
      userId: socket.userId,
      audioEnabled
    });
  }

  /**
   * Handle screen share start
   */
  handleStartScreenShare(socket, data) {
    const { callId } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('call_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    // Check if someone else is already screen sharing
    const isAnyoneSharing = Array.from(callSession.participants.values())
      .some(p => p.screenSharing);

    if (isAnyoneSharing) {
      socket.emit('screen_share_error', { message: 'Someone is already sharing screen' });
      return;
    }

    const participant = callSession.participants.get(socket.userId);
    participant.screenSharing = true;

    // Notify other participants
    this.io.to(`call_${callId}`).emit('screen_share_started', {
      callId,
      userId: socket.userId,
      userName: socket.userName
    });
  }

  /**
   * Handle screen share stop
   */
  handleStopScreenShare(socket, data) {
    const { callId } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('call_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    const participant = callSession.participants.get(socket.userId);
    participant.screenSharing = false;

    // Notify other participants
    this.io.to(`call_${callId}`).emit('screen_share_stopped', {
      callId,
      userId: socket.userId
    });
  }

  /**
   * Handle recording start
   */
  async handleStartRecording(socket, data) {
    const { callId, consent = false } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('call_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    if (callSession.recording.isRecording) {
      socket.emit('recording_error', { message: 'Recording already in progress' });
      return;
    }

    if (!consent) {
      socket.emit('recording_error', { message: 'Recording consent required' });
      return;
    }

    // Request consent from all participants
    const participants = Array.from(callSession.participants.values());
    
    // Notify all participants about recording request
    this.io.to(`call_${callId}`).emit('recording_consent_requested', {
      callId,
      requestedBy: {
        id: socket.userId,
        name: socket.userName
      }
    });

    // For now, assume consent is given (in production, you'd need to collect consent)
    await this.startCallRecording(callSession, socket.userId);
  }

  /**
   * Handle recording stop
   */
  async handleStopRecording(socket, data) {
    const { callId } = data;
    const callSession = this.activeCalls.get(callId);

    if (!callSession || !callSession.participants.has(socket.userId)) {
      socket.emit('call_error', { message: 'Invalid call or unauthorized' });
      return;
    }

    if (!callSession.recording.isRecording) {
      socket.emit('recording_error', { message: 'No recording in progress' });
      return;
    }

    await this.stopCallRecording(callSession);
  }

  /**
   * Start call recording
   */
  async startCallRecording(callSession, requestedBy) {
    try {
      const recordingId = this.generateRecordingId();
      
      callSession.recording = {
        isRecording: true,
        recordingId,
        requestedBy,
        consentGiven: true,
        startTime: new Date()
      };

      // Notify all participants
      this.io.to(`call_${callSession.callId}`).emit('recording_started', {
        callId: callSession.callId,
        recordingId,
        startedBy: callSession.participants.get(requestedBy)?.name
      });

      console.log(`Recording started for call ${callSession.callId}: ${recordingId}`);
    } catch (error) {
      console.error('Start recording error:', error);
      throw error;
    }
  }

  /**
   * Stop call recording
   */
  async stopCallRecording(callSession) {
    try {
      const { recordingId, startTime } = callSession.recording;
      const duration = Date.now() - startTime.getTime();

      callSession.recording.isRecording = false;
      callSession.recording.endTime = new Date();
      callSession.recording.duration = duration;

      // Notify all participants
      this.io.to(`call_${callSession.callId}`).emit('recording_stopped', {
        callId: callSession.callId,
        recordingId,
        duration
      });

      console.log(`Recording stopped for call ${callSession.callId}: ${recordingId}`);
    } catch (error) {
      console.error('Stop recording error:', error);
      throw error;
    }
  }

  /**
   * Handle call timeout
   */
  handleCallTimeout(callId) {
    const callSession = this.activeCalls.get(callId);
    if (!callSession) return;

    // Notify participants
    this.io.to(`call_${callId}`).emit('call_timeout', { callId });

    // Clean up call
    this.cleanupCall(callId);
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket) {
    const userId = this.socketUsers.get(socket.id);
    if (!userId) return;

    // Find any active calls for this user
    const activeCall = this.findCallByUserId(userId);
    if (activeCall) {
      // Notify other participants
      this.io.to(`call_${activeCall.callId}`).emit('participant_disconnected', {
        callId: activeCall.callId,
        userId,
        userName: socket.userName
      });

      // End call if this was the only participant
      if (activeCall.participants.size <= 1) {
        this.cleanupCall(activeCall.callId);
      } else {
        // Remove participant from call
        activeCall.participants.delete(userId);
      }
    }

    // Clean up user mappings
    this.userSockets.delete(userId);
    this.socketUsers.delete(socket.id);

    console.log(`WebRTC user disconnected: ${userId}`);
  }

  /**
   * Utility methods
   */
  findCallByUserId(userId) {
    for (const call of this.activeCalls.values()) {
      if (call.participants.has(userId)) {
        return call;
      }
    }
    return null;
  }

  getCallParticipantsInfo(callSession) {
    const participants = [];
    for (const [userId, participant] of callSession.participants) {
      participants.push({
        id: userId,
        name: participant.name,
        role: participant.role,
        videoEnabled: participant.videoEnabled,
        audioEnabled: participant.audioEnabled,
        screenSharing: participant.screenSharing
      });
    }
    return participants;
  }

  cleanupCall(callId) {
    const callSession = this.activeCalls.get(callId);
    if (!callSession) return;

    // Leave all participants from call room
    for (const participant of callSession.participants.values()) {
      if (participant.socket) {
        participant.socket.leave(`call_${callId}`);
      }
    }

    // Remove call from active calls
    this.activeCalls.delete(callId);

    console.log(`Call cleaned up: ${callId}`);
  }

  generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRecordingId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats() {
    const activeCalls = this.activeCalls.size;
    const connectedUsers = this.userSockets.size;
    const recordingSessions = Array.from(this.activeCalls.values())
      .filter(call => call.recording.isRecording).length;

    return {
      activeCalls,
      connectedUsers,
      recordingSessions,
      callDetails: Array.from(this.activeCalls.values()).map(call => ({
        callId: call.callId,
        status: call.status,
        callType: call.callType,
        participants: call.participants.size,
        duration: call.connectTime ? Date.now() - call.connectTime.getTime() : 0,
        recording: call.recording.isRecording
      }))
    };
  }
}

export default WebRTCSignalingService;
