import React, { useState, useEffect } from 'react';
import {
  PhoneIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  CameraIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

function VideoConsultation() {
  const [consultationState, setConsultationState] = useState('waiting'); // waiting, connecting, active, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [duration, setDuration] = useState(0);

  // Mock patient data
  const patient = {
    id: 'P001',
    name: 'John Doe',
    age: 32,
    gender: 'Male',
    phone: '+1-555-0123',
    appointmentTime: '10:00 AM',
    symptoms: 'Persistent headache, mild fever',
    medicalHistory: ['Hypertension', 'Diabetes Type 2'],
    allergies: ['Penicillin', 'Shellfish'],
    currentMedications: ['Metformin 500mg', 'Lisinopril 10mg']
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (consultationState === 'active') {
        setDuration(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [consultationState]);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startConsultation = () => {
    setConsultationState('connecting');
    setTimeout(() => {
      setConsultationState('active');
    }, 2000);
  };

  const endConsultation = () => {
    setConsultationState('ended');
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'doctor',
        message: chatInput,
        timestamp: new Date()
      }]);
      setChatInput('');
    }
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems(prev => [...prev, {
      id: Date.now(),
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }]);
  };

  const updatePrescriptionItem = (id, field, value) => {
    setPrescriptionItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removePrescriptionItem = (id) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  const renderWaitingScreen = () => (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
        <UserIcon className="h-16 w-16 text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patient.name}</h3>
        <p className="text-gray-600 dark:text-gray-400">Waiting to join consultation</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Scheduled: {patient.appointmentTime}
        </p>
      </div>
      <button
        onClick={startConsultation}
        className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center"
      >
        <VideoCameraIcon className="h-5 w-5 mr-2" />
        Start Consultation
      </button>
    </div>
  );

  const renderConnectingScreen = () => (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Connecting...</h3>
        <p className="text-gray-600 dark:text-gray-400">Establishing secure connection with {patient.name}</p>
      </div>
    </div>
  );

  const renderActiveConsultation = () => (
    <div className="h-full flex flex-col">
      {/* Video Area */}
      <div className="flex-1 bg-gray-900 rounded-t-2xl relative overflow-hidden">
        {/* Patient Video */}
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
          <div className="text-center text-white">
            <UserIcon className="h-24 w-24 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">{patient.name}</h3>
            <p className="text-blue-100">Video Active</p>
          </div>
        </div>

        {/* Doctor Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-48 h-32 bg-emerald-500 rounded-lg flex items-center justify-center">
          <div className="text-center text-white">
            <UserIcon className="h-8 w-8 mx-auto mb-2" />
            <p className="text-xs">You</p>
          </div>
        </div>

        {/* Duration Timer */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-white font-mono text-sm">{formatDuration(duration)}</p>
        </div>

        {/* Connection Status */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">Connected</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-b-2xl p-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full transition-colors ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <MicrophoneIcon className={`h-6 w-6 text-white ${isMuted ? 'opacity-50' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full transition-colors ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <CameraIcon className={`h-6 w-6 text-white ${isVideoOff ? 'opacity-50' : ''}`} />
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
          </button>

          <button
            onClick={endConsultation}
            className="p-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderEndedScreen = () => (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
        <CheckCircleIcon className="h-10 w-10 text-white" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Consultation Completed</h3>
        <p className="text-gray-600 dark:text-gray-400">Duration: {formatDuration(duration)}</p>
      </div>
      <div className="flex space-x-4">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
          Generate Report
        </button>
        <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
          Send Prescription
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-screen">
          {/* Main Video Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-lg h-full">
              {consultationState === 'waiting' && renderWaitingScreen()}
              {consultationState === 'connecting' && renderConnectingScreen()}
              {consultationState === 'active' && renderActiveConsultation()}
              {consultationState === 'ended' && renderEndedScreen()}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Patient Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Age & Gender</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{patient.age} years, {patient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Chief Complaint</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{patient.symptoms}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allergies</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patient.allergies.map((allergy, index) => (
                      <span key={index} className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-xs rounded-full">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat */}
            {showChat && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Chat</h3>
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">{message.message}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={sendChatMessage}
                    className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Consultation Notes</h3>
              <textarea
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder="Record your consultation notes here..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Prescription Modal */}
        {consultationState === 'ended' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Write Prescription</h2>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Patient</p>
                    <p className="font-semibold">{patient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                    <p className="font-semibold">{currentTime.toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Medications</h3>
                    <button
                      onClick={addPrescriptionItem}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      Add Medication
                    </button>
                  </div>

                  {prescriptionItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg mb-4">
                      <input
                        type="text"
                        placeholder="Medication"
                        value={item.medication}
                        onChange={(e) => updatePrescriptionItem(item.id, 'medication', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={item.dosage}
                        onChange={(e) => updatePrescriptionItem(item.id, 'dosage', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={item.frequency}
                        onChange={(e) => updatePrescriptionItem(item.id, 'frequency', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={item.duration}
                        onChange={(e) => updatePrescriptionItem(item.id, 'duration', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() => removePrescriptionItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50 rounded"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-4">
                  <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Save as Draft
                  </button>
                  <button className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                    Send Prescription
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoConsultation;
