import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckBadgeIcon,
  TrophyIcon,
  HeartIcon,
  StarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '../components/layout/DashboardLayout';
import DoctorProfile from '../components/doctor/DoctorProfile';
import ConsultationList from '../components/consultation/ConsultationList';
import EnhancedDashboard from '../components/dashboard/EnhancedDashboard';
import AppointmentManagement from '../components/doctor/AppointmentManagement';
import PatientList from '../components/doctor/PatientList';
import PatientRecords from '../components/doctor/PatientRecords';
import ConsultationHistory from '../components/doctor/ConsultationHistory';
import EarningsTracker from '../components/doctor/EarningsTracker';
import DoctorSettings from '../components/doctor/DoctorSettings';
import DoctorVideoConsultation from '../components/doctor/VideoConsultation';
import VoiceToPrescription from '../components/doctor/VoiceToPrescription';

function DoctorDashboard() {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({
    todayAppointments: 5,
    totalPatients: 127,
    monthlyEarnings: 8500,
    averageRating: 4.8,
    weeklyAppointments: 23,
    completedConsultations: 89
  });

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  // Update activeSection based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/doctor' || path === '/doctor/') {
      setActiveSection('dashboard');
    } else {
      const section = path.split('/doctor/')[1];
      if (section) {
        setActiveSection(section);
      }
    }
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      setDashboardStats({
        todayAppointments: 5,
        totalPatients: 127,
        monthlyEarnings: 8500,
        averageRating: 4.8,
        weeklyAppointments: 23,
        completedConsultations: 89
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, onClick }) => (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
        border border-white/20 dark:border-gray-700/30
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        shadow-lg dark:shadow-gray-900/30
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center mt-2">
              <span className="mr-1">↗</span>
              +{trend}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ icon: Icon, title, description, onClick, gradient }) => (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer
        bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl 
        border border-white/20 dark:border-gray-700/30
        hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1
        shadow-lg dark:shadow-gray-900/30
      `}
    >
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
      
      <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-6 w-6 text-white" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );

  const renderDashboardOverview = () => (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Today's Appointments"
          value={dashboardStats.todayAppointments}
          icon={CalendarDaysIcon}
          color="bg-blue-500"
          onClick={() => navigate('/doctor/appointments')}
        />
        <StatCard
          title="Total Patients"
          value={dashboardStats.totalPatients}
          icon={UserGroupIcon}
          color="bg-emerald-500"
          trend={12}
          onClick={() => navigate('/doctor/patients')}
        />
        <StatCard
          title="Monthly Earnings"
          value={`$${dashboardStats.monthlyEarnings.toLocaleString()}`}
          icon={CurrencyDollarIcon}
          color="bg-purple-500"
          trend={8}
          onClick={() => navigate('/doctor/earnings')}
        />
        <StatCard
          title="Average Rating"
          value={`${dashboardStats.averageRating}/5.0`}
          subtitle="Based on patient reviews"
          icon={StarIcon}
          color="bg-yellow-500"
        />
        <StatCard
          title="This Week"
          value={`${dashboardStats.weeklyAppointments} appointments`}
          icon={ClockIcon}
          color="bg-indigo-500"
        />
        <StatCard
          title="Completed"
          value={`${dashboardStats.completedConsultations} consultations`}
          icon={CheckBadgeIcon}
          color="bg-green-500"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            icon={CalendarDaysIcon}
            title="Manage Schedule"
            description="View and update your availability"
            onClick={() => navigate('/doctor/schedule')}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <QuickActionCard
            icon={UserGroupIcon}
            title="View Patients"
            description="Access patient records and history"
            onClick={() => navigate('/doctor/patients')}
            gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
          />
          <QuickActionCard
            icon={PlusIcon}
            title="New Prescription"
            description="Create prescription for patient"
            onClick={() => navigate('/doctor/prescriptions')}
            gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          />
          <QuickActionCard
            icon={ChartBarIcon}
            title="View Analytics"
            description="Performance metrics and insights"
            onClick={() => navigate('/doctor/analytics')}
            gradient="bg-gradient-to-r from-orange-500 to-red-500"
          />
          <QuickActionCard
            icon={PlusIcon}
            title="AI Medical Tools"
            description="Advanced AI-powered medical tools and features"
            onClick={() => navigate('/doctor/ai-features')}
            gradient="bg-gradient-to-r from-violet-500 to-purple-600"
            badge="AI"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointments */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Upcoming Appointments
          </h3>
          <div className="space-y-3">
            {[
              { patient: 'Sarah Johnson', time: '09:00 AM', type: 'Video Call' },
              { patient: 'Michael Chen', time: '10:30 AM', type: 'In-Person' },
              { patient: 'Emily Davis', time: '02:00 PM', type: 'Phone Call' }
            ].map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.patient}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.type}</p>
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {appointment.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Performance This Month
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Patient Satisfaction</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">96%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">On-time Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">94%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Response Time</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">2.3 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'profile-management':
      case 'personal-info':
      case 'medical-license':
      case 'specializations':
      case 'qualifications':
      case 'experience':
      case 'consultation-modes':
      case 'availability':
      case 'language-preferences':
      case 'notification-preferences':
      case 'profile-stats':
        return <DoctorProfile activeSection={activeSection} />;
      case 'appointments':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Appointment Management</h2>
            <p className="text-gray-600 dark:text-gray-400">Appointment management interface coming soon...</p>
          </div>
        );
      case 'patients':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">My Patients</h2>
            <p className="text-gray-600 dark:text-gray-400">Patient management interface coming soon...</p>
          </div>
        );
      case 'consultations':
        return <ConsultationList />;
      case 'prescriptions':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Prescription Management</h2>
            <p className="text-gray-600 dark:text-gray-400">Prescription management interface coming soon...</p>
          </div>
        );
      case 'earnings':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Earnings & Revenue</h2>
            <p className="text-gray-600 dark:text-gray-400">Earnings tracking interface coming soon...</p>
          </div>
        );
      case 'schedule':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Schedule Management</h2>
            <p className="text-gray-600 dark:text-gray-400">Schedule management interface coming soon...</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Analytics & Insights</h2>
            <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon...</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Notifications</h2>
            <p className="text-gray-600 dark:text-gray-400">Notification center coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">Settings interface coming soon...</p>
          </div>
        );
      case 'ai-features':
        return <EnhancedDashboard />;
      default:
        return renderDashboardOverview();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please log in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="doctor"
      activeSection={activeSection}
      onSectionChange={(section) => {
        if (section === 'dashboard') {
          navigate('/doctor');
        } else {
          navigate(`/doctor/${section}`);
        }
      }}
      showWelcome={activeSection === 'dashboard'}
      welcomeMessage={`Welcome back, Dr. ${user?.profile?.firstName || 'Doctor'}! 👨‍⚕️`}
    >
      <Routes>
        <Route index element={renderDashboardOverview()} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="appointments" element={<AppointmentManagement />} />
        <Route path="patients" element={<PatientList />} />
        <Route path="patient-records" element={<PatientRecords />} />
        <Route path="consultations" element={<ConsultationList />} />
        <Route path="consultation-history" element={<ConsultationHistory />} />
        <Route path="prescriptions" element={<VoiceToPrescription />} />
        <Route path="earnings" element={<EarningsTracker />} />
        <Route path="schedule" element={<AppointmentManagement />} />
        <Route path="analytics" element={<EarningsTracker />} />
        <Route path="settings" element={<DoctorSettings />} />
        <Route path="video-consultation" element={<DoctorVideoConsultation />} />
        <Route path="ai-features" element={<EnhancedDashboard />} />
        <Route 
          path="*" 
          element={
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Page Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400">This section is coming soon...</p>
            </div>
          } 
        />
      </Routes>
    </DashboardLayout>
  );
}

export default DoctorDashboard;