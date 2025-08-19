import pdf2pic from 'pdf2pic';
import fs from 'fs/promises';
import path from 'path';

// Dynamically import pdf-parse to avoid initialization issues
let pdfParse = null;

/**
 * PDF Processing Service for prescription PDFs
 * Converts PDFs to images and extracts text for OCR processing
 */
class PDFProcessingService {
  constructor() {
    this.tempDir = process.env.TEMP_DIR || './temp';
    this.supportedFormats = ['pdf'];
    
    // PDF to image conversion options
    this.pdf2picOptions = {
      density: 300,           // DPI for image conversion
      saveFilename: 'prescription_page',
      savePath: this.tempDir,
      format: 'png',         // Output format
      width: 2000,           // Max width
      height: 2000,          // Max height
      quality: 100           // Image quality
    };

    console.log('✅ PDF Processing Service initialized');
  }

  /**
   * Lazy load pdf-parse to avoid initialization issues
   */
  async getPdfParse() {
    if (!pdfParse) {
      try {
        const module = await import('pdf-parse');
        pdfParse = module.default;
      } catch (error) {
        console.error('❌ Failed to load pdf-parse:', error.message);
        throw new Error('PDF parsing not available');
      }
    }
    return pdfParse;
  }

  /**
   * Check if file is a PDF
   * @param {string} filePath - Path to file
   * @returns {Promise<boolean>} - True if PDF
   */
  async isPDF(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) return false;

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.pdf') return false;

