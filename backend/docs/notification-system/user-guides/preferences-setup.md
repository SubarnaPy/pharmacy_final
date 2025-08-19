# Setting Up Notification Preferences

## Overview

This guide walks you through setting up your notification preferences to ensure you receive the right notifications through your preferred channels at the right times.

## Accessing Notification Settings

### Web Application

1. Log into your account
2. Click on your profile picture or name in the top right corner
3. Select "Settings" from the dropdown menu
4. Click on "Notifications" in the left sidebar

### Mobile Application

1. Open the app and log in
2. Tap the menu icon (☰) or your profile picture
3. Select "Settings"
4. Tap "Notification Preferences"

## Understanding Notification Channels

### In-App Notifications (WebSocket)
- **What it is**: Real-time notifications that appear in the app
- **Best for**: Immediate actions, status updates, quick alerts
- **When to use**: Always enabled for the best experience
- **Limitations**: Only works when the app is open

### Email Notifications
- **What it is**: Detailed notifications sent to your email address
- **Best for**: Important information, records, detailed updates
- **When to use**: For notifications you want to keep or review later
- **Limitations**: May be delayed, can go to spam folder

### SMS Notifications
- **What it is**: Text messages sent to your phone
- **Best for**: Urgent alerts, time-sensitive information
- **When to use**: For critical notifications only (to avoid SMS charges)
- **Limitations**: Character limits, potential carrier charges

## Global Settings

### Enable/Disable All Notifications

**To turn off all notifications:**
1. Go to notification settings
2. Toggle "Enable Notifications" to OFF
3. Click "Save Changes"

⚠️ **Warning**: This will disable ALL notifications, including critical medical alerts. We recommend using category-specific settings instead.

### Quiet Hours

Set times when you don't want to receive non-critical notifications:

1. Toggle "Enable Quiet Hours" to ON
2. Set your start time (e.g., 10:00 PM)
3. Set your end time (e.g., 7:00 AM)
4. Select your timezone
5. Click "Save Changes"

**Note**: Critical and emergency notifications will still be delivered during quiet hours.

### Notification Frequency

Choose how often you want to receive notifications:

- **Immediate**: Get notifications as they happen (recommended)
- **Hourly Digest**: Receive a summary every hour
- **Daily Digest**: Receive a summary once per day
- **Weekly Digest**: Receive a summary once per week

## Channel-Specific Settings

### Email Settings

**Email Address**: Ensure your email address is correct and up to date.

**Email Frequency Options**:
- **Immediate**: Get emails as events happen
- **Daily Digest**: Receive one email per day with all notifications
- **Weekly Digest**: Receive one email per week with all notifications

**Digest Time**: If using digest mode, choose when you want to receive the summary email (e.g., 9:00 AM).

### SMS Settings

**Phone Number**: Verify your phone number is correct and includes the country code.

**SMS Options**:
- **All Notifications**: Receive SMS for all enabled notification types
- **Emergency Only**: Only receive SMS for critical/emergency notifications
- **Disabled**: Don't receive any SMS notifications

**International SMS**: If you're traveling or have an international number, ensure international SMS is enabled.

## Notification Categories

### Medical Notifications

**What's included**:
- Prescription updates and pharmacy responses
- Appointment reminders and confirmations
- Test results and lab reports
- Doctor communications and consultations

**Recommended settings**:
- **Channels**: In-app + Email + SMS (for urgent items)
- **Priority**: All notifications
- **Frequency**: Immediate

### Administrative Notifications

**What's included**:
- Account updates and security alerts
- Billing and payment confirmations
- Insurance and coverage changes
- Profile updates and verifications

**Recommended settings**:
- **Channels**: In-app + Email
- **Priority**: High and Critical only
- **Frequency**: Immediate or Daily Digest

### System Notifications

**What's included**:
- App updates and new features
- Maintenance notifications
- Service disruptions
- Security alerts

**Recommended settings**:
- **Channels**: In-app + Email
- **Priority**: High and Critical only
- **Frequency**: Immediate

### Marketing Notifications

**What's included**:
- Health tips and educational content
- Promotional offers and discounts
- Newsletter and blog updates
- Survey and feedback requests

**Recommended settings**:
- **Channels**: Email only
- **Priority**: All (or disable if not interested)
- **Frequency**: Weekly Digest

## Specific Notification Types

### For Patients

#### Prescription Notifications
- **Prescription Created**: When a doctor creates a new prescription
- **Pharmacy Response**: When pharmacies respond with pricing/availability
- **Prescription Ready**: When your prescription is ready for pickup
- **Prescription Expired**: When a prescription expires

**Recommended**: Enable all channels for immediate notifications.

