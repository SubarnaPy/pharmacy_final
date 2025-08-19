import React, { useState } from 'react';
import EditableField from './EditableField';
import MultiSelectField from './MultiSelectField';
import TimeSlotPicker from './TimeSlotPicker';
import DocumentUploader from './DocumentUploader';

const FormComponentsDemo = () => {
  const [personalInfo, setPersonalInfo] = useState({
    firstName: 'Dr. John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    phone: '+1-555-0123',
    bio: 'Experienced physician with 10+ years of practice.'
  });

  const [specializations, setSpecializations] = useState(['Cardiology', 'Internal Medicine']);
  const [languages, setLanguages] = useState(['English', 'Spanish']);
  const [workingHours, setWorkingHours] = useState({
    monday: {
      available: true,
      slots: [{ start: '09:00', end: '17:00' }],
      breaks: [{ start: '12:00', end: '13:00', label: 'Lunch Break' }]
    },
    tuesday: {
      available: true,
      slots: [{ start: '09:00', end: '17:00' }],
      breaks: []
    }
  });
  const [documents, setDocuments] = useState([]);

  const specializationOptions = [
    'Cardiology', 'Dermatology', 'Internal Medicine', 'Pediatrics', 
    'Orthopedics', 'Neurology', 'Psychiatry', 'Radiology'
  ];

  const languageOptions = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
    'Chinese', 'Japanese', 'Korean', 'Arabic'
  ];

  const handleSavePersonalInfo = async (field, value) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
    console.log(`Saved ${field}:`, value);
  };

  const handleDocumentUpload = async (file, options) => {
    // Simulate file upload
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            url: `https://example.com/documents/${file.name}`,
            uploadedAt: new Date().toISOString()
          });
        } else {
          reject(new Error('Upload failed. Please try again.'));
        }
      }, 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Form Components Demo
      </h1>

      {/* Personal Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableField
            value={personalInfo.firstName}
            onSave={(value) => handleSavePersonalInfo('firstName', value)}
            label="First Name"
            placeholder="Enter first name"
            required
          />
          <EditableField
            value={personalInfo.lastName}
            onSave={(value) => handleSavePersonalInfo('lastName', value)}
            label="Last Name"
            placeholder="Enter last name"
            required
          />
          <EditableField
            value={personalInfo.email}
            onSave={(value) => handleSavePersonalInfo('email', value)}
            label="Email"
            type="email"
            placeholder="Enter email address"
            required
          />
          <EditableField
            value={personalInfo.phone}
            onSave={(value) => handleSavePersonalInfo('phone', value)}
            label="Phone"
            type="tel"
            placeholder="Enter phone number"
          />
        </div>
        <div className="mt-6">
          <EditableField
            value={personalInfo.bio}
            onSave={(value) => handleSavePersonalInfo('bio', value)}
            label="Professional Bio"
            placeholder="Enter your professional bio"
            multiline
            maxLength={500}
          />
        </div>
      </div>

      {/* Specializations Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Specializations & Languages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MultiSelectField
            value={specializations}
            onChange={setSpecializations}
            options={specializationOptions}
            label="Medical Specializations"
            placeholder="Select specializations..."
            maxSelections={3}
            required
            allowCustom
          />
          <MultiSelectField
            value={languages}
            onChange={setLanguages}
            options={languageOptions}
            label="Languages Spoken"
            placeholder="Select languages..."
            searchable
            creatable
          />
        </div>
      </div>

      {/* Working Hours Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Working Hours
        </h2>
        <TimeSlotPicker
          value={workingHours}
          onChange={setWorkingHours}
          label="Weekly Schedule"
          required
          timeFormat="24"
          slotDuration={30}
          breakDuration={15}
        />
      </div>

      {/* Documents Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Document Upload
        </h2>
        <DocumentUploader
          value={documents}
          onChange={setDocuments}
          onUpload={handleDocumentUpload}
          label="Medical License & Certificates"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          maxFiles={5}
          maxFileSize={10 * 1024 * 1024} // 10MB
          multiple
          required
          showProgress
          showPreview
        />
      </div>

      {/* Current State Display */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Current State (for debugging)
        </h2>
        <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-auto">
          {JSON.stringify({
            personalInfo,
            specializations,
            languages,
            workingHours,
            documents: documents.map(doc => ({
              id: doc.id,
              name: doc.name,
              size: doc.size,
              status: doc.status
            }))
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default FormComponentsDemo;