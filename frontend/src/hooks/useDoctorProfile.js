import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../api/apiClient.js';
import { toast } from 'react-toastify';

const useDoctorProfile = (doctorId) => {
  const { user } = useSelector(state => state.auth);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Normalize doctorId (can be string or populated object)
  const normalizedDoctorId = useMemo(() => {
    if (!doctorId) return null;
    if (typeof doctorId === 'string') return doctorId;
    if (typeof doctorId === 'object') return doctorId._id || doctorId.id || null;
    return String(doctorId);
  }, [doctorId]);

  // Fetch complete profile data
  const fetchProfile = useCallback(async () => {
    if (!normalizedDoctorId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/doctors/${normalizedDoctorId}/profile/full?includeStats=true`);
      setProfileData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch doctor profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [normalizedDoctorId]);

  // Update specific section of the profile
  const updateProfileSection = useCallback(async (section, data) => {
    if (!normalizedDoctorId) {
      console.error('No doctorId provided to updateProfileSection');
      return;
    }

    try {
      setSaving(true);
      
      console.log('Updating profile section:', { section, data, doctorId: normalizedDoctorId });
      console.log('API URL:', `/doctors/${normalizedDoctorId}/profile/section`);
      console.log('Request payload:', JSON.stringify({ section, data }, null, 2));
      
      const response = await apiClient.put(`/doctors/${normalizedDoctorId}/profile/section`, {
        section,
        data
      });
      
      console.log('API Response:', response.data);

      // Update local state with the response data
      setProfileData(prevData => {
        if (!prevData) return prevData;

        const updatedData = { ...prevData };
        const responseData = response.data.data.data;
        
        // Update the specific section
        switch (section) {
          case 'personal':
            updatedData.personalInfo = { ...updatedData.personalInfo, ...data };
            break;
          case 'license':
            updatedData.medicalLicense = { ...updatedData.medicalLicense, ...data };
            break;
          case 'specializations':
            updatedData.specializations = data.specializations || updatedData.specializations;
            break;
          case 'qualifications':
            updatedData.qualifications = data.qualifications || updatedData.qualifications;
            break;
          case 'experience':
            updatedData.experience = { ...updatedData.experience, ...data };
            break;
          case 'consultation':
            updatedData.consultationModes = data.consultationModes || updatedData.consultationModes;
            break;
          case 'availability':
            // Use the response data from backend
            if (responseData.workingHours) {
              updatedData.workingHours = responseData.workingHours;
            }
            if (responseData.timeSlotDuration !== undefined) {
              updatedData.timeSlotDuration = responseData.timeSlotDuration;
            }
            if (responseData.breakBetweenSlots !== undefined) {
              updatedData.breakBetweenSlots = responseData.breakBetweenSlots;
            }
            if (responseData.maxAdvanceBookingDays !== undefined) {
              updatedData.maxAdvanceBookingDays = responseData.maxAdvanceBookingDays;
            }
            break;
          case 'bio':
            updatedData.bio = data.bio || updatedData.bio;
            break;
          case 'languages':
            updatedData.languages = data.languages || updatedData.languages;
            break;
          case 'notifications':
            updatedData.notificationPreferences = { ...updatedData.notificationPreferences, ...data };
            break;
          default:
            // For any other section, merge at root level
            Object.assign(updatedData, data);
        }

        return updatedData;
      });

      return response.data.data;
    } catch (err) {
      console.error(`Failed to update ${section}:`, err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || `Failed to update ${section}`;
      toast.error(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [normalizedDoctorId]);

  // Upload documents
  const uploadDocuments = useCallback(async (files, documentType) => {
    if (!normalizedDoctorId || !files || files.length === 0) return;

    try {
      setSaving(true);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('documents', file);
      });
      formData.append('documentType', documentType);

      const response = await apiClient.post(`/doctors/${normalizedDoctorId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh profile data to get updated document references
      await fetchProfile();

      return response.data.data;
    } catch (err) {
      console.error('Failed to upload documents:', err);
      const errorMessage = err.response?.data?.message || 'Failed to upload documents';
      toast.error(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [normalizedDoctorId, fetchProfile]);

  // Validate profile completeness using backend service
  const validateProfileCompleteness = useCallback(async () => {
    if (!normalizedDoctorId) {
      return { isComplete: false, completionPercentage: 0, missingFields: [] };
    }

    try {
      const response = await apiClient.get(`/doctors/${normalizedDoctorId}/profile/completion`);
      return response.data.data;
    } catch (error) {
      console.error('Error validating profile completeness:', error);
      
      // Fallback to client-side validation
      if (!profileData) return { isComplete: false, missingFields: [] };

      const missingFields = [];
      const requiredFields = {
        'Personal Information': {
          firstName: profileData.personalInfo?.firstName,
          lastName: profileData.personalInfo?.lastName,
          email: profileData.personalInfo?.email,
          phone: profileData.personalInfo?.phone
        },
        'Medical License': {
          licenseNumber: profileData.medicalLicense?.licenseNumber,
          issuingAuthority: profileData.medicalLicense?.issuingAuthority,
          expiryDate: profileData.medicalLicense?.expiryDate
        },
        'Specializations': {
          specializations: profileData.specializations?.length > 0
        },
        'Qualifications': {
          qualifications: profileData.qualifications?.length > 0
        },
        'Experience': {
          experienceYears: profileData.experience?.experienceYears,
          currentPosition: profileData.experience?.currentPosition
        },
        'Consultation Modes': {
          consultationModes: profileData.consultationModes?.some(mode => mode.isActive)
        },
        'Working Hours': {
          workingHours: Object.values(profileData.workingHours || {}).some(day => day.available)
        }
      };

      Object.entries(requiredFields).forEach(([section, fields]) => {
        Object.entries(fields).forEach(([field, value]) => {
          if (!value) {
            missingFields.push(`${section}: ${field}`);
          }
        });
      });

      return {
        isComplete: missingFields.length === 0,
        missingFields,
        completionPercentage: Math.round(
          ((Object.keys(requiredFields).length * Object.keys(requiredFields[Object.keys(requiredFields)[0]]).length - missingFields.length) /
          (Object.keys(requiredFields).length * Object.keys(requiredFields[Object.keys(requiredFields)[0]]).length)) * 100
        )
      };
    }
  }, [normalizedDoctorId, profileData]);

  // Check if current user can edit this profile
  const canEdit = useCallback(() => {
    if (!user || !profileData) return false;
    
    // Admin can edit any profile
    if (user.role === 'admin') return true;
    
    // Doctor can edit their own profile
    return profileData.user?._id === user._id || profileData.userId === user._id;
  }, [user, profileData]);

  // Initialize profile fetch
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profileData,
    loading,
    error,
    saving,
    fetchProfile,
    updateProfileSection,
    uploadDocuments,
    validateProfileCompleteness,
    canEdit: canEdit(),
    // Convenience getters for specific sections
    personalInfo: profileData?.personalInfo || {},
    medicalLicense: profileData?.medicalLicense || {},
    specializations: profileData?.specializations || [],
    qualifications: profileData?.qualifications || [],
    experience: profileData?.experience || {},
    consultationModes: profileData?.consultationModes || [],
    workingHours: profileData?.workingHours || {},
    bio: profileData?.bio || '',
    languages: profileData?.languages || [],
    notificationPreferences: profileData?.notificationPreferences || {},
    statistics: profileData?.statistics || {},
    earnings: profileData?.earnings || {}
  };
};

export default useDoctorProfile;