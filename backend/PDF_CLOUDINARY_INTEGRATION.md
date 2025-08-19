# PDF Support and Cloudinary Integration

This document provides a comprehensive guide for the PDF support and Cloudinary integration features added to the prescription processing system.

## Overview

The system now supports:
- **PDF prescription uploads** with automatic conversion to images for OCR processing
- **Cloudinary cloud storage** for secure file hosting with signed URLs
- **Enhanced database schema** with comprehensive metadata tracking
- **Improved file handling** with support for larger files (up to 50MB)

## Features Added

### 1. PDF Processing (`PDFProcessingService.js`)
- **PDF Validation**: Checks file type, size, and integrity
- **Text Extraction**: Direct text extraction from PDFs using pdf-parse
- **Image Conversion**: Converts PDF pages to images for OCR processing
- **Cleanup Management**: Automatic cleanup of temporary files

### 2. Cloudinary Integration (`CloudinaryService.js`)
- **Secure Uploads**: Direct upload to Cloudinary with transformations
- **Signed URLs**: Generate secure, time-limited access URLs
- **Metadata Management**: Track file information and processing status
- **Thumbnail Generation**: Automatic thumbnail creation for images
- **Batch Operations**: Support for multiple file uploads

### 3. Enhanced Database Schema
- **File Metadata**: Original filename, type, size, Cloudinary URLs
- **OCR Data**: Engine used, confidence scores, extracted text statistics
- **AI Processing**: Medication analysis, interaction detection, quality assessment
- **PDF Information**: Pages, conversion method, processing details
- **Processing Metadata**: Unique IDs, timing, status tracking

## Setup Instructions

### 1. Install Dependencies
```bash
npm install cloudinary pdf2pic pdf-parse
```

### 2. Configure Environment Variables
Add to your `.env` file:
```env
# Cloudinary Configuration (Required)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# File Upload Configuration
MAX_FILE_SIZE=52428800
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/tiff,image/bmp,image/webp,application/pdf

# OCR Configuration
OCR_ENGINE=tesseract
OCR_CONFIDENCE_THRESHOLD=60

# AI Processing Configuration
AI_PROCESSING_ENABLED=true
AI_CONFIDENCE_THRESHOLD=0.7

# Processing Thresholds
AUTO_APPROVE_THRESHOLD=0.9
MANUAL_REVIEW_THRESHOLD=0.5
TEMP_FILES_CLEANUP=true
```

### 3. Cloudinary Account Setup
1. Create account at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Configure upload presets if needed (optional)

## API Usage

### Upload Prescription (Enhanced)
```http
POST /api/prescriptions/upload
Content-Type: multipart/form-data

Fields:
- file: Prescription file (image or PDF, max 50MB)
- userId: User ID (required)
- additionalNotes: Optional notes
```

### Response Format (Enhanced)
```json
{
  "success": true,
  "message": "Prescription processed successfully",
  "data": {
    "prescriptionId": "unique_id",
    "processingId": "unique_processing_id",
    "fileInfo": {
      "originalFilename": "prescription.pdf",
      "fileType": "application/pdf",
      "fileSize": 2048576,
      "cloudinaryUrl": "https://res.cloudinary.com/...",
      "cloudinaryId": "prescriptions/unique_id",
      "thumbnailUrl": "https://res.cloudinary.com/.../thumbnail"
    },
    "processing": {
      "ocrEngine": "tesseract",
      "ocrConfidence": 85.5,
      "textLength": 1243,
      "medicationsFound": 3,
      "validMedications": 3,
      "qualityLevel": "high",
      "processingTime": 5432
    },
    "pdfInfo": {
      "wasPDF": true,
      "pages": 2,
      "textExtracted": true,
      "imagesConverted": 2,
      "processingMethod": "text_extraction"
    }
  }
}
```

## File Processing Pipeline

### 1. File Upload & Validation
- File type checking (images + PDFs)
- Size validation (max 50MB)
- Security scanning

### 2. PDF Processing (if applicable)
- PDF validation and integrity check
- Text extraction attempt
- Page-to-image conversion for OCR
- Temporary file management

### 3. Cloudinary Upload
- Secure upload with transformations
- Metadata attachment
- URL generation (public + signed)
- Thumbnail creation

### 4. OCR Processing
- Text extraction from images
- Confidence scoring
- Statistics collection
- Enhanced logging for debugging