#### Appointment Notifications
- **Appointment Scheduled**: When an appointment is booked
- **Appointment Reminder**: 24 hours and 1 hour before appointment
- **Appointment Changed**: When doctor reschedules or cancels
- **Appointment Completed**: After consultation ends

**Recommended**: Enable in-app and SMS for reminders, email for records.

#### Payment Notifications
- **Payment Processed**: When a payment is successfully processed
- **Payment Failed**: When a payment fails or is declined
- **Refund Issued**: When a refund is processed
- **Invoice Available**: When a new invoice is generated

**Recommended**: Enable email for records, in-app for immediate updates.

### For Healthcare Providers

#### Patient Notifications
- **New Patient Registration**: When a new patient joins your practice
- **Appointment Request**: When a patient requests an appointment
- **Patient Message**: When a patient sends you a message
- **Prescription Request**: When a patient requests a prescription refill

**Recommended**: Enable all channels for immediate response.

#### Practice Management
- **Schedule Changes**: When your schedule is updated
- **System Maintenance**: When the system will be unavailable
- **Compliance Alerts**: Important regulatory notifications
- **Performance Reports**: Monthly practice analytics

**Recommended**: Enable in-app and email, SMS for urgent items only.

### For Pharmacies

#### Prescription Management
- **New Prescription**: When a new prescription is received
- **Inventory Alert**: When medication stock is low
- **Patient Pickup**: Reminders for patient prescription pickups
- **Insurance Issues**: When insurance authorization is needed

**Recommended**: Enable all channels for business-critical notifications.

#### Business Operations
- **Order Confirmations**: When supply orders are placed/received
- **Payment Updates**: When payments are processed
- **Regulatory Alerts**: Compliance and regulatory notifications
- **System Updates**: When system features are updated

**Recommended**: Enable in-app and email for most notifications.

## Advanced Settings

### Priority-Based Filtering

You can choose to receive only certain priority levels:

- **All**: Receive all notifications (recommended)
- **High and Critical**: Only important notifications
- **Critical Only**: Only emergency/critical notifications

### Custom Notification Rules

For advanced users, you can create custom rules:

1. Go to "Advanced Settings" in notification preferences
2. Click "Add Custom Rule"
3. Choose conditions (notification type, sender, keywords)
4. Choose actions (channels, timing, priority)
5. Save the rule

**Example Rule**: "If notification type is 'appointment_reminder' AND time is within 1 hour, send via SMS and in-app, otherwise send via email only."

## Testing Your Settings

### Send Test Notification

1. Go to notification settings
2. Click "Send Test Notification"
3. Choose which channels to test
4. Check that you receive the test notification on selected channels

### Notification Preview

Use the preview feature to see how notifications will look:

1. Select a notification type from the dropdown
2. Click "Preview"
3. See how it will appear in each channel
4. Adjust settings if needed

## Troubleshooting Common Issues

### Not Receiving Notifications

1. **Check if notifications are enabled globally**
2. **Verify your contact information** (email, phone number)
3. **Check spam/junk folders** for emails
4. **Ensure app notifications are enabled** in your device settings
5. **Test with a test notification**

### Too Many Notifications

1. **Adjust notification frequency** to digest mode
2. **Disable marketing notifications** if not interested
3. **Use priority filtering** to receive only important notifications
4. **Set up quiet hours** to limit notification times

### Wrong Channel Receiving Notifications

1. **Review channel settings** for each notification type
2. **Check category settings** to ensure proper channel selection
3. **Update contact information** if it's incorrect
4. **Test settings** with test notifications

### Notifications Delayed

1. **Check internet connection** for in-app notifications
2. **Verify email server settings** aren't blocking emails
3. **Contact support** if delays persist
4. **Consider switching to immediate delivery** instead of digest mode

## Best Practices

### Recommended Setup for New Users

1. **Start with default settings** and adjust based on experience
2. **Enable all channels for medical notifications**
3. **Set quiet hours** to match your sleep schedule
4. **Use email for record-keeping**, SMS for urgent items
5. **Test your settings** with test notifications

### Regular Maintenance

1. **Review settings monthly** to ensure they still meet your needs
2. **Update contact information** when it changes
3. **Adjust based on usage patterns** and feedback
4. **Clean up old notification rules** that are no longer needed

### Privacy Considerations

1. **Review who can send you notifications**
2. **Understand data retention policies**
3. **Use secure email providers** for sensitive notifications
4. **Report spam or suspicious notifications**

## Getting Help

If you need assistance with notification settings:

1. **Check the FAQ section** for common questions
2. **Use the in-app help** feature for contextual guidance
3. **Contact support** via email or chat
4. **Schedule a call** with customer success for complex setups

**Support Contact**:
- Email: support@yourdomain.com
- Phone: 1-800-XXX-XXXX
- Live Chat: Available in the app 24/7