import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  DocumentTextIcon,
  ClockIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  TruckIcon,
  HeartIcon,
  StarIcon,
  CheckCircleIcon,
  DocumentPlusIcon,
  VideoCameraIcon,
  UserIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useNavigate as useNav } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import HealthHistory from '../components/HealthHistory';
import PrescriptionUpload from '../components/PrescriptionUpload';
import PharmacySearch from '../components/PharmacySearch';
import RefillReminders from '../components/RefillReminders';
import OrderTracking from '../components/OrderTracking';
import OrderManagement from '../components/Patient/OrderManagement';
import PaymentManagement from '../components/PaymentManagement';
import PrescriptionRequestTracker from '../components/Patient/PrescriptionRequestTracker';
import ConsultationList from '../components/consultation/ConsultationList';
import DoctorBooking from '../components/Patient/DoctorBooking';
import EnhancedDashboard from '../components/dashboard/EnhancedDashboard';
import PatientConsultations from '../components/Patient/PatientConsultations';
import PatientConsultationHistory from '../components/Patient/PatientConsultationHistory';
import PatientChat from '../components/Patient/PatientChat';
import ARPillScanner from '../components/Patient/ARPillScanner';
import PharmacyResponseSelector from '../components/Patient/PharmacyResponseSelector';
import MedicalDocuments from '../components/MedicalDocuments';
import PatientPrescriptionHistory from '../components/Patient/PrescriptionHistory';

