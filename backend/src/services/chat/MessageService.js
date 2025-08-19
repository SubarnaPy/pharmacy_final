import mongoose from 'mongoose';

/**
 * Message Service for Chat System
 * Handles message persistence, retrieval, and management in MongoDB
 */
class MessageService {
  constructor() {
    this.setupSchemas();
  }

  /**
   * Setup MongoDB schemas for messages
   */
  setupSchemas() {
    // Message Schema
    const messageSchema = new mongoose.Schema({
      roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true,
        index: true
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 10000
      },
      type: {
        type: String,
        enum: ['text', 'image', 'file', 'prescription', 'medical', 'voice', 'video', 'location', 'system'],
        default: 'text'
      },
      metadata: {
        fileName: String,
        fileSize: Number,
        fileType: String,
        fileUrl: String,
        thumbnailUrl: String,
        duration: Number, // for voice/video messages
        coordinates: {
          latitude: Number,
          longitude: Number
        },
        replyTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Message'
        },
        mentions: [{
          userId: mongoose.Schema.Types.ObjectId,
          name: String
        }],
        systemAction: String, // for system messages
        prescriptionData: {
          prescriptionId: mongoose.Schema.Types.ObjectId,
          medicationName: String,
          dosage: String,
          instructions: String
        }
      },
      readBy: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        readAt: {
          type: Date,
          default: Date.now
        }
      }],
      reactions: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        emoji: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      editHistory: [{
        content: String,
        editedAt: {
          type: Date,
          default: Date.now
        }
      }],
      isEdited: {
        type: Boolean,
        default: false
      },
      isDeleted: {
        type: Boolean,
        default: false
      },
      deletedAt: Date,
      deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
      },
      expiresAt: Date, // for temporary messages
      isEncrypted: {
        type: Boolean,
        default: false
      }
    }, {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true }
    });

    // Indexes for performance
    messageSchema.index({ roomId: 1, createdAt: -1 });
    messageSchema.index({ senderId: 1, createdAt: -1 });
    messageSchema.index({ 'readBy.userId': 1 });
    messageSchema.index({ type: 1 });
    messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });
    messageSchema.index({ isDeleted: 1, roomId: 1 });

    // Compound indexes
    messageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });
    messageSchema.index({ senderId: 1, type: 1, createdAt: -1 });

    // Virtual for read count
    messageSchema.virtual('readCount').get(function() {
      return this.readBy.length;
    });

    // Virtual for reaction count
    messageSchema.virtual('reactionCount').get(function() {
      return this.reactions.length;
    });

    // Virtual for is read by user
    messageSchema.virtual('isReadByUser').get(function() {
      return function(userId) {
        return this.readBy.some(read => read.userId.toString() === userId);
      }.bind(this);
    });

    // Methods
    messageSchema.methods.markAsRead = function(userId) {
      if (!this.readBy.some(read => read.userId.toString() === userId)) {
        this.readBy.push({
          userId,
          readAt: new Date()
        });
      }
      return this.save();
    };

    messageSchema.methods.addReaction = function(userId, emoji) {
      // Remove existing reaction from same user
      this.reactions = this.reactions.filter(reaction => 
        reaction.userId.toString() !== userId || reaction.emoji !== emoji
      );
      
      // Add new reaction
      this.reactions.push({
        userId,
        emoji,
        createdAt: new Date()
      });
      
      return this.save();
    };

    messageSchema.methods.removeReaction = function(userId, emoji) {
      this.reactions = this.reactions.filter(reaction => 
        !(reaction.userId.toString() === userId && reaction.emoji === emoji)
      );
      return this.save();
    };

    messageSchema.methods.editContent = function(newContent, editedBy) {
      // Save edit history
      this.editHistory.push({
        content: this.content,
        editedAt: new Date()
      });
      
      this.content = newContent;
      this.isEdited = true;
      
      return this.save();
    };

    messageSchema.methods.softDelete = function(deletedBy) {
      this.isDeleted = true;
      this.deletedAt = new Date();
      this.deletedBy = deletedBy;
      this.content = '[This message was deleted]';
      
      return this.save();
    };

    // Static methods
    messageSchema.statics.findByRoom = function(roomId, options = {}) {
      const {
        limit = 50,
        skip = 0,
        includeDeleted = false,
        fromDate,
        toDate,
        messageType,
        senderId
      } = options;

      const query = { roomId };
      
      if (!includeDeleted) {
        query.isDeleted = false;
      }
      
      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
      }
      
      if (messageType) {
        query.type = messageType;
      }
      
      if (senderId) {
        query.senderId = senderId;
      }

      return this.find(query)
        .populate('senderId', 'name email avatar role')
        .populate('readBy.userId', 'name email avatar')
        .populate('reactions.userId', 'name email avatar')
        .populate('metadata.replyTo')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    };

    messageSchema.statics.getUnreadCount = function(roomId, userId) {
      return this.countDocuments({
        roomId,
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId },
        isDeleted: false
      });
    };

    messageSchema.statics.markRoomAsRead = function(roomId, userId) {
      return this.updateMany(
        {
          roomId,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId },
          isDeleted: false
        },
        {
          $push: {
            readBy: {
              userId,
              readAt: new Date()
            }
          }
        }
      );
    };

    messageSchema.statics.searchMessages = function(roomId, searchQuery, options = {}) {
      const {
        limit = 20,
        messageType,
        fromDate,
        toDate
      } = options;

      const query = {
        roomId,
        isDeleted: false,
        $text: { $search: searchQuery }
      };

      if (messageType) {
        query.type = messageType;
      }

      if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) query.createdAt.$lte = new Date(toDate);
      }

      return this.find(query)
        .populate('senderId', 'name email avatar role')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(limit);
    };

    // Text index for search
    messageSchema.index({ content: 'text' });

    // Check if model already exists to prevent overwrite error
    try {
      this.Message = mongoose.model('Message');
      console.log('✅ Message model already exists, reusing existing model');
    } catch (error) {
      // Model doesn't exist, create new one
      this.Message = mongoose.model('Message', messageSchema);
      console.log('✅ Message model created successfully');
    }

    // Message Thread Schema for organizing replies
    const messageThreadSchema = new mongoose.Schema({
      parentMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: true,
        index: true
      },
      roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true,
        index: true
      },
      replies: [{
        messageId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Message',
          required: true
        },
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      replyCount: {
        type: Number,
        default: 0
      },
      lastReplyAt: Date,
      participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }, {
      timestamps: true
    });

    messageThreadSchema.index({ parentMessageId: 1 });
    messageThreadSchema.index({ roomId: 1, lastReplyAt: -1 });

    // Check if model already exists to prevent overwrite error
    try {
      this.MessageThread = mongoose.model('MessageThread');
      console.log('✅ MessageThread model already exists, reusing existing model');
    } catch (error) {
      // Model doesn't exist, create new one
      this.MessageThread = mongoose.model('MessageThread', messageThreadSchema);
      console.log('✅ MessageThread model created successfully');
    }
  }

  /**
   * Create a new message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} - Created message
   */
  async createMessage(messageData) {
    try {
      const {
        roomId,
        senderId,
        content,
        type = 'text',
        metadata = {},
        priority = 'normal',
        expiresAt
      } = messageData;

      const message = new this.Message({
        roomId,
        senderId,
        content,
        type,
        metadata,
        priority,
        expiresAt,
        isEncrypted: type === 'prescription' || type === 'medical'
      });

      await message.save();

      // Handle reply threading
      if (metadata.replyTo) {
        await this.addToThread(metadata.replyTo, message._id, senderId, roomId);
      }

      // Auto-mark as read by sender
      await message.markAsRead(senderId);

      console.log(`💬 Message created in room ${roomId} by ${senderId}`);
      return message;

    } catch (error) {
      console.error('❌ Create message failed:', error.message);
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  /**
   * Get messages for a room
   * @param {string} roomId - Room ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Messages
   */
  async getRoomMessages(roomId, options = {}) {
    try {
      const messages = await this.Message.findByRoom(roomId, options);
      return messages.reverse(); // Return in ascending order (oldest first)
    } catch (error) {
      console.error('❌ Get room messages failed:', error.message);
      throw new Error(`Failed to get room messages: ${error.message}`);
    }
  }

  /**
   * Get message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} - Message
   */
  async getMessageById(messageId) {
    try {
      const message = await this.Message.findById(messageId)
        .populate('senderId', 'name email avatar role')
        .populate('readBy.userId', 'name email avatar')
        .populate('reactions.userId', 'name email avatar')
        .populate('metadata.replyTo');

      if (!message) {
        throw new Error('Message not found');
      }

      return message;
    } catch (error) {
      console.error('❌ Get message failed:', error.message);
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }

  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID editing the message
   * @param {string} newContent - New content
   * @returns {Promise<Object>} - Updated message
   */
  async editMessage(messageId, userId, newContent) {
    try {
      const message = await this.getMessageById(messageId);

      // Validate user can edit (sender or admin)
      if (message.senderId._id.toString() !== userId) {
        throw new Error('Unauthorized to edit this message');
      }

      // Check if message is too old to edit (24 hours)
      const editDeadline = new Date(message.createdAt);
      editDeadline.setHours(editDeadline.getHours() + 24);
      
      if (new Date() > editDeadline) {
        throw new Error('Message is too old to edit');
      }

      await message.editContent(newContent, userId);

      console.log(`✏️ Message ${messageId} edited by ${userId}`);
      return message;

    } catch (error) {
      console.error('❌ Edit message failed:', error.message);
      throw new Error(`Failed to edit message: ${error.message}`);
    }
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID deleting the message
   * @returns {Promise<Object>} - Deleted message
   */
  async deleteMessage(messageId, userId) {
    try {
      const message = await this.getMessageById(messageId);

      // Validate user can delete (sender or admin)
      if (message.senderId._id.toString() !== userId) {
        throw new Error('Unauthorized to delete this message');
      }

      await message.softDelete(userId);

      console.log(`🗑️ Message ${messageId} deleted by ${userId}`);
      return message;

    } catch (error) {
      console.error('❌ Delete message failed:', error.message);
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated message
   */
  async markMessageAsRead(messageId, userId) {
    try {
      const message = await this.getMessageById(messageId);
      await message.markAsRead(userId);

      return message;
    } catch (error) {
      console.error('❌ Mark message as read failed:', error.message);
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }
  }

  /**
   * Mark all messages in room as read
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Update result
   */
  async markRoomAsRead(roomId, userId) {
    try {
      const result = await this.Message.markRoomAsRead(roomId, userId);
      console.log(`📖 Marked ${result.modifiedCount} messages as read in room ${roomId}`);
      return result;
    } catch (error) {
      console.error('❌ Mark room as read failed:', error.message);
      throw new Error(`Failed to mark room as read: ${error.message}`);
    }
  }

  /**
   * Get unread message count for room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Unread count
   */
  async getUnreadCount(roomId, userId) {
    try {
      const count = await this.Message.getUnreadCount(roomId, userId);
      return count;
    } catch (error) {
      console.error('❌ Get unread count failed:', error.message);
      return 0;
    }
  }

  /**
   * Add reaction to message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} - Updated message
   */
  async addReaction(messageId, userId, emoji) {
    try {
      const message = await this.getMessageById(messageId);
      await message.addReaction(userId, emoji);

      console.log(`😊 Reaction ${emoji} added to message ${messageId} by ${userId}`);
      return message;

    } catch (error) {
      console.error('❌ Add reaction failed:', error.message);
      throw new Error(`Failed to add reaction: ${error.message}`);
    }
  }

  /**
   * Remove reaction from message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   * @param {string} emoji - Emoji reaction
   * @returns {Promise<Object>} - Updated message
   */
  async removeReaction(messageId, userId, emoji) {
    try {
      const message = await this.getMessageById(messageId);
      await message.removeReaction(userId, emoji);

      console.log(`😊 Reaction ${emoji} removed from message ${messageId} by ${userId}`);
      return message;

    } catch (error) {
      console.error('❌ Remove reaction failed:', error.message);
      throw new Error(`Failed to remove reaction: ${error.message}`);
    }
  }

  /**
   * Search messages in room
   * @param {string} roomId - Room ID
   * @param {string} searchQuery - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async searchMessages(roomId, searchQuery, options = {}) {
    try {
      const messages = await this.Message.searchMessages(roomId, searchQuery, options);
      return messages;
    } catch (error) {
      console.error('❌ Search messages failed:', error.message);
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }

  /**
   * Add message to thread
   * @param {string} parentMessageId - Parent message ID
   * @param {string} replyMessageId - Reply message ID
   * @param {string} senderId - Sender ID
   * @param {string} roomId - Room ID
   * @returns {Promise<Object>} - Thread
   */
  async addToThread(parentMessageId, replyMessageId, senderId, roomId) {
    try {
      let thread = await this.MessageThread.findOne({ parentMessageId });

      if (!thread) {
        thread = new this.MessageThread({
          parentMessageId,
          roomId,
          replies: [],
          participants: []
        });
      }

      thread.replies.push({
        messageId: replyMessageId,
        senderId,
        createdAt: new Date()
      });

      thread.replyCount = thread.replies.length;
      thread.lastReplyAt = new Date();

      if (!thread.participants.includes(senderId)) {
        thread.participants.push(senderId);
      }

      await thread.save();
      return thread;

    } catch (error) {
      console.error('❌ Add to thread failed:', error.message);
      throw new Error(`Failed to add to thread: ${error.message}`);
    }
  }

  /**
   * Get thread for message
   * @param {string} parentMessageId - Parent message ID
   * @returns {Promise<Object>} - Thread with replies
   */
  async getThread(parentMessageId) {
    try {
      const thread = await this.MessageThread.findOne({ parentMessageId })
        .populate({
          path: 'replies.messageId',
          populate: {
            path: 'senderId',
            select: 'name email avatar role'
          }
        })
        .populate('participants', 'name email avatar role');

      return thread;
    } catch (error) {
      console.error('❌ Get thread failed:', error.message);
      throw new Error(`Failed to get thread: ${error.message}`);
    }
  }

  /**
   * Get message statistics for room
   * @param {string} roomId - Room ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Statistics
   */
  async getMessageStatistics(roomId, options = {}) {
    try {
      const { fromDate, toDate } = options;
      
      const matchQuery = { roomId, isDeleted: false };
      if (fromDate || toDate) {
        matchQuery.createdAt = {};
        if (fromDate) matchQuery.createdAt.$gte = new Date(fromDate);
        if (toDate) matchQuery.createdAt.$lte = new Date(toDate);
      }

      const stats = await this.Message.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            totalReactions: { $sum: { $size: '$reactions' } },
            messagesByType: {
              $push: '$type'
            },
            messagesBySender: {
              $push: '$senderId'
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalMessages: 1,
            totalReactions: 1,
            messageTypeDistribution: {
              $arrayToObject: {
                $map: {
                  input: { $setUnion: ['$messagesByType'] },
                  as: 'type',
                  in: {
                    k: '$$type',
                    v: {
                      $size: {
                        $filter: {
                          input: '$messagesByType',
                          cond: { $eq: ['$$this', '$$type'] }
                        }
                      }
                    }
                  }
                }
              }
            },
            uniqueSenders: { $size: { $setUnion: ['$messagesBySender'] } }
          }
        }
      ]);

      return stats[0] || {
        totalMessages: 0,
        totalReactions: 0,
        messageTypeDistribution: {},
        uniqueSenders: 0
      };

    } catch (error) {
      console.error('❌ Get message statistics failed:', error.message);
      throw new Error(`Failed to get message statistics: ${error.message}`);
    }
  }

  /**
   * Clean up old messages based on retention policy
   * @param {number} retentionDays - Number of days to retain messages
   * @returns {Promise<number>} - Number of deleted messages
   */
  async cleanupOldMessages(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.Message.deleteMany({
        createdAt: { $lt: cutoffDate },
        type: { $nin: ['prescription', 'medical'] } // Keep medical records longer
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old messages`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Cleanup old messages failed:', error.message);
      throw new Error(`Failed to cleanup old messages: ${error.message}`);
    }
  }

  /**
   * Export messages for a room
   * @param {string} roomId - Room ID
   * @param {Object} options - Export options
   * @returns {Promise<Array>} - Exported messages
   */
  async exportMessages(roomId, options = {}) {
    try {
      const {
        format = 'json',
        fromDate,
        toDate,
        includeDeleted = false
      } = options;

      const messages = await this.getRoomMessages(roomId, {
        includeDeleted,
        fromDate,
        toDate,
        limit: Number.MAX_SAFE_INTEGER // Get all messages
      });

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = messages.map(msg => ({
          timestamp: msg.createdAt,
          sender: msg.senderId.name,
          content: msg.content,
          type: msg.type,
          isEdited: msg.isEdited,
          reactions: msg.reactions.length
        }));
        return csvData;
      }

      return messages;
    } catch (error) {
      console.error('❌ Export messages failed:', error.message);
      throw new Error(`Failed to export messages: ${error.message}`);
    }
  }
}

export default MessageService;
