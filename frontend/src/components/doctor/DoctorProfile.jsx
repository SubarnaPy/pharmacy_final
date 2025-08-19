import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import DoctorProfileContainer from './profile/DoctorProfileContainer.jsx';
import { getDoctorId } from '../../utils/doctorUtils.js';
import { setActiveSection } from '../../store/doctorProfileSlice.js';

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

function DoctorProfile({ activeSection }) {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const doctorId = getDoctorId(user);

  // Map sidebar section to container section ID and set it in Redux
  useEffect(() => {
    if (activeSection && SIDEBAR_TO_SECTION_MAPPING[activeSection]) {
      const mappedSection = SIDEBAR_TO_SECTION_MAPPING[activeSection];
      dispatch(setActiveSection({ section: mappedSection }));
    } else if (activeSection === 'profile-management') {
      // If user clicks on "Profile Management" parent, default to personal info
      dispatch(setActiveSection({ section: 'personal' }));
    }
  }, [activeSection, dispatch]);

  return (
    <DoctorProfileContainer 
      doctorId={doctorId}
      isEditable={true}
    />
  );
}

export default DoctorProfile;
