import React, { useState, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadPrescription, getOcrResult, clearOcr } from '../prescriptionSlice';
import { 
  DocumentPlusIcon,
  PhotoIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../../app/DarkModeContext';

function PrescriptionUpload() {
  const dispatch = useDispatch();
  const { status, ocrText, prescriptionId } = useSelector(state => state.prescription);
  const { isDarkMode } = useContext(DarkModeContext);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
    dispatch(clearOcr());
    
    // Create preview
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleInputChange = (e) => {
    const selected = e.target.files[0];
    if (selected) handleFileChange(selected);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      dispatch(uploadPrescription(file));
    }
  };

  const handleFetchOcr = () => {
    if (prescriptionId) {
      dispatch(getOcrResult(prescriptionId));
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-600/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-teal-400/10 dark:bg-teal-600/5 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-scaleIn">
            <DocumentPlusIcon className="h-10 w-10 text-white" />
            <SparklesIcon className="h-6 w-6 text-white/80 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-4">Upload Prescription</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">Upload your prescription for AI-powered processing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="glass rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <CloudArrowUpIcon className="h-6 w-6 mr-2 text-emerald-500" />
              Upload Document
            </h2>

            {/* Drag & Drop Area */}
            <div 
              className={`
                relative border-3 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer
                ${dragActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-500'}
                ${file ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : ''}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input
                id="file-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="text-center">
                {file ? (
                  <CheckCircleIcon className="mx-auto h-16 w-16 text-emerald-500 mb-4" />
                ) : (
                  <PhotoIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                )}
                
                <div className="mb-4">
                  {file ? (
                    <>
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">File Selected!</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Drop your prescription here</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        or <span className="text-emerald-600 dark:text-emerald-400 font-medium">browse files</span>
                      </p>
                    </>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Supports: JPG, PNG, PDF up to 10MB
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleUpload}
                disabled={!file || status === 'loading'}
                className={`
                  flex-1 py-4 px-6 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center space-x-2
                  ${!file || status === 'loading'
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-[1.02]'
                  }
                `}
              >
                {status === 'loading' ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-5 w-5" />
                    <span>Upload Prescription</span>
                  </>
                )}
              </button>

              {prescriptionId && (
                <button
                  onClick={handleFetchOcr}
                  className="px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <EyeIcon className="h-5 w-5" />
                  <span>View OCR</span>
                </button>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="glass rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
              <EyeIcon className="h-6 w-6 mr-2 text-blue-500" />
              Preview & Analysis
            </h2>

            {preview ? (
              <div className="mb-6">
                <img 
                  src={preview} 
                  alt="Prescription Preview" 
                  className="w-full h-64 object-cover rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg"
                />
              </div>
            ) : (
              <div className="mb-6 h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No file selected</p>
                </div>
              </div>
            )}

            {/* OCR Results */}
            {ocrText && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <SparklesIcon className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Extracted Text</h3>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
                  <textarea
                    value={ocrText}
                    readOnly
                    className="w-full h-40 bg-transparent text-gray-800 dark:text-gray-200 text-sm leading-relaxed resize-none focus:outline-none"
                    placeholder="Extracted text will appear here..."
                  />
                </div>
                
                {/* Processing Status */}
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Text extraction completed successfully</span>
                </div>
              </div>
            )}

            {prescriptionId && !ocrText && (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">Prescription uploaded successfully!</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Click "View OCR" to extract text content</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {status === 'succeeded' && (
          <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-bold text-green-800 dark:text-green-300">Upload Successful!</p>
                <p className="text-sm text-green-700 dark:text-green-400">Your prescription has been processed and is ready for pharmacy review.</p>
              </div>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-8 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-bold text-red-800 dark:text-red-300">Upload Failed</p>
                <p className="text-sm text-red-700 dark:text-red-400">Please try again or contact support if the problem persists.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrescriptionUpload;
