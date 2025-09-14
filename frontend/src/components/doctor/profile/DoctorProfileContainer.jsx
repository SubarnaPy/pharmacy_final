import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  VideoCameraIcon,
  ClockIcon,
  BellIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getDoctorId } from '../../../utils/doctorUtils.js';

// Import profile section components
import PersonalInfoSection from './PersonalInfoSection.jsx';
import MedicalLicenseSection from './MedicalLicenseSection.jsx';
import SpecializationsSection from './SpecializationsSection.jsx';
import QualificationsSection from './QualificationsSection.jsx';
import ExperienceSection from './ExperienceSection.jsx';
import ConsultationModesSection from './ConsultationModesSection.jsx';
import AvailabilitySection from './AvailabilitySection.jsx';
import LanguagePreferencesSection from './LanguagePreferencesSection.jsx';
import NotificationPreferencesSection from './NotificationPreferencesSection.jsx';
import ProfileStatsSection from './ProfileStatsSection.jsx';
import ProfileSectionNavigation from './ProfileSectionNavigation.jsx';

// Import error handling components
import ProfileSectionErrorBoundary from './ProfileSectionErrorBoundary.jsx';
import ProfileSaveStatus from './ProfileSaveStatus.jsx';

// Import hooks and utilities
import useDoctorProfile from '../../../hooks/useDoctorProfile.js';
import useUnsavedChangesWarning from '../../../hooks/useUnsavedChangesWarning.js';
import useOfflineState from '../../../hooks/useOfflineState.js';
import useEnhancedProfileSave from '../../../hooks/useEnhancedProfileSave.js';
import { 
  setActiveSection, 
  setUnsavedChanges, 
  selectActiveSection, 
  selectUnsavedChanges,
  selectHasUnsavedChanges
} from '../../../store/doctorProfileSlice.js';
import notificationService from '../../../services/notificationService.js';

const PROFILE_SECTIONS = [
  {
    id: 'personal',
    title: 'Personal Information',
    icon: UserIcon,
    component: PersonalInfoSection,
    description: 'Basic personal and contact information'
  },
  {
    id: 'license',
    title: 'Medical License',
    icon: ShieldCheckIcon,
    component: MedicalLicenseSection,
    description: 'License information and verification documents'
  },
  {
    id: 'specializations',
    title: 'Specializations',
    icon: AcademicCapIcon,
    component: SpecializationsSection,
    description: 'Medical specializations and areas of expertise'
  },
  {
    id: 'qualifications',
    title: 'Qualifications',
    icon: AcademicCapIcon,
    component: QualificationsSection,
    description: 'Educational qualifications and certifications'
  },
  {
    id: 'experience',
    title: 'Experience',
    icon: BriefcaseIcon,
    component: ExperienceSection,
    description: 'Professional experience and bio'
  },
  {
    id: 'consultation',
    title: 'Consultation Modes',
    icon: VideoCameraIcon,
    component: ConsultationModesSection,
    description: 'Available consultation types and fees'
  },
  {
    id: 'availability',
    title: 'Availability',
    icon: ClockIcon,
    component: AvailabilitySection,
    description: 'Working hours and schedule settings'
  },
  {
    id: 'languages',
    title: 'Languages',
    icon: UserIcon,
    component: LanguagePreferencesSection,
    description: 'Supported languages for consultations'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: BellIcon,
    component: NotificationPreferencesSection,
    description: 'Notification preferences and settings'
  },
  {
    id: 'stats',
    title: 'Statistics',
    icon: ChartBarIcon,
    component: ProfileStatsSection,
    description: 'Profile statistics and earnings overview'
  }
];

// Mapping between sidebar keys and container section IDs
const SIDEBAR_TO_SECTION_MAPPING = {
  'profile-management': 'personal',
  'personal-info': 'personal',
  'medical-license': 'license',
  'specializations': 'specializations',
  'qualifications': 'qualifications',
  'experience': 'experience',
  'consultation-modes': 'consultation',
  'availability': 'availability',
  'language-preferences': 'languages',
  'notification-preferences': 'notifications',
  'profile-stats': 'stats'
};

// Convert sidebar section key to container section ID
const mapSidebarKeyToSectionId = (sidebarKey) => {
  return SIDEBAR_TO_SECTION_MAPPING[sidebarKey] || sidebarKey;
};

