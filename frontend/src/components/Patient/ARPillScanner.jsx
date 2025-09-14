import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  CameraIcon, 
  PhotoIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const ARPillScanner = ({ userMedications = [], onPillIdentified, className = '' }) => {
  // State management
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [selectedPill, setSelectedPill] = useState(null);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  // Camera configuration
  const cameraConfig = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'environment', // Use back camera on mobile
      focusMode: 'continuous'
    }
  };

  // Initialize camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia(cameraConfig);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);

        // Start real-time scanning if enabled
        if (realTimeMode) {
          startRealTimeScanning();
        }
      }
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      setError('Unable to access camera. Please check permissions.');
    }
  }, [realTimeMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Capture image from video
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Take photo and process
  const takePhoto = useCallback(async () => {
    const imageData = captureImage();
    if (imageData) {
      setCapturedImage(imageData);
      await processPillIdentification(imageData);
    }
  }, [captureImage]);

  // Process pill identification
  const processPillIdentification = async (imageData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/ar-pills/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          imageData: imageData,
          options: {
            includeInteractions: true,
            includeDosageInfo: true,
            userMedications: userMedications,
            confidenceThreshold: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setScanResults(result.data);
        setScanHistory(prev => [result.data, ...prev.slice(0, 9)]); // Keep last 10 scans
        
        if (onPillIdentified) {
          onPillIdentified(result.data);
        }

        // Draw AR overlays
        drawAROverlays(result.data.arOverlayData);
      } else {
        throw new Error(result.message || 'Identification failed');
      }

    } catch (error) {
      console.error('❌ Pill identification error:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start real-time scanning
  const startRealTimeScanning = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      if (!isProcessing && isScanning) {
        const imageData = captureImage();
        if (imageData) {
          await processPillIdentification(imageData);
        }
      }
    }, 3000); // Scan every 3 seconds
  }, [isProcessing, isScanning, captureImage]);

  // Draw AR overlays on the image
  const drawAROverlays = (overlayData) => {
    if (!overlayRef.current || !showOverlays) return;

    const overlay = overlayRef.current;
    const ctx = overlay.getContext('2d');
    
    // Clear previous overlays
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Set overlay canvas size to match video
    if (videoRef.current) {
      overlay.width = videoRef.current.videoWidth;
      overlay.height = videoRef.current.videoHeight;
    }

    // Draw pill identification overlays
    overlayData.pills?.forEach(pill => {
      const { bounds, overlay: pillOverlay } = pill;
      
      // Draw bounding box
      ctx.strokeStyle = pillOverlay.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      // Draw label background
      const labelText = `${pillOverlay.label} (${pillOverlay.confidence})`;
      const labelWidth = ctx.measureText(labelText).width + 20;
      const labelHeight = 30;

      ctx.fillStyle = pillOverlay.color;
      ctx.fillRect(bounds.x, bounds.y - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.fillText(labelText, bounds.x + 10, bounds.y - 10);

      // Draw warning indicators if any
      if (pillOverlay.warnings?.length > 0) {
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.arc(bounds.x + bounds.width - 15, bounds.y + 15, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('!', bounds.x + bounds.width - 18, bounds.y + 20);
      }
    });

    // Draw interaction warnings
    overlayData.interactions?.forEach((interaction, index) => {
      const y = 50 + (index * 40);
      
      // Warning background
      ctx.fillStyle = interaction.color + '20'; // 20% opacity
      ctx.fillRect(10, y - 25, overlay.width - 20, 35);
      
      // Warning border
      ctx.strokeStyle = interaction.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(10, y - 25, overlay.width - 20, 35);
      
      // Warning text
      ctx.fillStyle = interaction.color;
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`⚠️ ${interaction.warning}`, 20, y - 5);
    });

    // Draw global alerts
    overlayData.globalAlerts?.forEach((alert, index) => {
      const y = overlay.height - 100 - (index * 50);
      
      // Alert background
      ctx.fillStyle = alert.color + '30'; // 30% opacity
      ctx.fillRect(10, y - 30, overlay.width - 20, 40);
      
      // Alert border
      ctx.strokeStyle = alert.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, y - 30, overlay.width - 20, 40);
      
      // Alert text
      ctx.fillStyle = alert.color;
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`🚨 ${alert.message}`, 20, y - 8);
    });
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;
      setCapturedImage(imageData);
      await processPillIdentification(imageData);
    };
    reader.readAsDataURL(file);
  };

  // Toggle real-time mode
  const toggleRealTimeMode = () => {
    setRealTimeMode(!realTimeMode);
    if (!realTimeMode && isScanning) {
      startRealTimeScanning();
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className={`ar-pill-scanner bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BeakerIcon className="h-8 w-8" />
            <div>
              <h3 className="text-xl font-semibold">AR Pill Scanner</h3>
              <p className="text-sm opacity-90">Identify medications and check interactions</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Real-time toggle */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={realTimeMode}
                onChange={toggleRealTimeMode}
                className="rounded border-white/30 bg-white/10 text-white focus:ring-white/50"
              />
              <span>Real-time</span>
            </label>
            
            {/* Overlay toggle */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showOverlays}
                onChange={(e) => setShowOverlays(e.target.checked)}
                className="rounded border-white/30 bg-white/10 text-white focus:ring-white/50"
              />
              <span>AR Overlays</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {!isScanning ? (
              <button
                onClick={startCamera}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <CameraIcon className="h-5 w-5" />
                <span>Start Camera</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
                <span>Stop Camera</span>
              </button>
            )}

            {isScanning && (
              <button
                onClick={takePhoto}
                disabled={isProcessing}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <PhotoIcon className="h-5 w-5" />
                <span>{isProcessing ? 'Processing...' : 'Scan Pills'}</span>
              </button>
            )}

            {/* File Upload */}
            <label className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
              <PhotoIcon className="h-5 w-5" />
              <span>Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            {isScanning && (
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Camera Active</span>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Analyzing...</span>
              </div>
            )}

            {realTimeMode && isScanning && (
              <div className="flex items-center space-x-2 text-purple-600">
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Real-time Scanning</span>
              </div>
            )}
          </div>
        </div>

        {/* Camera/Image Display */}
        <div className="relative mb-6">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {/* Video Stream */}
            {isScanning && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}

            {/* Captured Image */}
            {capturedImage && !isScanning && (
              <img
                src={capturedImage}
                alt="Captured pills"
                className="w-full h-full object-cover"
              />
            )}

            {/* AR Overlay Canvas */}
            {showOverlays && (
              <canvas
                ref={overlayRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: 10 }}
              />
            )}

            {/* Hidden canvas for image capture */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />

            {/* Placeholder when no camera/image */}
            {!isScanning && !capturedImage && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Start camera or upload image to scan pills</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <span className="text-red-700 font-medium">Error:</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {scanResults && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Scan Results Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {scanResults.summary.totalPillsDetected}
                  </div>
                  <div className="text-gray-600">Pills Detected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {scanResults.summary.highConfidenceIdentifications}
                  </div>
                  <div className="text-gray-600">Identified</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {scanResults.summary.interactionWarnings}
                  </div>
                  <div className="text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {scanResults.summary.highRiskInteractions}
                  </div>
                  <div className="text-gray-600">High Risk</div>
                </div>
              </div>
            </div>

            {/* Identified Pills */}
            {scanResults.identifiedPills?.identifications?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Identified Medications</h4>
                <div className="space-y-3">
                  {scanResults.identifiedPills.identifications.map((identification, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedPill(identification)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {identification.bestMatch?.name || 'Unknown Medication'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Confidence: {Math.round((identification.bestMatch?.confidence || 0) * 100)}%
                          </div>
                          {identification.bestMatch?.reason && (
                            <div className="text-xs text-gray-500 mt-1">
                              {identification.bestMatch.reason}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {identification.identificationStatus === 'confirmed' && (
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          )}
                          {identification.identificationStatus === 'uncertain' && (
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          )}
                          {identification.warnings?.length > 0 && (
                            <ShieldExclamationIcon className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interaction Warnings */}
            {scanResults.interactionAnalysis?.warnings?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  <span>Drug Interaction Warnings</span>
                </h4>
                <div className="space-y-3">
                  {scanResults.interactionAnalysis.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        warning.severity === 'critical' ? 'bg-red-50 border-red-500' :
                        warning.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                        'bg-yellow-50 border-yellow-500'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{warning.message}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Medications: {warning.medications?.join(', ')}
                      </div>
                      {warning.action && (
                        <div className="text-sm text-gray-700 mt-2 font-medium">
                          Recommended Action: {warning.action}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Risk Assessment */}
            {scanResults.interactionAnalysis?.overallRisk && (
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Overall Risk Assessment</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-lg font-bold ${
                      scanResults.interactionAnalysis.overallRisk.level === 'critical' ? 'text-red-600' :
                      scanResults.interactionAnalysis.overallRisk.level === 'high' ? 'text-orange-600' :
                      scanResults.interactionAnalysis.overallRisk.level === 'moderate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {scanResults.interactionAnalysis.overallRisk.level.toUpperCase()} RISK
                    </div>
                    <div className="text-sm text-gray-600">
                      Risk Score: {scanResults.interactionAnalysis.overallRisk.score}/100
                    </div>
                  </div>
                  
                  <div className="text-right text-sm text-gray-600">
                    <div>Major Interactions: {scanResults.interactionAnalysis.overallRisk.majorInteractions}</div>
                    <div>Contraindications: {scanResults.interactionAnalysis.overallRisk.contraindicatedCombinations}</div>
                  </div>
                </div>
                
                {scanResults.interactionAnalysis.overallRisk.recommendation && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="font-medium text-gray-900">Recommendation:</div>
                    <div className="text-gray-700">{scanResults.interactionAnalysis.overallRisk.recommendation}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Recent Scans</h4>
            <div className="space-y-2">
              {scanHistory.slice(0, 3).map((scan, index) => (
                <div
                  key={scan.scanId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {scan.summary.totalPillsDetected} pill(s) • {scan.summary.highConfidenceIdentifications} identified
                    </span>
                    {scan.summary.interactionWarnings > 0 && (
                      <span className="ml-2 text-red-600">• {scan.summary.interactionWarnings} warning(s)</span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {new Date(scan.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Pill Information Modal */}
      {selectedPill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{selectedPill.bestMatch?.name}</h3>
                <button
                  onClick={() => setSelectedPill(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Identification Details</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Confidence: {Math.round((selectedPill.bestMatch?.confidence || 0) * 100)}%</div>
                    <div>Status: {selectedPill.identificationStatus}</div>
                    {selectedPill.bestMatch?.reason && (
                      <div>Reason: {selectedPill.bestMatch.reason}</div>
                    )}
                  </div>
                </div>

                {selectedPill.possibleMedications?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900">Alternative Possibilities</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedPill.possibleMedications.map((med, index) => (
                        <div key={index} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                          <div className="font-medium">{med.name}</div>
                          <div>Confidence: {Math.round(med.confidence * 100)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPill.warnings?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-red-600">Warnings</h4>
                    <div className="space-y-1">
                      {selectedPill.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARPillScanner;