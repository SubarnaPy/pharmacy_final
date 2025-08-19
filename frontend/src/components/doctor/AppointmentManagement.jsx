import React, { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  VideoCameraIcon,
  UserIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ArrowRightIcon,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

function AppointmentManagement() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  useEffect(() => {
    // Mock data - replace with actual API call
    setAppointments([
      {
        id: 1,
        patientName: 'Sarah Johnson',
        patientEmail: 'sarah.j@email.com',
        date: '2025-08-03',
        time: '09:00',
        duration: 30,
        type: 'video',
        status: 'confirmed',
        reason: 'Skin consultation for acne treatment',
        fee: 150,
        notes: 'First-time patient, referred by Dr. Smith'
      },
      {
        id: 2,
        patientName: 'Michael Chen',
        patientEmail: 'michael.chen@email.com',
        date: '2025-08-03',
        time: '10:30',
        duration: 45,
        type: 'inPerson',
        status: 'confirmed',
        reason: 'Follow-up for laser treatment',
        fee: 200,
        notes: 'Post-treatment checkup'
      },
      {
        id: 3,
        patientName: 'Emily Davis',
        patientEmail: 'emily.d@email.com',
        date: '2025-08-03',
        time: '14:00',
        duration: 30,
        type: 'phone',
        status: 'pending',
        reason: 'Prescription consultation',
        fee: 100,
        notes: 'Needs prescription renewal'
      },
      {
        id: 4,
        patientName: 'Robert Wilson',
        patientEmail: 'rob.wilson@email.com',
        date: '2025-08-04',
        time: '11:00',
        duration: 60,
        type: 'inPerson',
        status: 'completed',
        reason: 'Comprehensive skin examination',
        fee: 250,
        notes: 'Annual checkup completed'
      }
    ]);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

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

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    const matchesDate = appointment.date === selectedDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleStatusUpdate = (appointmentId, newStatus) => {
    setAppointments(appointments.map(apt => 
      apt.id === appointmentId ? { ...apt, status: newStatus } : apt
    ));
  };

  const AppointmentCard = ({ appointment }) => (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{appointment.patientName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.patientEmail}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{appointment.time}</span>
        </div>
        <div className="flex items-center space-x-2">
          {getTypeIcon(appointment.type)}
          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
            {appointment.type === 'inPerson' ? 'In-Person' : appointment.type}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{appointment.duration} min</span>
        </div>
        <div className="flex items-center space-x-2">
          <CurrencyDollarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">${appointment.fee}</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Reason:</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.reason}</p>
      </div>

      {appointment.notes && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Notes:</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {appointment.status === 'pending' && (
          <>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
              className="flex items-center px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Confirm
            </button>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
              className="flex items-center px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
            >
              <XCircleIcon className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </>
        )}
        {appointment.status === 'confirmed' && (
          <>
            <button
              onClick={() => handleStatusUpdate(appointment.id, 'completed')}
              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Mark Complete
            </button>
            {appointment.type === 'video' && (
              <button className="flex items-center px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors">
                <VideoCameraIcon className="h-4 w-4 mr-1" />
                Start Call
              </button>
            )}
          </>
        )}
        <button className="flex items-center px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors">
          <ArrowRightIcon className="h-4 w-4 mr-1" />
          View Details
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointment Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your patient appointments and schedule</p>
        </div>
        <button
          onClick={() => setShowNewAppointment(true)}
          className="flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Appointment
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Today\'s Appointments', value: filteredAppointments.length, color: 'bg-blue-500' },
          { label: 'Confirmed', value: filteredAppointments.filter(a => a.status === 'confirmed').length, color: 'bg-green-500' },
          { label: 'Pending', value: filteredAppointments.filter(a => a.status === 'pending').length, color: 'bg-yellow-500' },
          { label: 'Total Revenue', value: `$${filteredAppointments.reduce((sum, a) => sum + a.fee, 0)}`, color: 'bg-purple-500' }
        ].map((stat, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <CalendarDaysIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-12 border border-white/20 dark:border-gray-700/30 shadow-lg text-center">
            <CalendarDaysIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No appointments found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No appointments match your current filters for {new Date(selectedDate).toLocaleDateString()}.
            </p>
            <button
              onClick={() => setShowNewAppointment(true)}
              className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Schedule New Appointment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAppointments.map(appointment => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            View Calendar
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <ClockIcon className="h-5 w-5 mr-2" />
            Set Availability
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            <VideoCameraIcon className="h-5 w-5 mr-2" />
            Start Consultation
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentManagement;
