// import React, { useState, useEffect, useContext } from 'react';
// import { toast } from 'react-toastify';
// import { DarkModeContext } from '../../app/DarkModeContext';
// import apiClient from '../../api/apiClient';
// import {
//   BuildingStorefrontIcon,
//   MapPinIcon,
//   PhoneIcon,
//   EnvelopeIcon,
//   ClockIcon,
//   CameraIcon,
//   PencilIcon,
//   CheckIcon,
//   XMarkIcon,
//   StarIcon,
//   UserGroupIcon,
//   TruckIcon
// } from '@heroicons/react/24/outline';

// function PharmacyProfile() {
//   const { isDarkMode } = useContext(DarkModeContext);
//   const [profile, setProfile] = useState({});
//   const [isEditing, setIsEditing] = useState(false);
//   const [editedProfile, setEditedProfile] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [activeTab, setActiveTab] = useState('info');

//   useEffect(() => {
//     fetchProfile();
//   }, []);

//   const fetchProfile = async () => {
//     setLoading(true);
//     try {
//       console.log('🔍 Fetching pharmacy profile...');
//       const response = await apiClient.get('/pharmacies/status/me');
//       console.log('✅ Pharmacy profile received:', response.data);
      
//       setProfile(response.data.data || {});
//       setEditedProfile(response.data.data || {});
//     } catch (error) {
//       console.error('❌ Error fetching pharmacy profile:', error);
//       toast.error(`Failed to fetch pharmacy profile: ${error.response?.data?.message || error.message}`);
//       setProfile({});
//       setEditedProfile({});
//     } finally {
//       setLoading(false);
//     }
//   };
//  }
 

//   const handleSave = async () => {
//     setLoading(true);
//     try {
//       console.log('🔍 Updating pharmacy profile...');
//       const response = await apiClient.put('/pharmacies/me', editedProfile);
//       console.log('✅ Profile updated successfully:', response.data);
      
//       setProfile(editedProfile);
//       setIsEditing(false);
//       toast.success('Profile updated successfully');
//     } catch (error) {
//       console.error('❌ Error updating profile:', error);
//       toast.error(`Failed to update profile: ${error.response?.data?.message || error.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCancel = () => {
//     setEditedProfile(profile);
//     setIsEditing(false);
//   };

//   const handleInputChange = (path, value) => {
//     const pathArray = path.split('.');
//     const newProfile = { ...editedProfile };
    
//     let current = newProfile;
//     for (let i = 0; i < pathArray.length - 1; i++) {
//       current = current[pathArray[i]];
//     }
//     current[pathArray[pathArray.length - 1]] = value;
    
//     setEditedProfile(newProfile);
//   };

