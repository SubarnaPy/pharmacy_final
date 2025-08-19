import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import apiClient from '../../api/apiClient';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  CameraIcon,
  SpeakerWaveIcon,
  UserIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

function VideoConsultation() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [activeCall, setActiveCall] = useState(null);
  const [scheduledConsultations, setScheduledConsultations] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchScheduledConsultations();
    fetchCallHistory();
  }, []);

  const fetchScheduledConsultations = async () => {
    try {
      console.log('🔍 Fetching scheduled consultations...');
      const response = await apiClient.get('/webrtc/calls');
      console.log('✅ Scheduled consultations received:', response.data);
      
      const scheduledCalls = response.data.data?.filter(call => call.status === 'scheduled') || [];
      setScheduledConsultations(scheduledCalls);
    } catch (error) {
      console.error('❌ Error fetching scheduled consultations:', error);
      toast.error(`Failed to fetch consultations: ${error.response?.data?.message || error.message}`);
      setScheduledConsultations([]);
    }
  };

  const fetchCallHistory = async () => {
    try {
      console.log('🔍 Fetching call history...');
      const response = await apiClient.get('/webrtc/calls');
      console.log('✅ Call history received:', response.data);
      
      const completedCalls = response.data.data?.filter(call => call.status === 'completed') || [];
      setCallHistory(completedCalls);
    } catch (error) {
      console.error('❌ Error fetching call history:', error);
      toast.error(`Failed to fetch call history: ${error.response?.data?.message || error.message}`);
      setCallHistory([]);
    }
  };

  const startConsultation = async (consultation) => {
    try {
      console.log('🔍 Starting video consultation...', consultation._id);
      const response = await apiClient.post('/webrtc/calls/initiate', {
        targetUserId: consultation.patient._id,
        callType: 'video',
        context: {
          type: 'pharmacy_consultation',
          consultationId: consultation._id
        }
      });
      console.log('✅ Call initiated:', response.data);

      setActiveCall({
        ...consultation,
        callId: response.data.data.callId,
        startTime: new Date().toISOString(),
        videoEnabled: true,
        audioEnabled: true,
        recording: false
      });
      
      toast.success('Video consultation started');
    } catch (error) {
      console.error('❌ Error starting consultation:', error);
      toast.error(`Failed to start consultation: ${error.response?.data?.message || error.message}`);
    }
  };

  const endConsultation = async () => {
    if (activeCall) {
      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime) - new Date(activeCall.startTime)) / 60000);
      
      // Save consultation record
      try {
        console.log('🔍 Ending consultation...', activeCall.callId);
        await apiClient.post(`/webrtc/calls/${activeCall.callId}/end`, {
          endTime,
          duration,
          notes: 'Consultation completed successfully'
        });
        console.log('✅ Consultation ended successfully');
      } catch (error) {
        console.error('Error saving consultation:', error);
      }

      setActiveCall(null);
      toast.success('Consultation ended successfully');
      fetchCallHistory();
    }
  };

  const toggleVideo = () => {
    setActiveCall(prev => ({
      ...prev,
      videoEnabled: !prev.videoEnabled
    }));
  };

  const toggleAudio = () => {
    setActiveCall(prev => ({
      ...prev,
      audioEnabled: !prev.audioEnabled
    }));
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const ConsultationCard = ({ consultation, onStart }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {consultation.patient.profile.firstName} {consultation.patient.profile.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {consultation.patient.contact.phone}
            </p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          consultation.type === 'prescription_consultation' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {consultation.type.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Scheduled:</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatTime(consultation.scheduledTime)}
          </p>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {consultation.duration} minutes
          </p>
        </div>
      </div>

      <button
        onClick={() => onStart(consultation)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
      >
        <VideoCameraIcon className="h-5 w-5" />
        <span>Start Consultation</span>
      </button>
    </div>
  );

  const HistoryCard = ({ call }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {call.patient.profile.firstName} {call.patient.profile.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatTime(call.startTime)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDuration(call.duration)}
          </p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            call.status === 'completed' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }`}>
            {call.status}
          </span>
        </div>
      </div>

      {call.notes && (
        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
          {call.notes}
        </p>
      )}
    </div>
  );

  if (activeCall) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Video Call Interface */}
        <div className="flex-1 relative">
          {/* Remote Video */}
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="w-64 h-64 bg-blue-500 rounded-full flex items-center justify-center">
              <UserIcon className="h-32 w-32 text-white" />
            </div>
            <div className="absolute top-4 left-4 text-white">
              <h2 className="text-xl font-semibold">
                {activeCall.patient.profile.firstName} {activeCall.patient.profile.lastName}
              </h2>
              <p className="text-sm opacity-75">
                Call duration: {Math.floor((Date.now() - new Date(activeCall.startTime)) / 60000)}m
              </p>
            </div>
          </div>

          {/* Local Video */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <CameraIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 p-6">
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                activeCall.videoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <VideoCameraIcon className="h-6 w-6" />
            </button>

            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-colors ${
                activeCall.audioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>

            <button
              onClick={endConsultation}
              className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            >
              <PhoneXMarkIcon className="h-6 w-6" />
            </button>

            <button className="p-4 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors">
              <SpeakerWaveIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📹 Video Consultations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Conduct virtual consultations with patients
        </p>
      </div>

      {/* Scheduled Consultations */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Scheduled Consultations
        </h2>
        
        {scheduledConsultations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Scheduled Consultations
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Scheduled video consultations will appear here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scheduledConsultations.map((consultation) => (
              <ConsultationCard
                key={consultation._id}
                consultation={consultation}
                onStart={startConsultation}
              />
            ))}
          </div>
        )}
      </div>

      {/* Call History */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Consultations
        </h2>
        
        {callHistory.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Call History
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Completed consultations will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {callHistory.map((call) => (
              <HistoryCard key={call._id} call={call} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoConsultation;
