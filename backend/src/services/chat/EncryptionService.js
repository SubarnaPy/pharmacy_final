import crypto from 'crypto';

/**
 * Encryption Service for Chat Messages
 * Provides encryption/decryption for sensitive medical data
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    
    // Get encryption key from environment or generate
    this.encryptionKey = this.getOrGenerateKey();
    
    console.log('🔐 Encryption Service initialized');
  }

  /**
   * Get encryption key from environment or generate new one
   * @returns {Buffer} - Encryption key
   */
  getOrGenerateKey() {
    const envKey = process.env.CHAT_ENCRYPTION_KEY;
    
    if (envKey) {
      // Convert hex string to buffer
      return Buffer.from(envKey, 'hex');
    }
    
    // Generate new key (should be stored securely in production)
    const key = crypto.randomBytes(this.keyLength);
    console.warn('⚠️ Generated new encryption key. Store this securely:', key.toString('hex'));
    return key;
  }

  /**
   * Encrypt sensitive message content
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text with metadata
   */
  encrypt(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text to encrypt');
      }

      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const result = {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        encrypted: encrypted,
        algorithm: this.algorithm
      };
      
      // Return as base64 encoded JSON string
      return Buffer.from(JSON.stringify(result)).toString('base64');
      
    } catch (error) {
      console.error('❌ Encryption failed:', error.message);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted message content
   * @param {string} encryptedData - Encrypted data string
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data');
      }

      // Parse the encrypted data
      const dataObj = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      const { iv, tag, encrypted, algorithm } = dataObj;
      
      if (!iv || !tag || !encrypted || algorithm !== this.algorithm) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Create decipher
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt file content for sensitive documents
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Object} - Encrypted file data
   */
  encryptFile(fileBuffer) {
    try {
      if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('Invalid file buffer');
      }

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt the file
      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm,
        originalSize: fileBuffer.length
      };
      
    } catch (error) {
      console.error('❌ File encryption failed:', error.message);
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted file content
   * @param {Object} encryptedFileData - Encrypted file data
   * @returns {Buffer} - Decrypted file buffer
   */
  decryptFile(encryptedFileData) {
    try {
      const { encryptedData, iv, tag, algorithm, originalSize } = encryptedFileData;
      
      if (!encryptedData || !iv || !tag || algorithm !== this.algorithm) {
        throw new Error('Invalid encrypted file data');
      }
      
      // Create decipher
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      // Decrypt the file
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      // Verify size if provided
      if (originalSize && decrypted.length !== originalSize) {
        console.warn('⚠️ Decrypted file size mismatch');
      }
      
      return decrypted;
      
    } catch (error) {
      console.error('❌ File decryption failed:', error.message);
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate hash for data integrity verification
   * @param {string} data - Data to hash
   * @returns {string} - SHA-256 hash
   */
  generateHash(data) {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error('❌ Hash generation failed:', error.message);
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }

  /**
   * Verify data integrity using hash
   * @param {string} data - Original data
   * @param {string} hash - Expected hash
   * @returns {boolean} - Whether hash matches
   */
  verifyHash(data, hash) {
    try {
      const computedHash = this.generateHash(data);
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch (error) {
      console.error('❌ Hash verification failed:', error.message);
      return false;
    }
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} - Random token
   */
  generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      console.error('❌ Token generation failed:', error.message);
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Encrypt sensitive metadata
   * @param {Object} metadata - Metadata object
   * @returns {string} - Encrypted metadata
   */
  encryptMetadata(metadata) {
    try {
      const metadataString = JSON.stringify(metadata);
      return this.encrypt(metadataString);
    } catch (error) {
      console.error('❌ Metadata encryption failed:', error.message);
      throw new Error(`Metadata encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt metadata
   * @param {string} encryptedMetadata - Encrypted metadata
   * @returns {Object} - Decrypted metadata object
   */
  decryptMetadata(encryptedMetadata) {
    try {
      const decryptedString = this.decrypt(encryptedMetadata);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('❌ Metadata decryption failed:', error.message);
      throw new Error(`Metadata decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt prescription data with additional security
   * @param {Object} prescriptionData - Prescription data
   * @returns {string} - Encrypted prescription data
   */
  encryptPrescriptionData(prescriptionData) {
    try {
      // Add timestamp and hash for additional security
      const dataWithMetadata = {
        ...prescriptionData,
        encryptedAt: new Date().toISOString(),
        dataHash: this.generateHash(JSON.stringify(prescriptionData))
      };
      
      return this.encrypt(JSON.stringify(dataWithMetadata));
    } catch (error) {
      console.error('❌ Prescription encryption failed:', error.message);
      throw new Error(`Prescription encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt and verify prescription data
   * @param {string} encryptedPrescriptionData - Encrypted prescription data
   * @returns {Object} - Decrypted and verified prescription data
   */
  decryptPrescriptionData(encryptedPrescriptionData) {
    try {
      const decryptedString = this.decrypt(encryptedPrescriptionData);
      const dataWithMetadata = JSON.parse(decryptedString);
      
      const { encryptedAt, dataHash, ...prescriptionData } = dataWithMetadata;
      
      // Verify data integrity
      const computedHash = this.generateHash(JSON.stringify(prescriptionData));
      if (dataHash && !this.verifyHash(JSON.stringify(prescriptionData), dataHash)) {
        throw new Error('Prescription data integrity check failed');
      }
      
      // Check encryption age (optional security measure)
      if (encryptedAt) {
        const encryptionDate = new Date(encryptedAt);
        const daysSinceEncryption = (Date.now() - encryptionDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceEncryption > 365) { // 1 year
          console.warn('⚠️ Prescription data is over 1 year old');
        }
      }
      
      return prescriptionData;
    } catch (error) {
      console.error('❌ Prescription decryption failed:', error.message);
      throw new Error(`Prescription decryption failed: ${error.message}`);
    }
  }

  /**
   * Create encrypted backup of key data
   * @param {Object} data - Data to backup
   * @param {string} backupPassword - Password for backup encryption
   * @returns {string} - Encrypted backup
   */
  createEncryptedBackup(data, backupPassword) {
    try {
      // Use PBKDF2 to derive key from password
      const salt = crypto.randomBytes(16);
      const backupKey = crypto.pbkdf2Sync(backupPassword, salt, 100000, 32, 'sha256');
      
      // Encrypt data with backup key
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, backupKey, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      const backup = {
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        encrypted: encrypted,
        algorithm: this.algorithm,
        iterations: 100000
      };
      
      return Buffer.from(JSON.stringify(backup)).toString('base64');
    } catch (error) {
      console.error('❌ Backup encryption failed:', error.message);
      throw new Error(`Backup encryption failed: ${error.message}`);
    }
  }

  /**
   * Restore data from encrypted backup
   * @param {string} encryptedBackup - Encrypted backup string
   * @param {string} backupPassword - Password for backup decryption
   * @returns {Object} - Restored data
   */
  restoreFromEncryptedBackup(encryptedBackup, backupPassword) {
    try {
      const backup = JSON.parse(Buffer.from(encryptedBackup, 'base64').toString('utf8'));
      const { salt, iv, tag, encrypted, algorithm, iterations } = backup;
      
      if (algorithm !== this.algorithm) {
        throw new Error('Unsupported backup algorithm');
      }
      
      // Derive key from password
      const backupKey = crypto.pbkdf2Sync(
        backupPassword, 
        Buffer.from(salt, 'hex'), 
        iterations, 
        32, 
        'sha256'
      );
      
      // Decrypt backup
      const decipher = crypto.createDecipher(algorithm, backupKey, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('❌ Backup restoration failed:', error.message);
      throw new Error(`Backup restoration failed: ${error.message}`);
    }
  }

  /**
   * Test encryption/decryption functionality
   * @returns {boolean} - Whether test passed
   */
  testEncryption() {
    try {
      const testData = 'This is a test message for encryption';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      const success = testData === decrypted;
      console.log(success ? '✅ Encryption test passed' : '❌ Encryption test failed');
      return success;
    } catch (error) {
      console.error('❌ Encryption test failed:', error.message);
      return false;
    }
  }

  /**
   * Get encryption service statistics
   * @returns {Object} - Service statistics
   */
  getStatistics() {
    return {
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      ivLength: this.ivLength,
      tagLength: this.tagLength,
      isInitialized: !!this.encryptionKey,
      selfTestPassed: this.testEncryption()
    };
  }
}

export default EncryptionService;
