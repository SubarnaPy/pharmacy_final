import React, { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const DocumentUploader = ({
  value = [],
  onChange,
  onUpload,
  onDelete,
  onPreview,
  label = 'Upload Documents',
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'],
  disabled = false,
  required = false,
  multiple = true,
  dragAndDrop = true,
  showProgress = true,
  showPreview = true,
  validation = null,
  className = '',
  uploadText = 'Drag and drop files here, or click to select',
  uploadingText = 'Uploading...',
  successText = 'Upload complete',
  errorText = 'Upload failed'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const errors = [];

    // File size validation
    if (file.size > maxFileSize) {
      errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}`);
    }

    // File type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File "${file.name}" has unsupported format. Allowed formats: ${allowedTypes.join(', ')}`);
    }

    // Custom validation
    if (validation) {
      const customError = validation(file);
      if (customError && customError !== true) {
        errors.push(customError);
      }
    }

    return errors;
  };

  const validateFiles = (files) => {
    const errors = [];

    // Max files validation
    if (value.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed. Currently have ${value.length} files.`);
    }

    // Individual file validation
    files.forEach(file => {
      errors.push(...validateFile(file));
    });

    // Required validation
    if (required && value.length === 0 && files.length === 0) {
      errors.push('At least one file is required');
    }

    return errors;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) {
      return file.preview || file.url;
    }
    return null;
  };

  const getFileTypeIcon = (file) => {
    if (file.type?.includes('pdf')) {
      return <DocumentIcon className="h-8 w-8 text-red-500" />;
    }
    if (file.type?.includes('word')) {
      return <DocumentIcon className="h-8 w-8 text-blue-500" />;
    }
    if (file.type?.startsWith('image/')) {
      return <DocumentIcon className="h-8 w-8 text-green-500" />;
    }
    return <DocumentIcon className="h-8 w-8 text-gray-500" />;
  };

  const handleFileSelect = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const errors = validateFiles(fileArray);
    
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }

    // Process files for upload
    const filesToUpload = fileArray.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    // Add files to current value
    const newValue = [...value, ...filesToUpload];
    onChange(newValue);

    // Upload files if onUpload is provided
    if (onUpload) {
      for (const fileData of filesToUpload) {
        try {
          // Update status to uploading
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'uploading', progress: 0 }
          }));

          // Simulate progress updates (replace with actual upload progress)
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const current = prev[fileData.id]?.progress || 0;
              if (current >= 90) {
                clearInterval(progressInterval);
                return prev;
              }
              return {
                ...prev,
                [fileData.id]: { status: 'uploading', progress: current + 10 }
              };
            });
          }, 200);

          // Perform upload
          const uploadResult = await onUpload(fileData.file, {
            onProgress: (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [fileData.id]: { status: 'uploading', progress }
              }));
            }
          });

          clearInterval(progressInterval);

          // Update file with upload result
          const updatedFile = {
            ...fileData,
            ...uploadResult,
            status: 'success'
          };

          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'success', progress: 100 }
          }));

          // Update the file in the value array
          onChange(prev => prev.map(f => f.id === fileData.id ? updatedFile : f));

        } catch (error) {
          console.error('Upload failed:', error);
          
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: { status: 'error', progress: 0, error: error.message }
          }));

          // Update file status to error
          onChange(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, status: 'error', error: error.message }
              : f
          ));
        }
      }
    }
  }, [value, onChange, onUpload, maxFiles, validation]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled && dragAndDrop) {
      setIsDragOver(true);
    }
  }, [disabled, dragAndDrop]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, handleFileSelect]);

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveFile = (fileId) => {
    const fileToRemove = value.find(f => f.id === fileId);
    
    if (onDelete && fileToRemove.url) {
      onDelete(fileToRemove);
    }

    // Clean up preview URL if it exists
    if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    // Remove from upload progress
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });

    // Remove from value
    onChange(value.filter(f => f.id !== fileId));
  };

  const handleRetryUpload = async (fileId) => {
    const fileData = value.find(f => f.id === fileId);
    if (!fileData || !onUpload) return;

    try {
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { status: 'uploading', progress: 0 }
      }));

      const uploadResult = await onUpload(fileData.file, {
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: { status: 'uploading', progress }
          }));
        }
      });

      const updatedFile = {
        ...fileData,
        ...uploadResult,
        status: 'success',
        error: null
      };

      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { status: 'success', progress: 100 }
      }));

      onChange(prev => prev.map(f => f.id === fileId ? updatedFile : f));

    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: { status: 'error', progress: 0, error: error.message }
      }));

      onChange(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    }
  };

  const renderFileItem = (file) => {
    const progress = uploadProgress[file.id];
    const status = progress?.status || file.status || 'pending';
    const progressValue = progress?.progress || 0;
    const error = progress?.error || file.error;

    return (
      <div key={file.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        {/* File Icon/Preview */}
        <div className="flex-shrink-0">
          {getFileIcon(file) ? (
            <img 
              src={getFileIcon(file)} 
              alt={file.name}
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            getFileTypeIcon(file)
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(file.size)}
          </p>
          
          {/* Progress Bar */}
          {showProgress && status === 'uploading' && (
            <div className="mt-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {uploadingText} {progressValue}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {status === 'error' && error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>

        {/* Status Icon */}
        <div className="flex-shrink-0">
          {status === 'success' && (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          )}
          {status === 'uploading' && (
            <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
          )}
          {status === 'error' && (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showPreview && onPreview && (
            <button
              onClick={() => onPreview(file)}
              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="Preview"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          )}
          
          {status === 'error' && (
            <button
              onClick={() => handleRetryUpload(file.id)}
              className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              title="Retry upload"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={() => handleRemoveFile(file.id)}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
            title="Remove file"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`document-uploader ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {uploadText}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {accept} up to {formatFileSize(maxFileSize)}
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mt-2 space-y-1">
          {validationErrors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {error}
            </p>
          ))}
        </div>
      )}

      {/* File List */}
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Uploaded Files ({value.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {value.map(renderFileItem)}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {multiple ? `You can upload up to ${maxFiles} files` : 'Upload a single file'}
        {'. Supported formats: ' + accept}
      </div>
    </div>
  );
};

export default DocumentUploader;