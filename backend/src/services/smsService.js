import twilio from 'twilio';

/**
 * SMS service for sending text messages
 */
class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.init();
  }

  /**
   * Initialize SMS service
   */
  init() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not provided. SMS service will be in mock mode.');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      console.log('SMS service initialized successfully');
    } catch (error) {
      console.error('SMS service initialization failed:', error.message);
    }
  }

  /**
   * Send SMS message
   * @param {Object} options - SMS options
   * @param {string} options.to - Recipient phone number
   * @param {string} options.message - Message content
   * @param {string} options.from - Sender phone number (optional)
   */
  async sendSMS({ to, message, from = this.fromNumber }) {
    try {
      // If Twilio is not configured, use mock mode
      if (!this.client) {
        return this.mockSendSMS({ to, message, from });
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(to)) {
        throw new Error('Invalid phone number format');
      }

      // Send SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: from,
        to: to
      });

      console.log('SMS sent successfully:', result.sid);

      return {
        success: true,
        sid: result.sid,
        status: result.status
      };

    } catch (error) {
      console.error('Failed to send SMS:', error.message);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Mock SMS sending for development/testing
   * @param {Object} options - SMS options
   */
  mockSendSMS({ to, message, from }) {
    console.log('📱 MOCK SMS SERVICE 📱');
    console.log('From:', from);
    console.log('To:', to);
    console.log('Message:', message);
    console.log('─'.repeat(50));

    return {
      success: true,
      sid: `mock_${Date.now()}`,
      status: 'sent'
    };
  }

  /**
   * Send bulk SMS messages
   * @param {Array} recipients - Array of recipient objects
   * @param {string} message - Message content
   */
  async sendBulkSMS(recipients, message) {
    const results = [];

    for (const recipient of recipients) {
      try {
        // Personalize message if data is provided
        let personalizedMessage = message;
        if (recipient.data) {
          Object.keys(recipient.data).forEach(key => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            personalizedMessage = personalizedMessage.replace(regex, recipient.data[key] || '');
          });
        }

        const result = await this.sendSMS({
          to: recipient.phoneNumber,
          message: personalizedMessage
        });

        results.push({
          phoneNumber: recipient.phoneNumber,
          success: true,
          sid: result.sid
        });

      } catch (error) {
        results.push({
          phoneNumber: recipient.phoneNumber,
          success: false,
          error: error.message
        });
      }

      // Add delay between messages to avoid rate limiting
      if (this.client) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Send verification code SMS
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} code - Verification code
   * @param {string} appName - Application name
   */
  async sendVerificationCode(phoneNumber, code, appName = 'Pharmacy System') {
    const message = `Your ${appName} verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send two-factor authentication code
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} code - 2FA code
   * @param {string} appName - Application name
   */
  async sendTwoFactorCode(phoneNumber, code, appName = 'Pharmacy System') {
    const message = `Your ${appName} login code is: ${code}. This code expires in 5 minutes.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send emergency access code
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} code - Emergency access code
   * @param {string} appName - Application name
   */
  async sendEmergencyCode(phoneNumber, code, appName = 'Pharmacy System') {
    const message = `Your ${appName} emergency access code is: ${code}. This code expires in 1 hour. Do not share this code with anyone.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send order status update
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} orderNumber - Order number
   * @param {string} status - Order status
   * @param {string} appName - Application name
   */
  async sendOrderUpdate(phoneNumber, orderNumber, status, appName = 'Pharmacy System') {
    const message = `${appName}: Your order #${orderNumber} is now ${status}. Check the app for more details.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send appointment reminder
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} appointmentTime - Appointment time
   * @param {string} doctorName - Doctor name
   * @param {string} appName - Application name
   */
  async sendAppointmentReminder(phoneNumber, appointmentTime, doctorName, appName = 'Pharmacy System') {
    const message = `${appName}: Reminder - You have an appointment with Dr. ${doctorName} at ${appointmentTime}.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Send prescription ready notification
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} pharmacyName - Pharmacy name
   * @param {string} prescriptionId - Prescription ID
   * @param {string} appName - Application name
   */
  async sendPrescriptionReady(phoneNumber, pharmacyName, prescriptionId, appName = 'Pharmacy System') {
    const message = `${appName}: Your prescription #${prescriptionId} is ready for pickup at ${pharmacyName}.`;
    
    return await this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - True if valid
   */
  isValidPhoneNumber(phoneNumber) {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phoneNumber - Phone number to format
   * @param {string} countryCode - Country code (default: +1 for US)
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber, countryCode = '+1') {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with country code, return as is
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+${cleaned}`;
    }
    
    // If it's a 10-digit US number, add country code
    if (cleaned.length === 10) {
      return `${countryCode}${cleaned}`;
    }
    
    // Return original if can't format
    return phoneNumber;
  }

  /**
   * Get SMS delivery status
   * @param {string} sid - Message SID
   * @returns {Object} - Message status
   */
  async getSMSStatus(sid) {
    try {
      if (!this.client) {
        return { status: 'unknown', error: 'SMS service not configured' };
      }

      const message = await this.client.messages(sid).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateUpdated: message.dateUpdated
      };

    } catch (error) {
      console.error('Failed to get SMS status:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get account SMS usage and balance
   * @returns {Object} - Account information
   */
  async getAccountInfo() {
    try {
      if (!this.client) {
        return { error: 'SMS service not configured' };
      }

      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      
      return {
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
        dateUpdated: account.dateUpdated
      };

    } catch (error) {
      console.error('Failed to get account info:', error.message);
      return { error: error.message };
    }
  }

  /**
   * List SMS messages (for debugging/monitoring)
   * @param {Object} options - Query options
   * @returns {Array} - List of messages
   */
  async listSMSMessages(options = {}) {
    try {
      if (!this.client) {
        return [];
      }

      const messages = await this.client.messages.list({
        limit: options.limit || 20,
        dateSent: options.dateSent
      });

      return messages.map(message => ({
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        status: message.status,
        direction: message.direction,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      }));

    } catch (error) {
      console.error('Failed to list SMS messages:', error.message);
      return [];
    }
  }
}

// Create singleton instance
const smsService = new SMSService();

/**
 * Send SMS function
 * @param {Object} options - SMS options
 */
export const sendSMS = async (options) => {
  return await smsService.sendSMS(options);
};

/**
 * Send verification code function
 * @param {string} phoneNumber - Phone number
 * @param {string} code - Verification code
 * @param {string} appName - App name
 */
export const sendVerificationCode = async (phoneNumber, code, appName) => {
  return await smsService.sendVerificationCode(phoneNumber, code, appName);
};

/**
 * Send two-factor code function
 * @param {string} phoneNumber - Phone number
 * @param {string} code - 2FA code
 * @param {string} appName - App name
 */
export const sendTwoFactorCode = async (phoneNumber, code, appName) => {
  return await smsService.sendTwoFactorCode(phoneNumber, code, appName);
};

/**
 * Send emergency code function
 * @param {string} phoneNumber - Phone number
 * @param {string} code - Emergency code
 * @param {string} appName - App name
 */
export const sendEmergencyCode = async (phoneNumber, code, appName) => {
  return await smsService.sendEmergencyCode(phoneNumber, code, appName);
};

/**
 * Send bulk SMS function
 * @param {Array} recipients - Recipients array
 * @param {string} message - Message content
 */
export const sendBulkSMS = async (recipients, message) => {
  return await smsService.sendBulkSMS(recipients, message);
};

export default smsService;
