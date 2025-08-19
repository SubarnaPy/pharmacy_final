import React, { useEffect, useState, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile, saveProfile, uploadAvatar } from '../userSlice';
import { useAuth } from '../../auth/hooks/useAuth';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { DarkModeContext } from '../../../app/DarkModeContext';

function Profile() {
  const dispatch = useDispatch();
  const { profile, status } = useSelector(state => state.user);
  const { user } = useAuth();
  const { isDarkMode } = useContext(DarkModeContext);
  const [formData, setFormData] = useState({});
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    setMounted(true);
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) setFormData({ ...(profile.profile || {}), healthHistory: profile.healthHistory || [] });
  }, [profile]);

  // Handlers for health history entries
  const handleHistoryChange = (index, field, value) => {
    setFormData(prev => {
      const updated = prev.healthHistory.map((item, i) => i === index ? { ...item, [field]: value } : item);
      return { ...prev, healthHistory: updated };
    });
  };
  const handleAddHistory = () => {
    setFormData(prev => ({
      ...prev,
      healthHistory: [...(prev.healthHistory || []), { condition: '', diagnosedDate: '', medications: '', allergies: '', notes: '', isActive: true }]
    }));
  };
  const handleRemoveHistory = (index) => {
    setFormData(prev => ({
      ...prev,
      healthHistory: prev.healthHistory.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(saveProfile({ profile: formData, healthHistory: formData.healthHistory }));
  };

  if (status === 'loading') return <div>Loading...</div>;
  if (!profile) return <div>User profile not available. Please log in again.</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <h2 className="text-2xl mb-4">Profile</h2>
      {/* Read-only info */}
      <div className="mb-4">
        <p className="text-gray-600">Email: {profile.email}</p>
        <p className="text-gray-600">Role: {profile.role}</p>
      </div>
      {/* Avatar preview and upload */}
      <div className="mb-4 flex items-center space-x-4">
        {profile.profile?.avatar?.url && (
          <img src={profile.profile.avatar.url} alt="Avatar" className="w-16 h-16 rounded-full" />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={e => e.target.files[0] && dispatch(uploadAvatar(e.target.files[0]))}
          className="border p-2"
        />
      </div>
      <input
        name="firstName"
        placeholder="First Name"
        value={formData.firstName || ''}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      <input
        name="lastName"
        placeholder="Last Name"
        value={formData.lastName || ''}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      <input
        name="phone"
        placeholder="Phone"
        value={formData.phone || ''}
        onChange={handleChange}
        className="border p-2 mb-2 w-full"
      />
      {user.role === 'patient' && (
        <>
        {/* Existing patient fields */}
        <input
          name="dateOfBirth"
          type="date"
          placeholder="Date of Birth"
          value={formData.dateOfBirth?.split('T')[0] || ''}
          onChange={handleChange}
          className="border p-2 mb-2 w-full"
        />
        {/* Health History Section */}
        <h3 className="text-xl mt-4 mb-2">Health History</h3>
        {formData.healthHistory?.map((entry, idx) => (
          <div key={idx} className="border p-4 mb-2">
            <div className="flex justify-between">
              <p>Entry {idx + 1}</p>
              <button type="button" onClick={() => handleRemoveHistory(idx)} className="text-red-500">Remove</button>
            </div>
            <input type="text" placeholder="Condition" value={entry.condition} onChange={e => handleHistoryChange(idx, 'condition', e.target.value)} className="border p-2 mb-2 w-full" />
            <input type="date" value={entry.diagnosedDate?.split('T')[0] || ''} onChange={e => handleHistoryChange(idx, 'diagnosedDate', e.target.value)} className="border p-2 mb-2 w-full" />
            <input type="text" placeholder="Medications (comma separated)" value={entry.medications} onChange={e => handleHistoryChange(idx, 'medications', e.target.value)} className="border p-2 mb-2 w-full" />
            <input type="text" placeholder="Allergies (comma separated)" value={entry.allergies} onChange={e => handleHistoryChange(idx, 'allergies', e.target.value)} className="border p-2 mb-2 w-full" />
            <textarea placeholder="Notes" value={entry.notes} onChange={e => handleHistoryChange(idx, 'notes', e.target.value)} className="border p-2 mb-2 w-full" />
            <label className="inline-flex items-center">
              <input type="checkbox" checked={entry.isActive} onChange={e => handleHistoryChange(idx, 'isActive', e.target.checked)} className="form-checkbox" />
              <span className="ml-2">Active</span>
            </label>
          </div>
        ))}
        <button type="button" onClick={handleAddHistory} className="bg-green-500 text-white py-1 px-3 mb-4">Add Entry</button>
        </>
      )}
      <button type="submit" className="bg-blue-500 text-white py-2 px-4">
        Save
      </button>
    </form>
  );
}

export default Profile;
