import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  VideoCameraIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../app/DarkModeContext';
import { getMyConsultations, getDoctorProfile, startConsultation } from '../../api/consultationAPI';

function ConsultationList() {
  const { isDarkMode } = useContext(DarkModeContext);
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAndLoad = async () => {
      if (user?.role === 'doctor') {
        try {
          // Ensure doctor profile exists
          await getDoctorProfile();
        } catch (error) {
          console.error('Error initializing doctor profile:', error);
        }
      }
      loadConsultations();
    };
    
    initializeAndLoad();
  }, [user?.role]);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const response = await getMyConsultations();
      console.log('🔍 Frontend received consultations:', response);
      if (response.success) {
        console.log('🔍 Setting consultations:', response.data);
        setConsultations(response.data);
      }
    } catch (error) {
      console.error('Error loading consultations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <ClockIcon className="h-4 w-4" />;
      case 'active': return <PlayIcon className="h-4 w-4" />;
      case 'completed': return <CheckCircleIcon className="h-4 w-4" />;
      case 'cancelled': return <XCircleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const handleJoinConsultation = (consultationId) => {
    navigate(`/consultation/${consultationId}`);
  };
  
  const handleStartConsultation = async (consultationId) => {
    try {
      await startConsultation(consultationId);
      navigate(`/consultation/${consultationId}`);
    } catch (error) {
      console.error('Error starting consultation:', error);
    }
  };

  const canJoinConsultation = (consultation) => {
    return consultation.status === 'confirmed' || consultation.status === 'active';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          My Consultations
        </h2>
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
          {consultations.length} consultations
        </div>
      </div>

      {consultations.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <VideoCameraIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Consultations Yet</h3>
          <p className="text-sm">Book your first consultation to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {consultations.map(consultation => (
            <div
              key={consultation._id}
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-700/50'
                  : 'bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.role === 'patient' 
                        ? consultation.doctorId?.user?.name || 'Doctor'
                        : consultation.patientId?.name || 'Patient'
                      }
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {consultation.doctorId?.specializations?.[0] || 'General Medicine'}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                  {getStatusIcon(consultation.status)}
                  <span className="ml-1 capitalize">{consultation.status}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <CalendarDaysIcon className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {new Date(consultation.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <ClockIcon className={`h-4 w-4 mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {consultation.time}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Fee: ${consultation.consultationFee}
                  </span>
                </div>
              </div>

              {canJoinConsultation(consultation) && (
                <button
                  onClick={() => handleJoinConsultation(consultation._id)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center"
                >
                  <VideoCameraIcon className="h-5 w-5 mr-2" />
                  Join Consultation
                </button>
              )}
              
              {user.role === 'doctor' && consultation.status === 'confirmed' && (
                <button
                  onClick={() => handleStartConsultation(consultation._id)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 flex items-center justify-center mt-2"
                >
                  <VideoCameraIcon className="h-5 w-5 mr-2" />
                  Start Consultation
                </button>
              )}

              {consultation.status === 'completed' && (
                <div className={`text-center py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Consultation completed
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConsultationList;