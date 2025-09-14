import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLogService from './AuditLogService.js';

class SymptomMonitoringWebSocketService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.monitoringSessions = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Create a namespace for symptom monitoring to avoid conflicts with other services
    const symptomNamespace = this.io.of('/symptom-monitoring');
    
    symptomNamespace.on('connection', (socket) => {
      console.log('🔌 User connected to symptom monitoring:', socket.id);

      // Authentication middleware
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          
          if (user) {
            socket.userId = user._id.toString();
            socket.user = user;
            this.connectedUsers.set(socket.userId, socket);
            
            socket.emit('authenticated', { success: true, user: user.profile });
            console.log(`✅ User authenticated: ${user.profile.firstName} ${user.profile.lastName}`);
          } else {
            socket.emit('authentication_error', { message: 'User not found' });
            socket.disconnect();
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authentication_error', { message: 'Invalid token' });
          socket.disconnect();
        }
      });

      // Initialize monitoring session
      socket.on('initialize_monitoring', async (data) => {
        try {
          if (!socket.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { analysisId, symptoms, additionalInfo } = data;
          
          const monitoringSession = {
            sessionId: `session_${Date.now()}_${socket.userId}`,
            userId: socket.userId,
            analysisId,
            symptoms,
            additionalInfo,
            startTime: new Date(),
            lastUpdate: new Date(),
            vitals: {},
            alerts: [],
            riskScore: 0,
            urgencyLevel: 'low'
          };

          this.monitoringSessions.set(socket.id, monitoringSession);
          
          socket.emit('monitoring_initialized', {
            sessionId: monitoringSession.sessionId,
            status: 'active'
          });

          // Start continuous monitoring
          this.startContinuousMonitoring(socket, monitoringSession);

          // Log the monitoring session start
          await AuditLogService.log({
            action: 'symptom_monitoring_started',
            userId: socket.userId,
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            details: {
              sessionId: monitoringSession.sessionId,
              analysisId,
              symptoms: symptoms.substring(0, 100)
            }
          });

        } catch (error) {
          console.error('Error initializing monitoring:', error);
          socket.emit('error', { message: 'Failed to initialize monitoring' });
        }
      });

      // Update vitals data
      socket.on('update_vitals', async (data) => {
        try {
          const session = this.monitoringSessions.get(socket.id);
          if (!session) {
            socket.emit('error', { message: 'No active monitoring session' });
            return;
          }

          const { heartRate, bloodPressure, temperature, oxygenSaturation } = data;
          
          session.vitals = {
            ...session.vitals,
            heartRate,
            bloodPressure,
            temperature,
            oxygenSaturation,
            timestamp: new Date()
          };
          
          session.lastUpdate = new Date();

          // Analyze vitals for risk assessment
          const riskAssessment = this.analyzeVitalsRisk(session.vitals);
          session.riskScore = riskAssessment.riskScore;
          session.urgencyLevel = riskAssessment.urgencyLevel;

          // Check for alerts
          const alerts = this.checkVitalsAlerts(session.vitals);
          if (alerts.length > 0) {
            session.alerts.push(...alerts);
            
            // Emit alerts to user
            socket.emit('vitals_alert', {
              alerts,
              riskScore: session.riskScore,
              urgencyLevel: session.urgencyLevel
            });
          }

          // Emit updated vitals
          socket.emit('vitals_updated', {
            vitals: session.vitals,
            riskScore: session.riskScore,
            urgencyLevel: session.urgencyLevel
          });

          this.monitoringSessions.set(socket.id, session);

        } catch (error) {
          console.error('Error updating vitals:', error);
          socket.emit('error', { message: 'Failed to update vitals' });
        }
      });

      // Update symptoms during monitoring
      socket.on('update_symptoms', async (data) => {
        try {
          const session = this.monitoringSessions.get(socket.id);
          if (!session) {
            socket.emit('error', { message: 'No active monitoring session' });
            return;
          }

          const { newSymptoms, severity, notes } = data;
          
          session.symptoms = newSymptoms;
          session.lastUpdate = new Date();

          // Re-analyze risk based on updated symptoms
          const riskUpdate = await this.analyzeSymptomRisk(newSymptoms, severity);
          session.riskScore = Math.max(session.riskScore, riskUpdate.riskScore);
          session.urgencyLevel = this.determineHighestUrgency(session.urgencyLevel, riskUpdate.urgencyLevel);

          // Emit risk update
          socket.emit('risk_update', {
            riskScore: session.riskScore,
            urgencyLevel: session.urgencyLevel,
            alerts: riskUpdate.alerts || []
          });

          // Check if emergency intervention is needed
          if (session.urgencyLevel === 'emergency') {
            this.triggerEmergencyAlert(socket, session);
          }

          this.monitoringSessions.set(socket.id, session);

        } catch (error) {
          console.error('Error updating symptoms:', error);
          socket.emit('error', { message: 'Failed to update symptoms' });
        }
      });

      // End monitoring session
      socket.on('end_monitoring', async () => {
        try {
          const session = this.monitoringSessions.get(socket.id);
          if (session) {
            session.endTime = new Date();
            session.duration = session.endTime - session.startTime;

            // Log session end
            await AuditLogService.log({
              action: 'symptom_monitoring_ended',
              userId: socket.userId,
              details: {
                sessionId: session.sessionId,
                duration: session.duration,
                finalRiskScore: session.riskScore,
                alertsGenerated: session.alerts.length
              }
            });

            this.monitoringSessions.delete(socket.id);
            socket.emit('monitoring_ended', { sessionId: session.sessionId });
          }
        } catch (error) {
          console.error('Error ending monitoring:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log('🔌 User disconnected from symptom monitoring:', socket.id);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }

        const session = this.monitoringSessions.get(socket.id);
        if (session) {
          session.endTime = new Date();
          session.disconnected = true;
          
          // Log unexpected disconnection
          if (socket.userId) {
            await AuditLogService.log({
              action: 'symptom_monitoring_disconnected',
              userId: socket.userId,
              details: {
                sessionId: session.sessionId,
                unexpected: true
              }
            });
          }
        }

        this.monitoringSessions.delete(socket.id);
      });
    });
  }

  // Start continuous monitoring for a session
  startContinuousMonitoring(socket, session) {
    const monitoringInterval = setInterval(() => {
      if (!this.monitoringSessions.has(socket.id)) {
        clearInterval(monitoringInterval);
        return;
      }

      const currentSession = this.monitoringSessions.get(socket.id);
      
      // Check if session is stale (no updates for 5 minutes)
      const timeSinceUpdate = Date.now() - currentSession.lastUpdate.getTime();
      if (timeSinceUpdate > 5 * 60 * 1000) {
        socket.emit('monitoring_warning', {
          message: 'No recent updates received. Please update your status.',
          type: 'stale_session'
        });
      }

      // Send periodic check-in
      socket.emit('monitoring_check', {
        sessionId: currentSession.sessionId,
        duration: Date.now() - currentSession.startTime.getTime(),
        lastUpdate: currentSession.lastUpdate
      });

    }, 60000); // Check every minute

    // Store interval reference
    session.monitoringInterval = monitoringInterval;
  }

  // Analyze vitals for risk assessment
  analyzeVitalsRisk(vitals) {
    let riskScore = 0;
    let urgencyLevel = 'low';

    // Heart rate analysis
    if (vitals.heartRate) {
      if (vitals.heartRate > 120 || vitals.heartRate < 50) {
        riskScore += 3;
        urgencyLevel = 'high';
      } else if (vitals.heartRate > 100 || vitals.heartRate < 60) {
        riskScore += 1;
        urgencyLevel = 'moderate';
      }
    }

    // Blood pressure analysis
    if (vitals.bloodPressure) {
      const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
      if (systolic > 180 || diastolic > 110) {
        riskScore += 4;
        urgencyLevel = 'emergency';
      } else if (systolic > 160 || diastolic > 100) {
        riskScore += 2;
        urgencyLevel = 'high';
      }
    }

    // Temperature analysis
    if (vitals.temperature) {
      if (vitals.temperature > 39.5 || vitals.temperature < 35) {
        riskScore += 3;
        urgencyLevel = urgencyLevel === 'emergency' ? 'emergency' : 'high';
      } else if (vitals.temperature > 38.5) {
        riskScore += 1;
      }
    }

    // Oxygen saturation analysis
    if (vitals.oxygenSaturation) {
      if (vitals.oxygenSaturation < 90) {
        riskScore += 4;
        urgencyLevel = 'emergency';
      } else if (vitals.oxygenSaturation < 95) {
        riskScore += 2;
        urgencyLevel = urgencyLevel === 'emergency' ? 'emergency' : 'high';
      }
    }

    return { riskScore, urgencyLevel };
  }

  // Check vitals for specific alerts
  checkVitalsAlerts(vitals) {
    const alerts = [];

    if (vitals.heartRate > 120) {
      alerts.push({
        type: 'tachycardia',
        severity: 'high',
        message: 'Heart rate is elevated',
        value: vitals.heartRate,
        recommendation: 'Monitor closely and consider medical attention'
      });
    }

    if (vitals.bloodPressure) {
      const [systolic] = vitals.bloodPressure.split('/').map(Number);
      if (systolic > 180) {
        alerts.push({
          type: 'hypertensive_crisis',
          severity: 'emergency',
          message: 'Blood pressure critically high',
          value: vitals.bloodPressure,
          recommendation: 'Seek immediate emergency medical care'
        });
      }
    }

    if (vitals.oxygenSaturation < 90) {
      alerts.push({
        type: 'hypoxemia',
        severity: 'emergency',
        message: 'Oxygen saturation critically low',
        value: vitals.oxygenSaturation,
        recommendation: 'Seek immediate emergency medical care'
      });
    }

    return alerts;
  }

  // Analyze symptom risk
  async analyzeSymptomRisk(symptoms, severity) {
    const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe headache', 'confusion'];
    const riskKeywords = ['blood', 'severe pain', 'numbness', 'vision loss'];
    
    let riskScore = 0;
    const alerts = [];
    
    const symptomsLower = symptoms.toLowerCase();
    
    emergencyKeywords.forEach(keyword => {
      if (symptomsLower.includes(keyword)) {
        riskScore += 4;
        alerts.push({
          type: 'emergency_symptom',
          severity: 'emergency',
          message: `Emergency symptom detected: ${keyword}`,
          recommendation: 'Seek immediate medical attention'
        });
      }
    });
    
    riskKeywords.forEach(keyword => {
      if (symptomsLower.includes(keyword)) {
        riskScore += 2;
        alerts.push({
          type: 'high_risk_symptom',
          severity: 'high',
          message: `High-risk symptom detected: ${keyword}`,
          recommendation: 'Medical evaluation recommended'
        });
      }
    });
    
    // Factor in severity
    const severityScores = { mild: 1, moderate: 2, severe: 3, extreme: 4 };
    riskScore += severityScores[severity] || 1;
    
    const urgencyLevel = riskScore >= 6 ? 'emergency' : riskScore >= 4 ? 'high' : riskScore >= 2 ? 'moderate' : 'low';
    
    return { riskScore, urgencyLevel, alerts };
  }

  // Determine the highest urgency level
  determineHighestUrgency(current, new_level) {
    const urgencyOrder = { low: 1, moderate: 2, high: 3, emergency: 4 };
    return urgencyOrder[new_level] > urgencyOrder[current] ? new_level : current;
  }

  // Trigger emergency alert
  triggerEmergencyAlert(socket, session) {
    const emergencyAlert = {
      type: 'emergency',
      severity: 'critical',
      message: 'Emergency medical attention required',
      timestamp: new Date().toISOString(),
      sessionId: session.sessionId,
      recommendations: [
        'Call emergency services immediately',
        'Do not drive yourself to hospital',
        'Stay calm and follow emergency operator instructions'
      ]
    };

    session.alerts.push(emergencyAlert);
    
    socket.emit('emergency_alert', emergencyAlert);
    
    // Optionally notify healthcare providers or emergency contacts
    this.notifyEmergencyContacts(session);
  }

  // Notify emergency contacts (placeholder)
  async notifyEmergencyContacts(session) {
    try {
      // This would integrate with your notification service
      console.log(`🚨 Emergency alert for user ${session.userId}`);
      
      // Log emergency alert
      await AuditLogService.log({
        action: 'emergency_alert_triggered',
        userId: session.userId,
        details: {
          sessionId: session.sessionId,
          riskScore: session.riskScore,
          urgencyLevel: session.urgencyLevel,
          symptoms: session.symptoms.substring(0, 100)
        }
      });
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }

  // Send message to specific user
  sendMessageToUser(userId, event, data) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit(event, data);
      return true;
    }
    return false;
  }

  // Get monitoring session stats
  getSessionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeSessions: this.monitoringSessions.size,
      sessions: Array.from(this.monitoringSessions.values()).map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        duration: Date.now() - session.startTime.getTime(),
        riskScore: session.riskScore,
        urgencyLevel: session.urgencyLevel,
        alertsCount: session.alerts.length
      }))
    };
  }
}

export default SymptomMonitoringWebSocketService;
