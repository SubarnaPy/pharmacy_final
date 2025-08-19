import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import UserNotificationService from '../services/UserNotificationService.js';
import crypto from 'crypto';
import { 
  passwordUtils, 
  tokenUtils, 
  twoFactorUtils, 
  sessionUtils, 
  validationUtils 
} from '../utils/authUtils.js';
import AppError from '../utils/AppError.js';
import { sendEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';

/**
 * Helper function to map frontend working hours to backend operating hours format
 */
const mapWorkingHoursToOperatingHours = (workingHours) => {
  if (!workingHours) return null;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return days.map(day => {
    const dayData = workingHours[day];
    if (!dayData) {
      return { day, isOpen: false, openTime: '00:00', closeTime: '00:00' };
    }
    
    return {
      day,
      isOpen: !dayData.closed,
      openTime: dayData.open || '09:00',
      closeTime: dayData.close || '18:00'
    };
  });
};

/**
 * Register a new user
 */
export const register = async (req, res, next) => {
  try {
    console.log('Registration request body:', req.body);
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phoneNumber,
      dateOfBirth,
      address,
      pharmacyDetails,
      pharmacyInfo, // Add this to handle both field names
      preferences,
      profile
    } = req.body;

    // All validation is disabled. All fields are accepted as-is.
    // Only proceed to create user if no error occurs above.



    // Generate verification token using User instance method
    const tempUser = new User();
    const emailVerificationToken = tempUser.generateEmailVerificationToken();
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');
    
    
    console.log('[REGISTRATION DEBUG] Generated token:', emailVerificationToken);
    console.log('[REGISTRATION DEBUG] Hashed token:', hashedToken);
    console.log('[REGISTRATION DEBUG] Token expires:', tempUser.emailVerification.verificationExpires);

    // Create user data
    const userData = {
      email: email.toLowerCase(),
      password,
      role,
      profile: profile || {
        firstName: validationUtils.sanitizeInput(firstName),
        lastName: validationUtils.sanitizeInput(lastName),
        phone: phoneNumber,
        dateOfBirth,
        address
      },
      preferences: preferences || {},
      emailVerification: {
        isVerified: false,
        token: hashedToken,
        verificationExpires: tempUser.emailVerification.verificationExpires
      },
      passwordReset: {
        token: null,
        expires: null
      },
      loginAttempts: {
        count: 0,
        lockedUntil: null
      },
      twoFactorAuth: {
        enabled: false,
        secret: null,
        backupCodes: [],
        lastUsedAt: null
      },
      isActive: true
    };

    // Add pharmacy-specific data if role is pharmacy
    if (role === 'pharmacy' && (pharmacyDetails || pharmacyInfo)) {
      const pharmacyData = pharmacyDetails || pharmacyInfo;
      userData.pharmacyDetails = {
        pharmacyName: pharmacyData.pharmacyName,
        licenseNumber: pharmacyData.licenseNumber,
        verificationStatus: 'pending'
      };
    }

    let user;
    let pharmacy = null;
    
    try {
      console.log('[REGISTRATION DEBUG] Creating user with emailVerification:', userData.emailVerification);
      user = await User.create(userData);
      console.log('[REGISTRATION DEBUG] User created successfully with ID:', user._id);
      console.log('[REGISTRATION DEBUG] User emailVerification after save:', user.emailVerification);
      
      // Create Pharmacy document if role is pharmacy
      if (role === 'pharmacy' && (pharmacyDetails || pharmacyInfo)) {
        const pharmacyData = pharmacyDetails || pharmacyInfo;
        
        console.log('[REGISTRATION DEBUG] Creating pharmacy document for user:', user._id);
        console.log('[REGISTRATION DEBUG] Pharmacy address data:', pharmacyData.address);
        
        // Extract coordinates if provided
        let coordinates = [-74.006, 40.7128]; // Default NYC coordinates
        if (pharmacyData.address && pharmacyData.address.coordinates && Array.isArray(pharmacyData.address.coordinates)) {
          coordinates = pharmacyData.address.coordinates; // Already in [lng, lat] format
          console.log('[REGISTRATION DEBUG] Using provided coordinates:', coordinates);
        }
        
        // Create basic pharmacy document with required fields
        const pharmacyDoc = {
          name: pharmacyData.pharmacyName || 'Unnamed Pharmacy',
          owner: user._id,
          address: {
            street: pharmacyData.address?.street || pharmacyData.location?.street || '123 Main St',
            city: pharmacyData.address?.city || pharmacyData.location?.city || 'Unknown City',
            state: pharmacyData.address?.state || pharmacyData.location?.state || 'Unknown State',
            zipCode: pharmacyData.address?.zipCode || pharmacyData.location?.zipCode || '00000',
            country: pharmacyData.address?.country || 'United States'
          },
          location: {
            type: 'Point',
            coordinates: coordinates
          },
          contact: {
            phone: user.profile?.phone || '+1-555-000-0000',
            email: user.email,
            website: pharmacyData.website || ''
          },
          licenses: [{
            licenseNumber: pharmacyData.licenseNumber || 'TEMP-LICENSE',
            licenseType: pharmacyData.pharmacyType || 'retail',
            issuingAuthority: 'State Board of Pharmacy',
            issueDate: new Date(),
            expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year from now
            documentUrl: 'pending-upload',
            verificationStatus: 'pending'
          }],
          operatingHours: mapWorkingHoursToOperatingHours(pharmacyData.workingHours) || [
            { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
            { day: 'saturday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
            { day: 'sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
          ],
          services: pharmacyData.services || {
            prescription_filling: true,
            consultation: false,
            delivery: false,
            compound_medications: false,
            immunizations: false,
            health_screenings: false
          },
          deliveryZone: {
            radiusKm: pharmacyData.deliveryRadius || 15,
            deliveryFee: 0,
            minOrderAmount: 0,
            estimatedDeliveryTime: '2-4 hours'
          },
          insurance: {
            acceptedInsurances: pharmacyData.insuranceProviders || [],
            acceptedPayments: ['cash', 'credit_card', 'debit_card', 'insurance'],
            medicaidProvider: pharmacyData.acceptsInsurance || false,
            medicareProvider: pharmacyData.acceptsInsurance || false
          },
          staff: {
            pharmacists: [{
              name: pharmacyData.pharmacistName || user.profile?.firstName + ' ' + user.profile?.lastName || 'Unknown Pharmacist',
              licenseNumber: pharmacyData.licenseNumber || 'TEMP-LICENSE',
              specializations: pharmacyData.specializations || [],
              yearsExperience: 0
            }],
            totalStaff: 1
          },
          description: pharmacyData.pharmacyDescription || '',
          registrationStatus: 'draft'
        };
        
        pharmacy = await Pharmacy.create(pharmacyDoc);
        console.log('[REGISTRATION DEBUG] Pharmacy created successfully with ID:', pharmacy._id);
        
        // Update user with pharmacy reference
        user.pharmacy = pharmacy._id;
        await user.save();
        
        console.log('[REGISTRATION DEBUG] User updated with pharmacy reference:', pharmacy._id);
      }

      // Create Doctor document if role is doctor
      if (role === 'doctor' && profile?.doctorDetails) {
        const doctorData = profile.doctorDetails;
        
        console.log('[REGISTRATION DEBUG] Creating doctor profile for user:', user._id);
        console.log('[REGISTRATION DEBUG] Doctor data:', doctorData);
        
        // Import Doctor model
        const Doctor = (await import('../models/Doctor.js')).default;
        
        // Create basic doctor document with required fields
        const doctorDoc = {
          user: user._id,
          medicalLicense: {
            licenseNumber: doctorData.licenseNumber || 'TEMP-LICENSE',
            issuingAuthority: doctorData.issuingAuthority || 'Medical Board',
            issueDate: doctorData.licenseIssueDate ? new Date(doctorData.licenseIssueDate) : new Date(),
            expiryDate: doctorData.licenseExpiryDate ? new Date(doctorData.licenseExpiryDate) : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)),
            verificationStatus: 'pending',
            documentUrl: 'pending-upload'
          },
          specializations: doctorData.specializations || [],
          qualifications: doctorData.qualifications?.map(qual => ({
            degree: qual.degree || qual,
            institution: qual.institution || 'Unknown Institution',
            year: qual.year || new Date().getFullYear(),
            verificationStatus: 'pending'
          })) || [{
            degree: 'MD',
            institution: 'Unknown Institution',
            year: new Date().getFullYear(),
            verificationStatus: 'pending'
          }],
          experienceYears: doctorData.experienceYears || 0,
          consultationModes: doctorData.consultationModes?.map(mode => ({
            type: mode.type || mode,
            isActive: mode.isActive !== undefined ? mode.isActive : true,
            fee: mode.fee || 500, // Default fee in INR
            duration: mode.duration || 30 // Default 30 minutes
          })) || [
            { type: 'video', isActive: true, fee: 500, duration: 30 },
            { type: 'chat', isActive: true, fee: 300, duration: 30 }
          ],
          workingHours: doctorData.workingHours || {
            monday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
            tuesday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
            wednesday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
            thursday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
            friday: { isAvailable: true, slots: [{ start: '09:00', end: '17:00' }] },
            saturday: { isAvailable: true, slots: [{ start: '09:00', end: '13:00' }] },
            sunday: { isAvailable: false, slots: [] }
          },
          location: {
            clinicName: doctorData.clinicName || 'Private Practice',
            address: {
              street: doctorData.address?.street || address?.street || '123 Medical Center Dr',
              city: doctorData.address?.city || address?.city || 'Unknown City',
              state: doctorData.address?.state || address?.state || 'Unknown State',
              zipCode: doctorData.address?.zipCode || address?.zipCode || '00000',
              country: doctorData.address?.country || address?.country || 'India'
            },
            coordinates: doctorData.coordinates || [77.2090, 28.6139] // Default Delhi coordinates
          },
          bio: doctorData.bio || `Dr. ${user.profile?.firstName} ${user.profile?.lastName} is a dedicated healthcare professional committed to providing quality medical care.`,
          languages: doctorData.languages || ['English'],
          ratings: {
            average: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          },
          availability: {
            isAcceptingAppointments: true,
            nextAvailableSlot: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            bookingWindow: 30 // 30 days advance booking
          },
          verification: {
            isVerified: false,
            verificationLevel: 'basic',
            documentsSubmitted: false,
            backgroundCheckCompleted: false,
            medicalBoardVerified: false
          },
          registrationStatus: 'draft'
        };
        
        const doctor = await Doctor.create(doctorDoc);
        console.log('[REGISTRATION DEBUG] Doctor profile created successfully with ID:', doctor._id);
        
        // Update user with doctor reference (optional, for quick access)
        user.doctorProfile = doctor._id;
        await user.save();
        
        console.log('[REGISTRATION DEBUG] User updated with doctor profile reference:', doctor._id);
      }
      
    } catch (dbError) {
      console.error('Registration DB error:', dbError);
      return next(new AppError('Registration failed', 500));
    }

    // Generate tokens
    const accessToken = tokenUtils.generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    const refreshToken = tokenUtils.generateRefreshToken({
      userId: user._id,
      email: user.email
    });

    // Redis is removed; do not store refresh token in Redis.


    // Send verification email
    try {
      const emailData = {
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'emailVerification',
        data: {
          firstName: user.profile?.firstName,
          verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`
        }
      };
      const result = await sendEmail(emailData);
      if (!result) {
        console.log('Manual verification data:', emailData.data);
      }
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      console.log('Manual verification data:', {
        firstName: user.profile?.firstName,
        verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`
      });
    }


    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    if (userResponse.emailVerification) delete userResponse.emailVerification.token;
    if (userResponse.twoFactorAuth) delete userResponse.twoFactorAuth.secret;

    // Send welcome notification
    try {
      await UserNotificationService.sendWelcomeNotification(
        user._id,
        user.role,
        `${user.profile?.firstName} ${user.profile?.lastName}`.trim() || 'User'
      );
    } catch (notificationError) {
      console.error('⚠️ Failed to send welcome notification:', notificationError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    next(new AppError('Registration failed', 500));
  }
};

/**
 * User login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, twoFactorCode, rememberMe = false } = req.body;
    console.log('[LOGIN DEBUG] Incoming login request:', { email, hasPassword: !!password, hasTwoFactorCode: !!twoFactorCode });

    // Validate input
    if (!email || !password) {
      console.warn('[LOGIN DEBUG] Missing email or password');
      return next(new AppError('Email and password are required', 400));
    }

    if (!validationUtils.isValidEmail(email)) {
      console.warn('[LOGIN DEBUG] Invalid email format:', email);
      return next(new AppError('Invalid email format', 400));
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('doctorProfile');
    if (!user) {
      console.warn('[LOGIN DEBUG] No user found for email:', email);
      return next(new AppError('Invalid email or password', 401));
    }


    // Check if account is locked
    if (user.loginAttempts && user.loginAttempts.lockedUntil && user.loginAttempts.lockedUntil > Date.now()) {
      console.warn('[LOGIN DEBUG] Account is locked for user:', email);
      return next(new AppError('Account temporarily locked due to too many failed login attempts', 423));
    }


    // Verify password
    const isPasswordValid = await passwordUtils.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn('[LOGIN DEBUG] Invalid password for user:', email);
      // Increment login attempts
      if (user.incrementLoginAttempts) await user.incrementLoginAttempts();
      return next(new AppError('Invalid email or password', 401));
    }


    // Check if email is verified
    if (!user.emailVerification || !user.emailVerification.isVerified) {
      console.warn('[LOGIN DEBUG] Email not verified for user:', email);
      return next(new AppError('Please verify your email address before logging in. Check your inbox for verification link.', 403));
    }

    // Check if account is active
    if (!user.isActive) {
      console.warn('[LOGIN DEBUG] Account is disabled for user:', email);
      return next(new AppError('Account is disabled. Please contact support.', 403));
    }


    // Check 2FA if enabled
    if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
      if (!twoFactorCode) {
        console.log('[LOGIN DEBUG] 2FA required for user:', email);
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          message: 'Two-factor authentication code required'
        });
      }

      // Verify 2FA code
      const isTwoFactorValid = twoFactorUtils.verifyToken(twoFactorCode, user.twoFactorAuth.secret);
      if (!isTwoFactorValid) {
        // Check if it's a backup code
        const backupCodeIndex = user.twoFactorAuth.backupCodes.findIndex(
          code => code === twoFactorCode
        );
        if (backupCodeIndex === -1) {
          console.warn('[LOGIN DEBUG] Invalid 2FA code for user:', email);
          if (user.incrementLoginAttempts) await user.incrementLoginAttempts();
          return next(new AppError('Invalid two-factor authentication code', 401));
        }
        // Mark backup code as used (if you want to track usage, update logic here)
        // user.twoFactorAuth.backupCodes.splice(backupCodeIndex, 1); // Optionally remove used code
        console.log('[LOGIN DEBUG] Backup 2FA code used for user:', email);
      }
    }

    // Generate tokens for successful login
    const accessToken = tokenUtils.generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    const refreshToken = tokenUtils.generateRefreshToken({
      userId: user._id,
      email: user.email
    });

    // ...existing code... (removed Redis refresh token storage)
console.log(user,"-------------");

    // Reset login attempts on successful login
    if (user.resetLoginAttempts) await user.resetLoginAttempts();
    user.lastActiveAt = new Date();
    await user.save();


    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    if (userResponse.emailVerification) delete userResponse.emailVerification.token;
    if (userResponse.twoFactorAuth) delete userResponse.twoFactorAuth.secret;

    console.log('[LOGIN DEBUG] Login successful for user:', email);

    // Trigger successful login notification
    if (req.notify) {
      await req.notify.trigger('user.login_success', {
        userId: user._id,
        email: user.email,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`,
        loginAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(new AppError('Login failed', 500));
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    // Verify refresh token
    const decoded = tokenUtils.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return next(new AppError('Invalid token type', 401));
    }

    // ...existing code... (removed Redis refresh token check)

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return next(new AppError('User not found or inactive', 401));
    }

    // Generate new access token
    const newAccessToken = tokenUtils.generateAccessToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Update last active time
    user.lastActiveAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    next(new AppError('Token refresh failed', 401));
  }
};

/**
 * User logout
 */
export const logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // ...existing code... (removed Redis refresh token deletion)

    // You could also blacklist the access token here if needed
    // For now, we'll rely on the client to discard it

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    next(new AppError('Logout failed', 500));
  }
};

/**
 * Verify email address
 */

export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.headers['x-verification-token'];

    console.log('[VERIFY DEBUG] Incoming email verification request');
    console.log('[VERIFY DEBUG] Received token:', token);

    if (!token) {
      console.warn('[VERIFY DEBUG] No verification token provided in query or headers');
      return next(new AppError('Verification token is required', 400));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    console.log('[VERIFY DEBUG] Hashed token:', hashedToken);

    // First, try to find user with matching token (regardless of verification status)
    console.log('[VERIFY DEBUG] Searching for user with token...');
    let user = await User.findOne({
      $or: [
        {
          'emailVerification.token': hashedToken,
          'emailVerification.verificationExpires': { $gt: Date.now() }
        },
        {
          'emailVerification.token': hashedToken,
          'emailVerification.isVerified': true
        }
      ]
    });
    
    console.log('[VERIFY DEBUG] User found with token search:', !!user);
    
    if (!user) {
      console.log('[VERIFY DEBUG] No user found with token, searching all users with verification tokens...');
      const allUsersWithTokens = await User.find({
        'emailVerification.token': { $exists: true }
      }).select('email emailVerification');
      
      console.log('[VERIFY DEBUG] Users with verification tokens:', allUsersWithTokens.length);
      allUsersWithTokens.forEach((u, index) => {
        console.log(`[VERIFY DEBUG] User ${index + 1}:`, {
          email: u.email,
          token: u.emailVerification?.token,
          expires: u.emailVerification?.verificationExpires,
          isVerified: u.emailVerification?.isVerified
        });
      });
    }

    // If not found with token, try to find recently verified user (token might have been cleared)
    if (!user) {
      console.log('[VERIFY DEBUG] No user found with token, checking for recently verified users');
      // Check if there's a user who was recently verified (within last 10 minutes)
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      user = await User.findOne({
        'emailVerification.isVerified': true,
        'emailVerification.verifiedAt': { $gt: new Date(tenMinutesAgo) }
      });
      
      if (user) {
        console.log('[VERIFY DEBUG] Found recently verified user:', user.email);
        return res.status(200).json({
          success: true,
          message: 'Email is already verified.',
        });
      }
    }

    if (!user) {
      console.warn('[VERIFY DEBUG] No user found with valid verification token or token expired');
      console.warn('[VERIFY DEBUG] Token may be invalid or expired:', token);
      return next(new AppError('Invalid or expired verification token', 400));
    }

    console.log('[VERIFY DEBUG] User found for token:', user.email);

    if (user.emailVerification.isVerified) {
      console.log('[VERIFY DEBUG] Email already verified for user:', user.email);
      return res.status(200).json({
        success: true,
        message: 'Email is already verified.',
      });
    }

    // Mark email as verified and clear token
    user.emailVerification.isVerified = true;
    user.emailVerification.token = undefined;
    user.emailVerification.verificationExpires = undefined;
    user.emailVerification.verifiedAt = new Date(); // Add verification timestamp
    await user.save();

    console.log('[VERIFY DEBUG] Email verification completed for user:', user.email);

    // Send verification completion notification
    try {
      await UserNotificationService.sendAccountVerificationComplete(
        user._id,
        user.role,
        `${user.profile?.firstName} ${user.profile?.lastName}`.trim() || 'User'
      );
    } catch (notificationError) {
      console.error('⚠️ Failed to send verification completion notification:', notificationError.message);
    }

    // Trigger account verification notification
    if (req.notify) {
      await req.notify.trigger('user.verified', {
        userId: user._id,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`,
        email: user.email,
        role: user.role,
        verifiedAt: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
    });

  } catch (error) {
    console.error('[VERIFY DEBUG] Email verification process failed:', error);
    return next(new AppError('Email verification failed', 500));
  }
};

/**
 * Resend email verification
 */
export const resendEmailVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    console.log('[VERIFICATION DEBUG] Incoming request to resend verification email for:', email);

    if (!email) {
      console.warn('[VERIFICATION DEBUG] Missing email in request');
      return next(new AppError('Email is required', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.warn('[VERIFICATION DEBUG] No user found with email:', email);
      return next(new AppError('User not found', 404));
    }

    if (user.emailVerification && user.emailVerification.isVerified) {
      console.log('[VERIFICATION DEBUG] Email already verified for user:', email);
      return next(new AppError('Email is already verified', 400));
    }

    // Generate new token using User instance method
    const emailVerificationToken = user.generateEmailVerificationToken();
    const hashedToken = crypto.createHash('sha256').update(emailVerificationToken).digest('hex');

    user.emailVerification.token = hashedToken;
    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
    console.log('[VERIFICATION DEBUG] Generated verification link:', verificationLink);

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'emailVerification',
        data: {
          firstName: user.profile?.firstName,
          verificationLink
        }
      });

      console.log('[VERIFICATION DEBUG] Verification email sent to:', user.email);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });

    } catch (emailError) {
      console.error('[VERIFICATION DEBUG] Failed to send email:', emailError);
      console.log('[VERIFICATION DEBUG] Fallback: verification link for user:', verificationLink);

      return res.status(200).json({
        success: true,
        message: 'Verification email sending failed, but token was generated',
        verificationLink // optional: you can omit this in production
      });
    }

  } catch (error) {
    console.error('[VERIFICATION DEBUG] Unexpected error:', error);
    next(new AppError('Failed to resend verification email', 500));
  }
};


/**
 * Request password reset
 */
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError('Email is required', 400));
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal whether email exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }


    // Generate password reset token using User instance method
    const passwordResetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'passwordReset',
      data: {
        firstName: user.profile?.firstName,
        resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${passwordResetToken}`
      }
    });

    // Trigger password reset notification
    if (req.notify) {
      await req.notify.trigger('password.reset_requested', {
        userId: user._id,
        email: user.email,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`,
        requestedAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    next(new AppError('Failed to process password reset request', 500));
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new AppError('Token and new password are required', 400));
    }

    // Validate new password
    const passwordValidation = passwordUtils.validate(newPassword);
    if (!passwordValidation.isValid) {
      return next(new AppError(passwordValidation.errors.join(', '), 400));
    }


    // Find user with valid reset token
    const user = await User.findOne({
      'passwordReset.token': token,
      'passwordReset.expires': { $gt: new Date() }
    });

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    // Hash new password and update user
    user.password = newPassword; // Will be hashed by the pre-save middleware
    user.passwordReset.token = null;
    user.passwordReset.expires = null;
    user.passwordChangedAt = new Date();
    
    // Reset login attempts if account was locked
    if (user.resetLoginAttempts) await user.resetLoginAttempts();
    
    await user.save();

    // Send password reset success notification
    try {
      await UserNotificationService.sendPasswordResetSuccessful(
        user._id,
        user.role,
        `${user.profile?.firstName} ${user.profile?.lastName}`.trim() || 'User'
      );
    } catch (notificationError) {
      console.error('⚠️ Failed to send password reset notification:', notificationError.message);
    }

    // Trigger password reset success notification
    if (req.notify) {
      await req.notify.trigger('password.reset_completed', {
        userId: user._id,
        email: user.email,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`,
        resetAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress
      });
    }

    // ...existing code... (removed Redis refresh token deletion)

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    next(new AppError('Password reset failed', 500));
  }
};

/**
 * Change password (for authenticated users)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Current password and new password are required', 400));
    }

    // Validate new password
    const passwordValidation = passwordUtils.validate(newPassword);
    if (!passwordValidation.isValid) {
      return next(new AppError(passwordValidation.errors.join(', '), 400));
    }

    // Find user and include password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await passwordUtils.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return next(new AppError('Current password is incorrect', 400));
    }

    // Check if new password is different from current
    const isSamePassword = await passwordUtils.compare(newPassword, user.password);

    if (isSamePassword) {
      return next(new AppError('New password must be different from current password', 400));
    }

    // Update password
    user.password = newPassword; // Will be hashed by the pre-save middleware
    user.passwordChangedAt = new Date();
    await user.save();

    // Trigger password change notification
    if (req.notify) {
      await req.notify.trigger('password.changed', {
        userId: user._id,
        email: user.email,
        name: `${user.profile?.firstName} ${user.profile?.lastName}`,
        changedAt: new Date(),
        ipAddress: req.ip || req.connection.remoteAddress
      });
    }

    // ...existing code... (removed Redis refresh token deletion)

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    next(new AppError('Password change failed', 500));
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendEmailVerification,
  requestPasswordReset,
  resetPassword,
  changePassword
};
