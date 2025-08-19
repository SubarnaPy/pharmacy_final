import React, { useState, useEffect } from 'react';
import {
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  VideoCameraIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  StarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

function ConsultationHistory() {
  const [consultations, setConsultations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Mock data - replace with actual API call
    setConsultations([
      {
        id: 1,
        patientName: 'Sarah Johnson',
        date: '2025-08-01',
        time: '09:00 AM',
        duration: 30,
        type: 'video',
        status: 'completed',
        diagnosis: 'Mild acne, hormonal',
        treatment: 'Prescribed tretinoin cream 0.025%',
        notes: 'Patient responding well to treatment. Follow-up in 4 weeks.',
        rating: 5,
        fee: 150,
        prescriptions: ['Tretinoin 0.025%', 'Gentle cleanser']
      },
      {
        id: 2,
        patientName: 'Michael Chen',
        date: '2025-07-28',
        time: '2:30 PM',
        duration: 45,
        type: 'inPerson',
        status: 'completed',
        diagnosis: 'Psoriasis flare-up',
        treatment: 'Adjusted medication dosage',
        notes: 'Stress-related flare-up. Discussed stress management techniques.',
        rating: 5,
        fee: 200,
        prescriptions: ['Methotrexate increase', 'Topical steroid']
      },
      {
        id: 3,
        patientName: 'Emily Davis',
        date: '2025-07-25',
        time: '11:00 AM',
        duration: 20,
        type: 'phone',
        status: 'completed',
        diagnosis: 'Eczema management',
        treatment: 'Prescription renewal',
        notes: 'Condition stable, continuing current treatment plan.',
        rating: 4,
        fee: 100,
        prescriptions: ['Hydrocortisone cream', 'Moisturizer']
      },
      {
        id: 4,
        patientName: 'Robert Wilson',
        date: '2025-07-22',
        time: '3:00 PM',
        duration: 60,
        type: 'inPerson',
        status: 'completed',
        diagnosis: 'Annual skin screening',
        treatment: 'Comprehensive examination',
        notes: 'All moles and lesions examined. No concerning findings.',
        rating: 5,
        fee: 250,
        prescriptions: ['Sunscreen SPF 50']
      },
      {
        id: 5,
        patientName: 'Lisa Anderson',
        date: '2025-07-20',
        time: '10:30 AM',
        duration: 35,
        type: 'video',
        status: 'completed',
        diagnosis: 'Rosacea consultation',
        treatment: 'Started new treatment protocol',
        notes: 'Initial consultation for rosacea. Started metronidazole gel.',
        rating: 5,
        fee: 150,
        prescriptions: ['Metronidazole gel', 'Gentle sunscreen']
      }
    ]);
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <VideoCameraIcon className="h-5 w-5 text-purple-500" />;
      case 'phone':
        return <PhoneIcon className="h-5 w-5 text-green-500" />;
      case 'chat':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500" />;
      case 'inPerson':
        return <UserIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <CalendarDaysIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <StarIcon
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const filteredConsultations = consultations.filter(consultation => {
    const matchesSearch = consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consultation.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || consultation.type === filterType;
    const matchesStatus = filterStatus === 'all' || consultation.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const ConsultationCard = ({ consultation }) => (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {consultation.patientName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{consultation.patientName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(consultation.date).toLocaleDateString()} at {consultation.time}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getTypeIcon(consultation.type)}
          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {consultation.type === 'inPerson' ? 'In-Person' : consultation.type}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnosis:</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">{consultation.diagnosis}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment:</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">{consultation.treatment}</p>
        </div>

        {consultation.notes && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{consultation.notes}</p>
          </div>
        )}

        {consultation.prescriptions && consultation.prescriptions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prescriptions:</p>
            <div className="flex flex-wrap gap-2">
              {consultation.prescriptions.map((prescription, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs"
                >
                  {prescription}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{consultation.duration} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${consultation.fee}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {getRatingStars(consultation.rating)}
          </div>
          <button className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
            <ArrowRightIcon className="h-4 w-4 mr-1" />
            Details
          </button>
        </div>
      </div>
    </div>
  );

  const totalConsultations = consultations.length;
  const totalRevenue = consultations.reduce((sum, c) => sum + c.fee, 0);
  const averageRating = consultations.reduce((sum, c) => sum + c.rating, 0) / consultations.length;
  const averageDuration = consultations.reduce((sum, c) => sum + c.duration, 0) / consultations.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Consultation History</h2>
          <p className="text-gray-600 dark:text-gray-400">Review past consultations and patient interactions</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Consultations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalConsultations}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{averageRating.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
              <StarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Math.round(averageDuration)} min</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="video">Video</option>
              <option value="phone">Phone</option>
              <option value="inPerson">In-Person</option>
              <option value="chat">Chat</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Consultations List */}
      <div className="space-y-4">
        {filteredConsultations.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-12 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
            <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No consultations found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No consultations match your current search and filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredConsultations.map(consultation => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
        )}
      </div>

      {/* Export/Actions */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Analytics
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Advanced Filter
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsultationHistory;
