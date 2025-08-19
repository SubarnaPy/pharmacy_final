# Troubleshooting Guide - Advanced Notification System

## Overview

This guide provides solutions to common issues, diagnostic procedures, and troubleshooting steps for the Advanced Notification System.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Diagnostic Tools](#diagnostic-tools)
3. [Performance Issues](#performance-issues)
4. [External Service Issues](#external-service-issues)
5. [Database Issues](#database-issues)
6. [WebSocket Issues](#websocket-issues)
7. [Email Delivery Issues](#email-delivery-issues)
8. [SMS Delivery Issues](#sms-delivery-issues)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Emergency Procedures](#emergency-procedures)

## Common Issues

### Issue: Notifications Not Being Sent

**Symptoms**:
- Users report not receiving notifications
- Notification queue is growing
- No delivery confirmations

**Diagnosis**:
```bash
# Check service status
pm2 status notification-service

# Check logs for errors
pm2 logs notification-service --lines 100

# Check notification queue
redis-cli LLEN notification_queue

# Test notification creation
curl -X POST http://localhost:5000/api/v1/notifications/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Solutions**:

1. **Service Not Running**:
   ```bash
   pm2 restart notification-service
   pm2 save
   ```

2. **Database Connection Issues**:
   ```bash
   # Check MongoDB connection
   mongosh $MONGODB_URI --eval "db.runCommand('ping')"
   
   # Check Redis connection
   redis-cli -u $REDIS_URL ping
   ```

3. **Configuration Issues**:
   ```bash
   # Validate configuration
   npm run config:validate
   
   # Check environment variables
   env | grep -E "(SENDGRID|TWILIO|MONGODB|REDIS)"
   ```

4. **External Service Issues**:
   ```bash
   # Test SendGrid connectivity
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
   
   # Test Twilio connectivity
   curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
     -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
     -d "From=$TWILIO_PHONE_NUMBER" \
     -d "To=+1234567890" \
     -d "Body=Test message"
   ```

### Issue: High Memory Usage

**Symptoms**:
- Application consuming excessive memory
- Out of memory errors
- Slow performance

**Diagnosis**:
```bash
# Check memory usage
ps aux | grep node
free -h

# Check Node.js heap usage
curl http://localhost:5000/metrics | grep process_resident_memory_bytes

# Analyze memory leaks
node --inspect server.js
```

**Solutions**:

1. **Increase Memory Limit**:
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'notification-service',
       script: './server.js',
       node_args: '--max-old-space-size=2048',
       max_memory_restart: '2G'
     }]
   };
   ```

2. **Optimize Notification Processing**:
   ```javascript
   // Implement batch processing
   const BATCH_SIZE = 100;
   const notifications = await getNotificationsBatch(BATCH_SIZE);
   ```

3. **Clear Cache Regularly**:
   ```bash
   # Clear Redis cache
   redis-cli FLUSHDB
   
   # Restart application
   pm2 restart notification-service
   ```

### Issue: Slow Notification Delivery

**Symptoms**:
- Notifications taking too long to deliver
- Users complaining about delays
- High response times

**Diagnosis**:
```bash
# Check queue length
redis-cli LLEN notification_queue

# Check processing times
curl http://localhost:5000/metrics | grep notification_delivery_duration

# Check database performance
mongosh --eval "db.runCommand({serverStatus: 1}).opcounters"
```

**Solutions**:

1. **Scale Workers**:
   ```javascript
   // Increase PM2 instances
   pm2 scale notification-service +2
   ```

2. **Optimize Database Queries**:
   ```javascript
   // Add indexes
   db.notifications.createIndex({ "recipients.userId": 1, "createdAt": -1 });
   db.notifications.createIndex({ "type": 1, "scheduledFor": 1 });
   ```

3. **Implement Caching**:
   ```javascript
   // Cache user preferences
   const preferences = await redis.get(`preferences:${userId}`);
   if (!preferences) {
     const userPrefs = await getUserPreferences(userId);
     await redis.setex(`preferences:${userId}`, 3600, JSON.stringify(userPrefs));
   }
   ```

## Diagnostic Tools

### Health Check Script

**health-check.sh**:
```bash
#!/bin/bash

echo "=== Notification System Health Check ==="

# Service status
echo "1. Service Status:"
pm2 status notification-service

# Database connectivity
echo "2. Database Connectivity:"
mongosh $MONGODB_URI --quiet --eval "print('MongoDB: ' + (db.runCommand('ping').ok ? 'Connected' : 'Failed'))"
redis-cli -u $REDIS_URL ping > /dev/null && echo "Redis: Connected" || echo "Redis: Failed"

# External services
echo "3. External Services:"
curl -s -o /dev/null -w "SendGrid: %{http_code}\n" -X GET https://api.sendgrid.com/v3/user/profile -H "Authorization: Bearer $SENDGRID_API_KEY"
curl -s -o /dev/null -w "Twilio: %{http_code}\n" -X GET https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN

# Queue status
echo "4. Queue Status:"
echo "Notification Queue Length: $(redis-cli -u $REDIS_URL LLEN notification_queue)"
echo "Failed Queue Length: $(redis-cli -u $REDIS_URL LLEN notification_failed_queue)"

# Recent errors
echo "5. Recent Errors:"
pm2 logs notification-service --lines 10 --err

echo "=== Health Check Complete ==="
```

### Performance Monitoring Script

**performance-monitor.sh**:
```bash
#!/bin/bash

while true; do
  echo "$(date): CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%, Memory: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}'), Queue: $(redis-cli -u $REDIS_URL LLEN notification_queue)"
  sleep 30
done
```

### Log Analysis Script

**analyze-logs.sh**:
```bash
#!/bin/bash

LOG_FILE="/var/log/notification-service/combined.log"
TIME_RANGE=${1:-"1 hour ago"}

echo "=== Log Analysis for last $TIME_RANGE ==="

# Error count
echo "Error Count:"
grep -c "ERROR" $LOG_FILE | tail -1000

# Most common errors
echo "Most Common Errors:"
grep "ERROR" $LOG_FILE | awk '{print $NF}' | sort | uniq -c | sort -nr | head -10

# Notification delivery stats
echo "Notification Delivery Stats:"
grep "notification_delivered" $LOG_FILE | awk '{print $5}' | sort | uniq -c

# Response time analysis
echo "Average Response Times:"
grep "response_time" $LOG_FILE | awk '{sum+=$6; count++} END {print "Average:", sum/count "ms"}'
```

## Performance Issues

### High CPU Usage

**Diagnosis**:
```bash
# Check CPU usage by process
top -p $(pgrep -f notification-service)

# Profile Node.js application
node --prof server.js
node --prof-process isolate-*.log > profile.txt
```

**Solutions**:

1. **Optimize Event Loop**:
   ```javascript
   // Use setImmediate for CPU-intensive tasks
   function processNotificationsBatch(notifications) {
     return new Promise((resolve) => {
       setImmediate(() => {
         // Process notifications
         resolve();
       });
     });
   }
   ```

2. **Implement Worker Threads**:
   ```javascript
   const { Worker, isMainThread, parentPort } = require('worker_threads');
   
   if (isMainThread) {
     const worker = new Worker(__filename);
     worker.postMessage(notificationData);
   } else {
     parentPort.on('message', (data) => {
       // Process notification in worker thread
     });
   }
   ```

### Database Performance Issues

**Diagnosis**:
```bash
# MongoDB slow queries
mongosh --eval "db.setProfilingLevel(2, {slowms: 100})"
mongosh --eval "db.system.profile.find().sort({ts: -1}).limit(5)"

# Check index usage
mongosh --eval "db.notifications.find({userId: 'test'}).explain('executionStats')"
```

**Solutions**:

1. **Add Missing Indexes**:
   ```javascript
   // Create compound indexes
   db.notifications.createIndex({ 
     "recipients.userId": 1, 
     "createdAt": -1, 
     "type": 1 
   });
   ```

2. **Optimize Queries**:
   ```javascript
   // Use projection to limit returned fields
   const notifications = await Notification.find(
     { "recipients.userId": userId },
     { title: 1, message: 1, createdAt: 1 }
   ).limit(20);
   ```

## External Service Issues

### SendGrid Issues

**Common Problems**:

1. **API Key Invalid**:
   ```bash
   # Test API key
   curl -X GET https://api.sendgrid.com/v3/user/profile \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

2. **Rate Limiting**:
   ```javascript
   // Implement exponential backoff
   async function sendEmailWithRetry(emailData, retries = 3) {
     try {
       return await sendgrid.send(emailData);
     } catch (error) {
       if (error.code === 429 && retries > 0) {
         const delay = Math.pow(2, 3 - retries) * 1000;
         await new Promise(resolve => setTimeout(resolve, delay));
         return sendEmailWithRetry(emailData, retries - 1);
       }
       throw error;
     }
   }
   ```

3. **Bounce Handling**:
   ```javascript
   // Handle webhook events
   app.post('/webhook/sendgrid', (req, res) => {
     const events = req.body;
     events.forEach(event => {
       if (event.event === 'bounce') {
         // Handle bounce
         handleEmailBounce(event.email, event.reason);
       }
     });
     res.status(200).send('OK');
   });
   ```

### Twilio Issues

**Common Problems**:

1. **Invalid Phone Numbers**:
   ```javascript
   const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
   
   function validatePhoneNumber(phoneNumber, countryCode = 'US') {
     try {
       const number = phoneUtil.parseAndKeepRawInput(phoneNumber, countryCode);
       return phoneUtil.isValidNumber(number);
     } catch (error) {
       return false;
     }
   }
   ```

2. **Message Delivery Failures**:
   ```javascript
   // Check message status
   const message = await twilio.messages(messageSid).fetch();
   console.log('Status:', message.status);
   console.log('Error Code:', message.errorCode);
   ```

## Database Issues

### MongoDB Connection Issues

**Diagnosis**:
```bash
# Check connection status
mongosh $MONGODB_URI --eval "db.runCommand('connectionStatus')"

# Check replica set status
mongosh $MONGODB_URI --eval "rs.status()"
```

**Solutions**:

1. **Connection Pool Configuration**:
   ```javascript
   const mongoose = require('mongoose');
   
   mongoose.connect(process.env.MONGODB_URI, {
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
     bufferCommands: false,
     bufferMaxEntries: 0
   });
   ```

2. **Handle Connection Events**:
   ```javascript
   mongoose.connection.on('connected', () => {
     console.log('MongoDB connected');
   });
   
   mongoose.connection.on('error', (err) => {
     console.error('MongoDB connection error:', err);
   });
   
   mongoose.connection.on('disconnected', () => {
     console.log('MongoDB disconnected');
   });
   ```

### Redis Connection Issues

**Diagnosis**:
```bash
# Check Redis status
redis-cli -u $REDIS_URL info server

# Check memory usage
redis-cli -u $REDIS_URL info memory
```

**Solutions**:

1. **Connection Retry Logic**:
   ```javascript
   const redis = require('redis');
   
   const client = redis.createClient({
     url: process.env.REDIS_URL,
     retry_strategy: (options) => {
       if (options.error && options.error.code === 'ECONNREFUSED') {
         return new Error('Redis server connection refused');
       }
       if (options.total_retry_time > 1000 * 60 * 60) {
         return new Error('Retry time exhausted');
       }
       return Math.min(options.attempt * 100, 3000);
     }
   });
   ```

## WebSocket Issues

### Connection Problems

**Diagnosis**:
```javascript
// Client-side debugging
const socket = io('ws://localhost:5000', {
  transports: ['websocket'],
  upgrade: false
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**Solutions**:

1. **CORS Configuration**:
   ```javascript
   const io = require('socket.io')(server, {
     cors: {
       origin: process.env.CORS_ORIGIN,
       methods: ["GET", "POST"],
       credentials: true
     }
   });
   ```

2. **Authentication Issues**:
   ```javascript
   io.use((socket, next) => {
     const token = socket.handshake.auth.token;
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       socket.userId = decoded.userId;
       next();
     } catch (error) {
       next(new Error('Authentication error'));
     }
   });
   ```

## Email Delivery Issues

### Emails Going to Spam

**Solutions**:

1. **SPF Record**:
   ```
   v=spf1 include:sendgrid.net ~all
   ```

2. **DKIM Setup**:
   ```
   # Add DKIM record to DNS
   s1._domainkey.yourdomain.com CNAME s1.domainkey.u123456.wl.sendgrid.net
   ```

3. **DMARC Policy**:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

### Email Template Issues

**Diagnosis**:
```javascript
// Test template rendering
const template = await getTemplate('prescription_created', 'email', 'patient');
const rendered = await renderTemplate(template, testData);
console.log('Rendered template:', rendered);
```

**Solutions**:

1. **Template Validation**:
   ```javascript
   function validateTemplate(template) {
     const requiredFields = ['subject', 'body'];
     const missingFields = requiredFields.filter(field => !template[field]);
     
     if (missingFields.length > 0) {
       throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
     }
   }
   ```

## Emergency Procedures

### System Outage Response

**Immediate Actions**:

1. **Check System Status**:
   ```bash
   ./health-check.sh
   ```

2. **Restart Services**:
   ```bash
   pm2 restart notification-service
   ```

3. **Check External Dependencies**:
   ```bash
   # Test external services
   curl -I https://api.sendgrid.com
   curl -I https://api.twilio.com
   ```

4. **Enable Fallback Mode**:
   ```javascript
   // Disable non-critical features
   process.env.ENABLE_SMS_NOTIFICATIONS = 'false';
   process.env.ENABLE_EMAIL_TRACKING = 'false';
   ```

### Data Recovery

**Backup Restoration**:
```bash
# Restore from latest backup
./recovery-script.sh $(date +%Y%m%d)

# Verify data integrity
mongosh --eval "db.notifications.countDocuments()"
```

### Escalation Procedures

**Contact Information**:
- **Level 1 Support**: support@yourdomain.com
- **Level 2 Engineering**: engineering@yourdomain.com
- **Emergency Hotline**: +1-800-XXX-XXXX

**Escalation Criteria**:
- System down for > 5 minutes
- Data loss detected
- Security breach suspected
- External service outage affecting > 50% of notifications

This troubleshooting guide provides comprehensive solutions for common issues and emergency procedures to maintain system reliability.