// Convert container section ID to sidebar key (reverse mapping)
const mapSectionIdToSidebarKey = (sectionId) => {
  const entry = Object.entries(SIDEBAR_TO_SECTION_MAPPING).find(([key, value]) => value === sectionId);
  return entry ? entry[0] : sectionId;
};

const DoctorProfileContainer = ({ doctorId: propDoctorId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  
  // Get current doctor ID
  const doctorId = propDoctorId || getDoctorId(user);
  console.log(user);
  
  // Redux state
  const activeSection = useSelector(selectActiveSection);
  const unsavedChanges = useSelector(state => selectUnsavedChanges(state, doctorId));
  const hasUnsavedChanges = useSelector(state => selectHasUnsavedChanges(state, doctorId, activeSection));
  
  // Local state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingSection, setPendingSection] = useState(null);
  
  // Profile data hook
  const {
    profileData,
    loading,
    error,
    canEdit,
    validateProfileCompleteness,
    updateProfileSection // Added destructuring for updateProfileSection
  } = useDoctorProfile(doctorId);

  // Enhanced save functionality with error handling
  const { getSaveStatus } = useEnhancedProfileSave(doctorId, 'profile');
  
  // Resolved personal info (merge doctor profile + auth user data)
  const resolvedPersonalInfo = useMemo(() => {
    const fromDoctor = profileData?.personalInfo || profileData?.profile || {};
    const fromAuth = user?.profile || {};
    const email = profileData?.email || user?.email || fromAuth?.email;
    return { ...fromAuth, ...fromDoctor, email };
  }, [profileData, user]);

  // Offline state management
  const { isOnline, queuedOperations } = useOfflineState({
    showNotifications: true,
    onOnline: () => {
      notificationService.info('Connection restored. Syncing profile changes...');
    },
    onOffline: () => {
      notificationService.warning('You are offline. Changes will be saved when connection is restored.');
    }
  });

  // Unsaved changes warning hook
  useUnsavedChangesWarning(doctorId, true);

  // Handle URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const sectionFromUrl = urlParams.get('section');
    
    if (sectionFromUrl) {
      // Map sidebar key to section ID
      const mappedSection = mapSidebarKeyToSectionId(sectionFromUrl);
      
      // Check if the mapped section exists in PROFILE_SECTIONS
      if (PROFILE_SECTIONS.find(s => s.id === mappedSection)) {
        // Only update if different from current active section
        if (activeSection !== mappedSection) {
          dispatch(setActiveSection({ section: mappedSection }));
        }
      }
    } else if (!activeSection) {
      // Set default section only if no section is active
      dispatch(setActiveSection({ section: PROFILE_SECTIONS[0].id }));
    }
  }, [location.search, dispatch, activeSection]);

  // Update URL when active section changes programmatically - DISABLED to prevent loops
  // useEffect(() => {
  //   if (activeSection) {
  //     const currentParams = new URLSearchParams(location.search);
  //     const currentSection = currentParams.get('section');
      
  //     // Map section ID back to sidebar key for URL
  //     const sidebarKey = mapSectionIdToSidebarKey(activeSection);
      
  //     // Only update URL if the section actually changed
  //     if (currentSection !== sidebarKey) {
  //       navigate(`${location.pathname}?section=${sidebarKey}`, { replace: true });
  //     }
  //   }
  // }, [activeSection, navigate, location.pathname, location.search]);

  // Handle section navigation with unsaved changes warning
  const handleSectionChange = useCallback((sectionId) => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingSection(sectionId);
    } else {
      dispatch(setActiveSection({ section: sectionId }));
      setIsMobileSidebarOpen(false);
    }
  }, [hasUnsavedChanges, dispatch]);

  // Handle unsaved changes warning response
  const handleUnsavedWarningResponse = useCallback((shouldProceed) => {
    setShowUnsavedWarning(false);
    
    if (shouldProceed && pendingSection) {
      // Clear unsaved changes and navigate
      Object.keys(unsavedChanges).forEach(section => {
        dispatch(setUnsavedChanges({ 
          doctorId, 
          section, 
          hasChanges: false 
        }));
      });
      dispatch(setActiveSection({ section: pendingSection }));
      setIsMobileSidebarOpen(false);
    }
    
    setPendingSection(null);
  }, [pendingSection, unsavedChanges, doctorId, dispatch]);

  // Handle profile section updates
  const handleSectionUpdate = useCallback((section, hasChanges) => {
    dispatch(setUnsavedChanges({ 
      doctorId, 
      section, 
      hasChanges 
    }));
  }, [doctorId, dispatch]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingSection('back');
    } else {
      navigate('/doctor');
    }
  }, [hasUnsavedChanges, navigate]);

  // Get current section component with error boundary
  const getCurrentSection = () => {
    const section = PROFILE_SECTIONS.find(s => s.id === activeSection);
    if (!section) return null;

    const Component = section.component;
    return (
      <ProfileSectionErrorBoundary 
        sectionName={section.title}
        onReset={() => {
          // Reset section state if needed
          dispatch(setUnsavedChanges({ 
            doctorId, 
            section: section.id, 
            hasChanges: false 
          }));
        }}
      >
        <Component
          key={section.id}
          doctorId={doctorId}
          isEditable={canEdit}
          onUpdate={handleSectionUpdate}
          profileData={profileData}
          {...(section.id === 'personal' ? { personalInfo: resolvedPersonalInfo } : {})}
          {...(section.id === 'experience' ? { 
            experienceData: profileData?.experience || {}, 
            bio: profileData?.bio || '' 
          } : {})}
          {...(section.id === 'consultation' ? { 
            consultationModes: profileData?.consultationModes || {} 
          } : {})}
          {...(section.id === 'availability' ? { 
            workingHours: profileData?.workingHours || {},
            disabled: !canEdit,
            onChange: (availabilityData) => {
              updateProfileSection('availability', availabilityData);
            }
          } : {})}
        />
      </ProfileSectionErrorBoundary>
    );
  };

  // Get profile completion status
  const getProfileCompletion = () => {
    if (!profileData) return { isComplete: false, completionPercentage: 0, missingFields: [] };
    return validateProfileCompleteness();
  };

  const profileCompletion = getProfileCompletion();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Failed to Load Profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Back button and title */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Profile Management
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your professional profile and settings
                </p>
              </div>
            </div>

            {/* Profile completion and save status */}
            <div className="hidden md:flex items-center gap-4">
              {/* Save status indicator */}
              <ProfileSaveStatus 
                saveStatus={getSaveStatus()}
                sectionName={PROFILE_SECTIONS.find(s => s.id === activeSection)?.title}
                showDetails={true}
              />
              
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profileCompletion.completionPercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {profileCompletion.completionPercentage}% complete
                </span>
              </div>
              
              {profileCompletion.isComplete && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Complete</span>
                </div>
              )}

              {/* Offline indicator */}
              {!isOnline && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Offline</span>
                </div>
              )}

              {/* Queued operations indicator */}
              {queuedOperations.length > 0 && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <ClockIcon className="h-4 w-4" />
                  <span className="text-sm">{queuedOperations.length} queued</span>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar - COMMENTED OUT TO AVOID DUPLICATE SIDEBARS */}
          {/* <div className="hidden md:block w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Profile Sections
              </h2>
              
              <ProfileSectionNavigation
                sections={PROFILE_SECTIONS.map(s => s.id)}
                activeSection={activeSection}
                unsavedChanges={unsavedChanges}
                onSectionChange={handleSectionChange}
              />
            </div>
          </div> */}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {getCurrentSection()}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileSidebarOpen(false)}></div>
          
          <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Profile Sections
              </h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <ProfileSectionNavigation
                sections={PROFILE_SECTIONS.map(s => s.id)}
                activeSection={activeSection}
                unsavedChanges={unsavedChanges}
                onSectionChange={handleSectionChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Unsaved Changes
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You have unsaved changes in the following sections:
                    </p>
                    <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      {Object.entries(unsavedChanges).map(([sectionId, hasChanges]) => {
                        if (!hasChanges) return null;
                        const section = PROFILE_SECTIONS.find(s => s.id === sectionId);
                        return (
                          <li key={sectionId} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            {section?.title}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to continue? Your changes will be lost.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => handleUnsavedWarningResponse(true)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Discard Changes
                </button>
                <button
                  onClick={() => handleUnsavedWarningResponse(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Stay Here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfileContainer;