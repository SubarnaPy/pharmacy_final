// Performance monitoring middleware for the pharmacy platform
// Integrates with Prometheus for metrics collection and monitoring

const promClient = require('prom-client');
const onFinished = require('on-finished');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'pharmacy-backend'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics for the pharmacy platform
const metrics = {
  // HTTP request metrics
  httpRequestDuration: new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  }),

  httpRequestsTotal: new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  httpRequestSize: new promClient.Histogram({
    name: 'http_request_size_bytes',
    help: 'Size of HTTP requests in bytes',
    labelNames: ['method', 'route'],
    buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000]
  }),

  httpResponseSize: new promClient.Histogram({
    name: 'http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000]
  }),

  // Business logic metrics
  prescriptionProcessingDuration: new promClient.Histogram({
    name: 'prescription_processing_duration_seconds',
    help: 'Time taken to process prescriptions',
    labelNames: ['type', 'pharmacy_id'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600]
  }),

  prescriptionValidationFailures: new promClient.Counter({
    name: 'prescription_validation_failures_total',
    help: 'Total number of prescription validation failures',
    labelNames: ['error_type', 'pharmacy_id']
  }),

  paymentProcessingFailures: new promClient.Counter({
    name: 'payment_processing_failures_total',
    help: 'Total number of payment processing failures',
    labelNames: ['error_type', 'payment_method']
  }),

  // Database metrics
  databaseQueryDuration: new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Time taken for database queries',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
  }),

  databaseConnectionsActive: new promClient.Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections'
  }),

  // Cache metrics
  cacheHits: new promClient.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type', 'key_pattern']
  }),

  cacheMisses: new promClient.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type', 'key_pattern']
  }),

  cacheOperationDuration: new promClient.Histogram({
    name: 'cache_operation_duration_seconds',
    help: 'Time taken for cache operations',
    labelNames: ['operation', 'cache_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
  }),

  // Security metrics
  loginAttempts: new promClient.Counter({
    name: 'login_attempts_total',
    help: 'Total number of login attempts',
    labelNames: ['status', 'user_type']
  }),

  loginFailures: new promClient.Counter({
    name: 'login_failures_total',
    help: 'Total number of failed login attempts',
    labelNames: ['reason', 'user_type']
  }),

  suspiciousActivity: new promClient.Counter({
    name: 'suspicious_activity_total',
    help: 'Total number of suspicious activities detected',
    labelNames: ['activity_type', 'severity']
  }),

  rateLimitExceeded: new promClient.Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Total number of rate limit violations',
    labelNames: ['endpoint', 'user_type']
  }),

  // File upload metrics
  fileUploadDuration: new promClient.Histogram({
    name: 'file_upload_duration_seconds',
    help: 'Time taken for file uploads',
    labelNames: ['file_type', 'size_category'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  }),

  fileUploadSize: new promClient.Histogram({
    name: 'file_upload_size_bytes',
    help: 'Size of uploaded files',
    labelNames: ['file_type'],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600]
  }),

  // WebSocket metrics
  websocketConnections: new promClient.Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    labelNames: ['room_type']
  }),

  websocketMessages: new promClient.Counter({
    name: 'websocket_messages_total',
    help: 'Total number of WebSocket messages',
    labelNames: ['message_type', 'direction']
  }),

  // External API metrics
  externalApiCalls: new promClient.Counter({
    name: 'external_api_calls_total',
    help: 'Total number of external API calls',
    labelNames: ['service', 'endpoint', 'status']
  }),

  externalApiDuration: new promClient.Histogram({
    name: 'external_api_duration_seconds',
    help: 'Duration of external API calls',
    labelNames: ['service', 'endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
  })
};

// Register all metrics
Object.values(metrics).forEach(metric => {
  register.registerMetric(metric);
});

// Middleware function to collect HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route ? req.route.path : req.path;

  // Record request size
  const requestSize = parseInt(req.get('content-length')) || 0;
  if (requestSize > 0) {
    metrics.httpRequestSize.observe(
      { method: req.method, route },
      requestSize
    );
  }

  // When the response finishes
  onFinished(res, () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    // Record metrics
    metrics.httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );

    metrics.httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode
    });

    // Record response size if available
    const responseSize = parseInt(res.get('content-length')) || 0;
    if (responseSize > 0) {
      metrics.httpResponseSize.observe(
        { method: req.method, route, status_code: statusCode },
        responseSize
      );
    }
  });

  next();
};

// Helper functions for business logic metrics
const recordPrescriptionProcessing = (duration, type, pharmacyId) => {
  metrics.prescriptionProcessingDuration.observe(
    { type, pharmacy_id: pharmacyId },
    duration
  );
};

const recordPrescriptionValidationFailure = (errorType, pharmacyId) => {
  metrics.prescriptionValidationFailures.inc({
    error_type: errorType,
    pharmacy_id: pharmacyId
  });
};

const recordPaymentFailure = (errorType, paymentMethod) => {
  metrics.paymentProcessingFailures.inc({
    error_type: errorType,
    payment_method: paymentMethod
  });
};

const recordDatabaseQuery = (duration, operation, collection) => {
  metrics.databaseQueryDuration.observe(
    { operation, collection },
    duration
  );
};

const recordCacheOperation = (operation, duration, cacheType, hit = null) => {
  metrics.cacheOperationDuration.observe(
    { operation, cache_type: cacheType },
    duration
  );

  if (hit === true) {
    metrics.cacheHits.inc({ cache_type: cacheType, key_pattern: 'general' });
  } else if (hit === false) {
    metrics.cacheMisses.inc({ cache_type: cacheType, key_pattern: 'general' });
  }
};

const recordLoginAttempt = (status, userType, reason = null) => {
  metrics.loginAttempts.inc({ status, user_type: userType });
  
  if (status === 'failed' && reason) {
    metrics.loginFailures.inc({ reason, user_type: userType });
  }
};

const recordSuspiciousActivity = (activityType, severity) => {
  metrics.suspiciousActivity.inc({ activity_type: activityType, severity });
};

const recordRateLimitExceeded = (endpoint, userType) => {
  metrics.rateLimitExceeded.inc({ endpoint, user_type: userType });
};

const recordFileUpload = (duration, size, fileType) => {
  const sizeCategory = size < 1024 * 1024 ? 'small' : 
                      size < 10 * 1024 * 1024 ? 'medium' : 'large';
  
  metrics.fileUploadDuration.observe(
    { file_type: fileType, size_category: sizeCategory },
    duration
  );

  metrics.fileUploadSize.observe({ file_type: fileType }, size);
};

const recordWebSocketConnection = (roomType, delta) => {
  metrics.websocketConnections.inc({ room_type: roomType }, delta);
};

const recordWebSocketMessage = (messageType, direction) => {
  metrics.websocketMessages.inc({ message_type: messageType, direction });
};

const recordExternalApiCall = (service, endpoint, duration, status) => {
  metrics.externalApiCalls.inc({ service, endpoint, status });
  metrics.externalApiDuration.observe({ service, endpoint }, duration);
};

// Metrics endpoint
const getMetrics = async () => {
  return register.metrics();
};

module.exports = {
  metricsMiddleware,
  recordPrescriptionProcessing,
  recordPrescriptionValidationFailure,
  recordPaymentFailure,
  recordDatabaseQuery,
  recordCacheOperation,
  recordLoginAttempt,
  recordSuspiciousActivity,
  recordRateLimitExceeded,
  recordFileUpload,
  recordWebSocketConnection,
  recordWebSocketMessage,
  recordExternalApiCall,
  getMetrics,
  register
};
