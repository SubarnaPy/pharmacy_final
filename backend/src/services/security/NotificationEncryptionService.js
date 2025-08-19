import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Service for encrypting and decrypting sensitive notification data
 * Implements AES-256-GCM encryption for notification content
 */
class NotificationEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltRounds = 12;
    
    // Get encryption key from environment or generate one
    this.encryptionKey = this.getOrGenerateKey();
  }

  /**
   * Get encryption key from environment or generate a new one
   * @returns {Buffer} Encryption key
   */
  getOrGenerateKey() {
    const envKey = process.env.NOTIFICATION_ENCRYPTION_KEY;
    if (envKey) {
      return Buffer.from(envKey, 'hex');
    }
    
    // Generate a new key (should be stored securely in production)
    const key = crypto.randomBytes(this.keyLength);
    console.warn('Generated new encryption key. Store this securely:', key.toString('hex'));
    return key;
  }

  /**
   * Encrypt sensitive notification data
   * @param {string} plaintext - Data to encrypt
   * @param {Object} metadata - Additional metadata for encryption context
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encrypt(plaintext, metadata = {}) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Invalid plaintext for encryption');
      }

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata)));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        metadata: metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive notification data
   * @param {Object} encryptedData - Encrypted data object
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || !encryptedData.encrypted) {
        throw new Error('Invalid encrypted data');
      }

      const { encrypted, iv, authTag, metadata = {} } = encryptedData;
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from(JSON.stringify(metadata)));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt notification content based on sensitivity level
   * @param {Object} notification - Notification object
   * @returns {Object} Notification with encrypted sensitive fields
   */
  encryptNotificationContent(notification) {
    const sensitiveFields = [
      'content.personalInfo',
      'content.medicalData',
      'content.financialData',
      'contextData.patientInfo',
      'contextData.prescriptionDetails',
      'contextData.paymentInfo'
    ];

    const encryptedNotification = { ...notification };
    
    sensitiveFields.forEach(fieldPath => {
      const value = this.getNestedValue(notification, fieldPath);
      if (value) {
        const encrypted = this.encrypt(JSON.stringify(value), {
          field: fieldPath,
          notificationId: notification._id,
          type: notification.type
        });
        this.setNestedValue(encryptedNotification, fieldPath, encrypted);
      }
    });

    // Mark as encrypted
    encryptedNotification._encrypted = true;
    encryptedNotification._encryptedAt = new Date();

    return encryptedNotification;
  }

  /**
   * Decrypt notification content
   * @param {Object} notification - Encrypted notification object
   * @returns {Object} Notification with decrypted sensitive fields
   */
  decryptNotificationContent(notification) {
    if (!notification._encrypted) {
      return notification;
    }

    const decryptedNotification = { ...notification };
    
    // Find and decrypt all encrypted fields
    this.findAndDecryptFields(decryptedNotification);
    
    // Remove encryption markers
    delete decryptedNotification._encrypted;
    delete decryptedNotification._encryptedAt;

    return decryptedNotification;
  }

  /**
   * Hash sensitive data for indexing without exposing content
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} Hashed data
   */
  async hashForIndexing(data, salt = null) {
    if (!salt) {
      salt = await bcrypt.genSalt(this.saltRounds);
    }
    return await bcrypt.hash(data, salt);
  }

  /**
   * Verify hashed data
   * @param {string} data - Original data
   * @param {string} hash - Hash to verify against
   * @returns {boolean} Verification result
   */
  async verifyHash(data, hash) {
    return await bcrypt.compare(data, hash);
  }

  /**
   * Generate secure token for notification access
   * @param {Object} payload - Token payload
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {string} Secure token
   */
  generateSecureToken(payload, expiresIn = 3600) {
    const tokenData = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    const signature = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(token)
      .digest('hex');

    return `${token}.${signature}`;
  }

  /**
   * Verify secure token
   * @param {string} token - Token to verify
   * @returns {Object|null} Decoded payload or null if invalid
   */
  verifySecureToken(token) {
    try {
      const [tokenData, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.encryptionKey)
        .update(tokenData)
        .digest('hex');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode and verify expiration
      const payload = JSON.parse(Buffer.from(tokenData, 'base64').toString());
      
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expired
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper method to get nested object value
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path
   * @returns {*} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Helper method to set nested object value
   * @param {Object} obj - Object to modify
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Recursively find and decrypt encrypted fields
   * @param {Object} obj - Object to process
   */
  findAndDecryptFields(obj) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        if (obj[key].encrypted && obj[key].algorithm) {
          // This is an encrypted field
          try {
            const decrypted = this.decrypt(obj[key]);
            obj[key] = JSON.parse(decrypted);
          } catch (error) {
            console.error(`Failed to decrypt field ${key}:`, error.message);
          }
        } else {
          // Recursively process nested objects
          this.findAndDecryptFields(obj[key]);
        }
      }
    }
  }
}

export default NotificationEncryptionService;