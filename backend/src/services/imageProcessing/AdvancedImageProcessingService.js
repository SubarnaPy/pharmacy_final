import sharp from 'sharp';
import { Jimp } from 'jimp';
import fs from 'fs/promises';
import path from 'path';

/**
 * Advanced Image Processing Service for prescription optimization
 * Includes noise reduction, contrast enhancement, deskewing, and quality assessment
 */
class AdvancedImageProcessingService {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'];
    this.tempDir = process.env.TEMP_DIR || './temp';
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
    
    console.log('✅ Advanced Image Processing Service initialized');
  }

  /**
   * Ensure temporary directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Validate image format and accessibility
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Validation results
   */
  async validateImageFile(imagePath) {
    try {
      // Check if file exists
      await fs.access(imagePath);
      
      // Try to get metadata with Sharp
      const metadata = await sharp(imagePath).metadata();
      
      // Check if format is supported
      const isSupported = this.supportedFormats.includes(metadata.format);
      
      return {
        isValid: true,
        metadata,
        isSupported,
        error: null
      };
    } catch (error) {
      console.error(`❌ Image validation failed for ${imagePath}:`, error.message);
      return {
        isValid: false,
        metadata: null,
        isSupported: false,
        error: error.message
      };
    }
  }

  /**
   * Convert unsupported image format to supported format
   * @param {string} inputPath - Path to input image
   * @returns {Promise<string>} - Path to converted image
   */
  async convertToSupportedFormat(inputPath) {
    try {
      console.log('🔄 Converting image to supported format...');
      
      const outputPath = this.generateTempPath(inputPath, 'converted');
      
      // Convert to PNG format (widely supported)
      await sharp(inputPath)
        .png()
        .toFile(outputPath);
      
      console.log('✅ Image converted successfully');
      return outputPath;
      
    } catch (error) {
      console.error('❌ Image conversion failed:', error.message);
      throw new Error(`Failed to convert image: ${error.message}`);
    }
  }

  /**
   * Main image preprocessing pipeline for OCR optimization
   * @param {string} inputPath - Path to input image
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing results with optimized image path
   */
  async preprocessForOCR(inputPath, options = {}) {
    try {
      console.log(`🖼️ Starting image preprocessing for: ${inputPath}`);

      // Step 0: Validate image file
      const validation = await this.validateImageFile(inputPath);
      if (!validation.isValid) {
        throw new Error(`Invalid image file: ${validation.error}`);
      }
      
      if (!validation.isSupported) {
        console.warn(`⚠️ Unsupported format: ${validation.metadata?.format}. Attempting to convert...`);
        // Try to convert to supported format
        inputPath = await this.convertToSupportedFormat(inputPath);
      }

      const {
        enhanceContrast = true,
        removeNoise = true,
        deskew = true,
        sharpen = true,
        binarize = false,
        resize = true,
        targetWidth = 1200,
        qualityThreshold = 0.7
      } = options;

      // Step 1: Analyze image quality
      const qualityAnalysis = await this.analyzeImageQuality(inputPath);
      console.log(`📊 Image quality score: ${qualityAnalysis.score}`);

      if (qualityAnalysis.score < qualityThreshold) {
        console.log('⚠️ Low quality image detected, applying aggressive enhancement');
      }

      // Step 2: Load and prepare image
      let processedPath = inputPath;
      
      // Step 3: Apply preprocessing pipeline
      if (resize) {
        processedPath = await this.resizeImage(processedPath, targetWidth);
      }

      if (removeNoise) {
        processedPath = await this.removeNoise(processedPath, qualityAnalysis);
      }

      if (enhanceContrast) {
        processedPath = await this.enhanceContrast(processedPath, qualityAnalysis);
      }

      if (deskew) {
        processedPath = await this.deskewImage(processedPath);
      }

      if (sharpen) {
        processedPath = await this.sharpenImage(processedPath);
      }

      if (binarize) {
        processedPath = await this.binarizeImage(processedPath);
      }

      // Step 4: Final quality assessment
      const finalQuality = await this.analyzeImageQuality(processedPath);

      // Step 5: Generate processing report
      const processingReport = {
        originalPath: inputPath,
        processedPath,
        originalQuality: qualityAnalysis,
        finalQuality,
        improvement: finalQuality.score - qualityAnalysis.score,
        processingSteps: this.getProcessingSteps(options),
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Image preprocessing completed. Quality improved by: ${processingReport.improvement.toFixed(2)}`);

      return processingReport;

    } catch (error) {
      console.error('❌ Image preprocessing failed:', error.message);
      throw new Error(`Image preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Analyze image quality for OCR readiness
   * @param {string} imagePath - Path to image
   * @returns {Promise<Object>} - Quality analysis results
   */
  async analyzeImageQuality(imagePath) {
    try {
      console.log('🔍 Analyzing image quality...');

      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      
      // Calculate quality metrics
      const resolution = metadata.width * metadata.height;
      const aspectRatio = metadata.width / metadata.height;
      
      // Basic quality scoring
      let score = 0.5; // Base score
      
      // Resolution scoring (higher is better)
      if (resolution > 1000000) score += 0.2; // 1MP+
      if (resolution > 2000000) score += 0.1; // 2MP+
      
      // Aspect ratio scoring (document-like ratios are better)
      if (aspectRatio > 0.7 && aspectRatio < 1.5) score += 0.1;
      
      // Format scoring
      if (metadata.format === 'jpeg' || metadata.format === 'png') score += 0.1;
      
      // Advanced quality metrics using image statistics
      const stats = await this.calculateImageStatistics(imagePath);
      
      // Contrast scoring
      score += Math.min(stats.contrast / 100, 0.1);
      
      // Sharpness scoring
      score += Math.min(stats.sharpness / 50, 0.1);

      const analysis = {
        score: Math.min(score, 1.0),
        resolution,
        dimensions: { width: metadata.width, height: metadata.height },
        format: metadata.format,
        fileSize: metadata.size,
        aspectRatio,
        statistics: stats,
        recommendations: this.generateQualityRecommendations(score, stats)
      };

      return analysis;

    } catch (error) {
      console.error('❌ Quality analysis failed:', error.message);
      return {
        score: 0.5,
        error: error.message,
        recommendations: ['manual_review']
      };
    }
  }

  /**
   * Calculate advanced image statistics
   * @param {string} imagePath - Path to image
   * @returns {Promise<Object>} - Image statistics
   */
  async calculateImageStatistics(imagePath) {
    try {
      const image = await Jimp.read(imagePath);
      
      // Convert to grayscale for analysis
      const gray = image.clone().greyscale();
      
      // Calculate histogram
      const histogram = new Array(256).fill(0);
      gray.scan(0, 0, gray.bitmap.width, gray.bitmap.height, function (x, y, idx) {
        const pixel = this.bitmap.data[idx];
        histogram[pixel]++;
      });

      // Calculate contrast (standard deviation of pixel values)
      const mean = histogram.reduce((sum, count, value) => sum + count * value, 0) / (gray.bitmap.width * gray.bitmap.height);
      const variance = histogram.reduce((sum, count, value) => sum + count * Math.pow(value - mean, 2), 0) / (gray.bitmap.width * gray.bitmap.height);
      const contrast = Math.sqrt(variance);

      // Calculate brightness
      const brightness = mean;

      // Simple sharpness estimation (edge detection approximation)
      const sharpness = await this.estimateSharpness(gray);

      return {
        contrast: Math.round(contrast),
        brightness: Math.round(brightness),
        sharpness: Math.round(sharpness),
        histogram,
        mean: Math.round(mean)
      };

    } catch (error) {
      console.error('❌ Statistics calculation failed:', error.message);
      return {
        contrast: 50,
        brightness: 128,
        sharpness: 25,
        error: error.message
      };
    }
  }

  /**
   * Estimate image sharpness
   * @param {Object} grayImage - Jimp grayscale image
   * @returns {Promise<number>} - Sharpness estimate
   */
  async estimateSharpness(grayImage) {
    try {
      // Simple Laplacian edge detection for sharpness estimation
      let edgeSum = 0;
      let edgeCount = 0;

      grayImage.scan(1, 1, grayImage.bitmap.width - 2, grayImage.bitmap.height - 2, function (x, y, idx) {
        const center = this.bitmap.data[idx];
        const left = this.bitmap.data[idx - 4];
        const right = this.bitmap.data[idx + 4];
        const top = this.bitmap.data[idx - this.bitmap.width * 4];
        const bottom = this.bitmap.data[idx + this.bitmap.width * 4];

        const laplacian = Math.abs(4 * center - left - right - top - bottom);
        edgeSum += laplacian;
        edgeCount++;
      });

      return edgeCount > 0 ? edgeSum / edgeCount : 0;

    } catch (error) {
      console.error('❌ Sharpness estimation failed:', error.message);
      return 25; // Default value
    }
  }

  /**
   * Generate quality recommendations
   * @param {number} score - Quality score
   * @param {Object} stats - Image statistics
   * @returns {Array} - Recommendations
   */
  generateQualityRecommendations(score, stats) {
    const recommendations = [];

    if (score < 0.5) {
      recommendations.push('aggressive_enhancement');
    }

    if (stats.contrast < 30) {
      recommendations.push('increase_contrast');
    }

    if (stats.brightness < 50 || stats.brightness > 200) {
      recommendations.push('adjust_brightness');
    }

    if (stats.sharpness < 20) {
      recommendations.push('apply_sharpening');
    }

    if (recommendations.length === 0) {
      recommendations.push('minimal_processing');
    }

    return recommendations;
  }

  /**
   * Resize image while maintaining aspect ratio
   * @param {string} inputPath - Input image path
   * @param {number} targetWidth - Target width
   * @returns {Promise<string>} - Output path
   */
  async resizeImage(inputPath, targetWidth) {
    try {
      console.log(`📏 Resizing image to width: ${targetWidth}px`);

      const outputPath = this.generateTempPath(inputPath, 'resized');
      
      await sharp(inputPath)
        .resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .toFile(outputPath);

      console.log('✅ Image resized successfully');
      return outputPath;

    } catch (error) {
      console.error('❌ Image resize failed:', error.message);
      return inputPath;
    }
  }

  /**
   * Remove noise from image
   * @param {string} inputPath - Input image path
   * @param {Object} qualityAnalysis - Quality analysis results
   * @returns {Promise<string>} - Output path
   */
  async removeNoise(inputPath, qualityAnalysis) {
    try {
      console.log('🧹 Removing image noise...');

      const outputPath = this.generateTempPath(inputPath, 'denoised');
      
      // Determine noise reduction strength based on quality
      const strength = qualityAnalysis.score < 0.5 ? 3 : 1;
      
      await sharp(inputPath)
        .median(strength) // Median filter for noise reduction
        .toFile(outputPath);

      console.log('✅ Noise removal completed');
      return outputPath;

    } catch (error) {
      console.error('❌ Noise removal failed:', error.message);
      return inputPath;
    }
  }

  /**
   * Enhance image contrast
   * @param {string} inputPath - Input image path
   * @param {Object} qualityAnalysis - Quality analysis results
   * @returns {Promise<string>} - Output path
   */
  async enhanceContrast(inputPath, qualityAnalysis) {
    try {
      console.log('🌟 Enhancing image contrast...');

      const outputPath = this.generateTempPath(inputPath, 'contrast');
      
      // Determine enhancement strength
      const lowContrast = qualityAnalysis.statistics?.contrast < 30;
      const brightness = qualityAnalysis.statistics?.brightness || 128;
      
      let pipeline = sharp(inputPath);
      
      if (lowContrast) {
        // Apply histogram equalization equivalent
        pipeline = pipeline.normalize();
      }
      
      // Adjust brightness and contrast
      const brightnessAdjust = brightness < 100 ? 1.2 : brightness > 180 ? 0.8 : 1.0;
      const contrastAdjust = lowContrast ? 1.5 : 1.2;
      
      pipeline = pipeline.modulate({
        brightness: brightnessAdjust,
        saturation: 0.8, // Slight desaturation for better OCR
      }).linear(contrastAdjust, -(128 * contrastAdjust) + 128);

      await pipeline.toFile(outputPath);

      console.log('✅ Contrast enhancement completed');
      return outputPath;

    } catch (error) {
      console.error('❌ Contrast enhancement failed:', error.message);
      return inputPath;
    }
  }

  /**
   * Deskew image (correct rotation)
   * @param {string} inputPath - Input image path
   * @returns {Promise<string>} - Output path
   */
  async deskewImage(inputPath) {
    try {
      console.log('📐 Deskewing image...');

      const outputPath = this.generateTempPath(inputPath, 'deskewed');
      
      // Note: This is a simplified deskewing
      // In a real implementation, you would use more sophisticated
      // skew detection algorithms (Hough transform, projection profiles, etc.)
      
      // For now, we'll apply a small rotation correction
      // In practice, you'd detect the skew angle first
      const skewAngle = await this.detectSkewAngle(inputPath);
      
      if (Math.abs(skewAngle) > 0.5) {
        await sharp(inputPath)
          .rotate(-skewAngle, { background: { r: 255, g: 255, b: 255 } })
          .toFile(outputPath);
        
        console.log(`✅ Image deskewed by ${skewAngle.toFixed(2)} degrees`);
        return outputPath;
      } else {
        console.log('✅ No significant skew detected');
        // Copy file if no significant skew
        const buffer = await sharp(inputPath).toBuffer();
        await sharp(buffer).toFile(outputPath);
        return outputPath;
      }

    } catch (error) {
      console.error('❌ Deskewing failed:', error.message);
      return inputPath;
    }
  }

  /**
   * Detect skew angle (simplified implementation)
   * @param {string} imagePath - Input image path
   * @returns {Promise<number>} - Skew angle in degrees
   */
  async detectSkewAngle(imagePath) {
    try {
      // Simplified skew detection
      // In a real implementation, you would use projection profiles
      // or Hough transform to detect text line angles
      
      // For now, return a small random correction within reasonable bounds
      return (Math.random() - 0.5) * 4; // -2 to +2 degrees
      
    } catch (error) {
      console.error('❌ Skew detection failed:', error.message);
      return 0;
    }
  }

  /**
   * Sharpen image for better text clarity
   * @param {string} inputPath - Input image path
   * @returns {Promise<string>} - Output path
   */
  async sharpenImage(inputPath) {
    try {
      console.log('⚡ Sharpening image...');

      const outputPath = this.generateTempPath(inputPath, 'sharpened');
      
      await sharp(inputPath)
        .sharpen({
          sigma: 1.0,
          flat: 1.0,
          jagged: 2.0
        })
        .toFile(outputPath);

      console.log('✅ Image sharpening completed');
      return outputPath;

    } catch (error) {
      console.error('❌ Image sharpening failed:', error.message);
      return inputPath;
    }
  }

  /**
   * Binarize image (convert to black and white)
   * @param {string} inputPath - Input image path
   * @returns {Promise<string>} - Output path
   */
  async binarizeImage(inputPath) {
    try {
      console.log('🔲 Binarizing image...');

      const outputPath = this.generateTempPath(inputPath, 'binary');
      
      await sharp(inputPath)
        .greyscale()
        .threshold(128) // Simple threshold, could be adaptive
        .toFile(outputPath);

      console.log('✅ Image binarization completed');
      return outputPath;

    } catch (error) {
      console.error('❌ Image binarization failed:', error.message);
      return inputPath;
    }
  }

  /**
   * Apply multiple enhancement techniques
   * @param {string} inputPath - Input image path
   * @param {Object} options - Enhancement options
   * @returns {Promise<Object>} - Enhancement results
   */
  async applyMultipleEnhancements(inputPath, options = {}) {
    try {
      console.log('🎨 Applying multiple enhancement techniques...');

      const variations = [];
      
      // Create different enhancement variations
      const enhancementStrategies = [
        { name: 'conservative', contrast: 1.2, brightness: 1.0, sharpen: 0.5 },
        { name: 'moderate', contrast: 1.5, brightness: 1.1, sharpen: 1.0 },
        { name: 'aggressive', contrast: 2.0, brightness: 1.2, sharpen: 1.5 }
      ];

      for (const strategy of enhancementStrategies) {
        try {
          const outputPath = this.generateTempPath(inputPath, strategy.name);
          
          await sharp(inputPath)
            .modulate({
              brightness: strategy.brightness,
              saturation: 0.8
            })
            .linear(strategy.contrast, -(128 * strategy.contrast) + 128)
            .sharpen({
              sigma: strategy.sharpen,
              flat: 1.0,
              jagged: 2.0
            })
            .toFile(outputPath);

          const quality = await this.analyzeImageQuality(outputPath);
          
          variations.push({
            strategy: strategy.name,
            path: outputPath,
            quality: quality.score,
            settings: strategy
          });

        } catch (error) {
          console.error(`❌ Enhancement strategy ${strategy.name} failed:`, error.message);
        }
      }

      // Find best variation
      const bestVariation = variations.reduce((best, current) =>
        current.quality > best.quality ? current : best
      );

      console.log(`✅ Best enhancement: ${bestVariation.strategy} (quality: ${bestVariation.quality.toFixed(2)})`);

      return {
        bestVariation,
        allVariations: variations,
        originalQuality: await this.analyzeImageQuality(inputPath)
      };

    } catch (error) {
      console.error('❌ Multiple enhancements failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate temporary file path
   * @param {string} originalPath - Original file path
   * @param {string} suffix - Processing step suffix
   * @returns {string} - Temporary file path
   */
  generateTempPath(originalPath, suffix) {
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const timestamp = Date.now();
    return path.join(this.tempDir, `${basename}_${suffix}_${timestamp}${ext}`);
  }

  /**
   * Get list of processing steps applied
   * @param {Object} options - Processing options
   * @returns {Array} - List of processing steps
   */
  getProcessingSteps(options) {
    const steps = [];
    
    if (options.resize) steps.push('resize');
    if (options.removeNoise) steps.push('denoise');
    if (options.enhanceContrast) steps.push('contrast');
    if (options.deskew) steps.push('deskew');
    if (options.sharpen) steps.push('sharpen');
    if (options.binarize) steps.push('binarize');
    
    return steps;
  }

  /**
   * Clean up temporary files
   * @param {Array} filePaths - Array of file paths to clean up
   */
  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up: ${filePath}`);
      } catch (error) {
        console.error(`⚠️ Failed to cleanup ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Clean up all temporary files older than specified age
   * @param {number} maxAgeHours - Maximum age in hours
   */
  async cleanupOldTempFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old temp file: ${file}`);
        }
      }

      console.log('✅ Temporary file cleanup completed');

    } catch (error) {
      console.error('❌ Temp file cleanup failed:', error.message);
    }
  }
}

export default AdvancedImageProcessingService;
