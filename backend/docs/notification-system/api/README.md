# Notification System API Documentation

## Overview

This document provides comprehensive API documentation for the Advanced Notification System, including all endpoints, request/response formats, and usage examples.

## Base URL

```
Production: https://api.yourdomain.com/api/v1
Development: http://localhost:5000/api/v1
```

## Authentication

All API endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Core Notification APIs

### Send Notification

Send a notification to a specific user.

**Endpoint:** `POST /notifications/send`

**Request Body:**
```json
{
  "userId": "string",
  "type": "string",
  "data": "object",
  "options": {
    "channels": ["websocket", "email", "sms"],
    "priority": "high",
    "scheduledFor": "2024-01-15T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "notificationId": "notification_123",
  "deliveryStatus": {
    "websocket": "delivered",
    "email": "queued",
    "sms": "delivered"
  }
}
```

**Example:**
```javascript
const response = await fetch('/api/v1/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user_123',
    type: 'prescription_created',
    data: {
      prescriptionId: 'rx_456',
      doctorName: 'Dr. Smith',
      medicationName: 'Amoxicillin'
    },
    options: {
      channels: ['websocket', 'email'],
      priority: 'high'
    }
  })
});
```

### Send Bulk Notification

Send notifications to multiple users.

**Endpoint:** `POST /notifications/send-bulk`

**Request Body:**
```json
{
  "recipients": ["user1", "user2", "user3"],
  "type": "string",
  "data": "object",
  "options": {
    "channels": ["websocket", "email"],
    "priority": "medium"
  }
}
```

### Send Role-Based Notification

Send notifications to all users with a specific role.

**Endpoint:** `POST /notifications/send-role`

**Request Body:**
```json
{
  "role": "doctor",
  "type": "system_maintenance",
  "data": {
    "maintenanceStart": "2024-01-15T02:00:00Z",
    "estimatedDuration": "2 hours"
  },
  "options": {
    "channels": ["websocket", "email"],
    "priority": "high"
  }
}
```

## User Notification APIs

### Get User Notifications

Retrieve notifications for the authenticated user.

**Endpoint:** `GET /notifications/user`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (unread, read, all)
- `type` (optional): Filter by notification type

