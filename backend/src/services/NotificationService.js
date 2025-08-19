import nodemailer from 'nodemailer';
import twilio from 'twilio';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';

class NotificationService {
  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize SMS client (Twilio)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.smsClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      console.log('Twilio credentials not provided. SMS service will be in mock mode.');
      this.smsClient = null;
    }

    // Default from addresses
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@healthcare.com';
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER;
  }

  // Send email notification
  async sendEmail(to, subject, htmlContent, textContent) {
    try {
      const mailOptions = {
        from: this.fromEmail,
        to,
        subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    try {
      if (!this.smsClient || !this.fromPhone) {
        console.log(`SMS (mock) to ${to}: ${message}`);
        return { success: true, mock: true };
      }

      const result = await this.smsClient.messages.create({
        body: message,
        from: this.fromPhone,
        to
      });

      console.log('SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send push notification (placeholder for future implementation)
  async sendPushNotification(userId, title, message, data = {}) {
    // This would integrate with Firebase, OneSignal, or similar service
    console.log(`Push notification for user ${userId}: ${title} - ${message}`);
    return { success: true, mock: true };
  }

  // Appointment confirmation notification
  async sendAppointmentConfirmation(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'name email phone')
        .populate('doctor', 'name email specializations');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const patient = appointment.patient;
      const doctor = appointment.doctor;
      const appointmentDate = new Date(appointment.startTime).toLocaleDateString();
      const appointmentTime = new Date(appointment.startTime).toLocaleTimeString();

      // Email to patient
      const patientEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Appointment Confirmed</h2>
          <p>Dear ${patient.name},</p>
          <p>Your appointment has been confirmed with the following details:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Doctor:</strong> Dr. ${doctor.name}</p>
            <p><strong>Specialization:</strong> ${doctor.specializations?.join(', ')}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Consultation Type:</strong> ${appointment.consultationType}</p>
            <p><strong>Reason:</strong> ${appointment.reason}</p>
          </div>
          
          <p>Please be available 5 minutes before your scheduled time.</p>
          <p>If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
          
          <p>Best regards,<br>Healthcare Platform Team</p>
        </div>
      `;

      await this.sendEmail(
        patient.email,
        'Appointment Confirmed',
        patientEmailHtml,
        `Your appointment with Dr. ${doctor.name} on ${appointmentDate} at ${appointmentTime} has been confirmed.`
      );

      // SMS to patient
      const patientSMS = `Appointment confirmed with Dr. ${doctor.name} on ${appointmentDate} at ${appointmentTime}. Consultation type: ${appointment.consultationType}`;
      if (patient.phone) {
        await this.sendSMS(patient.phone, patientSMS);
      }

      // Email to doctor
      const doctorEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">New Appointment Scheduled</h2>
          <p>Dear Dr. ${doctor.name},</p>
          <p>A new appointment has been scheduled with you:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Patient:</strong> ${patient.name}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Consultation Type:</strong> ${appointment.consultationType}</p>
            <p><strong>Reason:</strong> ${appointment.reason}</p>
            <p><strong>Contact:</strong> ${patient.phone}</p>
          </div>
          
          <p>Please review the patient's health survey and medical history before the consultation.</p>
          
          <p>Best regards,<br>Healthcare Platform Team</p>
        </div>
      `;

      await this.sendEmail(
        doctor.email,
        'New Appointment Scheduled',
        doctorEmailHtml,
        `New appointment with ${patient.name} on ${appointmentDate} at ${appointmentTime}`
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to send appointment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Appointment reminder notification (24 hours before)
  async sendAppointmentReminder(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'name email phone')
        .populate('doctor', 'name email');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const patient = appointment.patient;
      const doctor = appointment.doctor;
      const appointmentDate = new Date(appointment.startTime).toLocaleDateString();
      const appointmentTime = new Date(appointment.startTime).toLocaleTimeString();

      // Email reminder
      const reminderEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Appointment Reminder</h2>
          <p>Dear ${patient.name},</p>
          <p>This is a reminder about your upcoming appointment:</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>Doctor:</strong> Dr. ${doctor.name}</p>
            <p><strong>Date:</strong> ${appointmentDate}</p>
            <p><strong>Time:</strong> ${appointmentTime}</p>
            <p><strong>Consultation Type:</strong> ${appointment.consultationType}</p>
          </div>
          
          <p>Please ensure you're available at the scheduled time.</p>
          <p>If you need to reschedule, please do so as soon as possible.</p>
          
          <p>Best regards,<br>Healthcare Platform Team</p>
        </div>
      `;

      await this.sendEmail(
        patient.email,
        'Appointment Reminder - Tomorrow',
        reminderEmailHtml,
        `Reminder: Your appointment with Dr. ${doctor.name} is tomorrow at ${appointmentTime}`
      );

      // SMS reminder
      const reminderSMS = `Reminder: Your appointment with Dr. ${doctor.name} is tomorrow (${appointmentDate}) at ${appointmentTime}. Please be on time.`;
      if (patient.phone) {
        await this.sendSMS(patient.phone, reminderSMS);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send appointment reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Payment confirmation notification
  async sendPaymentConfirmation(paymentId, appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'name email phone');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const patient = appointment.patient;
      const amount = appointment.payment.amount;

      const paymentEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Payment Successful</h2>
          <p>Dear ${patient.name},</p>
          <p>Your payment has been processed successfully.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Payment ID:</strong> ${paymentId}</p>
            <p><strong>Amount:</strong> ₹${amount}</p>
            <p><strong>Status:</strong> Completed</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Your appointment is now confirmed. You will receive appointment details separately.</p>
          
          <p>Best regards,<br>Healthcare Platform Team</p>
        </div>
      `;

      await this.sendEmail(
        patient.email,
        'Payment Confirmation',
        paymentEmailHtml,
        `Payment of ₹${amount} has been processed successfully. Payment ID: ${paymentId}`
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Consultation started notification
  async sendConsultationStarted(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'name email phone')
        .populate('doctor', 'name email');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const patient = appointment.patient;
      const doctor = appointment.doctor;

      // For video/phone consultations, include meeting details
      let meetingInfo = '';
      if (appointment.meetingDetails?.joinUrl) {
        meetingInfo = `
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Join Meeting:</strong> <a href="${appointment.meetingDetails.joinUrl}" style="color: #0066cc;">${appointment.meetingDetails.joinUrl}</a></p>
            ${appointment.meetingDetails.meetingId ? `<p><strong>Meeting ID:</strong> ${appointment.meetingDetails.meetingId}</p>` : ''}
          </div>
        `;
      }

      const consultationEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #17a2b8;">Your Consultation is Starting</h2>
          <p>Dear ${patient.name},</p>
          <p>Dr. ${doctor.name} has started your consultation session.</p>
          
          ${meetingInfo}
          
          <p>Please join the consultation as soon as possible.</p>
          
          <p>Best regards,<br>Healthcare Platform Team</p>
        </div>
      `;

      await this.sendEmail(
        patient.email,
        'Consultation Started',
        consultationEmailHtml,
        `Dr. ${doctor.name} has started your consultation. Please join now.`
      );

      // SMS notification
      const consultationSMS = `Dr. ${doctor.name} has started your consultation. Please join now via the app or website.`;
      if (patient.phone) {
        await this.sendSMS(patient.phone, consultationSMS);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send consultation started notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Prescription ready notification
  async sendPrescriptionReady(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'name email phone')
        .populate('doctor', 'name email')
        .populate('medicalRecords');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      const patient = appointment.patient;
      const doctor = appointment.doctor;
      const prescriptions = appointment.consultation?.prescriptions || [];

      let prescriptionList = '';
      if (prescriptions.length > 0) {
        prescriptionList = prescriptions.map(rx => 
          `<li>${rx.medication} - ${rx.dosage} (${rx.frequency})</li>`
        ).join('');
      }

      const prescriptionEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6f42c1;">Your Prescription is Ready</h2>
          <p>Dear ${patient.name},</p>
          <p>Dr. ${doctor.name} has completed your consultation and your prescription is now ready.</p>
          
          ${prescriptionList ? `
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>Prescribed Medications:</h3>
              <ul style="margin: 10px 0;">
                ${prescriptionList}
              </ul>
            </div>
          ` : ''}
          
          <p>You can download your prescription and medical records from your patient dashboard.</p>
          <p>Please follow the doctor's instructions carefully.</p>
          
          <p>Best regards,<br>Healthcare Platform Team</p>
        </div>
      `;

      await this.sendEmail(
        patient.email,
        'Prescription Ready',
        prescriptionEmailHtml,
        `Your prescription from Dr. ${doctor.name} is ready. Please check your patient dashboard.`
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to send prescription ready notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Generic notification method
  async sendNotification(userId, type, data) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const notifications = {
        'appointment-confirmation': () => this.sendAppointmentConfirmation(data.appointmentId),
        'appointment-reminder': () => this.sendAppointmentReminder(data.appointmentId),
        'payment-confirmation': () => this.sendPaymentConfirmation(data.paymentId, data.appointmentId),
        'consultation-started': () => this.sendConsultationStarted(data.appointmentId),
        'prescription-ready': () => this.sendPrescriptionReady(data.appointmentId)
      };

      if (notifications[type]) {
        return await notifications[type]();
      } else {
        throw new Error(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule appointment reminders (to be called by cron job)
  async scheduleAppointmentReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const appointments = await Appointment.find({
        appointmentDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow
        },
        status: { $in: ['confirmed', 'pending'] }
      });

      console.log(`Found ${appointments.length} appointments for reminder`);

      for (const appointment of appointments) {
        await this.sendAppointmentReminder(appointment._id);
      }

      return { success: true, remindersSent: appointments.length };
    } catch (error) {
      console.error('Failed to schedule appointment reminders:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();
