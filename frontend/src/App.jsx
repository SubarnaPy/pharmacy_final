import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/sidebar-animations.css';
import notificationIntegrationService from './services/notificationIntegrationService';
import notificationSoundService from './services/notificationSoundService';
// ...existing imports...
import ProtectedRoute from './components/ProtectedRoute';
import AuthRedirect from './components/AuthRedirect';
import NavBar from './components/layout/NavBar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import LoginForm from './features/auth/components/LoginForm';
import RegisterForm from './features/auth/components/RegisterForm';
import EmailVerification from './pages/EmailVerification';
import Dashboard from './pages/Dashboard';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import Profile from './features/user/components/Profile';
import DoctorProfileContainer from './components/doctor/profile/DoctorProfileContainer';
import PrescriptionUpload from './features/prescription/components/PrescriptionUpload';
import PrescriptionHistory from './features/prescription/components/PrescriptionHistory';
import PrescriptionDetails from './features/prescription/components/PrescriptionDetails';
import DetailedPrescriptionView from './components/Pharmacy/DetailedPrescriptionView';
import PatientDetailedPrescriptionView from './components/Patient/DetailedPrescriptionView';
import ChatInterface from './features/chat/components/ChatInterface';
import VideoConsultation from './pages/VideoConsultation';
import VideoConsultationRoom from './components/consultation/VideoConsultationRoom';
import ChatConsultationRoom from './components/consultation/ChatConsultationRoom';
import DashboardDemo from './components/demo/DashboardDemo';
import SidebarDemo from './pages/SidebarDemo';
import AdvancedChatbot from './components/chatbot/AdvancedChatbot';
import SymptomAnalyzer from './components/chatbot/SymptomAnalyzer';
import DoctorFinder from './components/chatbot/DoctorFinder';
import HealthEducation from './components/chatbot/HealthEducation';
// Medicine System Components
import MedicineApp from './components/MedicineApp';
import MedicineSearch from './components/MedicineSearch';
import MedicinePurchase from './components/MedicinePurchase';
import MedicineOrderTracking from './components/MedicineOrderTracking';

// Patient Components
import DoctorBooking from './components/Patient/DoctorBooking';
import PatientOrderManagement from './components/Patient/OrderManagement';
import PatientConsultations from './components/Patient/PatientConsultations';
import PatientConsultationHistory from './components/Patient/PatientConsultationHistory';
import PatientPrescriptionHistory from './components/Patient/PrescriptionHistory';
import PrescriptionRequestTracker from './components/Patient/PrescriptionRequestTracker';
import PatientChat from './components/Patient/PatientChat';
import ARPillScanner from './components/Patient/ARPillScanner';
import PharmacyResponseSelector from './components/Patient/PharmacyResponseSelector';

// Doctor Components
import DoctorProfile from './components/doctor/DoctorProfile';
import AppointmentManagement from './components/doctor/AppointmentManagement';
import PatientList from './components/doctor/PatientList';
import PatientRecords from './components/doctor/PatientRecords';
import ConsultationHistory from './components/doctor/ConsultationHistory';
import EarningsTracker from './components/doctor/EarningsTracker';
import DoctorSettings from './components/doctor/DoctorSettings';
import DoctorVideoConsultation from './components/doctor/VideoConsultation';
import VoiceToPrescription from './components/doctor/VoiceToPrescription';

// Pharmacy Components
import PharmacyRegistration from './components/Pharmacy/PharmacyRegistration';
import PrescriptionQueue from './components/Pharmacy/PrescriptionQueue';
import PrescriptionViewer from './components/Pharmacy/PrescriptionViewer';
import PharmacyChat from './components/Pharmacy/PharmacyChat';
import PharmacyVideoConsultation from './components/Pharmacy/VideoConsultation';
import PharmacyProfile from './components/Pharmacy/PharmacyProfile';
import InventoryManagement from './components/Pharmacy/InventoryManagement';
import PharmacyOrderManagement from './components/Pharmacy/OrderManagement';
import TransactionDashboard from './components/Pharmacy/TransactionDashboard';
import PharmacyPrescriptionHistory from './components/Pharmacy/PrescriptionHistory';
import PharmacySettings from './components/Pharmacy/PharmacySettings';
import PrescriptionTabs from './components/Pharmacy/PrescriptionTabs';
import RiskQualityTabs from './components/Pharmacy/RiskQualityTabs';