**Response:**
```json
{
  "notifications": [
    {
      "id": "notification_123",
      "type": "prescription_created",
      "title": "New Prescription Available",
      "message": "Dr. Smith has created a new prescription for you.",
      "data": {
        "prescriptionId": "rx_456",
        "doctorName": "Dr. Smith"
      },
      "readAt": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "actionUrl": "/prescriptions/rx_456",
      "actionText": "View Prescription"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Mark Notification as Read

Mark a specific notification as read.

**Endpoint:** `PUT /notifications/:id/read`

**Response:**
```json
{
  "success": true,
  "readAt": "2024-01-15T10:30:00Z"
}
```

### Mark All Notifications as Read

Mark all notifications for the user as read.

**Endpoint:** `PUT /notifications/read-all`

**Response:**
```json
{
  "success": true,
  "markedCount": 12
}
```

## Notification Preferences APIs

### Get User Preferences

Get notification preferences for the authenticated user.

**Endpoint:** `GET /notification-preferences`

**Response:**
```json
{
  "globalSettings": {
    "enabled": true,
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00",
      "timezone": "America/New_York"
    },
    "frequency": "immediate"
  },
  "channels": {
    "websocket": { "enabled": true },
    "email": { 
      "enabled": true,
      "frequency": "immediate"
    },
    "sms": { 
      "enabled": true,
      "emergencyOnly": false
    }
  },
  "categories": {
    "medical": {
      "enabled": true,
      "channels": ["websocket", "email", "sms"],
      "priority": "all"
    },
    "administrative": {
      "enabled": true,
      "channels": ["websocket", "email"],
      "priority": "high"
    }
  }
}
```

### Update User Preferences

Update notification preferences for the authenticated user.

**Endpoint:** `PUT /notification-preferences`

**Request Body:**
```json
{
  "globalSettings": {
    "enabled": true,
    "quietHours": {
      "enabled": true,
      "startTime": "23:00",
      "endTime": "07:00"
    }
  },
  "channels": {
    "sms": {
      "enabled": false
    }
  }
}
```

## Admin APIs

### Get System Analytics

Get notification system analytics (admin only).

**Endpoint:** `GET /admin/notifications/analytics`

**Query Parameters:**
- `startDate`: Start date for analytics (ISO 8601)
- `endDate`: End date for analytics (ISO 8601)
- `groupBy`: Group by period (day, week, month)

**Response:**
```json
{
  "totalSent": 15420,
  "totalDelivered": 14890,
  "totalRead": 12340,
  "deliveryRate": 96.6,
  "readRate": 82.9,
  "channelMetrics": {
    "websocket": {
      "sent": 15420,
      "delivered": 15200,
      "deliveryRate": 98.6
    },
    "email": {
      "sent": 8920,
      "delivered": 8650,
      "opened": 6540,
      "clicked": 2180,
      "deliveryRate": 97.0,
      "openRate": 75.6,
      "clickRate": 33.3
    },
    "sms": {
      "sent": 3240,
      "delivered": 3180,
      "deliveryRate": 98.1
    }
  }
}
```

### Send Admin Notification

Send system-wide notifications (admin only).

**Endpoint:** `POST /admin/notifications/broadcast`

**Request Body:**
```json
{
  "type": "system_announcement",
  "title": "System Maintenance Notice",
  "message": "Scheduled maintenance will occur tonight from 2-4 AM EST.",
  "targetRoles": ["all"],
  "channels": ["websocket", "email"],
  "priority": "high"
}
```

### Get Notification Templates

Get all notification templates (admin only).

**Endpoint:** `GET /admin/notifications/templates`

**Response:**
```json
{
  "templates": [
    {
      "id": "template_123",
      "name": "Prescription Created",
      "type": "prescription_created",
      "variants": [
        {
          "channel": "email",
          "userRole": "patient",
          "language": "en",
          "subject": "New Prescription Available",
          "body": "Hello {{patientName}}, Dr. {{doctorName}} has created a new prescription for {{medicationName}}."
        }
      ],
      "isActive": true,
      "usage": {
        "totalSent": 1250,
        "lastUsed": "2024-01-15T10:00:00Z"
      }
    }
  ]
}
```

## WebSocket Events

### Connection

Connect to the WebSocket server for real-time notifications:

```javascript
const socket = io('ws://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Incoming Events (Server → Client)

**notification**: New notification received
```javascript
socket.on('notification', (data) => {
  console.log('New notification:', data);
  // {
  //   id: 'notification_123',
  //   type: 'prescription_created',
  //   title: 'New Prescription Available',
  //   message: 'Dr. Smith has created a new prescription for you.',
  //   actionUrl: '/prescriptions/rx_456',
  //   createdAt: '2024-01-15T10:00:00Z'
  // }
});
```

**notification_read**: Notification marked as read (for multi-device sync)
```javascript
socket.on('notification_read', (data) => {
  console.log('Notification read:', data.notificationId);
});
```

#### Outgoing Events (Client → Server)

**mark_read**: Mark notification as read
```javascript
socket.emit('mark_read', { notificationId: 'notification_123' });
```

**join_room**: Join role-based room for targeted notifications
```javascript
socket.emit('join_room', { room: 'doctors' });
```

## Error Handling

### Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid notification type",
    "details": {
      "field": "type",
      "value": "invalid_type"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `DELIVERY_FAILED`: Notification delivery failed
- `TEMPLATE_ERROR`: Template rendering failed
- `EXTERNAL_SERVICE_ERROR`: External service unavailable

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **User endpoints**: 100 requests per minute
- **Admin endpoints**: 500 requests per minute
- **Bulk operations**: 10 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

## SDKs and Examples

### JavaScript/Node.js

```javascript
const NotificationClient = require('@yourapp/notification-client');

const client = new NotificationClient({
  baseUrl: 'https://api.yourdomain.com/api/v1',
  token: 'your_jwt_token'
});

// Send notification
await client.sendNotification({
  userId: 'user_123',
  type: 'prescription_created',
  data: { prescriptionId: 'rx_456' }
});

// Get user notifications
const notifications = await client.getUserNotifications({
  page: 1,
  limit: 20,
  status: 'unread'
});
```

### React Hook

```javascript
import { useNotifications } from '@yourapp/notification-hooks';

function NotificationComponent() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      {notifications.map(notification => (
        <div key={notification.id} onClick={() => markAsRead(notification.id)}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}
```

## Testing

### Test Endpoints

Use these endpoints for testing in development:

**Send Test Notification:**
```bash
curl -X POST http://localhost:5000/api/v1/notifications/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test_notification",
    "channels": ["websocket", "email"]
  }'
```

**Health Check:**
```bash
curl http://localhost:5000/api/v1/notifications/health
```

### Mock Data

For testing, you can use the provided mock data generators:

```javascript
const { generateMockNotification } = require('./test/mocks/notification-mocks');

const mockNotification = generateMockNotification({
  type: 'prescription_created',
  userId: 'test_user_123'
});
```