// Data Encryption and Security Utilities
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { promisify } from 'util';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATION_COUNT = 100000;

// Key derivation function
const deriveKey = async (password, salt) => {
  const pbkdf2 = promisify(crypto.pbkdf2);
  return await pbkdf2(password, salt, ITERATION_COUNT, 32, 'sha512');
};

// Secure random string generation
export const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate cryptographically secure UUID
export const generateSecureUUID = () => {
  return crypto.randomUUID();
};

// Password hashing with bcrypt
export const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Password verification
export const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Encrypt sensitive data
export const encryptData = async (data, masterKey = process.env.ENCRYPTION_KEY) => {
  try {
    if (!masterKey) {
      throw new Error('Encryption key not provided');
    }
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from master key and salt
    const key = await deriveKey(masterKey, salt);
    
    // Create cipher
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(salt); // Additional authenticated data
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine all components
    const result = Buffer.concat([salt, iv, tag, encrypted]);
    
    return {
      encrypted: result.toString('base64'),
      algorithm: ALGORITHM,
      keyDerivation: 'pbkdf2',
      iterations: ITERATION_COUNT
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

// Decrypt sensitive data
export const decryptData = async (encryptedData, masterKey = process.env.ENCRYPTION_KEY) => {
  try {
    if (!masterKey) {
      throw new Error('Decryption key not provided');
    }
    
    if (typeof encryptedData === 'string') {
      encryptedData = { encrypted: encryptedData };
    }
    
    // Parse encrypted data
    const buffer = Buffer.from(encryptedData.encrypted, 'base64');
    
    // Extract components
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from master key and salt
    const key = await deriveKey(masterKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

// Encrypt field in database document
export const encryptField = async (value, fieldName = 'default') => {
  if (!value) return value;
  
  const encryptionKey = process.env.FIELD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  const encrypted = await encryptData(value, encryptionKey);
  
  return {
    ...encrypted,
    field: fieldName,
    encrypted: true
  };
};

// Decrypt field from database document
export const decryptField = async (encryptedField, fieldName = 'default') => {
  if (!encryptedField || !encryptedField.encrypted) {
    return encryptedField;
  }
  
  const encryptionKey = process.env.FIELD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  return await decryptData(encryptedField, encryptionKey);
};

// Hash sensitive identifiers (for indexing)
export const hashIdentifier = (identifier, salt = process.env.IDENTIFIER_SALT) => {
  if (!salt) {
    throw new Error('Identifier salt not provided');
  }
  
  return crypto.createHash('sha256')
    .update(identifier + salt)
    .digest('hex');
};

// Generate HMAC for data integrity
export const generateHMAC = (data, secret = process.env.HMAC_SECRET) => {
  if (!secret) {
    throw new Error('HMAC secret not provided');
  }
  
  return crypto.createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
};

// Verify HMAC
export const verifyHMAC = (data, hmac, secret = process.env.HMAC_SECRET) => {
  const expectedHMAC = generateHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHMAC));
};

// Secure token generation for reset tokens, verification codes, etc.
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate time-based one-time password (TOTP) secret
export const generateTOTPSecret = () => {
  return crypto.randomBytes(20).toString('base32');
};

// Encrypt file contents
export const encryptFile = async (filePath, outputPath, password) => {
  const fs = await import('fs');
  const stream = await import('stream');
  const { pipeline } = stream;
  
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);
  
  const cipher = crypto.createCipher(ALGORITHM, key);
  
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(outputPath);
    
    // Write salt and IV to the beginning of the file
    output.write(salt);
    output.write(iv);
    
    pipeline(input, cipher, output, (error) => {
      if (error) {
        reject(new Error(`File encryption failed: ${error.message}`));
      } else {
        resolve({
          success: true,
          salt: salt.toString('hex'),
          iv: iv.toString('hex')
        });
      }
    });
  });
};

// Decrypt file contents
export const decryptFile = async (filePath, outputPath, password) => {
  const fs = await import('fs');
  const stream = await import('stream');
  const { pipeline } = stream;
  
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    
    // Read salt and IV from the beginning of the file
    const saltBuffer = Buffer.alloc(SALT_LENGTH);
    const ivBuffer = Buffer.alloc(IV_LENGTH);
    
    input.read(saltBuffer);
    input.read(ivBuffer);
    
    deriveKey(password, saltBuffer)
      .then(key => {
        const decipher = crypto.createDecipher(ALGORITHM, key);
        const output = fs.createWriteStream(outputPath);
        
        pipeline(input, decipher, output, (error) => {
          if (error) {
            reject(new Error(`File decryption failed: ${error.message}`));
          } else {
            resolve({ success: true });
          }
        });
      })
      .catch(reject);
  });
};

// Secure data wiping (overwrite with random data)
export const secureWipe = async (filePath, passes = 3) => {
  const fs = await import('fs');
  
  try {
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;
    
    for (let i = 0; i < passes; i++) {
      const randomData = crypto.randomBytes(fileSize);
      await fs.promises.writeFile(filePath, randomData);
    }
    
    // Finally, delete the file
    await fs.promises.unlink(filePath);
    return { success: true, passes };
  } catch (error) {
    throw new Error(`Secure wipe failed: ${error.message}`);
  }
};

// Generate cryptographic hash of file
export const hashFile = async (filePath, algorithm = 'sha256') => {
  const fs = await import('fs');
  const hash = crypto.createHash(algorithm);
  
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Encrypt database connection string
export const encryptConnectionString = async (connectionString) => {
  const key = process.env.DB_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  return await encryptData(connectionString, key);
};

// Decrypt database connection string
export const decryptConnectionString = async (encryptedConnectionString) => {
  const key = process.env.DB_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  return await decryptData(encryptedConnectionString, key);
};

// Generate API key with metadata
export const generateAPIKey = (metadata = {}) => {
  const keyData = {
    key: generateSecureRandom(32),
    created: new Date().toISOString(),
    version: '1',
    ...metadata
  };
  
  const signature = generateHMAC(keyData);
  
  return {
    apiKey: keyData.key,
    signature,
    metadata: keyData
  };
};

// Validate API key signature
export const validateAPIKeySignature = (keyData, signature) => {
  return verifyHMAC(keyData, signature);
};

// Key rotation utilities
export const rotateEncryptionKey = async (oldKey, newKey) => {
  // This would be used to re-encrypt data with a new key
  // Implementation depends on specific use case
  console.log('Key rotation process initiated');
  return {
    success: true,
    rotatedAt: new Date().toISOString(),
    oldKeyHash: crypto.createHash('sha256').update(oldKey).digest('hex').substring(0, 8),
    newKeyHash: crypto.createHash('sha256').update(newKey).digest('hex').substring(0, 8)
  };
};

// Secure memory cleanup
export const clearSensitiveData = (obj) => {
  if (typeof obj === 'string') {
    // Overwrite string with random data (best effort)
    return crypto.randomBytes(obj.length).toString('hex');
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        obj[key] = crypto.randomBytes(obj[key].length).toString('hex');
      } else if (typeof obj[key] === 'object') {
        clearSensitiveData(obj[key]);
      }
      delete obj[key];
    });
  }
};

export default {
  generateSecureRandom,
  generateSecureUUID,
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  encryptField,
  decryptField,
  hashIdentifier,
  generateHMAC,
  verifyHMAC,
  generateSecureToken,
  generateTOTPSecret,
  encryptFile,
  decryptFile,
  secureWipe,
  hashFile,
  encryptConnectionString,
  decryptConnectionString,
  generateAPIKey,
  validateAPIKeySignature,
  rotateEncryptionKey,
  clearSensitiveData
};
