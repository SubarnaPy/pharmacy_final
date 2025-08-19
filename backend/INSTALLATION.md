# Advanced Prescription Processing System - Installation Guide

## Overview
This document provides installation instructions for the advanced prescription processing system with OCR and AI capabilities implemented in Task 5.

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn package manager
- Git (for repository management)
- Optional: Redis (for advanced rate limiting)
- Optional: AWS account (for AWS Textract OCR)

## Required Dependencies

### Core Processing Dependencies
```bash
# OCR Processing
npm install tesseract.js@4.1.4
npm install @aws-sdk/client-textract@3.478.0

# AI and NLP Processing  
npm install natural@6.12.0
npm install compromise@14.10.0

# Image Processing
npm install sharp@0.32.6
npm install jimp@0.22.10

# File Upload and Processing
npm install multer@1.4.5

# API Rate Limiting
npm install express-rate-limit@7.1.5
npm install rate-limit-redis@4.2.0
npm install redis@4.6.11

# Request Validation
npm install express-validator@7.0.1
```

### Installation Commands

#### 1. Install Core OCR Dependencies
```bash
npm install tesseract.js @aws-sdk/client-textract
```

#### 2. Install AI and NLP Dependencies
```bash
npm install natural compromise
```

#### 3. Install Image Processing Dependencies
```bash
npm install sharp jimp
```

#### 4. Install Web Framework Dependencies
```bash
npm install multer express-validator
```

#### 5. Install Rate Limiting Dependencies
```bash
npm install express-rate-limit rate-limit-redis redis
```

#### 6. All-in-One Installation (if supported)
```bash
npm install tesseract.js @aws-sdk/client-textract natural compromise sharp jimp multer express-rate-limit rate-limit-redis redis express-validator
```

## Environment Configuration

### Required Environment Variables
Create a `.env` file in the backend root directory:

```env
# Application Settings
NODE_ENV=development
PORT=5000
JWT_SECRET=your-jwt-secret-key

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/pharmacy-db

# File Upload Configuration
UPLOAD_DIR=uploads/
MAX_FILE_SIZE=10485760  # 10MB in bytes
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# OCR Configuration
TESSERACT_LANG=eng
TESSERACT_OEM=1
TESSERACT_PSM=3

# AWS Textract (Optional)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
RATE_LIMIT_MAX_REQUESTS=100

# AI Processing
NLP_CONFIDENCE_THRESHOLD=0.7
OCR_CONFIDENCE_THRESHOLD=0.6
```

## Directory Structure

### Service Files Created
```
backend/src/
├── services/
│   ├── ocr/
│   │   └── AdvancedOCRService.js
│   ├── ai/
│   │   └── AdvancedAIService.js
│   ├── imageProcessing/
│   │   └── AdvancedImageProcessingService.js
│   └── PrescriptionProcessingService.js
├── controllers/
│   └── PrescriptionController.js
├── routes/
│   └── prescriptionRoutes.js
└── middleware/
    ├── rateLimiter.js
    └── validation.js
```

### Required Directories
```bash
# Create required directories
mkdir -p uploads/prescriptions
mkdir -p uploads/processed
mkdir -p temp/ocr
mkdir -p temp/image-processing
mkdir -p logs
```

## Feature Capabilities

### 1. Advanced OCR Service
- **Multi-Engine Support**: Tesseract.js and AWS Textract
- **Preprocessing Pipeline**: Image enhancement, noise reduction, deskewing
- **Confidence Scoring**: Quality assessment and fallback strategies
- **Language Support**: Multiple language recognition
- **Format Support**: JPEG, PNG, TIFF, BMP, PDF

### 2. Advanced AI Service
- **NLP Processing**: Natural language processing with Natural.js and Compromise.js
- **Medication Database**: 50+ common medications with dosage validation
- **Drug Interaction Matrix**: 100+ known drug interactions
- **Anomaly Detection**: Statistical analysis and pattern recognition
- **Dosage Validation**: Comprehensive dosage format and range checking
- **Prescriber Information**: Doctor and clinic detail extraction

### 3. Advanced Image Processing Service
- **Quality Analysis**: Automated image quality assessment
- **Enhancement Pipeline**: Contrast enhancement, sharpening, noise reduction
- **Preprocessing**: Optimization for OCR accuracy
- **Format Conversion**: Automatic format standardization
- **Batch Processing**: Multiple image processing capabilities

