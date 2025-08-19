import React from 'react';
import {
  UserIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  VideoCameraIcon,
  ClockIcon,
  BellIcon,
  ChartBarIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const SECTION_ICONS = {
  personal: UserIcon,
  license: ShieldCheckIcon,
  specializations: AcademicCapIcon,
  qualifications: AcademicCapIcon,
  experience: BriefcaseIcon,
  consultation: VideoCameraIcon,
  availability: ClockIcon,
  languages: UserIcon,
  notifications: BellIcon,
  stats: ChartBarIcon
};

const SECTION_TITLES = {
  personal: 'Personal Information',
  license: 'Medical License',
  specializations: 'Specializations',
  qualifications: 'Qualifications',
  experience: 'Experience',
  consultation: 'Consultation Modes',
  availability: 'Availability',
  languages: 'Languages',
  notifications: 'Notifications',
  stats: 'Statistics'
};

const SECTION_DESCRIPTIONS = {
  personal: 'Basic personal and contact information',
  license: 'License information and verification documents',
  specializations: 'Medical specializations and areas of expertise',
  qualifications: 'Educational qualifications and certifications',
  experience: 'Professional experience and bio',
  consultation: 'Available consultation types and fees',
  availability: 'Working hours and schedule settings',
  languages: 'Supported languages for consultations',
  notifications: 'Notification preferences and settings',
  stats: 'Profile statistics and earnings overview'
};

const ProfileSectionNavigation = ({
  sections,
  activeSection,
  unsavedChanges = {},
  onSectionChange,
  className = ''
}) => {
  return (
    <nav className={`space-y-2 ${className}`}>
      {sections.map((sectionId) => {
        const Icon = SECTION_ICONS[sectionId];
        const title = SECTION_TITLES[sectionId];
        const description = SECTION_DESCRIPTIONS[sectionId];
        const isActive = activeSection === sectionId;
        const hasUnsaved = unsavedChanges[sectionId];
        
        if (!Icon || !title) return null;
        
        return (
          <button
            key={sectionId}
            onClick={() => onSectionChange(sectionId)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-emerald-100 dark:bg-emerald-800/30' 
                  : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
              }`}>
                <Icon className="h-5 w-5 flex-shrink-0" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{title}</p>
                  <div className="flex items-center gap-2">
                    {hasUnsaved && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse"></div>
                    )}
                    <ChevronRightIcon className={`h-4 w-4 transition-transform ${
                      isActive ? 'rotate-90' : 'group-hover:translate-x-1'
                    }`} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  {description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};

export default ProfileSectionNavigation;