//   const handleImageUpload = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       // In a real app, you would upload to your server
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         setEditedProfile({
//           ...editedProfile,
//           logo: e.target.result
//         });
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const InfoTab = () => (
//     <div className="space-y-6">
//       {/* Basic Information */}
//       <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//         <div className="flex items-center justify-between mb-6">
//           <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
//             Basic Information
//           </h2>
//           {!isEditing ? (
//             <button
//               onClick={() => setIsEditing(true)}
//               className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
//             >
//               <PencilIcon className="h-4 w-4" />
//               <span>Edit</span>
//             </button>
//           ) : (
//             <div className="flex items-center space-x-2">
//               <button
//                 onClick={handleSave}
//                 disabled={loading}
//                 className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
//               >
//                 <CheckIcon className="h-4 w-4" />
//                 <span>Save</span>
//               </button>
//               <button
//                 onClick={handleCancel}
//                 className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
//               >
//                 <XMarkIcon className="h-4 w-4" />
//                 <span>Cancel</span>
//               </button>
//             </div>
//           )}
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {/* Logo */}
//           <div className="md:col-span-2 flex items-center space-x-6">
//             <div className="relative">
//               <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
//                 {(isEditing ? editedProfile.logo : profile.logo) ? (
//                   <img 
//                     src={isEditing ? editedProfile.logo : profile.logo} 
//                     alt="Pharmacy Logo" 
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   <BuildingStorefrontIcon className="h-12 w-12 text-gray-400" />
//                 )}
//               </div>
//               {isEditing && (
//                 <label className="absolute -bottom-2 -right-2 p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
//                   <CameraIcon className="h-4 w-4" />
//                   <input
//                     type="file"
//                     accept="image/*"
//                     onChange={handleImageUpload}
//                     className="hidden"
//                   />
//                 </label>
//               )}
//             </div>
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                 Pharmacy Name
//               </label>
//               {isEditing ? (
//                 <input
//                   type="text"
//                   value={editedProfile.name || ''}
//                   onChange={(e) => handleInputChange('name', e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                 />
//               ) : (
//                 <p className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name}</p>
//               )}
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               License Number
//             </label>
//             {isEditing ? (
//               <input
//                 type="text"
//                 value={editedProfile.licenseNumber || ''}
//                 onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//               />
//             ) : (
//               <p className="font-medium text-gray-900 dark:text-white">{profile.licenseNumber}</p>
//             )}
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Established Year
//             </label>
//             {isEditing ? (
//               <input
//                 type="number"
//                 value={editedProfile.establishedYear || ''}
//                 onChange={(e) => handleInputChange('establishedYear', parseInt(e.target.value))}
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//               />
//             ) : (
//               <p className="font-medium text-gray-900 dark:text-white">{profile.establishedYear}</p>
//             )}
//           </div>

//           <div className="md:col-span-2">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Description
//             </label>
//             {isEditing ? (
//               <textarea
//                 rows={4}
//                 value={editedProfile.description || ''}
//                 onChange={(e) => handleInputChange('description', e.target.value)}
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//               />
//             ) : (
//               <p className="text-gray-600 dark:text-gray-400">{profile.description}</p>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Contact Information */}
//       <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//         <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
//           Contact Information
//         </h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Phone Number
//             </label>
//             <div className="flex items-center space-x-2">
//               <PhoneIcon className="h-5 w-5 text-gray-400" />
//               {isEditing ? (
//                 <input
//                   type="text"
//                   value={editedProfile.contact?.phone || ''}
//                   onChange={(e) => handleInputChange('contact.phone', e.target.value)}
//                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                 />
//               ) : (
//                 <span className="text-gray-900 dark:text-white">{profile.contact?.phone}</span>
//               )}
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Email Address
//             </label>
//             <div className="flex items-center space-x-2">
//               <EnvelopeIcon className="h-5 w-5 text-gray-400" />
//               {isEditing ? (
//                 <input
//                   type="email"
//                   value={editedProfile.contact?.email || ''}
//                   onChange={(e) => handleInputChange('contact.email', e.target.value)}
//                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                 />
//               ) : (
//                 <span className="text-gray-900 dark:text-white">{profile.contact?.email}</span>
//               )}
//             </div>
//           </div>

//           <div className="md:col-span-2">
//             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//               Address
//             </label>
//             <div className="flex items-start space-x-2">
//               <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
//               {isEditing ? (
//                 <div className="flex-1 space-y-3">
//                   <input
//                     type="text"
//                     placeholder="Street Address"
//                     value={editedProfile.address?.street || ''}
//                     onChange={(e) => handleInputChange('address.street', e.target.value)}
//                     className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                   />
//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//                     <input
//                       type="text"
//                       placeholder="City"
//                       value={editedProfile.address?.city || ''}
//                       onChange={(e) => handleInputChange('address.city', e.target.value)}
//                       className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                     />
//                     <input
//                       type="text"
//                       placeholder="State"
//                       value={editedProfile.address?.state || ''}
//                       onChange={(e) => handleInputChange('address.state', e.target.value)}
//                       className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                     />
//                     <input
//                       type="text"
//                       placeholder="ZIP Code"
//                       value={editedProfile.address?.zipCode || ''}
//                       onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
//                       className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                     />
//                     <input
//                       type="text"
//                       placeholder="Country"
//                       value={editedProfile.address?.country || ''}
//                       onChange={(e) => handleInputChange('address.country', e.target.value)}
//                       className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
//                     />
//                   </div>
//                 </div>
//               ) : (
//                 <div className="text-gray-900 dark:text-white">
//                   <p>{profile.address?.street}</p>
//                   <p>{profile.address?.city}, {profile.address?.state} {profile.address?.zipCode}</p>
//                   <p>{profile.address?.country}</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Statistics */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//           <div className="flex items-center">
//             <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
//               <StarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
//               <p className="text-2xl font-bold text-gray-900 dark:text-white">
//                 {profile.rating}/5
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//           <div className="flex items-center">
//             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
//               <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-600 dark:text-gray-400">Reviews</p>
//               <p className="text-2xl font-bold text-gray-900 dark:text-white">
//                 {profile.totalReviews}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//           <div className="flex items-center">
//             <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
//               <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-600 dark:text-gray-400">Staff</p>
//               <p className="text-2xl font-bold text-gray-900 dark:text-white">
//                 {profile.totalStaff}
//               </p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//           <div className="flex items-center">
//             <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
//               <TruckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
//             </div>
//             <div className="ml-4">
//               <p className="text-sm text-gray-600 dark:text-gray-400">Delivery</p>
//               <p className="text-2xl font-bold text-gray-900 dark:text-white">
//                 {profile.deliveryRadius}mi
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   const ServicesTab = () => (
//     <div className="space-y-6">
//       {/* Services */}
//       <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//         <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
//           Services Offered
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {profile.services?.map((service, index) => (
//             <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
//               <CheckIcon className="h-5 w-5 text-green-500" />
//               <span className="text-gray-900 dark:text-white">{service}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Specializations */}
//       <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//         <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
//           Specializations
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {profile.specializations?.map((spec, index) => (
//             <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
//               <StarIcon className="h-5 w-5 text-blue-500" />
//               <span className="text-gray-900 dark:text-white">{spec}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Insurance Accepted */}
//       <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//         <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
//           Insurance Accepted
//         </h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {profile.insuranceAccepted?.map((insurance, index) => (
//             <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
//               <CheckIcon className="h-5 w-5 text-green-500" />
//               <span className="text-gray-900 dark:text-white">{insurance}</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );

//   const HoursTab = () => (
//     <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
//       <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
//         Working Hours
//       </h2>
      
//       <div className="space-y-4">
//         {Object.entries(profile.workingHours || {}).map(([day, hours]) => (
//           <div key={day} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
//             <div className="flex items-center space-x-3">
//               <ClockIcon className="h-5 w-5 text-gray-400" />
//               <span className="font-medium text-gray-900 dark:text-white capitalize">
//                 {day}
//               </span>
//             </div>
            
//             <div className="text-right">
//               {hours.isOpen ? (
//                 <span className="text-gray-900 dark:text-white">
//                   {hours.open} - {hours.close}
//                 </span>
//               ) : (
//                 <span className="text-red-600 dark:text-red-400">Closed</span>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );

//   if (loading && !profile.name) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div>
//         <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
//           🏪 Pharmacy Profile
//         </h1>
//         <p className="text-gray-600 dark:text-gray-400 mt-2">
//           Manage your pharmacy information and settings
//         </p>
//       </div>

//       {/* Tabs */}
//       <div className="border-b border-gray-200 dark:border-gray-700">
//         <nav className="-mb-px flex space-x-8">
//           {[
//             { id: 'info', name: 'Information', icon: BuildingStorefrontIcon },
//             { id: 'services', name: 'Services', icon: CheckIcon },
//             { id: 'hours', name: 'Hours', icon: ClockIcon }
//           ].map((tab) => (
//             <button
//               key={tab.id}
//               onClick={() => setActiveTab(tab.id)}
//               className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === tab.id
//                   ? 'border-blue-500 text-blue-600 dark:text-blue-400'
//                   : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
//               }`}
//             >
//               <tab.icon className="h-5 w-5" />
//               <span>{tab.name}</span>
//             </button>
//           ))}
//         </nav>
//       </div>

//       {/* Tab Content */}
//       {activeTab === 'info' && <InfoTab />}
//       {activeTab === 'services' && <ServicesTab />}
//       {activeTab === 'hours' && <HoursTab />}
//     </div>
//   );


// export default PharmacyProfile;
import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { DarkModeContext } from '../../app/DarkModeContext';
import apiClient from '../../api/apiClient';
import {
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon,
  UserGroupIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

function PharmacyProfile() {
  const { isDarkMode } = useContext(DarkModeContext);
  const [profile, setProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching pharmacy profile...');
      const response = await apiClient.get('/pharmacies/status/me');
      console.log('✅ Pharmacy profile received:', response.data);
      
      setProfile(response.data.data || {});
      setEditedProfile(response.data.data || {});
    } catch (error) {
      console.error('❌ Error fetching pharmacy profile:', error);
      toast.error(`Failed to fetch pharmacy profile: ${error.response?.data?.message || error.message}`);
      setProfile({});
      setEditedProfile({});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log('🔍 Updating pharmacy profile...');
      const response = await apiClient.put('/pharmacies/me', editedProfile);
      console.log('✅ Profile updated successfully:', response.data);
      
      setProfile(editedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleInputChange = (path, value) => {
    const pathArray = path.split('.');
  
    setEditedProfile(prevProfile => {
      const newProfile = { ...prevProfile };
      let currentLevel = newProfile;
  
      for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];
        // Create a copy of the nested object, or a new object if it doesn't exist
        currentLevel[key] = { ...currentLevel[key] };
        currentLevel = currentLevel[key];
      }
  
      currentLevel[pathArray[pathArray.length - 1]] = value;
      return newProfile;
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // In a real app, you would upload to your server
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditedProfile({
          ...editedProfile,
          logo: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const InfoTab = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Basic Information
          </h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div className="md:col-span-2 flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {(isEditing ? editedProfile.logo : profile.logo) ? (
                  <img 
                    src={isEditing ? editedProfile.logo : profile.logo} 
                    alt="Pharmacy Logo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BuildingStorefrontIcon className="h-12 w-12 text-gray-400" />
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                  <CameraIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pharmacy Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{profile.name}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              License Number
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedProfile.licenseNumber || ''}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="font-medium text-gray-900 dark:text-white">{profile.licenseNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Established Year
            </label>
            {isEditing ? (
              <input
                type="number"
                value={editedProfile.establishedYear || ''}
                onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('establishedYear', value === '' ? '' : parseInt(value, 10));
                  }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="font-medium text-gray-900 dark:text-white">{profile.establishedYear}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                rows={4}
                value={editedProfile.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{profile.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="flex items-center space-x-2">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.contact?.phone || ''}
                  onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <span className="text-gray-900 dark:text-white">{profile.contact?.phone}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="flex items-center space-x-2">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              {isEditing ? (
                <input
                  type="email"
                  value={editedProfile.contact?.email || ''}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <span className="text-gray-900 dark:text-white">{profile.contact?.email}</span>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <div className="flex items-start space-x-2">
              <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
              {isEditing ? (
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={editedProfile.address?.street || ''}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={editedProfile.address?.city || ''}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={editedProfile.address?.state || ''}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={editedProfile.address?.zipCode || ''}
                      onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={editedProfile.address?.country || ''}
                      onChange={(e) => handleInputChange('address.country', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-gray-900 dark:text-white">
                  <p>{profile.address?.street}</p>
                  <p>{profile.address?.city}, {profile.address?.state} {profile.address?.zipCode}</p>
                  <p>{profile.address?.country}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <StarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.rating}/5
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Reviews</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.totalReviews}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Staff</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.totalStaff}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TruckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Delivery</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.deliveryRadius}mi
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ServicesTab = () => (
    <div className="space-y-6">
      {/* Services */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Services Offered
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.services?.map((service) => (
            <div key={service} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-gray-900 dark:text-white">{service}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Specializations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Specializations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.specializations?.map((spec) => (
            <div key={spec} className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <StarIcon className="h-5 w-5 text-blue-500" />
              <span className="text-gray-900 dark:text-white">{spec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insurance Accepted */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Insurance Accepted
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.insuranceAccepted?.map((insurance) => (
            <div key={insurance} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <CheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-gray-900 dark:text-white">{insurance}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const HoursTab = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Working Hours
      </h2>
      
      <div className="space-y-4">
        {Object.entries(profile.workingHours || {}).map(([day, hours]) => (
          <div key={day} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {day}
              </span>
            </div>
            
            <div className="text-right">
              {hours.isOpen ? (
                <span className="text-gray-900 dark:text-white">
                  {hours.open} - {hours.close}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Closed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading && !profile.name) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🏪 Pharmacy Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your pharmacy information and settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'info', name: 'Information', icon: BuildingStorefrontIcon },
            { id: 'services', name: 'Services', icon: CheckIcon },
            { id: 'hours', name: 'Hours', icon: ClockIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && <InfoTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'hours' && <HoursTab />}
    </div>
  );
}

export default PharmacyProfile;