function App() {
  // Initialize notification services (temporarily disabled to prevent WebSocket errors)
  useEffect(() => {
    const initializeNotificationServices = async () => {
      try {
        // Temporarily disable notification services to prevent WebSocket connection errors
        // These will be re-enabled once the backend WebSocket endpoints are available
        
        // await notificationSoundService.init();
        // notificationIntegrationService.init();

        console.log('✅ Notification services temporarily disabled (WebSocket endpoints not available)');
      } catch (error) {
        console.error('❌ Failed to initialize notification services:', error);
      }
    };

    initializeNotificationServices();

    // Cleanup on unmount
    return () => {
      // notificationIntegrationService.destroy();
      // notificationSoundService.destroy();
    };
  }, []);

  return (
    // Only wrap with Provider and AuthProvider ONCE, in main.jsx, not here
    <Router>
      <div className="App min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-500">
        {/* Enhanced background with animated elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-600/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 -left-32 w-64 h-64 bg-teal-400/10 dark:bg-teal-600/5 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-cyan-400/10 dark:bg-cyan-600/5 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <NavBar />
        <main className="flex-1 relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthRedirect><LoginForm /></AuthRedirect>} />
            <Route path="/register" element={<AuthRedirect><RegisterForm /></AuthRedirect>} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            {/* Patient Routes */}
            <Route path="/patient" element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>} />
            <Route path="/patient/*" element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>} />
            
            {/* Doctor Routes */}
            <Route path="/doctor" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/*" element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>} />
            
            {/* Pharmacy Routes */}
            <Route path="/pharmacy" element={<ProtectedRoute><PharmacyDashboard /></ProtectedRoute>} />
            <Route path="/pharmacy/*" element={<ProtectedRoute><PharmacyDashboard /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            {/* Demo Route */}
            <Route path="/dashboard-demo" element={<DashboardDemo />} />
            <Route path="/sidebar-demo" element={<SidebarDemo />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/doctor/profile" element={<ProtectedRoute><DoctorProfileContainer /></ProtectedRoute>} />
            <Route path="/profile-management" element={<ProtectedRoute><DoctorProfileContainer /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/prescription/upload" element={<ProtectedRoute><PrescriptionUpload /></ProtectedRoute>} />
            <Route path="/prescriptions/history" element={<ProtectedRoute><PrescriptionHistory /></ProtectedRoute>} />
            <Route path="/patient/prescription-history" element={<ProtectedRoute><PatientPrescriptionHistory /></ProtectedRoute>} />
            <Route path="/prescriptions/:id" element={<ProtectedRoute><PrescriptionDetails /></ProtectedRoute>} />
            <Route path="/pharmacy/prescription/:id" element={<ProtectedRoute><DetailedPrescriptionView /></ProtectedRoute>} />
            <Route path="/patient/prescription/:id" element={<ProtectedRoute><PatientDetailedPrescriptionView /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatInterface /></ProtectedRoute>} />
            
            {/* AI Chatbot Routes */}
            <Route path="/chatbot" element={<ProtectedRoute><AdvancedChatbot isModal={false} /></ProtectedRoute>} />
            <Route path="/chatbot/symptoms" element={<ProtectedRoute><SymptomAnalyzer /></ProtectedRoute>} />
            <Route path="/chatbot/doctors" element={<ProtectedRoute><DoctorFinder /></ProtectedRoute>} />
            <Route path="/chatbot/education" element={<ProtectedRoute><HealthEducation /></ProtectedRoute>} />
            
            {/* Medicine System Routes */}
            <Route path="/medicines" element={<ProtectedRoute><MedicineApp /></ProtectedRoute>} />
            <Route path="/medicine-search" element={<ProtectedRoute><MedicineSearch /></ProtectedRoute>} />
            <Route path="/medicine-purchase" element={<ProtectedRoute><MedicinePurchase /></ProtectedRoute>} />
            <Route path="/medicine-tracking" element={<ProtectedRoute><MedicineOrderTracking /></ProtectedRoute>} />
            
            <Route path="/consultation/:consultationId/room" element={<ProtectedRoute><VideoConsultationRoom /></ProtectedRoute>} />
            <Route path="/consultation/:consultationId/chat" element={<ProtectedRoute><ChatConsultationRoom /></ProtectedRoute>} />
            <Route path="/consultation/:consultationId" element={<ProtectedRoute><VideoConsultation /></ProtectedRoute>} />
            <Route path="/consultation/book" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30"><h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-4">Book Consultation</h1><p className="text-gray-600 dark:text-gray-400">Coming Soon</p></div></div>} />
            <Route path="/settings" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30"><h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-4">Settings Page</h1><p className="text-gray-600 dark:text-gray-400">Coming Soon</p></div></div>} />
            <Route path="/pharmacy" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30"><h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-4">Pharmacy Discovery</h1><p className="text-gray-600 dark:text-gray-400">Coming Soon</p></div></div>} />
            <Route path="/payment" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30"><h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-4">Payment Center</h1><p className="text-gray-600 dark:text-gray-400">Coming Soon</p></div></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />

        {/* Toast Notification Container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          className="z-50"
        />
      </div>
    </Router>
  );
}

export default App;
