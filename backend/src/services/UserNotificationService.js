import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';

/**
 * Centralized User Notification Service
 * Handles notifications between different user roles
 */
class UserNotificationService {
  
  /**
   * Send notification to specific user
   */
  static async sendNotification(userId, userRole, notificationData) {
    try {
      const notification = new Notification({
        type: notificationData.type,
        category: notificationData.category || 'info',
        priority: notificationData.priority || 'normal',
        recipients: [{
          userId,
          userRole,
          deliveryChannels: ['websocket'],
          deliveryStatus: {
            websocket: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        }],
        content: {
          title: notificationData.title,
          message: notificationData.message,
          actionUrl: notificationData.actionUrl,
          actionText: notificationData.actionText
        },
        relatedEntities: notificationData.relatedEntities || [],
        analytics: {
          totalRecipients: 1,
          deliveredCount: 1
        }
      });
      
      await notification.save();
      return notification;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Appointment/Consultation Notifications
   */
  static async sendAppointmentBooked(consultation, patientUser, doctorUser) {
    const notifications = [];
    
    // To Patient
    notifications.push(this.sendNotification(consultation.patientId, 'patient', {
      type: 'doctor_booking_confirmed',
      category: 'medical',
      priority: 'high',
      title: 'Appointment Booked Successfully',
      message: `Your appointment with Dr. ${doctorUser?.name || 'Doctor'} has been confirmed for ${consultation.date} at ${consultation.time}.`,
      actionUrl: `/consultations/${consultation._id}`,
      actionText: 'View Appointment',
      relatedEntities: [{ entityType: 'appointment', entityId: consultation._id }]
    }));
    
    // To Doctor
    notifications.push(this.sendNotification(doctorUser._id, 'doctor', {
      type: 'doctor_new_appointment',
      category: 'medical',
      priority: 'high',
      title: 'New Appointment Booked',
      message: `${patientUser?.name || 'A patient'} has booked an appointment with you for ${consultation.date} at ${consultation.time}.`,
      actionUrl: `/doctor/appointments/${consultation._id}`,
      actionText: 'View Appointment',
      relatedEntities: [{ entityType: 'appointment', entityId: consultation._id }]
    }));
    
    await Promise.all(notifications);
  }

  static async sendAppointmentCancelled(consultation, patientUser, doctorUser, cancelledBy) {
    const notifications = [];
    
    if (cancelledBy === 'patient') {
      // Notify Doctor
      notifications.push(this.sendNotification(doctorUser._id, 'doctor', {
        type: 'doctor_appointment_cancelled',
        category: 'medical',
        priority: 'high',
        title: 'Appointment Cancelled',
        message: `${patientUser?.name || 'Patient'} has cancelled their appointment scheduled for ${consultation.date} at ${consultation.time}.`,
        actionUrl: `/doctor/appointments`,
        actionText: 'View Appointments',
        relatedEntities: [{ entityType: 'appointment', entityId: consultation._id }]
      }));
      
      // Confirmation to Patient
      notifications.push(this.sendNotification(consultation.patientId, 'patient', {
        type: 'appointment_cancelled',
        category: 'medical',
        priority: 'medium',
        title: 'Appointment Cancelled',
        message: `Your appointment with Dr. ${doctorUser?.name || 'Doctor'} has been cancelled successfully.`,
        actionUrl: `/consultations`,
        actionText: 'View History',
        relatedEntities: [{ entityType: 'appointment', entityId: consultation._id }]
      }));
    } else {
      // Notify Patient
      notifications.push(this.sendNotification(consultation.patientId, 'patient', {
        type: 'appointment_cancelled',
        category: 'medical',
        priority: 'high',
        title: 'Appointment Cancelled by Doctor',
        message: `Dr. ${doctorUser?.name || 'Doctor'} has cancelled your appointment scheduled for ${consultation.date} at ${consultation.time}.`,
        actionUrl: `/consultations`,
        actionText: 'Book New Appointment',
        relatedEntities: [{ entityType: 'appointment', entityId: consultation._id }]
      }));
    }
    
    await Promise.all(notifications);
  }

  /**
   * Prescription Notifications
   */
  static async sendPrescriptionUploaded(prescriptionId, patientId, patientName) {
    const notifications = [];
    
    // To Patient
    notifications.push(this.sendNotification(patientId, 'patient', {
      type: 'patient_prescription_uploaded',
      category: 'medical',
      priority: 'medium',
      title: 'Prescription Uploaded Successfully',
      message: 'Your prescription has been uploaded and is being processed by pharmacies.',
      actionUrl: `/prescriptions/${prescriptionId}`,
      actionText: 'View Prescription',
      relatedEntities: [{ entityType: 'prescription', entityId: prescriptionId }]
    }));
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendPrescriptionToPharmacies(prescriptionId, targetPharmacies, patientName) {
    const notifications = [];
    
    // Notify each target pharmacy
    for (const pharmacyId of targetPharmacies) {
      const pharmacy = await Pharmacy.findById(pharmacyId).populate('owner', 'name');
      if (pharmacy && pharmacy.owner) {
        notifications.push(this.sendNotification(pharmacy.owner._id, 'pharmacy', {
          type: 'pharmacy_prescription_request',
          category: 'medical',
          priority: 'medium',
          title: 'New Prescription Request',
          message: `New prescription request from ${patientName}. Please review and respond.`,
          actionUrl: `/pharmacy/prescriptions/${prescriptionId}`,
          actionText: 'Review Prescription',
          relatedEntities: [{ entityType: 'prescription', entityId: prescriptionId }]
        }));
      }
    }
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendPrescriptionResponse(prescriptionId, patientId, pharmacyName, responseType) {
    const notifications = [];
    
    let title, message, priority;
    
    if (responseType === 'accepted') {
      title = 'Pharmacy Response Received';
      message = `${pharmacyName} has accepted your prescription request and provided a quote.`;
      priority = 'high';
    } else if (responseType === 'partial') {
      title = 'Partial Pharmacy Response';
      message = `${pharmacyName} has partially fulfilled your prescription request.`;
      priority = 'medium';
    } else {
      title = 'Pharmacy Response Received';
      message = `${pharmacyName} has responded to your prescription request.`;
      priority = 'medium';
    }
    
    notifications.push(this.sendNotification(patientId, 'patient', {
      type: 'prescription_response_received',
      category: 'medical',
      priority: priority,
      title: title,
      message: message,
      actionUrl: `/prescription/${prescriptionId}`,
      actionText: 'View Response',
      relatedEntities: [{ entityType: 'prescription', entityId: prescriptionId }]
    }));
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendPharmacyResponseSubmitted(prescriptionId, pharmacyUserId, pharmacyName, patientName) {
    return this.sendNotification(pharmacyUserId, 'pharmacy', {
      type: 'pharmacy_response_submitted',
      category: 'medical',
      priority: 'medium',
      title: 'Response Submitted',
      message: `Your response to ${patientName}'s prescription request has been submitted successfully.`,
      actionUrl: `/pharmacy/prescription/${prescriptionId}`,
      actionText: 'View Details',
      relatedEntities: [{ entityType: 'prescription', entityId: prescriptionId }]
    });
  }

  // Legacy method for backward compatibility
  static async sendNewPrescriptionToPharmacy(prescriptionId, pharmacyUserId, patientName) {
    return this.sendNotification(pharmacyUserId, 'pharmacy', {
      type: 'prescription_request',
      category: 'medical',
      priority: 'medium',
      title: 'New Prescription Request',
      message: `New prescription request from ${patientName}. Please review and respond.`,
      actionUrl: `/pharmacy/prescription/${prescriptionId}`,
      actionText: 'Review Prescription',
      relatedEntities: [{ entityType: 'prescription', entityId: prescriptionId }]
    });
  }

  /**
   * Order Notifications
   */
  static async sendOrderPlaced(orderId, patientId, patientName, pharmacyUserId, pharmacyName, orderTotal) {
    const notifications = [];
    
    // To Patient
    notifications.push(this.sendNotification(patientId, 'patient', {
      type: 'patient_order_placed',
      category: 'medical',
      priority: 'high',
      title: 'Order Placed Successfully',
      message: `Your order with ${pharmacyName} for ₹${orderTotal} has been placed successfully.`,
      actionUrl: `/orders/${orderId}`,
      actionText: 'Track Order',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    // To Pharmacy
    notifications.push(this.sendNotification(pharmacyUserId, 'pharmacy', {
      type: 'pharmacy_order_received',
      category: 'medical',
      priority: 'high',
      title: 'New Order Received',
      message: `New order from ${patientName} for ₹${orderTotal}. Please review and process.`,
      actionUrl: `/pharmacy/orders/${orderId}`,
      actionText: 'Process Order',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendOrderConfirmed(orderId, patientId, pharmacyUserId, pharmacyName, estimatedDelivery) {
    const notifications = [];
    
    // To Patient
    notifications.push(this.sendNotification(patientId, 'patient', {
      type: 'order_confirmed',
      category: 'medical',
      priority: 'high',
      title: 'Order Confirmed',
      message: `Your order has been confirmed by ${pharmacyName}${estimatedDelivery ? ` and will be delivered by ${estimatedDelivery}` : ''}.`,
      actionUrl: `/orders/${orderId}`,
      actionText: 'Track Order',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    // To Pharmacy (confirmation)
    notifications.push(this.sendNotification(pharmacyUserId, 'pharmacy', {
      type: 'pharmacy_order_processed',
      category: 'medical',
      priority: 'medium',
      title: 'Order Confirmed',
      message: 'Order has been confirmed and customer has been notified.',
      actionUrl: `/pharmacy/orders/${orderId}`,
      actionText: 'View Order',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendOrderStatusUpdate(orderId, patientId, pharmacyUserId, newStatus, statusMessage) {
    const notifications = [];
    
    let title, message, priority;
    
    switch (newStatus) {
      case 'preparing':
        title = 'Order Being Prepared';
        message = statusMessage || 'Your order is being prepared by the pharmacy.';
        priority = 'medium';
        break;
      case 'ready_for_pickup':
        title = 'Order Ready for Pickup';
        message = statusMessage || 'Your order is ready for pickup at the pharmacy.';
        priority = 'high';
        break;
      case 'out_for_delivery':
        title = 'Order Out for Delivery';
        message = statusMessage || 'Your order is out for delivery and will arrive soon.';
        priority = 'high';
        break;
      case 'delivered':
        title = 'Order Delivered';
        message = statusMessage || 'Your order has been delivered successfully.';
        priority = 'high';
        break;
      case 'cancelled':
        title = 'Order Cancelled';
        message = statusMessage || 'Your order has been cancelled.';
        priority = 'high';
        break;
      default:
        title = 'Order Status Updated';
        message = statusMessage || `Your order status has been updated to ${newStatus}.`;
        priority = 'medium';
    }
    
    // To Patient
    notifications.push(this.sendNotification(patientId, 'patient', {
      type: 'order_status_updated',
      category: 'medical',
      priority: priority,
      title: title,
      message: message,
      actionUrl: `/orders/${orderId}`,
      actionText: 'View Order',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendOrderDelivered(orderId, patientId, pharmacyUserId) {
    const notifications = [];
    
    // To Patient
    notifications.push(this.sendNotification(patientId, 'patient', {
      type: 'order_delivered',
      category: 'medical',
      priority: 'high',
      title: 'Order Delivered Successfully',
      message: 'Your order has been delivered. Please confirm receipt and rate your experience.',
      actionUrl: `/orders/${orderId}`,
      actionText: 'Confirm & Rate',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    // To Pharmacy (confirmation)
    notifications.push(this.sendNotification(pharmacyUserId, 'pharmacy', {
      type: 'order_delivered',
      category: 'medical',
      priority: 'medium',
      title: 'Order Delivered',
      message: 'Order has been successfully delivered to the customer.',
      actionUrl: `/pharmacy/orders/${orderId}`,
      actionText: 'View Order',
      relatedEntities: [{ entityType: 'order', entityId: orderId }]
    }));
    
    await Promise.all(notifications);
    return notifications;
  }

  /**
   * Payment Notifications
   */
  static async sendPaymentSuccessful(paymentId, userId, userRole, amount, orderId = null, pharmacyUserId = null) {
    const notifications = [];
    
    // Build related entities without payment ID since it's not an ObjectId
    const relatedEntities = [];
    if (orderId) {
      relatedEntities.push({ entityType: 'order', entityId: orderId });
    }
    
    // To payer (patient)
    notifications.push(this.sendNotification(userId, userRole, {
      type: 'payment_successful',
      category: 'system',
      priority: 'high',
      title: 'Payment Successful',
      message: `Your payment of ₹${amount} has been processed successfully.`,
      actionUrl: orderId ? `/orders/${orderId}` : `/payments`,
      actionText: orderId ? 'View Order' : 'View Payments',
      relatedEntities: relatedEntities
    }));
    
    // To pharmacy (if applicable)
    if (pharmacyUserId && orderId) {
      notifications.push(this.sendNotification(pharmacyUserId, 'pharmacy', {
        type: 'order_payment_received',
        category: 'system',
        priority: 'high',
        title: 'Payment Received',
        message: `Payment of ₹${amount} has been received for the order. You can now process the order.`,
        actionUrl: `/pharmacy/orders/${orderId}`,
        actionText: 'Process Order',
        relatedEntities: [{ entityType: 'order', entityId: orderId }]
      }));
    }
    
    await Promise.all(notifications);
    return notifications;
  }

  static async sendPaymentFailed(paymentId, userId, userRole, amount, reason = null) {
    return this.sendNotification(userId, userRole, {
      type: 'payment_failed',
      category: 'system',
      priority: 'high',
      title: 'Payment Failed',
      message: `Your payment of ₹${amount} could not be processed${reason ? `: ${reason}` : ''}. Please try again.`,
      actionUrl: `/payments`,
      actionText: 'Retry Payment',
      relatedEntities: [] // No payment ID since it's not an ObjectId
    });
  }

  static async sendPaymentPending(paymentId, userId, userRole, amount, orderId = null) {
    const relatedEntities = [];
    if (orderId) {
      relatedEntities.push({ entityType: 'order', entityId: orderId });
    }
    
    return this.sendNotification(userId, userRole, {
      type: 'payment_pending',
      category: 'system',
      priority: 'medium',
      title: 'Payment Pending',
      message: `Your payment of ₹${amount} is being processed. You will be notified once confirmed.`,
      actionUrl: orderId ? `/orders/${orderId}` : `/payments`,
      actionText: orderId ? 'View Order' : 'View Payment',
      relatedEntities: relatedEntities
    });
  }

  /**
   * General System Notifications
   */
  static async sendWelcomeNotification(userId, userRole, userName) {
    return this.sendNotification(userId, userRole, {
      type: 'user_registered',
      category: 'system',
      priority: 'medium',
      title: 'Welcome to PharmaConnect!',
      message: `Welcome ${userName}! Your account has been created successfully.`,
      actionUrl: '/dashboard',
      actionText: 'Explore Dashboard'
    });
  }

  static async sendAccountVerificationPending(userId, userRole, userName) {
    return this.sendNotification(userId, userRole, {
      type: 'verification_required',
      category: 'system',
      priority: 'high',
      title: 'Account Verification Required',
      message: `Hi ${userName}, please verify your account by clicking the verification link sent to your email.`,
      actionUrl: '/verify-account',
      actionText: 'Verify Account'
    });
  }

  static async sendAccountVerificationComplete(userId, userRole, userName) {
    return this.sendNotification(userId, userRole, {
      type: 'verification_completed',
      category: 'system',
      priority: 'medium',
      title: 'Account Verified Successfully',
      message: `Congratulations ${userName}! Your account has been verified. You can now access all features.`,
      actionUrl: '/dashboard',
      actionText: 'Go to Dashboard'
    });
  }

  static async sendPasswordResetRequested(userId, userRole, userName) {
    return this.sendNotification(userId, userRole, {
      type: 'password_reset',
      category: 'system',
      priority: 'high',
      title: 'Password Reset Requested',
      message: `Hi ${userName}, a password reset has been requested for your account. Please check your email.`,
      actionUrl: '/reset-password',
      actionText: 'Reset Password'
    });
  }

  static async sendPasswordResetSuccessful(userId, userRole, userName) {
    return this.sendNotification(userId, userRole, {
      type: 'password_reset',
      category: 'system',
      priority: 'medium',
      title: 'Password Changed Successfully',
      message: `Hi ${userName}, your password has been changed successfully.`,
      actionUrl: '/dashboard',
      actionText: 'Go to Dashboard'
    });
  }

  static async sendProfileUpdated(userId, userRole, userName, updatedFields = []) {
    const fieldsText = updatedFields.length > 0 ? ` (${updatedFields.join(', ')})` : '';
    return this.sendNotification(userId, userRole, {
      type: 'profile_updated',
      category: 'system',
      priority: 'low',
      title: 'Profile Updated',
      message: `Hi ${userName}, your profile has been updated successfully${fieldsText}.`,
      actionUrl: '/profile',
      actionText: 'View Profile'
    });
  }

  static async sendDocumentUploaded(userId, userRole, userName, documentType) {
    return this.sendNotification(userId, userRole, {
      type: 'document_uploaded',
      category: 'system',
      priority: 'medium',
      title: 'Document Uploaded Successfully',
      message: `Hi ${userName}, your ${documentType} has been uploaded and is being reviewed.`,
      actionUrl: '/documents',
      actionText: 'View Documents'
    });
  }

  /**
   * Doctor-specific Notifications
   */
  static async sendDoctorProfileApproved(userId, doctorName) {
    return this.sendNotification(userId, 'doctor', {
      type: 'verification_completed',
      category: 'system',
      priority: 'high',
      title: 'Doctor Profile Approved',
      message: `Congratulations Dr. ${doctorName}! Your doctor profile has been approved. You can now start accepting consultations.`,
      actionUrl: '/doctor/dashboard',
      actionText: 'Start Consulting'
    });
  }

  static async sendDoctorProfileRejected(userId, doctorName, reason = '') {
    return this.sendNotification(userId, 'doctor', {
      type: 'verification_required',
      category: 'system',
      priority: 'high',
      title: 'Doctor Profile Requires Revision',
      message: `Hi Dr. ${doctorName}, your doctor profile needs some revisions${reason ? `: ${reason}` : ''}. Please update and resubmit.`,
      actionUrl: '/doctor/profile',
      actionText: 'Update Profile'
    });
  }

  static async sendNewPatientRegistered(doctorUserId, patientName) {
    return this.sendNotification(doctorUserId, 'doctor', {
      type: 'patient_consultation_scheduled',
      category: 'medical',
      priority: 'medium',
      title: 'New Patient in Your Area',
      message: `${patientName} has registered and is looking for consultations in your specialty.`,
      actionUrl: '/doctor/patients',
      actionText: 'View Patients'
    });
  }

  static async sendConsultationStarted(consultationId, userId, userRole, otherPartyName) {
    const isDoctor = userRole === 'doctor';
    return this.sendNotification(userId, userRole, {
      type: 'consultation_started',
      category: 'medical',
      priority: 'high',
      title: 'Consultation Started',
      message: `Your consultation with ${isDoctor ? otherPartyName : 'Dr. ' + otherPartyName} has started.`,
      actionUrl: `/consultations/${consultationId}`,
      actionText: 'Join Consultation',
      relatedEntities: [{ entityType: 'appointment', entityId: consultationId }]
    });
  }

  static async sendConsultationCompleted(consultationId, userId, userRole, otherPartyName) {
    const isDoctor = userRole === 'doctor';
    return this.sendNotification(userId, userRole, {
      type: 'consultation_completed',
      category: 'medical',
      priority: 'medium',
      title: 'Consultation Completed',
      message: `Your consultation with ${isDoctor ? 'the patient' : 'Dr. ' + otherPartyName} has been completed.`,
      actionUrl: `/consultations/${consultationId}`,
      actionText: 'View Summary',
      relatedEntities: [{ entityType: 'appointment', entityId: consultationId }]
    });
  }

  /**
   * Pharmacy-specific Notifications
   */
  static async sendPharmacyRegistrationApproved(userId, pharmacyName) {
    return this.sendNotification(userId, 'pharmacy', {
      type: 'verification_completed',
      category: 'system',
      priority: 'high',
      title: 'Pharmacy Registration Approved',
      message: `Congratulations! ${pharmacyName} has been approved and you can now start receiving prescription requests.`,
      actionUrl: '/pharmacy/dashboard',
      actionText: 'View Dashboard'
    });
  }

  static async sendPharmacyRegistrationRejected(userId, pharmacyName, reason = '') {
    return this.sendNotification(userId, 'pharmacy', {
      type: 'verification_required',
      category: 'system',
      priority: 'high',
      title: 'Pharmacy Registration Requires Revision',
      message: `${pharmacyName} registration needs revision${reason ? `: ${reason}` : ''}. Please update and resubmit.`,
      actionUrl: '/pharmacy/profile',
      actionText: 'Update Profile'
    });
  }

  static async sendInventoryLowStock(userId, itemName, currentStock, minimumStock) {
    return this.sendNotification(userId, 'pharmacy', {
      type: 'inventory_low_stock',
      category: 'system',
      priority: 'medium',
      title: 'Low Stock Alert',
      message: `${itemName} is running low (${currentStock} remaining, minimum: ${minimumStock}). Please restock soon.`,
      actionUrl: '/pharmacy/inventory',
      actionText: 'Manage Inventory'
    });
  }

  static async sendInventoryExpiringSoon(userId, itemName, expiryDate) {
    return this.sendNotification(userId, 'pharmacy', {
      type: 'inventory_near_expiry',
      category: 'system',
      priority: 'high',
      title: 'Medicine Expiring Soon',
      message: `${itemName} is expiring on ${expiryDate}. Please review your inventory.`,
      actionUrl: '/pharmacy/inventory',
      actionText: 'Check Inventory'
    });
  }

  static async sendAppointmentReminder(consultationId, userId, userRole, doctorName, date, time) {
    return this.sendNotification(userId, userRole, {
      type: 'appointment_reminder',
      category: 'medical',
      priority: 'high',
      title: 'Appointment Reminder',
      message: `You have an appointment with Dr. ${doctorName} in 1 hour (${date} at ${time}).`,
      actionUrl: `/consultations/${consultationId}`,
      actionText: 'Join Consultation',
      relatedEntities: [{ entityType: 'appointment', entityId: consultationId }]
    });
  }
}

export default UserNotificationService;