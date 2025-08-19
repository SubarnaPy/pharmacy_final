import mongoose from 'mongoose';

/**
 * Chat Room Management System
 * Handles creation, management, and access control for chat rooms
 */
class ChatRoomManager {
  constructor() {
    this.setupSchemas();
  }

  /**
   * Setup MongoDB schemas for chat rooms
   */
  setupSchemas() {
    // Chat Room Schema
    const chatRoomSchema = new mongoose.Schema({
      name: {
        type: String,
        required: true,
        maxlength: 100
      },
      type: {
        type: String,
        enum: ['direct', 'group', 'consultation', 'pharmacy', 'support', 'order'],
        required: true
      },
      participants: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        role: {
          type: String,
          enum: ['admin', 'member', 'viewer'],
          default: 'member'
        },
        joinedAt: {
          type: Date,
          default: Date.now
        },
        permissions: {
          canSendMessages: { type: Boolean, default: true },
          canShareFiles: { type: Boolean, default: true },
          canInitiateCalls: { type: Boolean, default: true },
          canInviteUsers: { type: Boolean, default: false },
          canManageRoom: { type: Boolean, default: false }
        }
      }],
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      description: {
        type: String,
        maxlength: 500
      },
      avatar: {
        type: String // URL to room avatar
      },
      settings: {
        isPrivate: { type: Boolean, default: false },
        requireApproval: { type: Boolean, default: false },
        allowFileSharing: { type: Boolean, default: true },
        allowCalls: { type: Boolean, default: true },
        messageRetentionDays: { type: Number, default: 90 },
        maxParticipants: { type: Number, default: 100 }
      },
      metadata: {
        prescriptionId: mongoose.Schema.Types.ObjectId,
        pharmacyId: mongoose.Schema.Types.ObjectId,
        appointmentId: mongoose.Schema.Types.ObjectId,
        consultationType: String,
        tags: [String]
      },
      lastActivity: {
        type: Date,
        default: Date.now
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }, {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true }
    });

    // Indexes for performance
    chatRoomSchema.index({ 'participants.userId': 1 });
    chatRoomSchema.index({ type: 1, isActive: 1 });
    chatRoomSchema.index({ createdBy: 1 });
    chatRoomSchema.index({ lastActivity: -1 });
    chatRoomSchema.index({ 'metadata.prescriptionId': 1 });
    chatRoomSchema.index({ 'metadata.pharmacyId': 1 });

    // Virtual for participant count
    chatRoomSchema.virtual('participantCount').get(function() {
      return this.participants.length;
    });

    // Virtual for active participants
    chatRoomSchema.virtual('activeParticipants').get(function() {
      return this.participants.filter(p => p.permissions.canSendMessages);
    });

    // Methods
    chatRoomSchema.methods.addParticipant = function(userId, role = 'member', permissions = {}) {
      const existingParticipant = this.participants.find(p => p.userId.toString() === userId);
      if (existingParticipant) {
        throw new Error('User is already a participant');
      }

      const defaultPermissions = {
        canSendMessages: true,
        canShareFiles: true,
        canInitiateCalls: true,
        canInviteUsers: role === 'admin',
        canManageRoom: role === 'admin'
      };

      this.participants.push({
        userId,
        role,
        permissions: { ...defaultPermissions, ...permissions }
      });

      return this.save();
    };

    chatRoomSchema.methods.removeParticipant = function(userId) {
      this.participants = this.participants.filter(p => p.userId.toString() !== userId);
      return this.save();
    };

    chatRoomSchema.methods.updateParticipantRole = function(userId, role, permissions = {}) {
      const participant = this.participants.find(p => p.userId.toString() === userId);
      if (!participant) {
        throw new Error('Participant not found');
      }

      participant.role = role;
      if (Object.keys(permissions).length > 0) {
        participant.permissions = { ...participant.permissions, ...permissions };
      }

      return this.save();
    };

    chatRoomSchema.methods.hasParticipant = function(userId) {
      return this.participants.some(p => p.userId.toString() === userId);
    };

    chatRoomSchema.methods.getParticipant = function(userId) {
      return this.participants.find(p => p.userId.toString() === userId);
    };

    chatRoomSchema.methods.canUserPerformAction = function(userId, action) {
      const participant = this.getParticipant(userId);
      if (!participant) return false;

      switch (action) {
        case 'send_message':
          return participant.permissions.canSendMessages;
        case 'share_file':
          return participant.permissions.canShareFiles;
        case 'initiate_call':
          return participant.permissions.canInitiateCalls;
        case 'invite_user':
          return participant.permissions.canInviteUsers;
        case 'manage_room':
          return participant.permissions.canManageRoom;
        default:
          return false;
      }
    };

    // Static methods for room creation
    chatRoomSchema.statics.createDirectRoom = async function(user1Id, user2Id) {
      // Check if direct room already exists
      const existingRoom = await this.findOne({
        type: 'direct',
        'participants.userId': { $all: [user1Id, user2Id] },
        isActive: true
      });

      if (existingRoom) {
        return existingRoom;
      }

      // Create new direct room
      const room = new this({
        name: 'Direct Message',
        type: 'direct',
        createdBy: user1Id,
        settings: {
          isPrivate: true,
          maxParticipants: 2
        }
      });

      await room.addParticipant(user1Id, 'admin');
      await room.addParticipant(user2Id, 'member');

      return room;
    };

    chatRoomSchema.statics.createConsultationRoom = async function(patientId, pharmacyId, prescriptionId) {
      const room = new this({
        name: 'Prescription Consultation',
        type: 'consultation',
        createdBy: patientId,
        settings: {
          isPrivate: true,
          allowCalls: true,
          messageRetentionDays: 180
        },
        metadata: {
          prescriptionId,
          pharmacyId,
          consultationType: 'prescription'
        }
      });

      await room.addParticipant(patientId, 'member');
      // Pharmacy staff will be added when they join

      return room;
    };

    // Check if model already exists to prevent overwrite error
    try {
      this.ChatRoom = mongoose.model('ChatRoom');
      console.log('✅ ChatRoom model already exists, reusing existing model');
    } catch (error) {
      // Model doesn't exist, create new one
      this.ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
      console.log('✅ ChatRoom model created successfully');
    }
  }

  /**
   * Create a new chat room
   * @param {Object} roomData - Room creation data
   * @returns {Promise<Object>} - Created room
   */
  async createRoom(roomData) {
    try {
      const {
        name,
        type,
        createdBy,
        participants = [],
        description,
        settings = {},
        metadata = {}
      } = roomData;

      const room = new this.ChatRoom({
        name,
        type,
        createdBy,
        description,
        settings: {
          isPrivate: false,
          requireApproval: false,
          allowFileSharing: true,
          allowCalls: true,
          messageRetentionDays: 90,
          maxParticipants: 100,
          ...settings
        },
        metadata
      });

      await room.save();

      // Add creator as admin
      await room.addParticipant(createdBy, 'admin');

      // Add other participants
      for (const participantId of participants) {
        if (participantId !== createdBy) {
          await room.addParticipant(participantId, 'member');
        }
      }

      console.log(`🏠 Chat room created: ${name} (${type})`);
      return room;

    } catch (error) {
      console.error('❌ Create room failed:', error.message);
      throw new Error(`Failed to create room: ${error.message}`);
    }
  }

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {Promise<Object>} - Room object
   */
  async getRoomById(roomId) {
    try {
      const room = await this.ChatRoom.findById(roomId)
        .populate('participants.userId', 'name email avatar role')
        .populate('createdBy', 'name email avatar role');

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      console.error('❌ Get room failed:', error.message);
      throw new Error(`Failed to get room: ${error.message}`);
    }
  }

  /**
   * Get user's rooms
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - User's rooms
   */
  async getUserRooms(userId, options = {}) {
    try {
      const {
        type,
        isActive = true,
        limit = 50,
        sort = { lastActivity: -1 }
      } = options;

      const query = {
        'participants.userId': userId,
        isActive
      };

      if (type) {
        query.type = type;
      }

      const rooms = await this.ChatRoom.find(query)
        .populate('participants.userId', 'name email avatar role status')
        .populate('createdBy', 'name email avatar role')
        .sort(sort)
        .limit(limit);

      return rooms.map(room => ({
        id: room._id.toString(),
        name: room.name,
        type: room.type,
        description: room.description,
        avatar: room.avatar,
        participantCount: room.participantCount,
        lastActivity: room.lastActivity,
        settings: room.settings,
        metadata: room.metadata,
        createdAt: room.createdAt,
        participants: room.participants.map(p => ({
          id: p.userId._id.toString(),
          name: p.userId.name,
          email: p.userId.email,
          avatar: p.userId.avatar,
          role: p.role,
          permissions: p.permissions,
          joinedAt: p.joinedAt
        }))
      }));

    } catch (error) {
      console.error('❌ Get user rooms failed:', error.message);
      throw new Error(`Failed to get user rooms: ${error.message}`);
    }
  }

  /**
   * Validate room access for user
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether user has access
   */
  async validateRoomAccess(roomId, userId) {
    try {
      const room = await this.ChatRoom.findOne({
        _id: roomId,
        'participants.userId': userId,
        isActive: true
      });

      return !!room;
    } catch (error) {
      console.error('❌ Validate room access failed:', error.message);
      return false;
    }
  }

  /**
   * Add participant to room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to add
   * @param {string} role - User role
   * @param {Object} permissions - User permissions
   * @returns {Promise<Object>} - Updated room
   */
  async addParticipant(roomId, userId, role = 'member', permissions = {}) {
    try {
      const room = await this.getRoomById(roomId);
      
      // Check room capacity
      if (room.participants.length >= room.settings.maxParticipants) {
        throw new Error('Room is at maximum capacity');
      }

      await room.addParticipant(userId, role, permissions);
      
      console.log(`👥 Added participant ${userId} to room ${roomId}`);
      return room;

    } catch (error) {
      console.error('❌ Add participant failed:', error.message);
      throw new Error(`Failed to add participant: ${error.message}`);
    }
  }

  /**
   * Remove participant from room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID to remove
   * @returns {Promise<Object>} - Updated room
   */
  async removeParticipant(roomId, userId) {
    try {
      const room = await this.getRoomById(roomId);
      await room.removeParticipant(userId);
      
      console.log(`👋 Removed participant ${userId} from room ${roomId}`);
      return room;

    } catch (error) {
      console.error('❌ Remove participant failed:', error.message);
      throw new Error(`Failed to remove participant: ${error.message}`);
    }
  }

  /**
   * Update room settings
   * @param {string} roomId - Room ID
   * @param {Object} settings - New settings
   * @param {string} updatedBy - User ID making the update
   * @returns {Promise<Object>} - Updated room
   */
  async updateRoomSettings(roomId, settings, updatedBy) {
    try {
      const room = await this.getRoomById(roomId);
      
      // Validate user can manage room
      if (!room.canUserPerformAction(updatedBy, 'manage_room')) {
        throw new Error('Insufficient permissions to update room settings');
      }

      room.settings = { ...room.settings, ...settings };
      await room.save();
      
      console.log(`⚙️ Room settings updated for ${roomId} by ${updatedBy}`);
      return room;

    } catch (error) {
      console.error('❌ Update room settings failed:', error.message);
      throw new Error(`Failed to update room settings: ${error.message}`);
    }
  }

  /**
   * Update room activity timestamp
   * @param {string} roomId - Room ID
   */
  async updateRoomActivity(roomId) {
    try {
      await this.ChatRoom.findByIdAndUpdate(
        roomId,
        { lastActivity: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('❌ Update room activity failed:', error.message);
    }
  }

  /**
   * Archive room
   * @param {string} roomId - Room ID
   * @param {string} archivedBy - User ID archiving the room
   * @returns {Promise<Object>} - Archived room
   */
  async archiveRoom(roomId, archivedBy) {
    try {
      const room = await this.getRoomById(roomId);
      
      // Validate user can manage room
      if (!room.canUserPerformAction(archivedBy, 'manage_room')) {
        throw new Error('Insufficient permissions to archive room');
      }

      room.isActive = false;
      await room.save();
      
      console.log(`📦 Room archived: ${roomId} by ${archivedBy}`);
      return room;

    } catch (error) {
      console.error('❌ Archive room failed:', error.message);
      throw new Error(`Failed to archive room: ${error.message}`);
    }
  }

  /**
   * Create direct message room between two users
   * @param {string} user1Id - First user ID
   * @param {string} user2Id - Second user ID
   * @returns {Promise<Object>} - Direct room
   */
  async createDirectRoom(user1Id, user2Id) {
    try {
      const room = await this.ChatRoom.createDirectRoom(user1Id, user2Id);
      console.log(`💬 Direct room created between ${user1Id} and ${user2Id}`);
      return room;
    } catch (error) {
      console.error('❌ Create direct room failed:', error.message);
      throw new Error(`Failed to create direct room: ${error.message}`);
    }
  }

  /**
   * Create consultation room for prescription
   * @param {string} patientId - Patient ID
   * @param {string} pharmacyId - Pharmacy ID
   * @param {string} prescriptionId - Prescription ID
   * @returns {Promise<Object>} - Consultation room
   */
  async createConsultationRoom(patientId, pharmacyId, prescriptionId) {
    try {
      const room = await this.ChatRoom.createConsultationRoom(patientId, pharmacyId, prescriptionId);
      console.log(`🩺 Consultation room created for prescription ${prescriptionId}`);
      return room;
    } catch (error) {
      console.error('❌ Create consultation room failed:', error.message);
      throw new Error(`Failed to create consultation room: ${error.message}`);
    }
  }

  /**
   * Get rooms by pharmacy
   * @param {string} pharmacyId - Pharmacy ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Pharmacy rooms
   */
  async getPharmacyRooms(pharmacyId, options = {}) {
    try {
      const {
        isActive = true,
        limit = 50,
        sort = { lastActivity: -1 }
      } = options;

      const rooms = await this.ChatRoom.find({
        $or: [
          { 'metadata.pharmacyId': pharmacyId },
          { type: 'pharmacy', 'participants.userId': pharmacyId }
        ],
        isActive
      })
        .populate('participants.userId', 'name email avatar role')
        .populate('createdBy', 'name email avatar role')
        .sort(sort)
        .limit(limit);

      return rooms;
    } catch (error) {
      console.error('❌ Get pharmacy rooms failed:', error.message);
      throw new Error(`Failed to get pharmacy rooms: ${error.message}`);
    }
  }

  /**
   * Clean up old inactive rooms
   * @param {number} daysOld - Days since last activity
   * @returns {Promise<number>} - Number of cleaned rooms
   */
  async cleanupOldRooms(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.ChatRoom.deleteMany({
        lastActivity: { $lt: cutoffDate },
        isActive: false
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old rooms`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Cleanup old rooms failed:', error.message);
      throw new Error(`Failed to cleanup old rooms: ${error.message}`);
    }
  }
}

export default ChatRoomManager;