      // Check file header (PDF magic bytes)
      const buffer = await fs.readFile(filePath, { start: 0, end: 4 });
      return buffer.toString() === '%PDF';

    } catch (error) {
      console.error('❌ PDF check failed:', error.message);
      return false;
    }
  }

  /**
   * Convert PDF to images for OCR processing
   * @param {string} pdfPath - Path to PDF file
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Conversion results
   */
  async convertToImages(pdfPath, options = {}) {
    try {
      console.log('📄 Converting PDF to images for OCR...');

      const {
        density = 300,
        quality = 100,
        format = 'png',
        maxPages = 10
      } = options;

      // Create unique output directory
      const outputDir = path.join(this.tempDir, `pdf_${Date.now()}`);
      await fs.mkdir(outputDir, { recursive: true });

      const conversionOptions = {
        ...this.pdf2picOptions,
        density,
        quality,
        format,
        savePath: outputDir,
        saveFilename: `page`
      };

      // Convert PDF to images
      const convert = pdf2pic.fromPath(pdfPath, conversionOptions);
      
      // Get PDF info first to determine page count
      const pdfInfo = await this.getPDFInfo(pdfPath);
      const totalPages = Math.min(pdfInfo.pages, maxPages);

      console.log(`📊 Converting ${totalPages} pages from PDF...`);

      const convertedPages = [];
      const errors = [];

      // Convert each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          console.log(`🔄 Converting page ${pageNum}/${totalPages}...`);
          
          const result = await convert(pageNum, { responseType: 'image' });
          
          if (result && result.path) {
            convertedPages.push({
              pageNumber: pageNum,
              imagePath: result.path,
              filename: result.name,
              size: await this.getFileSize(result.path)
            });
            console.log(`✅ Page ${pageNum} converted successfully`);
          }
        } catch (pageError) {
          console.error(`❌ Failed to convert page ${pageNum}:`, pageError.message);
          errors.push({
            pageNumber: pageNum,
            error: pageError.message
          });
        }
      }

      console.log(`✅ PDF conversion completed: ${convertedPages.length}/${totalPages} pages successful`);

      return {
        success: convertedPages.length > 0,
        totalPages,
        convertedPages: convertedPages.length,
        pages: convertedPages,
        errors,
        outputDirectory: outputDir,
        pdfInfo
      };

    } catch (error) {
      console.error('❌ PDF to image conversion failed:', error.message);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Extract text directly from PDF
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<Object>} - Extracted text and metadata
   */
  async extractTextFromPDF(pdfPath) {
    try {
      console.log('📝 Extracting text directly from PDF...');

      const pdfParseModule = await this.getPdfParse();
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdfParseModule(pdfBuffer);

      console.log('✅ PDF text extraction completed');
      console.log('   📊 Pages:', pdfData.numpages);
      console.log('   📝 Text length:', pdfData.text.length, 'characters');

      return {
        success: true,
        text: pdfData.text,
        pages: pdfData.numpages,
        info: pdfData.info,
        metadata: pdfData.metadata,
        version: pdfData.version,
        textLength: pdfData.text.length,
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ PDF text extraction failed:', error.message);
      return {
        success: false,
        text: '',
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get PDF information and metadata
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<Object>} - PDF information
   */
  async getPDFInfo(pdfPath) {
    try {
      const pdfParseModule = await this.getPdfParse();
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfData = await pdfParseModule(pdfBuffer, { max: 1 }); // Only parse metadata

      return {
        pages: pdfData.numpages,
        info: pdfData.info || {},
        metadata: pdfData.metadata || {},
        version: pdfData.version,
        fileSize: pdfBuffer.length,
        title: pdfData.info?.Title || 'Unknown',
        author: pdfData.info?.Author || 'Unknown',
        creator: pdfData.info?.Creator || 'Unknown',
        producer: pdfData.info?.Producer || 'Unknown',
        creationDate: pdfData.info?.CreationDate || null,
        modificationDate: pdfData.info?.ModDate || null
      };

    } catch (error) {
      console.error('❌ Failed to get PDF info:', error.message);
      return {
        pages: 0,
        error: error.message
      };
    }
  }

  /**
   * Process PDF for prescription OCR
   * Combines text extraction and image conversion
   * @param {string} pdfPath - Path to PDF file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Complete processing results
   */
  async processPrescriptionPDF(pdfPath, options = {}) {
    try {
      console.log('🏥 Processing prescription PDF...');

      const {
        extractText = true,
        convertToImages = true,
        maxPages = 5,
        preferTextExtraction = true
      } = options;

      const results = {
        pdfPath,
        processingStarted: new Date().toISOString()
      };

      // Get PDF info
      results.pdfInfo = await this.getPDFInfo(pdfPath);
      console.log(`📊 PDF has ${results.pdfInfo.pages} pages`);

      // Extract text directly if requested
      if (extractText) {
        results.textExtraction = await this.extractTextFromPDF(pdfPath);
        
        // If we got good text and prefer text extraction, we might skip image conversion
        if (preferTextExtraction && results.textExtraction.success && 
            results.textExtraction.textLength > 100) {
          console.log('✅ Good text extracted from PDF, skipping image conversion');
          results.recommendedMethod = 'text_extraction';
          results.processingCompleted = new Date().toISOString();
          return results;
        }
      }

      // Convert to images if requested or text extraction failed
      if (convertToImages) {
        results.imageConversion = await this.convertToImages(pdfPath, { maxPages });
        results.recommendedMethod = 'image_ocr';
      }

      results.processingCompleted = new Date().toISOString();
      
      console.log('✅ PDF processing completed');
      return results;

    } catch (error) {
      console.error('❌ PDF processing failed:', error.message);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Get file size
   * @param {string} filePath - Path to file
   * @returns {Promise<number>} - File size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Clean up temporary PDF processing files
   * @param {string} outputDirectory - Directory to clean up
   */
  async cleanupPDFFiles(outputDirectory) {
    try {
      if (outputDirectory && outputDirectory.includes('pdf_')) {
        await fs.rm(outputDirectory, { recursive: true, force: true });
        console.log('🗑️ Cleaned up PDF processing files');
      }
    } catch (error) {
      console.error('⚠️ Failed to cleanup PDF files:', error.message);
    }
  }

  /**
   * Validate PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<Object>} - Validation results
   */
  async validatePDF(filePath) {
    try {
      const isValidPDF = await this.isPDF(filePath);
      
      if (!isValidPDF) {
        return {
          isValid: false,
          error: 'File is not a valid PDF'
        };
      }

      const pdfInfo = await this.getPDFInfo(filePath);
      
      if (pdfInfo.pages === 0) {
        return {
          isValid: false,
          error: 'PDF has no pages'
        };
      }

      if (pdfInfo.pages > 20) {
        return {
          isValid: false,
          error: 'PDF has too many pages (maximum 20 allowed)'
        };
      }

      if (pdfInfo.fileSize > 50 * 1024 * 1024) { // 50MB
        return {
          isValid: false,
          error: 'PDF file is too large (maximum 50MB allowed)'
        };
      }

      return {
        isValid: true,
        pdfInfo
      };

    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
}

export default PDFProcessingService;