function PatientDashboard() {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [quickStats, setQuickStats] = useState({
    activePrescriptions: 3,
    pendingRefills: 1,
    nearbyPharmacies: 12,
    unreadMessages: 2,
    upcomingAppointments: 2,
    ordersInTransit: 1
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update activeSection based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/patient' || path === '/patient/') {
      setActiveSection('dashboard');
    } else {
      const section = path.split('/patient/')[1];
      if (section) {
        setActiveSection(section);
      }
    }
  }, [location.pathname]);

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API calls
      setQuickStats({
        activePrescriptions: 3,
        pendingRefills: 1,
        nearbyPharmacies: 12,
        unreadMessages: 2,
        upcomingAppointments: 2,
        ordersInTransit: 1
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color, trend, onClick }) => (
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
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
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

  const QuickActionCard = ({ icon: Icon, title, description, onClick, gradient, badge }) => (
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
      {badge && (
        <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
          {badge}
        </div>
      )}

      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
      
      <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-6 w-6 text-white" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Active Prescriptions" 
          value={quickStats.activePrescriptions} 
          icon={DocumentTextIcon} 
          color="bg-emerald-500" 
          trend={12}
          onClick={() => navigate('/patient/prescription-history')}
        />
        <StatCard 
          label="Refills Due" 
          value={quickStats.pendingRefills} 
          icon={ClockIcon} 
          color="bg-yellow-500"
          onClick={() => navigate('/patient/reminders')}
        />
        <StatCard 
          label="Nearby Pharmacies" 
          value={quickStats.nearbyPharmacies} 
          icon={MapPinIcon} 
          color="bg-blue-500"
          onClick={() => navigate('/patient/find-pharmacy')}
        />
        <StatCard 
          label="Unread Messages" 
          value={quickStats.unreadMessages} 
          icon={ChatBubbleLeftRightIcon} 
          color="bg-purple-500"
          onClick={() => navigate('/patient/messages')}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <StarIcon className="h-6 w-6 mr-2 text-emerald-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionCard
            icon={DocumentPlusIcon}
            title="Upload Prescription"
            description="Upload a new prescription for processing"
            onClick={() => navigate('/patient/upload-prescription')}
            gradient="bg-gradient-to-r from-emerald-500 to-teal-500"
          />
          <QuickActionCard
            icon={DocumentTextIcon}
            title="My Requests"
            description="Track prescription requests and responses"
            onClick={() => navigate('/patient/prescription-requests')}
            gradient="bg-gradient-to-r from-rose-500 to-pink-500"
            badge="New"
          />
          <QuickActionCard
            icon={UserIcon}
            title="Book Doctor"
            description="Find and book appointments with doctors"
            onClick={() => navigate('/patient/doctor-book')}
            gradient="bg-gradient-to-r from-violet-500 to-purple-500"
            badge="1"
          />
          <QuickActionCard
            icon={MapPinIcon}
            title="Find Pharmacies"
            description="Discover nearby pharmacies"
            onClick={() => navigate('/patient/find-pharmacy')}
            gradient="bg-gradient-to-r from-purple-500 to-pink-500"
          />
          <QuickActionCard
            icon={VideoCameraIcon}
            title="My Consultations"
            description="View and join consultations"
            onClick={() => navigate('/patient/consultations')}
            gradient="bg-gradient-to-r from-indigo-500 to-purple-500"
          />
          <QuickActionCard
            icon={BellIcon}
            title="Medication Reminders"
            description="Set up medication alerts"
            onClick={() => navigate('/patient/reminders')}
            gradient="bg-gradient-to-r from-yellow-500 to-orange-500"
            badge="2"
          />
          <QuickActionCard
            icon={TruckIcon}
            title="Order Tracking"
            description="Track your prescription orders"
            onClick={() => navigate('/patient/order-tracking')}
            gradient="bg-gradient-to-r from-green-500 to-emerald-500"
            badge={quickStats.ordersInTransit > 0 ? quickStats.ordersInTransit.toString() : null}
          />
          <QuickActionCard
            icon={ShoppingCartIcon}
            title="Medicine Search"
            description="AI-powered medicine search and buying"
            onClick={() => navigate('/medicines')}
            gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
            badge="AI"
          />
          <QuickActionCard
            icon={ShoppingCartIcon}
            title="My Orders"
            description="Manage and view all orders"
            onClick={() => navigate('/patient/order-management')}
            gradient="bg-gradient-to-r from-pink-500 to-rose-500"
          />
          <QuickActionCard
            icon={ChatBubbleLeftRightIcon}
            title="AI Health Features"
            description="Access advanced AI-powered health tools"
            onClick={() => navigate('/patient/ai-features')}
            gradient="bg-gradient-to-r from-cyan-500 to-blue-500"
            badge="New"
          />
        </div>
      </div>

      {/* Health Insights */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 border border-white/20 dark:border-gray-700/30 shadow-lg">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <HeartIcon className="h-6 w-6 mr-2 text-emerald-500" />
          Health Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
            <HeartIcon className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Medication Adherence</h4>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">94%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Excellent compliance!</p>
          </div>
          <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <TruckIcon className="h-12 w-12 text-blue-500 mx-auto mb-3" />
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Delivery Success</h4>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">98%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">On-time deliveries</p>
          </div>
          <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
            <StarIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">Pharmacy Rating</h4>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">4.8</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Average rating given</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Prescriptions */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-emerald-500" />
            Recent Prescriptions
          </h3>
          <div className="space-y-3">
            {[
              { medicine: 'Metformin 500mg', pharmacy: 'HealthPlus Pharmacy', status: 'Ready for pickup', date: 'Today' },
              { medicine: 'Lisinopril 10mg', pharmacy: 'MediCare Plus', status: 'Delivered', date: 'Yesterday' },
              { medicine: 'Atorvastatin 20mg', pharmacy: 'City Pharmacy', status: 'Processing', date: '2 days ago' }
            ].map((prescription, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{prescription.medicine}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{prescription.pharmacy}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    prescription.status === 'Ready for pickup' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    prescription.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {prescription.status}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{prescription.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <VideoCameraIcon className="h-5 w-5 mr-2 text-blue-500" />
            Upcoming Consultations
          </h3>
          <div className="space-y-3">
            {[
              { type: 'Medication Review', doctor: 'Dr. Sarah Johnson', time: 'Today 3:00 PM' },
              { type: 'Follow-up Consultation', doctor: 'Dr. Mike Chen', time: 'Tomorrow 10:00 AM' }
            ].map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{appointment.type}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.doctor}</p>
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {appointment.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'profile':
        return <UserProfile />;
      case 'health-history':
        return <HealthHistory />;
      case 'medical-documents':
        return <MedicalDocuments />;
      case 'test-results':
        return <HealthHistory />;
      case 'upload-prescription':
        return <PrescriptionUpload />;
      case 'prescription-history':
        return <PatientPrescriptionHistory />;
      case 'prescription-requests':
        return <PrescriptionRequestTracker />;
      case 'doctor-book':
        return <DoctorBooking />;
      case 'find-pharmacy':
        return <PharmacySearch />;
      case 'consultations':
        return <PatientConsultations />;
      case 'reminders':
        return <RefillReminders />;
      case 'order-tracking':
        return <OrderTracking />;
      case 'order-management':
        return <OrderManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'ai-features':
        return <EnhancedDashboard />;
      default:
        return (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1).replace('-', ' ')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">This section is coming soon...</p>
          </div>
        );
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
    <>
      <DashboardLayout
        userRole="patient"
        activeSection={activeSection}
        onSectionChange={(section) => {
          if (section === 'dashboard') {
            navigate('/patient');
          } else {
            navigate(`/patient/${section}`);
          }
        }}
        showWelcome={activeSection === 'dashboard'}
        welcomeMessage={`Welcome back, ${user?.profile?.firstName || 'Patient'}! 👋`}
      >
        <Routes>
          <Route index element={renderDashboardOverview()} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="health-history" element={<HealthHistory />} />
          <Route path="medical-documents" element={<MedicalDocuments />} />
          <Route path="test-results" element={<HealthHistory />} />
          <Route path="upload-prescription" element={<PrescriptionUpload />} />
          <Route path="prescription-requests" element={<PrescriptionRequestTracker />} />
          <Route path="doctor-book" element={<DoctorBooking />} />
          <Route path="find-pharmacy" element={<PharmacySearch />} />
          <Route path="consultations" element={<PatientConsultations />} />
          <Route path="consultation-history" element={<PatientConsultationHistory />} />
          <Route path="reminders" element={<RefillReminders />} />
          <Route path="order-tracking" element={<OrderTracking />} />
          <Route path="order-management" element={<OrderManagement />} />
          <Route path="payments" element={<PaymentManagement />} />
          <Route path="messages" element={<PatientChat />} />
          <Route path="ar-scanner" element={<ARPillScanner />} />
          <Route path="pharmacy-response" element={<PharmacyResponseSelector />} />
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
      {/* Floating Chatbot Button */}
      <button
        onClick={() => navigate('/chatbot')}
        className="fixed bottom-8 right-8 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 flex items-center justify-center transition-all duration-300"
        aria-label="Open Chatbot"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75c4.556 0 8.25-2.807 8.25-6.25 0-3.444-3.694-6.25-8.25S3.75 9.056 3.75 12.5c0 3.443 3.694 6.25 8.25 6.25z" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      </button>
    </>
  );
}

export default PatientDashboard;