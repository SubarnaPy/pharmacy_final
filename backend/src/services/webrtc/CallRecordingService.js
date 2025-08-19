import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import ffmpeg from 'fluent-ffmpeg';
import mongoose from 'mongoose';

/**
 * Call Recording Service
 * Handles recording of video calls with consent management and cloud storage
 */
class CallRecordingService {
  constructor() {
    this.activeRecordings = new Map(); // recordingId -> RecordingSession
    this.recordingsDir = path.join(process.cwd(), 'recordings');
    this.ensureRecordingsDirectory();
  }

  /**
   * Ensure recordings directory exists
   */
  ensureRecordingsDirectory() {
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  /**
   * Start recording a call
   */
  async startRecording(callId, participants, metadata = {}) {
    try {
      const recordingId = this.generateRecordingId();
      const startTime = new Date();
      
      const recordingSession = {
        recordingId,
        callId,
        participants: participants.map(p => ({
          userId: p.userId,
          name: p.name,
          role: p.role,
          consentGiven: p.consentGiven || false,
          consentTimestamp: p.consentGiven ? new Date() : null
        })),
        startTime,
        status: 'recording',
        metadata: {
          ...metadata,
          recordingQuality: '720p',
          audioCodec: 'opus',
          videoCodec: 'vp8'
        },
        segments: [],
        filePath: null,
        cloudinaryUrl: null,
        duration: 0,
        fileSize: 0
      };

      this.activeRecordings.set(recordingId, recordingSession);

      // Save initial recording info to database
      await this.saveRecordingToDatabase(recordingSession);

      console.log(`Recording started: ${recordingId} for call ${callId}`);
      return recordingSession;
    } catch (error) {
      console.error('Start recording error:', error);
      throw new Error('Failed to start recording');
    }
  }

  /**
   * Stop recording a call
   */
  async stopRecording(recordingId) {
    try {
      const recordingSession = this.activeRecordings.get(recordingId);
      if (!recordingSession) {
        throw new Error('Recording session not found');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - recordingSession.startTime.getTime();

      recordingSession.endTime = endTime;
      recordingSession.duration = duration;
      recordingSession.status = 'processing';

      // Process and upload recording
      const processedRecording = await this.processRecording(recordingSession);
      
      // Update database with final recording info
      await this.updateRecordingInDatabase(recordingId, {
        endTime,
        duration,
        status: 'completed',
        filePath: processedRecording.filePath,
        cloudinaryUrl: processedRecording.cloudinaryUrl,
        fileSize: processedRecording.fileSize,
        thumbnails: processedRecording.thumbnails
      });

      // Clean up active recording
      this.activeRecordings.delete(recordingId);

      console.log(`Recording completed: ${recordingId} - Duration: ${duration}ms`);
      return processedRecording;
    } catch (error) {
      console.error('Stop recording error:', error);
      
      // Update recording status to failed
      const recordingSession = this.activeRecordings.get(recordingId);
      if (recordingSession) {
        recordingSession.status = 'failed';
        recordingSession.error = error.message;
        await this.updateRecordingInDatabase(recordingId, {
          status: 'failed',
          error: error.message
        });
        this.activeRecordings.delete(recordingId);
      }
      
      throw error;
    }
  }

  /**
   * Add recording segment (for WebRTC MediaRecorder chunks)
   */
  async addRecordingSegment(recordingId, segmentData, segmentIndex) {
    try {
      const recordingSession = this.activeRecordings.get(recordingId);
      if (!recordingSession) {
        throw new Error('Recording session not found');
      }

      const segmentPath = path.join(
        this.recordingsDir,
        `${recordingId}_segment_${segmentIndex}.webm`
      );

      // Write segment to disk
      await fs.promises.writeFile(segmentPath, segmentData);

      recordingSession.segments.push({
        index: segmentIndex,
        path: segmentPath,
        size: segmentData.length,
        timestamp: new Date()
      });

      console.log(`Recording segment added: ${recordingId} segment ${segmentIndex}`);
    } catch (error) {
      console.error('Add recording segment error:', error);
      throw error;
    }
  }

  /**
   * Process recording (combine segments, convert format, generate thumbnails)
   */
  async processRecording(recordingSession) {
    try {
      const { recordingId, segments } = recordingSession;
      
      if (segments.length === 0) {
        throw new Error('No recording segments found');
      }

      // Combine segments into single file
      const outputPath = path.join(this.recordingsDir, `${recordingId}.mp4`);
      await this.combineSegments(segments, outputPath);

      // Generate thumbnails
      const thumbnails = await this.generateThumbnails(outputPath, recordingId);

      // Get file stats
      const stats = await fs.promises.stat(outputPath);
      const fileSize = stats.size;

      // Upload to Cloudinary
      const cloudinaryResult = await this.uploadToCloudinary(outputPath, recordingId);

      // Clean up local segments
      await this.cleanupSegments(segments);

      return {
        recordingId,
        filePath: outputPath,
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        fileSize,
        thumbnails,
        duration: recordingSession.duration
      };
    } catch (error) {
      console.error('Process recording error:', error);
      throw error;
    }
  }

  /**
   * Combine recording segments using FFmpeg
   */
  async combineSegments(segments, outputPath) {
    return new Promise((resolve, reject) => {
      const segmentPaths = segments
        .sort((a, b) => a.index - b.index)
        .map(segment => segment.path);

      if (segmentPaths.length === 1) {
        // Single segment, just copy
        fs.copyFileSync(segmentPaths[0], outputPath);
        resolve();
        return;
      }

      // Multiple segments, use FFmpeg to concatenate
      const command = ffmpeg();
      
      segmentPaths.forEach(segmentPath => {
        command.input(segmentPath);
      });

      command
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('Segments combined successfully');
          resolve();
        })
        .on('error', (error) => {
          console.error('FFmpeg error:', error);
          reject(error);
        })
        .mergeToFile(outputPath, this.recordingsDir);
    });
  }