### 4. Unified Processing Service
- **Pipeline Orchestration**: Seamless integration of all services
- **Quality Assessment**: Comprehensive confidence scoring
- **Business Rules**: Automated decision making and recommendations
- **Batch Processing**: Concurrent processing with configurable limits
- **Statistics Tracking**: Processing metrics and performance monitoring

### 5. API Endpoints
- `POST /api/prescriptions/process` - Single prescription processing
- `POST /api/prescriptions/process-batch` - Batch prescription processing
- `GET /api/prescriptions/history` - Processing history with pagination
- `GET /api/prescriptions/stats` - Processing statistics
- `GET /api/prescriptions/:processingId` - Get specific processing result
- `POST /api/prescriptions/:processingId/validate` - Manual validation
- `GET /api/prescriptions/health` - Service health check
- `GET /api/prescriptions/supported-types` - Supported file types

## Testing

### Unit Testing
```bash
npm run test:unit
```

### Integration Testing
```bash
npm run test:integration
```

### API Testing
```bash
npm run test:api
```

## Performance Optimization

### Recommended Settings
- **Concurrency**: 3-5 concurrent processing tasks
- **Memory**: Minimum 2GB RAM for image processing
- **Storage**: SSD recommended for temporary file operations
- **Network**: Stable connection for AWS Textract API calls

### Monitoring
- Processing time metrics
- Confidence score tracking
- Error rate monitoring
- Resource utilization tracking

## Troubleshooting

### Common Issues

#### 1. Tesseract.js Installation
```bash
# If installation fails, try:
npm install --no-optional tesseract.js
```

#### 2. Sharp Installation (Windows)
```bash
# For Windows build issues:
npm install --platform=win32 --arch=x64 sharp
```

#### 3. Redis Connection
```bash
# Ensure Redis is running:
redis-server
```

#### 4. AWS Textract Permissions
Ensure your AWS credentials have the following permissions:
- `textract:DetectDocumentText`
- `textract:AnalyzeDocument`

### Error Codes
- `OCR_ERROR`: OCR processing failed
- `AI_ERROR`: AI processing failed
- `IMAGE_PROCESSING_ERROR`: Image processing failed
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded

## Security Considerations

### File Upload Security
- File type validation
- Size limitations
- Virus scanning (recommended)
- Secure temporary file handling

### API Security
- JWT authentication
- Rate limiting
- Input sanitization
- CORS configuration

### Data Privacy
- Automatic file cleanup
- Secure temporary storage
- Audit logging
- HIPAA compliance considerations

## Production Deployment

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Nginx Configuration
```nginx
upstream pharmacy_backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 10M;
    
    location /api/prescriptions/process {
        proxy_pass http://pharmacy_backend;
        proxy_timeout 300s;
    }
}
```

## Support and Maintenance

### Monitoring Tools
- Application Performance Monitoring (APM)
- Log aggregation
- Health check endpoints
- Performance metrics

### Backup Strategy
- Database backups
- Configuration backups
- Application logs retention

### Updates and Patches
- Regular security updates
- Dependency vulnerability scanning
- Feature updates and improvements

---

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install tesseract.js @aws-sdk/client-textract natural compromise sharp jimp multer express-rate-limit rate-limit-redis redis express-validator
   ```

2. **Configure Environment**:
   - Copy `.env.example` to `.env`
   - Update configuration values

3. **Create Directories**:
   ```bash
   mkdir -p uploads/prescriptions uploads/processed temp/ocr temp/image-processing logs
   ```

4. **Start Application**:
   ```bash
   npm run dev
   ```

5. **Test API**:
   ```bash
   curl -X GET http://localhost:5000/api/prescriptions/health
   ```

## Advanced Configuration

### Custom OCR Settings
```javascript
// In AdvancedOCRService.js
const ocrConfig = {
  tesseract: {
    lang: 'eng+fra+spa',  // Multiple languages
    oem: 1,               // LSTM only
    psm: 3                // Fully automatic page segmentation
  },
  aws: {
    region: 'us-east-1',
    timeout: 30000
  }
};
```

### Custom AI Processing
```javascript
// In AdvancedAIService.js
const aiConfig = {
  nlp: {
    stemmer: 'porter',
    tokenizer: 'aggressive',
    sentiment: true
  },
  validation: {
    strictMode: true,
    customRules: true
  }
};
```

This comprehensive installation guide covers all aspects of setting up and configuring the advanced prescription processing system implemented in Task 5.
