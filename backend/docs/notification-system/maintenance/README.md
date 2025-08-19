# Maintenance Guide - Advanced Notification System

## Overview

This guide covers routine maintenance procedures, system optimization, and preventive measures to ensure the Advanced Notification System operates efficiently and reliably.

## Table of Contents

1. [Routine Maintenance Tasks](#routine-maintenance-tasks)
2. [Database Maintenance](#database-maintenance)
3. [Cache Management](#cache-management)
4. [Log Management](#log-management)
5. [Performance Optimization](#performance-optimization)
6. [Security Updates](#security-updates)
7. [Backup and Recovery](#backup-and-recovery)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Capacity Planning](#capacity-planning)
10. [Scheduled Maintenance](#scheduled-maintenance)

## Routine Maintenance Tasks

### Daily Tasks

**1. System Health Check**
```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Daily Health Check - $(date) ==="

# Service status
pm2 status notification-service

# Resource usage
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"

# Queue status
echo "Notification Queue: $(redis-cli -u $REDIS_URL LLEN notification_queue)"
echo "Failed Queue: $(redis-cli -u $REDIS_URL LLEN notification_failed_queue)"

# Database connections
mongosh $MONGODB_URI --quiet --eval "print('Active connections: ' + db.serverStatus().connections.current)"

# External service health
curl -s -o /dev/null -w "SendGrid API: %{http_code}\n" -X GET https://api.sendgrid.com/v3/user/profile -H "Authorization: Bearer $SENDGRID_API_KEY"
curl -s -o /dev/null -w "Twilio API: %{http_code}\n" -X GET https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN

# Recent errors
ERROR_COUNT=$(pm2 logs notification-service --lines 1000 --nostream | grep -c "ERROR")
echo "Errors in last 1000 log lines: $ERROR_COUNT"

echo "=== Health Check Complete ==="
```

**2. Queue Monitoring**
```bash
#!/bin/bash
# monitor-queues.sh

QUEUE_THRESHOLD=1000
FAILED_THRESHOLD=100

QUEUE_SIZE=$(redis-cli -u $REDIS_URL LLEN notification_queue)
FAILED_SIZE=$(redis-cli -u $REDIS_URL LLEN notification_failed_queue)

if [ $QUEUE_SIZE -gt $QUEUE_THRESHOLD ]; then
  echo "WARNING: Notification queue size ($QUEUE_SIZE) exceeds threshold ($QUEUE_THRESHOLD)"
  # Alert administrators
  curl -X POST $SLACK_WEBHOOK_URL -d "{\"text\":\"Notification queue size alert: $QUEUE_SIZE\"}"
fi

if [ $FAILED_SIZE -gt $FAILED_THRESHOLD ]; then
  echo "WARNING: Failed queue size ($FAILED_SIZE) exceeds threshold ($FAILED_THRESHOLD)"
  # Process failed notifications
  npm run process-failed-notifications
fi
```

**3. Log Rotation Check**
```bash
#!/bin/bash
# check-log-rotation.sh

LOG_DIR="/var/log/notification-service"
MAX_SIZE="100M"

for log_file in $LOG_DIR/*.log; do
  if [ -f "$log_file" ]; then
    size=$(du -h "$log_file" | cut -f1)
    echo "$log_file: $size"
    
    # Rotate if too large
    if [ $(du -k "$log_file" | cut -f1) -gt 102400 ]; then
      logrotate -f /etc/logrotate.d/notification-service
    fi
  fi
done
```

### Weekly Tasks

**1. Performance Analysis**
```bash
#!/bin/bash
# weekly-performance-analysis.sh

echo "=== Weekly Performance Analysis - $(date) ==="

# Notification delivery stats
mongosh $MONGODB_URI --quiet --eval "
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stats = db.notifications.aggregate([
    { \$match: { createdAt: { \$gte: startDate } } },
    { \$group: {
      _id: null,
      totalSent: { \$sum: 1 },
      avgDeliveryTime: { \$avg: '\$deliveryTime' },
      successRate: { \$avg: { \$cond: [{ \$eq: ['\$status', 'delivered'] }, 1, 0] } }
    }}
  ]).toArray();
  print('Weekly Stats:', JSON.stringify(stats[0], null, 2));
"

# Resource usage trends
echo "Average CPU usage this week:"
sar -u 1 1 | tail -1

echo "Average memory usage this week:"
free -h

# Database performance
mongosh $MONGODB_URI --quiet --eval "
  print('Database stats:');
  printjson(db.stats());
  print('Slow queries:');
  db.system.profile.find().sort({ts: -1}).limit(5).forEach(printjson);
"

echo "=== Performance Analysis Complete ==="
```

**2. Security Audit**
```bash
#!/bin/bash
# weekly-security-audit.sh

echo "=== Weekly Security Audit - $(date) ==="

# Check for failed authentication attempts
FAILED_AUTH=$(grep "authentication failed" /var/log/notification-service/combined.log | wc -l)
echo "Failed authentication attempts: $FAILED_AUTH"

# Check SSL certificate expiry
openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates

# Check for suspicious activity
grep -i "suspicious\|attack\|breach" /var/log/notification-service/combined.log

# Update security patches
apt list --upgradable | grep -i security

echo "=== Security Audit Complete ==="
```

### Monthly Tasks

**1. Capacity Planning Review**
```bash
#!/bin/bash
# monthly-capacity-review.sh

echo "=== Monthly Capacity Review - $(date) ==="

# Growth metrics
mongosh $MONGODB_URI --quiet --eval "
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const userGrowth = db.users.countDocuments({ createdAt: { \$gte: thirtyDaysAgo } });
  const notificationGrowth = db.notifications.countDocuments({ createdAt: { \$gte: thirtyDaysAgo } });
  print('New users this month:', userGrowth);
  print('Notifications sent this month:', notificationGrowth);
"

# Resource utilization trends
echo "Storage usage trends:"
df -h

echo "Database size trends:"
mongosh $MONGODB_URI --quiet --eval "printjson(db.stats())"

# Performance benchmarks
echo "Running performance benchmarks..."
npm run benchmark

echo "=== Capacity Review Complete ==="
```

## Database Maintenance

### MongoDB Maintenance

**1. Index Optimization**
```javascript
// monthly-index-optimization.js
const mongoose = require('mongoose');

async function optimizeIndexes() {
  console.log('Starting index optimization...');
  
  // Analyze query patterns
  const slowQueries = await db.system.profile.find({
    millis: { $gt: 100 }
  }).sort({ ts: -1 }).limit(100).toArray();
  
  console.log('Found', slowQueries.length, 'slow queries');
  
  // Check index usage
  const indexStats = await db.notifications.aggregate([
    { $indexStats: {} }
  ]).toArray();
  
  console.log('Index usage stats:', indexStats);
  
  // Remove unused indexes
  const unusedIndexes = indexStats.filter(stat => stat.accesses.ops === 0);
  for (const index of unusedIndexes) {
    if (index.name !== '_id_') {
      console.log('Dropping unused index:', index.name);
      await db.notifications.dropIndex(index.name);
    }
  }
  
  // Create missing indexes based on query patterns
  const commonQueries = [
    { "recipients.userId": 1, "createdAt": -1 },
    { "type": 1, "scheduledFor": 1 },
    { "status": 1, "createdAt": -1 }
  ];
  
  for (const indexSpec of commonQueries) {
    try {
      await db.notifications.createIndex(indexSpec);
      console.log('Created index:', indexSpec);
    } catch (error) {
      console.log('Index already exists:', indexSpec);
    }
  }
  
  console.log('Index optimization complete');
}

optimizeIndexes().catch(console.error);
```

**2. Data Cleanup**
```javascript
// data-cleanup.js
async function cleanupOldData() {
  console.log('Starting data cleanup...');
  
  // Remove old notifications (older than 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const oldNotifications = await db.notifications.deleteMany({
    createdAt: { $lt: ninetyDaysAgo },
    priority: { $nin: ['critical', 'emergency'] }
  });
  console.log('Deleted', oldNotifications.deletedCount, 'old notifications');
  
  // Remove old analytics data (older than 1 year)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const oldAnalytics = await db.notificationanalytics.deleteMany({
    date: { $lt: oneYearAgo }
  });
  console.log('Deleted', oldAnalytics.deletedCount, 'old analytics records');
  
  // Remove orphaned templates
  const activeTemplateIds = await db.notifications.distinct('templateId');
  const orphanedTemplates = await db.notificationtemplates.deleteMany({
    _id: { $nin: activeTemplateIds },
    isActive: false
  });
  console.log('Deleted', orphanedTemplates.deletedCount, 'orphaned templates');
  
  console.log('Data cleanup complete');
}

cleanupOldData().catch(console.error);
```

**3. Database Compaction**
```bash
#!/bin/bash
# compact-database.sh

echo "Starting database compaction..."

# Compact collections
mongosh $MONGODB_URI --eval "
  db.notifications.compact();
  db.notificationanalytics.compact();
  db.notificationtemplates.compact();
  db.usernotificationpreferences.compact();
"

# Rebuild indexes
mongosh $MONGODB_URI --eval "
  db.notifications.reIndex();
  db.notificationanalytics.reIndex();
"

echo "Database compaction complete"
```

### Redis Maintenance

**1. Memory Optimization**
```bash
#!/bin/bash
# redis-maintenance.sh

echo "Starting Redis maintenance..."

# Check memory usage
redis-cli -u $REDIS_URL info memory

# Remove expired keys
redis-cli -u $REDIS_URL --scan --pattern "temp:*" | xargs -r redis-cli -u $REDIS_URL del

# Optimize memory
redis-cli -u $REDIS_URL config set save "900 1 300 10 60 10000"
redis-cli -u $REDIS_URL bgsave

# Check fragmentation
FRAGMENTATION=$(redis-cli -u $REDIS_URL info memory | grep mem_fragmentation_ratio | cut -d: -f2)
echo "Memory fragmentation ratio: $FRAGMENTATION"

if (( $(echo "$FRAGMENTATION > 1.5" | bc -l) )); then
  echo "High fragmentation detected, consider restarting Redis"
fi

echo "Redis maintenance complete"
```

## Cache Management

### Cache Optimization

**1. Cache Hit Rate Analysis**
```javascript
// cache-analysis.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

async function analyzeCachePerformance() {
  console.log('Analyzing cache performance...');
  
  const info = await client.info('stats');
  const stats = {};
  
  info.split('\r\n').forEach(line => {
    const [key, value] = line.split(':');
    if (key && value) {
      stats[key] = value;
    }
  });
  
  const hitRate = (stats.keyspace_hits / (stats.keyspace_hits + stats.keyspace_misses)) * 100;
  console.log('Cache hit rate:', hitRate.toFixed(2) + '%');
  
  if (hitRate < 80) {
    console.log('WARNING: Low cache hit rate detected');
    // Analyze cache patterns
    const keys = await client.keys('*');
    const keyPatterns = {};
    
    keys.forEach(key => {
      const pattern = key.split(':')[0];
      keyPatterns[pattern] = (keyPatterns[pattern] || 0) + 1;
    });
    
    console.log('Key patterns:', keyPatterns);
  }
  
  console.log('Cache analysis complete');
}

analyzeCachePerformance().catch(console.error);
```

**2. Cache Cleanup**
```bash
#!/bin/bash
# cache-cleanup.sh

echo "Starting cache cleanup..."

# Remove expired sessions
redis-cli -u $REDIS_URL --scan --pattern "session:*" | while read key; do
  TTL=$(redis-cli -u $REDIS_URL ttl "$key")
  if [ $TTL -eq -1 ]; then
    redis-cli -u $REDIS_URL del "$key"
    echo "Removed expired session: $key"
  fi
done

# Clean up old notification queues
redis-cli -u $REDIS_URL ltrim notification_processed_queue 0 1000

# Remove old analytics cache
redis-cli -u $REDIS_URL --scan --pattern "analytics:*" | while read key; do
  CREATED=$(redis-cli -u $REDIS_URL hget "$key" "created")
  if [ -n "$CREATED" ] && [ $(($(date +%s) - CREATED)) -gt 86400 ]; then
    redis-cli -u $REDIS_URL del "$key"
  fi
done

echo "Cache cleanup complete"
```

## Log Management

### Log Rotation Configuration

**/etc/logrotate.d/notification-service**:
```
/var/log/notification-service/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Log Analysis Scripts

**1. Error Analysis**
```bash
#!/bin/bash
# analyze-errors.sh

LOG_FILE="/var/log/notification-service/combined.log"
REPORT_FILE="/tmp/error-report-$(date +%Y%m%d).txt"

echo "=== Error Analysis Report - $(date) ===" > $REPORT_FILE

# Count errors by type
echo "Error counts by type:" >> $REPORT_FILE
grep "ERROR" $LOG_FILE | awk '{print $NF}' | sort | uniq -c | sort -nr >> $REPORT_FILE

# Recent critical errors
echo -e "\nRecent critical errors:" >> $REPORT_FILE
grep -i "critical\|fatal" $LOG_FILE | tail -10 >> $REPORT_FILE

# External service errors
echo -e "\nExternal service errors:" >> $REPORT_FILE
grep -i "sendgrid\|twilio\|timeout" $LOG_FILE | tail -10 >> $REPORT_FILE

# Performance issues
echo -e "\nSlow operations:" >> $REPORT_FILE
grep "slow" $LOG_FILE | tail -10 >> $REPORT_FILE

echo "Error analysis complete. Report saved to: $REPORT_FILE"
```

**2. Performance Log Analysis**
```bash
#!/bin/bash
# analyze-performance.sh

LOG_FILE="/var/log/notification-service/combined.log"

echo "=== Performance Analysis ==="

# Average response times
echo "Average response times:"
grep "response_time" $LOG_FILE | awk '{sum+=$6; count++} END {print "Average:", sum/count "ms"}'

# Slowest endpoints
echo "Slowest endpoints:"
grep "response_time" $LOG_FILE | awk '{print $4, $6}' | sort -k2 -nr | head -10

# Memory usage trends
echo "Memory usage trends:"
grep "memory_usage" $LOG_FILE | tail -20 | awk '{print $1, $2, $NF}'

# Queue processing times
echo "Queue processing times:"
grep "queue_processed" $LOG_FILE | awk '{sum+=$NF; count++} END {print "Average queue processing:", sum/count "ms"}'
```

## Performance Optimization

### Application Performance

**1. Memory Leak Detection**
```javascript
// memory-leak-detector.js
const v8 = require('v8');
const fs = require('fs');

let heapSnapshots = [];

function takeHeapSnapshot() {
  const snapshot = v8.writeHeapSnapshot();
  heapSnapshots.push({
    timestamp: Date.now(),
    file: snapshot,
    size: fs.statSync(snapshot).size
  });
  
  // Keep only last 5 snapshots
  if (heapSnapshots.length > 5) {
    const old = heapSnapshots.shift();
    fs.unlinkSync(old.file);
  }
  
  console.log('Heap snapshot taken:', snapshot);
}

function analyzeMemoryGrowth() {
  if (heapSnapshots.length < 2) return;
  
  const latest = heapSnapshots[heapSnapshots.length - 1];
  const previous = heapSnapshots[heapSnapshots.length - 2];
  
  const growth = latest.size - previous.size;
  const growthRate = growth / (latest.timestamp - previous.timestamp) * 1000; // bytes per second
  
  console.log('Memory growth rate:', growthRate, 'bytes/second');
  
  if (growthRate > 1024 * 1024) { // 1MB/second
    console.warn('WARNING: High memory growth rate detected');
  }
}

// Take snapshots every 10 minutes
setInterval(() => {
  takeHeapSnapshot();
  analyzeMemoryGrowth();
}, 10 * 60 * 1000);
```

**2. Database Query Optimization**
```javascript
// query-optimizer.js
const mongoose = require('mongoose');

// Add query logging
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now();
  
  // Log slow queries
  process.nextTick(() => {
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn('Slow query detected:', {
        collection: collectionName,
        method: method,
        query: query,
        duration: duration + 'ms'
      });
    }
  });
});

// Optimize common queries
class NotificationOptimizer {
  static async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    
    const query = { 'recipients.userId': userId };
    if (status) query['recipients.deliveryStatus.websocket.status'] = status;
    
    // Use lean() for better performance
    return await Notification.find(query)
      .select('type title message createdAt actionUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  
  static async getNotificationStats(dateRange) {
    // Use aggregation pipeline for better performance
    return await Notification.aggregate([
      { $match: { createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
      { $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgDeliveryTime: { $avg: '$deliveryTime' }
      }},
      { $sort: { count: -1 } }
    ]);
  }
}
```

## Security Updates

### Security Patch Management

**1. Dependency Updates**
```bash
#!/bin/bash
# update-dependencies.sh

echo "Checking for security updates..."

# Check for npm vulnerabilities
npm audit

# Update dependencies
npm update

# Check for high/critical vulnerabilities
VULNERABILITIES=$(npm audit --json | jq '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical')

if [ $VULNERABILITIES -gt 0 ]; then
  echo "WARNING: $VULNERABILITIES high/critical vulnerabilities found"
  npm audit fix
  
  # If auto-fix doesn't work, manual intervention needed
  if [ $? -ne 0 ]; then
    echo "Manual intervention required for security fixes"
    npm audit --json > security-report.json
  fi
fi

echo "Dependency update complete"
```

**2. SSL Certificate Renewal**
```bash
#!/bin/bash
# renew-ssl-certificates.sh

CERT_FILE="/etc/nginx/ssl/cert.pem"
DAYS_UNTIL_EXPIRY=$(openssl x509 -in $CERT_FILE -noout -checkend $((30*24*3600)) && echo "OK" || echo "EXPIRED")

if [ "$DAYS_UNTIL_EXPIRY" = "EXPIRED" ]; then
  echo "SSL certificate expires within 30 days, renewing..."
  
  # Renew certificate (example with Let's Encrypt)
  certbot renew --nginx
  
  # Restart nginx
  systemctl reload nginx
  
  echo "SSL certificate renewed"
else
  echo "SSL certificate is valid"
fi
```

## Backup and Recovery

### Automated Backup System

**1. Database Backup**
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/notification-system"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "Starting database backup..."

# MongoDB backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb_$DATE" --gzip

# Redis backup
redis-cli -u $REDIS_URL --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Compress backups
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$BACKUP_DIR/mongodb_$DATE" "$BACKUP_DIR/redis_$DATE.rdb"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/backup_$DATE.tar.gz" s3://your-backup-bucket/notification-system/

# Cleanup old backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "mongodb_*" -mtime +1 -exec rm -rf {} \;
find $BACKUP_DIR -name "redis_*.rdb" -mtime +1 -delete

echo "Database backup complete: backup_$DATE.tar.gz"
```

**2. Configuration Backup**
```bash
#!/bin/bash
# backup-configuration.sh

CONFIG_BACKUP_DIR="/backups/config"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $CONFIG_BACKUP_DIR

# Backup application configuration
tar -czf "$CONFIG_BACKUP_DIR/app_config_$DATE.tar.gz" \
  /app/.env \
  /app/ecosystem.config.js \
  /etc/nginx/sites-available/notification-service \
  /etc/systemd/system/notification-service.service

# Backup database configuration
cp /etc/mongod.conf "$CONFIG_BACKUP_DIR/mongod_$DATE.conf"
cp /etc/redis/redis.conf "$CONFIG_BACKUP_DIR/redis_$DATE.conf"

echo "Configuration backup complete"
```

### Recovery Testing

**1. Backup Verification**
```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Extract backup
TEMP_DIR="/tmp/backup_verify_$$"
mkdir -p $TEMP_DIR
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# Verify MongoDB backup
if [ -d "$TEMP_DIR/mongodb_"* ]; then
  echo "MongoDB backup structure verified"
  # Test restore to temporary database
  mongorestore --uri="mongodb://localhost:27017/test_restore" --drop "$TEMP_DIR/mongodb_"*
  
  # Verify data integrity
  RECORD_COUNT=$(mongosh mongodb://localhost:27017/test_restore --quiet --eval "db.notifications.countDocuments()")
  echo "Restored $RECORD_COUNT notification records"
  
  # Cleanup test database
  mongosh mongodb://localhost:27017/test_restore --quiet --eval "db.dropDatabase()"
else
  echo "ERROR: MongoDB backup not found"
fi

# Verify Redis backup
if [ -f "$TEMP_DIR/redis_"*.rdb ]; then
  echo "Redis backup file verified"
else
  echo "ERROR: Redis backup not found"
fi

# Cleanup
rm -rf $TEMP_DIR

echo "Backup verification complete"
```

## Monitoring and Alerting

### Custom Monitoring Scripts

**1. Service Health Monitor**
```bash
#!/bin/bash
# monitor-service-health.sh

ALERT_EMAIL="admin@yourdomain.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

check_service_health() {
  local service_name=$1
  local health_url=$2
  
  response=$(curl -s -o /dev/null -w "%{http_code}" $health_url)
  
  if [ $response -ne 200 ]; then
    echo "ALERT: $service_name health check failed (HTTP $response)"
    
    # Send email alert
    echo "Service $service_name is unhealthy" | mail -s "Service Alert" $ALERT_EMAIL
    
    # Send Slack alert
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 Service Alert: $service_name is unhealthy (HTTP $response)\"}" \
      $SLACK_WEBHOOK
    
    return 1
  fi
  
  return 0
}

# Check main service
check_service_health "Notification Service" "http://localhost:5000/health"

# Check database
if ! mongosh $MONGODB_URI --quiet --eval "db.runCommand('ping')" > /dev/null 2>&1; then
  echo "ALERT: MongoDB connection failed"
fi

# Check Redis
if ! redis-cli -u $REDIS_URL ping > /dev/null 2>&1; then
  echo "ALERT: Redis connection failed"
fi
```

**2. Performance Monitor**
```bash
#!/bin/bash
# monitor-performance.sh

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
QUEUE_THRESHOLD=1000

# Get current metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d',' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
QUEUE_SIZE=$(redis-cli -u $REDIS_URL LLEN notification_queue)

echo "Current metrics: CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Queue: ${QUEUE_SIZE}"

# Check thresholds
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
  echo "WARNING: High CPU usage: ${CPU_USAGE}%"
fi

if [ $MEMORY_USAGE -gt $MEMORY_THRESHOLD ]; then
  echo "WARNING: High memory usage: ${MEMORY_USAGE}%"
fi

if [ $QUEUE_SIZE -gt $QUEUE_THRESHOLD ]; then
  echo "WARNING: Large notification queue: $QUEUE_SIZE"
fi
```

## Capacity Planning

### Growth Analysis

**1. Usage Trend Analysis**
```javascript
// analyze-growth-trends.js
const mongoose = require('mongoose');

async function analyzeGrowthTrends() {
  console.log('Analyzing growth trends...');
  
  // User growth over time
  const userGrowth = await User.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  console.log('User growth by month:', userGrowth);
  
  // Notification volume trends
  const notificationTrends = await Notification.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  console.log('Notification trends by type:', notificationTrends);
  
  // Calculate growth rates
  const monthlyGrowth = userGrowth.map((current, index) => {
    if (index === 0) return { ...current, growthRate: 0 };
    
    const previous = userGrowth[index - 1];
    const growthRate = ((current.count - previous.count) / previous.count) * 100;
    
    return { ...current, growthRate };
  });
  
  console.log('Monthly growth rates:', monthlyGrowth);
  
  // Predict future capacity needs
  const avgGrowthRate = monthlyGrowth
    .slice(-6) // Last 6 months
    .reduce((sum, month) => sum + month.growthRate, 0) / 6;
  
  const currentUsers = await User.countDocuments();
  const projectedUsers = Math.round(currentUsers * (1 + avgGrowthRate / 100) ** 12);
  
  console.log('Current users:', currentUsers);
  console.log('Projected users (12 months):', projectedUsers);
  console.log('Average growth rate:', avgGrowthRate.toFixed(2) + '%');
}

analyzeGrowthTrends().catch(console.error);
```

**2. Resource Planning**
```bash
#!/bin/bash
# resource-planning.sh

echo "=== Resource Planning Analysis ==="

# Current resource usage
echo "Current resource usage:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

# Database size trends
echo "Database size:"
mongosh $MONGODB_URI --quiet --eval "printjson(db.stats())"

# Network usage
echo "Network usage:"
cat /proc/net/dev | grep eth0

# Projected needs based on growth
CURRENT_NOTIFICATIONS=$(mongosh $MONGODB_URI --quiet --eval "db.notifications.countDocuments()")
GROWTH_RATE=20 # 20% monthly growth

PROJECTED_6M=$((CURRENT_NOTIFICATIONS * (100 + GROWTH_RATE * 6) / 100))
PROJECTED_12M=$((CURRENT_NOTIFICATIONS * (100 + GROWTH_RATE * 12) / 100))

echo "Current notifications: $CURRENT_NOTIFICATIONS"
echo "Projected 6 months: $PROJECTED_6M"
echo "Projected 12 months: $PROJECTED_12M"

# Resource recommendations
if [ $PROJECTED_12M -gt $((CURRENT_NOTIFICATIONS * 3)) ]; then
  echo "RECOMMENDATION: Consider scaling infrastructure within 6 months"
fi
```

## Scheduled Maintenance

### Maintenance Windows

**1. Weekly Maintenance Script**
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Starting Weekly Maintenance - $(date) ==="

# 1. Health check
./daily-health-check.sh

# 2. Performance analysis
./weekly-performance-analysis.sh

# 3. Security audit
./weekly-security-audit.sh

# 4. Database maintenance
node monthly-index-optimization.js
./compact-database.sh

# 5. Cache cleanup
./cache-cleanup.sh

# 6. Log rotation
logrotate -f /etc/logrotate.d/notification-service

# 7. Backup verification
LATEST_BACKUP=$(ls -t /backups/notification-system/backup_*.tar.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  ./verify-backup.sh "$LATEST_BACKUP"
fi

# 8. Update dependencies (if needed)
npm audit
if [ $? -ne 0 ]; then
  echo "Security vulnerabilities found, updating..."
  npm audit fix
fi

# 9. Generate maintenance report
echo "=== Weekly Maintenance Complete - $(date) ===" >> /var/log/maintenance.log

echo "Weekly maintenance complete"
```

**2. Monthly Maintenance Script**
```bash
#!/bin/bash
# monthly-maintenance.sh

echo "=== Starting Monthly Maintenance - $(date) ==="

# 1. Capacity planning review
./monthly-capacity-review.sh

# 2. Deep database cleanup
node data-cleanup.js

# 3. SSL certificate check
./renew-ssl-certificates.sh

# 4. Full system backup
./backup-database.sh
./backup-configuration.sh

# 5. Performance benchmarking
npm run benchmark > /tmp/benchmark-$(date +%Y%m%d).log

# 6. Security updates
./update-dependencies.sh

# 7. Growth analysis
node analyze-growth-trends.js

# 8. Generate monthly report
{
  echo "=== Monthly Maintenance Report - $(date) ==="
  echo "System uptime: $(uptime)"
  echo "Total notifications sent: $(mongosh $MONGODB_URI --quiet --eval 'db.notifications.countDocuments()')"
  echo "Active users: $(mongosh $MONGODB_URI --quiet --eval 'db.users.countDocuments({lastLoginAt: {$gte: new Date(Date.now() - 30*24*60*60*1000)}})')"
  echo "Average response time: $(grep 'response_time' /var/log/notification-service/combined.log | tail -1000 | awk '{sum+=$6; count++} END {print sum/count "ms"}')"
} >> /var/log/monthly-maintenance.log

echo "Monthly maintenance complete"
```

This maintenance guide provides comprehensive procedures to keep the notification system running optimally with proper monitoring, regular maintenance, and proactive capacity planning.