### 5. AI Analysis
- Medicine extraction and validation
- Interaction checking
- Quality assessment
- Business rules application

### 6. Database Storage
- Comprehensive metadata saving
- Cloudinary URL storage
- Processing results archival
- Status tracking

## Database Schema Updates

### Prescription Model Enhancements
```javascript
{
  // File information
  prescriptionImage: String,    // Cloudinary URL
  cloudinaryId: String,         // Cloudinary public ID
  originalFilename: String,     // Original file name
  fileType: String,            // MIME type
  fileSize: Number,            // File size in bytes
  
  // OCR data (enhanced)
  ocrData: {
    engine: String,            // OCR engine used
    confidence: Number,        // Confidence score
    rawText: String,          // Extracted text
    textLength: Number,       // Text statistics
    wordsFound: Number,       // Word count
    linesFound: Number,       // Line count
    fields: Mixed             // Parsed fields
  },
  
  // AI processing results
  aiProcessing: {
    medicationsFound: Number,
    validMedications: Number,
    unknownMedications: Number,
    hasInteractions: Boolean,
    hasAnomalies: Boolean,
    overallConfidence: Number,
    qualityLevel: String      // low/medium/high
  },
  
  // PDF processing info
  pdfInfo: {
    wasPDF: Boolean,
    pages: Number,
    textExtracted: Boolean,
    imagesConverted: Number,
    processingMethod: String   // text_extraction/image_ocr
  },
  
  // Processing metadata
  processingId: String,
  processingTime: Number,
  processingStatus: String,
  requiresManualReview: Boolean,
  businessRulesAction: String
}
```

## Error Handling

### Common Issues and Solutions

1. **Cloudinary Upload Failures**
   - Check API credentials
   - Verify file size limits
   - Check network connectivity

2. **PDF Processing Errors**
   - Ensure pdf2pic dependencies are installed
   - Check file corruption
   - Verify sufficient disk space

3. **OCR Processing Issues**
   - Check image quality
   - Verify text presence
   - Monitor confidence thresholds

4. **File Size Limits**
   - Current limit: 50MB
   - Adjust MAX_FILE_SIZE in environment
   - Consider Cloudinary plan limits

## Monitoring and Debugging

### Enhanced Logging
- OCR processing details with text samples
- Processing time tracking
- File metadata logging
- Error context information

### Processing Status Tracking
- Unique processing IDs for each upload
- Status progression monitoring
- Failure point identification
- Manual review flagging

## Security Considerations

### File Security
- Type validation and sanitization
- Size limits enforcement
- Temporary file cleanup
- Secure upload URLs

### Cloudinary Security
- Signed URLs for sensitive content
- Access control via transformations
- Automatic HTTPS enforcement
- API key protection

## Performance Optimizations

### File Processing
- Parallel processing where possible
- Efficient temporary file management
- Memory usage optimization
- Background processing for large files

### Database Operations
- Indexed queries for performance
- Efficient metadata storage
- Batch operations support
- Connection pooling

## Testing

### Test Cases to Implement
1. PDF upload and processing
2. Large file handling (up to 50MB)
3. Cloudinary integration
4. Error scenarios
5. Security validation
6. Performance benchmarks

### Manual Testing Steps
1. Upload various PDF formats
2. Test with large files
3. Verify Cloudinary URLs
4. Check database metadata
5. Test error handling
6. Validate OCR output visibility

## Migration Notes

### Existing Data
- Current prescriptions remain compatible
- New fields will be null for existing records
- Gradual migration recommended for production

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Cloudinary account set up
- [ ] Dependencies installed
- [ ] Database indexes created
- [ ] File upload limits configured
- [ ] Monitoring set up

## Support and Troubleshooting

For issues with:
- **PDF Processing**: Check PDFProcessingService logs
- **Cloudinary**: Verify configuration and quotas
- **OCR Visibility**: Check enhanced logging output
- **File Uploads**: Monitor multer and size limits
- **Database**: Verify schema updates and indexes

## Next Steps

1. **Environment Setup**: Configure Cloudinary credentials
2. **Testing**: Comprehensive testing of PDF uploads
3. **Monitoring**: Set up performance monitoring
4. **Documentation**: Update API documentation
5. **Deployment**: Gradual rollout with monitoring
