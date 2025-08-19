import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ClockIcon,
  HeartIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    // Mock data - replace with actual API call
    setPatients([
      {
        id: 1,
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        phone: '+1-555-0123',
        age: 32,
        gender: 'Female',
        lastVisit: '2025-07-28',
        nextAppointment: '2025-08-10',
        status: 'active',
        condition: 'Acne Treatment',
        totalVisits: 5,
        totalSpent: 750,
        riskLevel: 'low',
        notes: 'Responding well to current treatment plan',
        medicalHistory: ['Acne', 'Sensitive skin'],
        allergies: ['Penicillin'],
        currentMedications: ['Tretinoin 0.025%', 'Clindamycin gel'],
        address: '123 Main St, Los Angeles, CA 90210'
      },
      {
        id: 2,
        name: 'Michael Chen',
        email: 'michael.chen@email.com',
        phone: '+1-555-0124',
        age: 45,
        gender: 'Male',
        lastVisit: '2025-07-25',
        nextAppointment: '2025-08-15',
        status: 'active',
        condition: 'Psoriasis Management',
        totalVisits: 12,
        totalSpent: 2400,
        riskLevel: 'medium',
        notes: 'Chronic condition, needs regular monitoring',
        medicalHistory: ['Psoriasis', 'Hypertension'],
        allergies: ['Sulfa drugs'],
        currentMedications: ['Methotrexate', 'Topical steroids'],
        address: '456 Oak Ave, Beverly Hills, CA 90210'
      },
      {
        id: 3,
        name: 'Emily Davis',
        email: 'emily.d@email.com',
        phone: '+1-555-0125',
        age: 28,
        gender: 'Female',
        lastVisit: '2025-06-15',
        nextAppointment: null,
        status: 'inactive',
        condition: 'Eczema',
        totalVisits: 3,
        totalSpent: 450,
        riskLevel: 'low',
        notes: 'Treatment completed successfully',
        medicalHistory: ['Eczema', 'Allergic rhinitis'],
        allergies: ['Latex', 'Nickel'],
        currentMedications: ['Moisturizing cream'],
        address: '789 Pine St, Santa Monica, CA 90401'
      },
      {
        id: 4,
        name: 'Robert Wilson',
        email: 'rob.wilson@email.com',
        phone: '+1-555-0126',
        age: 58,
        gender: 'Male',
        lastVisit: '2025-07-30',
        nextAppointment: '2025-08-05',
        status: 'active',
        condition: 'Skin Cancer Screening',
        totalVisits: 8,
        totalSpent: 1600,
        riskLevel: 'high',
        notes: 'Annual screening, family history of melanoma',
        medicalHistory: ['Basal cell carcinoma', 'Sun damage'],
        allergies: ['None known'],
        currentMedications: ['Sunscreen SPF 50'],
        address: '321 Cedar Blvd, Malibu, CA 90265'
      }
    ]);
  }, []);

  const getRiskColor = (level) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.condition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'lastVisit':
        return new Date(b.lastVisit) - new Date(a.lastVisit);
      case 'totalVisits':
        return b.totalVisits - a.totalVisits;
      case 'riskLevel':
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      default:
        return 0;
    }
  });

  const PatientCard = ({ patient }) => (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{patient.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{patient.age} years, {patient.gender}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
            {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(patient.riskLevel)}`}>
            {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Condition:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{patient.condition}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Last Visit:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {new Date(patient.lastVisit).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total Visits:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{patient.totalVisits}</span>
        </div>
        {patient.nextAppointment && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Next Appointment:</span>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {new Date(patient.nextAppointment).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {patient.notes && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">{patient.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPatient(patient)}
          className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View Details
        </button>
        <button className="flex items-center px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors">
          <CalendarDaysIcon className="h-4 w-4 mr-1" />
          Schedule
        </button>
        <button className="flex items-center px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors">
          <DocumentTextIcon className="h-4 w-4 mr-1" />
          Records
        </button>
      </div>
    </div>
  );

  const PatientModal = ({ patient, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Details</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name:</span>
                  <p className="text-gray-900 dark:text-gray-100">{patient.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Age:</span>
                  <p className="text-gray-900 dark:text-gray-100">{patient.age} years</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Gender:</span>
                  <p className="text-gray-900 dark:text-gray-100">{patient.gender}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email:</span>
                  <p className="text-gray-900 dark:text-gray-100">{patient.email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone:</span>
                  <p className="text-gray-900 dark:text-gray-100">{patient.phone}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Visit Summary</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Visits:</span>
                  <p className="text-gray-900 dark:text-gray-100">{patient.totalVisits}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent:</span>
                  <p className="text-gray-900 dark:text-gray-100">${patient.totalSpent}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Visit:</span>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(patient.lastVisit).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Risk Level:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(patient.riskLevel)}`}>
                    {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Medical History</h3>
              <div className="space-y-2">
                {patient.medicalHistory.map((condition, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-sm mr-2 mb-2"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Allergies</h3>
              <div className="space-y-2">
                {patient.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded text-sm mr-2 mb-2"
                  >
                    🚨 {allergy}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Current Medications */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Medications</h3>
            <div className="space-y-2">
              {patient.currentMedications.map((medication, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-sm mr-2 mb-2"
                >
                  💊 {medication}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Clinical Notes</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">{patient.notes}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
              <CalendarDaysIcon className="h-5 w-5 mr-2" />
              Schedule Appointment
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Medical Records
            </button>
            <button className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <PencilIcon className="h-5 w-5 mr-2" />
              Add Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your patient records and medical history</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Patients</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or condition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Patients</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="name">Name</option>
              <option value="lastVisit">Last Visit</option>
              <option value="totalVisits">Total Visits</option>
              <option value="riskLevel">Risk Level</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, color: 'bg-blue-500', icon: UserGroupIcon },
          { label: 'Active Patients', value: patients.filter(p => p.status === 'active').length, color: 'bg-green-500', icon: CheckCircleIcon },
          { label: 'High Risk', value: patients.filter(p => p.riskLevel === 'high').length, color: 'bg-red-500', icon: ExclamationTriangleIcon },
          { label: 'This Month', value: patients.filter(p => new Date(p.lastVisit).getMonth() === new Date().getMonth()).length, color: 'bg-purple-500', icon: CalendarDaysIcon }
        ].map((stat, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedPatients.map(patient => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <PatientModal 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
        />
      )}
    </div>
  );
}

export default PatientList;
