import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  HeartIcon,
  FireIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

function PatientRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock patient data
  const [patients, setPatients] = useState([
    {
      id: 'P001',
      name: 'John Doe',
      age: 32,
      gender: 'Male',
      phone: '+1-555-0123',
      email: 'john.doe@email.com',
      address: '123 Main St, City, State 12345',
      bloodType: 'A+',
      height: '5\'10"',
      weight: '175 lbs',
      lastVisit: '2024-01-15',
      nextAppointment: '2024-02-15',
      status: 'active',
      riskLevel: 'low',
      conditions: ['Hypertension', 'Diabetes Type 2'],
      allergies: ['Penicillin', 'Shellfish'],
      currentMedications: ['Metformin 500mg', 'Lisinopril 10mg'],
      emergencyContact: {
        name: 'Jane Doe',
        relation: 'Spouse',
        phone: '+1-555-0124'
      },
      insurance: {
        provider: 'Blue Cross Blue Shield',
        policyNumber: 'BC123456789',
        groupNumber: 'GRP001'
      },
      visits: [
        {
          date: '2024-01-15',
          type: 'Routine Checkup',
          diagnosis: 'Hypertension monitoring',
          prescription: 'Continue current medications',
          notes: 'Blood pressure stable, continue monitoring'
        },
        {
          date: '2023-12-10',
          type: 'Follow-up',
          diagnosis: 'Diabetes management',
          prescription: 'Metformin 500mg twice daily',
          notes: 'HbA1c improved to 7.2%'
        }
      ],
      vitals: [
        { date: '2024-01-15', bp: '130/80', pulse: '72', temp: '98.6°F', weight: '175' },
        { date: '2023-12-10', bp: '135/85', pulse: '75', temp: '98.4°F', weight: '178' }
      ],
      labs: [
        { date: '2024-01-10', test: 'HbA1c', result: '7.2%', reference: '<7.0%', status: 'high' },
        { date: '2024-01-10', test: 'Cholesterol', result: '180 mg/dL', reference: '<200 mg/dL', status: 'normal' }
      ]
    },
    {
      id: 'P002',
      name: 'Sarah Johnson',
      age: 28,
      gender: 'Female',
      phone: '+1-555-0234',
      email: 'sarah.johnson@email.com',
      address: '456 Oak Ave, City, State 12345',
      bloodType: 'O-',
      height: '5\'6"',
      weight: '140 lbs',
      lastVisit: '2024-01-20',
      nextAppointment: '2024-03-01',
      status: 'active',
      riskLevel: 'low',
      conditions: ['Anxiety'],
      allergies: ['Latex'],
      currentMedications: ['Sertraline 50mg'],
      emergencyContact: {
        name: 'Robert Johnson',
        relation: 'Father',
        phone: '+1-555-0235'
      },
      insurance: {
        provider: 'Aetna',
        policyNumber: 'AET987654321',
        groupNumber: 'GRP002'
      },
      visits: [
        {
          date: '2024-01-20',
          type: 'Mental Health',
          diagnosis: 'Anxiety disorder - stable',
          prescription: 'Continue Sertraline 50mg',
          notes: 'Patient reports improved mood and reduced anxiety'
        }
      ],
      vitals: [
        { date: '2024-01-20', bp: '110/70', pulse: '68', temp: '98.2°F', weight: '140' }
      ],
      labs: []
    },
    {
      id: 'P003',
      name: 'Michael Chen',
      age: 45,
      gender: 'Male',
      phone: '+1-555-0345',
      email: 'michael.chen@email.com',
      address: '789 Pine St, City, State 12345',
      bloodType: 'B+',
      height: '5\'8"',
      weight: '190 lbs',
      lastVisit: '2024-01-18',
      nextAppointment: null,
      status: 'inactive',
      riskLevel: 'high',
      conditions: ['Coronary Artery Disease', 'High Cholesterol'],
      allergies: ['Aspirin'],
      currentMedications: ['Atorvastatin 40mg', 'Metoprolol 50mg'],
      emergencyContact: {
        name: 'Lisa Chen',
        relation: 'Wife',
        phone: '+1-555-0346'
      },
      insurance: {
        provider: 'Cigna',
        policyNumber: 'CIG555666777',
        groupNumber: 'GRP003'
      },
      visits: [
        {
          date: '2024-01-18',
          type: 'Cardiology Follow-up',
          diagnosis: 'Stable coronary artery disease',
          prescription: 'Continue current regimen',
          notes: 'EKG shows stable changes, continue medications'
        }
      ],
      vitals: [
        { date: '2024-01-18', bp: '145/90', pulse: '82', temp: '98.8°F', weight: '190' }
      ],
      labs: [
        { date: '2024-01-15', test: 'LDL Cholesterol', result: '150 mg/dL', reference: '<100 mg/dL', status: 'high' }
      ]
    }
  ]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone.includes(searchTerm) ||
                         patient.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'active' && patient.status === 'active') ||
                         (selectedFilter === 'inactive' && patient.status === 'inactive') ||
                         (selectedFilter === 'high-risk' && patient.riskLevel === 'high');
    
    return matchesSearch && matchesFilter;
  });

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400'
      : 'text-gray-600 bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400';
  };

  const openPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  const PatientCard = ({ patient }) => (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{patient.name}</h3>
            <p className="text-gray-600 dark:text-gray-400">{patient.age} years • {patient.gender}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(patient.riskLevel)}`}>
            {patient.riskLevel.toUpperCase()} RISK
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
            {patient.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center space-x-2">
          <PhoneIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{patient.phone}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
          </span>
        </div>

        {patient.nextAppointment && (
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Next: {new Date(patient.nextAppointment).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {patient.conditions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Current Conditions</p>
          <div className="flex flex-wrap gap-1">
            {patient.conditions.slice(0, 2).map((condition, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                {condition}
              </span>
            ))}
            {patient.conditions.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                +{patient.conditions.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors">
            <PhoneIcon className="h-4 w-4" />
          </button>
          <button className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg transition-colors">
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => openPatientDetails(patient)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center text-sm"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View Details
        </button>
      </div>
    </div>
  );

  const PatientDetailsModal = () => {
    if (!selectedPatient) return null;

    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'visits', label: 'Visit History' },
      { id: 'vitals', label: 'Vitals' },
      { id: 'labs', label: 'Lab Results' },
      { id: 'medications', label: 'Medications' }
    ];

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedPatient.name}</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.bloodType}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPatientDetails(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Phone:</span> {selectedPatient.phone}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Email:</span> {selectedPatient.email}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Address:</span> {selectedPatient.address}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Emergency Contact</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Name:</span> {selectedPatient.emergencyContact.name}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Relation:</span> {selectedPatient.emergencyContact.relation}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Phone:</span> {selectedPatient.emergencyContact.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Medical Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Height:</span> {selectedPatient.height}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Weight:</span> {selectedPatient.weight}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Blood Type:</span> {selectedPatient.bloodType}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Insurance</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Provider:</span> {selectedPatient.insurance.provider}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Policy:</span> {selectedPatient.insurance.policyNumber}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Group:</span> {selectedPatient.insurance.groupNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'visits' && (
              <div className="space-y-4">
                {selectedPatient.visits.map((visit, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{visit.type}</h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(visit.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Diagnosis:</span> {visit.diagnosis}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Prescription:</span> {visit.prescription}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Notes:</span> {visit.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'vitals' && (
              <div className="space-y-4">
                {selectedPatient.vitals.map((vital, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Vital Signs</h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(vital.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Blood Pressure</p>
                        <p className="font-semibold">{vital.bp}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Pulse</p>
                        <p className="font-semibold">{vital.pulse} bpm</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Temperature</p>
                        <p className="font-semibold">{vital.temp}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Weight</p>
                        <p className="font-semibold">{vital.weight} lbs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'labs' && (
              <div className="space-y-4">
                {selectedPatient.labs.length > 0 ? (
                  selectedPatient.labs.map((lab, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{lab.test}</h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(lab.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Result: <span className="font-semibold text-gray-900 dark:text-gray-100">{lab.result}</span></p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Reference: {lab.reference}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lab.status === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                          lab.status === 'low' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        }`}>
                          {lab.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No lab results available
                  </div>
                )}
              </div>
            )}

            {activeTab === 'medications' && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Medications</h3>
                  <div className="space-y-2">
                    {selectedPatient.currentMedications.map((medication, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                        <span className="text-gray-900 dark:text-gray-100">{medication}</span>
                        <span className="text-green-600 dark:text-green-400 text-sm">Active</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Allergies</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.allergies.map((allergy, index) => (
                      <span key={index} className="px-3 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-full text-sm flex items-center">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Records</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage and view patient medical records</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Patients</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="high-risk">High Risk</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <DocumentTextIcon className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No patients found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria or filters.</p>
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && <PatientDetailsModal />}
    </div>
  );
}

export default PatientRecords;
