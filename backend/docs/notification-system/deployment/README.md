# Deployment Guide - Advanced Notification System

## Overview

This guide covers the deployment procedures, configuration management, and infrastructure requirements for the Advanced Notification System in production environments.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Configuration Management](#configuration-management)
4. [Deployment Procedures](#deployment-procedures)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Security Configuration](#security-configuration)
7. [Performance Optimization](#performance-optimization)
8. [Disaster Recovery](#disaster-recovery)

## System Requirements

### Minimum Hardware Requirements

**Application Servers**:
- CPU: 4 cores (8 recommended)
- RAM: 8GB (16GB recommended)
- Storage: 100GB SSD
- Network: 1Gbps connection

**Database Servers**:
- CPU: 8 cores (16 recommended)
- RAM: 16GB (32GB recommended)
- Storage: 500GB SSD with high IOPS
- Network: 10Gbps connection

**Cache Servers (Redis)**:
- CPU: 4 cores
- RAM: 8GB (16GB recommended)
- Storage: 50GB SSD
- Network: 1Gbps connection

### Software Requirements

**Operating System**:
- Ubuntu 20.04 LTS or later
- CentOS 8 or later
- Amazon Linux 2

**Runtime Environment**:
- Node.js 18.x or later
- npm 8.x or later
- PM2 for process management

**Database**:
- MongoDB 5.0 or later
- Redis 6.0 or later

**External Services**:
- SendGrid account with API key
- Twilio account with API credentials
- AWS account (for SES and SNS backup)

## Infrastructure Setup

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │    Database     │
│    (HAProxy)    │────│     Servers     │────│   (MongoDB)     │
│                 │    │   (Node.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐    ┌─────────────────┐
                       │      Cache      │    │  External APIs  │
                       │    (Redis)      │    │ SendGrid/Twilio │
                       └─────────────────┘    └─────────────────┘
```

### Docker Setup

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000

CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/healthcare
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:6.0-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

### Kubernetes Deployment

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  labels:
    app: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: your-registry/notification-service:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: mongodb-uri
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: notification-service
spec:
  selector:
    app: notification-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
```

## Configuration Management

### Environment Variables

**Production Environment (.env.production)**:
```bash
# Application
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://mongo-cluster:27017/healthcare_prod
MONGODB_OPTIONS={"replicaSet":"rs0","readPreference":"secondaryPreferred"}

# Cache
REDIS_URL=redis://redis-cluster:6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# External Services
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Healthcare Platform

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
AWS_SNS_REGION=us-east-1

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
CORS_ORIGIN=https://yourdomain.com

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_newrelic_key

# Feature Flags
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_TRACKING=true
ENABLE_ANALYTICS=true
ENABLE_RATE_LIMITING=true

# Performance
MAX_CONCURRENT_NOTIFICATIONS=100
NOTIFICATION_QUEUE_SIZE=10000
REDIS_CONNECTION_POOL_SIZE=10
```

### Configuration Validation

**config/validator.js**:
```javascript
const Joi = require('joi');

const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().port().default(5000),
  
  // Database
  MONGODB_URI: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  
  // External Services
  SENDGRID_API_KEY: Joi.string().required(),
  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  
  // Security
  JWT_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  
  // Optional
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  ENABLE_SMS_NOTIFICATIONS: Joi.boolean().default(true),
  ENABLE_EMAIL_TRACKING: Joi.boolean().default(true)
});

function validateConfig() {
  const { error, value } = configSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: false
  });
  
  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }
  
  return value;
}

module.exports = { validateConfig };
```

## Deployment Procedures

### Automated Deployment Pipeline

**GitHub Actions (.github/workflows/deploy.yml)**:
```yaml
name: Deploy Notification Service

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run test
    - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Build Docker image
      run: |
        docker build -t notification-service:${{ github.sha }} .
        docker tag notification-service:${{ github.sha }} notification-service:latest
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push notification-service:${{ github.sha }}
        docker push notification-service:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to production
      run: |
        # Update Kubernetes deployment
        kubectl set image deployment/notification-service notification-service=notification-service:${{ github.sha }}
        kubectl rollout status deployment/notification-service
```

### Manual Deployment Steps

**1. Pre-deployment Checklist**:
```bash
# Verify environment configuration
npm run config:validate

# Run tests
npm run test:all

# Build application
npm run build

# Verify external service connectivity
npm run health:check
```

**2. Database Migration**:
```bash
# Run database migrations
npm run migrate:up

# Verify migration success
npm run migrate:status
```

**3. Application Deployment**:
```bash
# Stop existing processes
pm2 stop notification-service

# Deploy new version
git pull origin main
npm ci --production

# Start application
pm2 start ecosystem.config.js
pm2 save
```

**4. Post-deployment Verification**:
```bash
# Health check
curl -f http://localhost:5000/health

# Send test notification
npm run test:notification

# Verify external services
npm run test:external-services
```

### Blue-Green Deployment

**deployment-script.sh**:
```bash
#!/bin/bash

set -e

BLUE_PORT=5000
GREEN_PORT=5001
CURRENT_COLOR=$(curl -s http://localhost/health | jq -r '.color // "blue"')
NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")
NEW_PORT=$([ "$NEW_COLOR" = "blue" ] && echo $BLUE_PORT || echo $GREEN_PORT)

echo "Current deployment: $CURRENT_COLOR"
echo "Deploying to: $NEW_COLOR on port $NEW_PORT"

# Deploy to inactive environment
PORT=$NEW_PORT pm2 start ecosystem.config.js --name "notification-$NEW_COLOR"

# Wait for application to be ready
sleep 30

# Health check
if curl -f "http://localhost:$NEW_PORT/health"; then
  echo "Health check passed"
else
  echo "Health check failed"
  pm2 delete "notification-$NEW_COLOR"
  exit 1
fi

# Switch traffic
nginx -s reload

# Stop old deployment
pm2 delete "notification-$CURRENT_COLOR"

echo "Deployment completed successfully"
```

## Monitoring and Alerting

### Health Checks

**health-check.js**:
```javascript
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database check
    if (mongoose.connection.readyState === 1) {
      health.checks.database = 'healthy';
    } else {
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Redis check
    const redisClient = redis.createClient(process.env.REDIS_URL);
    await redisClient.ping();
    health.checks.redis = 'healthy';
    await redisClient.quit();

    // External services check
    health.checks.sendgrid = await checkSendGrid();
    health.checks.twilio = await checkTwilio();

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/ready', (req, res) => {
  // Readiness probe for Kubernetes
  res.status(200).json({ status: 'ready' });
});

module.exports = router;
```

### Prometheus Metrics

**metrics.js**:
```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const notificationsSent = new prometheus.Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['type', 'channel', 'status']
});

const notificationDeliveryTime = new prometheus.Histogram({
  name: 'notification_delivery_duration_seconds',
  help: 'Time taken to deliver notifications',
  labelNames: ['channel', 'provider']
});

const activeConnections = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

// Middleware to collect HTTP metrics
function collectHttpMetrics(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
}

module.exports = {
  httpRequestDuration,
  notificationsSent,
  notificationDeliveryTime,
  activeConnections,
  collectHttpMetrics,
  register: prometheus.register
};
```

### Alerting Rules

**alerting-rules.yml**:
```yaml
groups:
- name: notification-service
  rules:
  - alert: NotificationServiceDown
    expr: up{job="notification-service"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Notification service is down"
      description: "Notification service has been down for more than 1 minute"

  - alert: HighNotificationFailureRate
    expr: rate(notifications_sent_total{status="failed"}[5m]) / rate(notifications_sent_total[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High notification failure rate"
      description: "Notification failure rate is {{ $value | humanizePercentage }}"

  - alert: DatabaseConnectionFailed
    expr: mongodb_up == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "Database connection failed"
      description: "Cannot connect to MongoDB database"

  - alert: RedisConnectionFailed
    expr: redis_up == 0
    for: 30s
    labels:
      severity: warning
    annotations:
      summary: "Redis connection failed"
      description: "Cannot connect to Redis cache"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes / 1024 / 1024 > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }}MB"
```

## Security Configuration

### SSL/TLS Setup

**nginx.conf**:
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://notification-service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://notification-service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Firewall Configuration

**firewall-rules.sh**:
```bash
#!/bin/bash

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application port (internal only)
ufw allow from 10.0.0.0/8 to any port 5000

# Allow database access (internal only)
ufw allow from 10.0.0.0/8 to any port 27017
ufw allow from 10.0.0.0/8 to any port 6379

# Enable firewall
ufw --force enable
```

## Performance Optimization

### PM2 Configuration

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'notification-service',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Database Optimization

**MongoDB Indexes**:
```javascript
// Create indexes for optimal performance
db.notifications.createIndex({ "recipients.userId": 1, "createdAt": -1 });
db.notifications.createIndex({ "type": 1, "createdAt": -1 });
db.notifications.createIndex({ "scheduledFor": 1 });
db.notifications.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

db.usernotificationpreferences.createIndex({ "userId": 1 }, { unique: true });
db.notificationtemplates.createIndex({ "type": 1, "isActive": 1 });
db.notificationanalytics.createIndex({ "date": 1 });
```

### Redis Configuration

**redis.conf**:
```
# Memory optimization
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 0

# Security
requirepass your_redis_password
```

## Disaster Recovery

### Backup Procedures

**backup-script.sh**:
```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/notification-system"

# Create backup directory
mkdir -p $BACKUP_DIR

# MongoDB backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb_$DATE"

# Redis backup
redis-cli --rdb "$BACKUP_DIR/redis_$DATE.rdb"

# Application configuration backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" /app/config

# Upload to S3
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/notification-system/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Recovery Procedures

**recovery-script.sh**:
```bash
#!/bin/bash

BACKUP_DATE=$1
BACKUP_DIR="/backups/notification-system"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  exit 1
fi

# Stop services
pm2 stop notification-service

# Restore MongoDB
mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_DIR/mongodb_$BACKUP_DATE"

# Restore Redis
redis-cli FLUSHALL
redis-cli --rdb "$BACKUP_DIR/redis_$BACKUP_DATE.rdb"

# Restore configuration
tar -xzf "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" -C /

# Start services
pm2 start notification-service

echo "Recovery completed for backup: $BACKUP_DATE"
```

This deployment guide provides comprehensive procedures for deploying and managing the notification system in production environments with proper monitoring, security, and disaster recovery measures.