  /**
   * Generate video thumbnails
   */
  async generateThumbnails(videoPath, recordingId) {
    return new Promise((resolve, reject) => {
      const thumbnailsDir = path.join(this.recordingsDir, 'thumbnails');
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }

      const thumbnailPath = path.join(thumbnailsDir, `${recordingId}_thumb.jpg`);

      ffmpeg(videoPath)
        .on('end', async () => {
          try {
            // Upload thumbnail to Cloudinary
            const result = await cloudinary.uploader.upload(thumbnailPath, {
              folder: 'call-recordings/thumbnails',
              public_id: `${recordingId}_thumbnail`,
              resource_type: 'image'
            });

            resolve([{
              type: 'main',
              url: result.secure_url,
              publicId: result.public_id
            }]);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        })
        .screenshot({
          timestamps: ['10%'],
          filename: `${recordingId}_thumb.jpg`,
          folder: thumbnailsDir,
          size: '320x240'
        });
    });
  }

  /**
   * Upload recording to Cloudinary
   */
  async uploadToCloudinary(filePath, recordingId) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'call-recordings',
        public_id: recordingId,
        resource_type: 'video',
        eager: [
          { quality: 'auto:low', format: 'mp4' },
          { quality: 'auto:good', format: 'mp4' }
        ],
        eager_async: true
      });

      console.log(`Recording uploaded to Cloudinary: ${result.secure_url}`);
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  /**
   * Clean up local recording segments
   */
  async cleanupSegments(segments) {
    try {
      for (const segment of segments) {
        if (fs.existsSync(segment.path)) {
          await fs.promises.unlink(segment.path);
        }
      }
      console.log('Recording segments cleaned up');
    } catch (error) {
      console.error('Cleanup segments error:', error);
    }
  }

  /**
   * Save recording info to database
   */
  async saveRecordingToDatabase(recordingSession) {
    try {
      const CallRecording = mongoose.model('CallRecording', new mongoose.Schema({
        recordingId: { type: String, required: true, unique: true },
        callId: { type: String, required: true },
        participants: [{
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: String,
          role: String,
          consentGiven: Boolean,
          consentTimestamp: Date
        }],
        startTime: { type: Date, required: true },
        endTime: Date,
        duration: Number,
        status: {
          type: String,
          enum: ['recording', 'processing', 'completed', 'failed'],
          default: 'recording'
        },
        filePath: String,
        cloudinaryUrl: String,
        cloudinaryPublicId: String,
        fileSize: Number,
        thumbnails: [{
          type: String,
          url: String,
          publicId: String
        }],
        metadata: mongoose.Schema.Types.Mixed,
        error: String,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }));

      const recording = new CallRecording({
        recordingId: recordingSession.recordingId,
        callId: recordingSession.callId,
        participants: recordingSession.participants,
        startTime: recordingSession.startTime,
        status: recordingSession.status,
        metadata: recordingSession.metadata
      });

      await recording.save();
      console.log(`Recording saved to database: ${recordingSession.recordingId}`);
    } catch (error) {
      console.error('Save recording to database error:', error);
      throw error;
    }
  }

  /**
   * Update recording in database
   */
  async updateRecordingInDatabase(recordingId, updateData) {
    try {
      const CallRecording = mongoose.model('CallRecording');
      await CallRecording.findOneAndUpdate(
        { recordingId },
        { ...updateData, updatedAt: new Date() }
      );
      console.log(`Recording updated in database: ${recordingId}`);
    } catch (error) {
      console.error('Update recording in database error:', error);
      throw error;
    }
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId) {
    try {
      const CallRecording = mongoose.model('CallRecording');
      const recording = await CallRecording.findOne({ recordingId })
        .populate('participants.userId', 'name email role avatar');
      return recording;
    } catch (error) {
      console.error('Get recording error:', error);
      throw error;
    }
  }

  /**
   * Get recordings for a user
   */
  async getUserRecordings(userId, options = {}) {
    try {
      const { limit = 20, skip = 0, status } = options;
      const CallRecording = mongoose.model('CallRecording');
      
      const query = {
        'participants.userId': userId
      };

      if (status) {
        query.status = status;
      }

      const recordings = await CallRecording.find(query)
        .populate('participants.userId', 'name email role avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return recordings;
    } catch (error) {
      console.error('Get user recordings error:', error);
      throw error;
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId, userId) {
    try {
      const recording = await this.getRecording(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Check if user has permission to delete
      const isParticipant = recording.participants.some(p => 
        p.userId._id.toString() === userId
      );

      if (!isParticipant) {
        throw new Error('Unauthorized to delete this recording');
      }

      // Delete from Cloudinary
      if (recording.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(recording.cloudinaryPublicId, {
          resource_type: 'video'
        });
      }

      // Delete thumbnails from Cloudinary
      if (recording.thumbnails) {
        for (const thumbnail of recording.thumbnails) {
          if (thumbnail.publicId) {
            await cloudinary.uploader.destroy(thumbnail.publicId);
          }
        }
      }

      // Delete local file if exists
      if (recording.filePath && fs.existsSync(recording.filePath)) {
        await fs.promises.unlink(recording.filePath);
      }

      // Delete from database
      const CallRecording = mongoose.model('CallRecording');
      await CallRecording.findOneAndDelete({ recordingId });

      console.log(`Recording deleted: ${recordingId}`);
      return true;
    } catch (error) {
      console.error('Delete recording error:', error);
      throw error;
    }
  }

  /**
   * Generate unique recording ID
   */
  generateRecordingId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      activeRecordings: this.activeRecordings.size,
      recordingDetails: Array.from(this.activeRecordings.values()).map(recording => ({
        recordingId: recording.recordingId,
        callId: recording.callId,
        status: recording.status,
        duration: recording.startTime ? Date.now() - recording.startTime.getTime() : 0,
        participants: recording.participants.length,
        segments: recording.segments.length
      }))
    };
  }
}

export default CallRecordingService;
