import {
  HomeIcon,
  UserIcon,
  CalendarDaysIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BellIcon,
  ShieldCheckIcon,
  MapPinIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  HeartIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  EyeIcon,
  ArchiveBoxIcon,
  CalendarIcon,
  BanknotesIcon,
  PlusIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

import  SidebarDataService  from '../services/SidebarDataService';

// ===================================================================================
// CONFIGURATION TEMPLATES (Internal Functions)
// These functions define the structure for each role's sidebar.
// They accept badgeCounts to populate dynamic data when available.
// ===================================================================================

/**
 * Doctor Dashboard Sidebar Configuration Template
 * @param {object} badgeCounts - An object containing counts for badges.
 * @returns {object} The sidebar configuration object.
 */
const getDoctorSidebarConfig = (badgeCounts = {}) => ({
  title: "Doctor Portal",
  items: [
    { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, description: 'Overview and quick actions' },
    {
      key: 'profile-management',
      label: 'Profile Management',
      icon: UserIcon,
      description: 'Manage your professional profile',
      children: [
        { key: 'personal-info', label: 'Personal Information', icon: UserIcon, description: 'Basic personal details' },
        { key: 'medical-license', label: 'Medical License', icon: ShieldCheckIcon, description: 'License verification' },
        { key: 'specializations', label: 'Specializations', icon: AcademicCapIcon, description: 'Medical specialties' },
        { key: 'qualifications', label: 'Qualifications', icon: DocumentTextIcon, description: 'Education and certifications' },
        { key: 'experience', label: 'Experience', icon: BuildingOffice2Icon, description: 'Work experience' },
        { key: 'consultation-modes', label: 'Consultation Modes', icon: VideoCameraIcon, description: 'Configure consultation options' },
        { key: 'availability', label: 'Availability', icon: CalendarDaysIcon, description: 'Working hours and schedule' },
        { key: 'language-preferences', label: 'Language Preferences', icon: ChatBubbleLeftRightIcon, description: 'Communication languages' },
        { key: 'notification-preferences', label: 'Notification Preferences', icon: BellIcon, description: 'Notification settings' },
        { key: 'profile-stats', label: 'Profile Statistics', icon: ChartBarIcon, description: 'Profile analytics and stats' }
      ]
    },
    { key: 'appointments', label: 'Appointments', icon: CalendarDaysIcon, description: 'Manage patient appointments', badge: badgeCounts.appointments || 0 },
    { key: 'patients', label: 'My Patients', icon: UserGroupIcon, description: 'Patient records and history' },
    { key: 'consultations', label: 'Consultations', icon: VideoCameraIcon, description: 'Video and phone consultations', badge: badgeCounts.consultations || 0 },
    { key: 'prescriptions', label: 'Prescriptions', icon: DocumentTextIcon, description: 'Create and manage prescriptions' },
    { key: 'earnings', label: 'Earnings', icon: CurrencyDollarIcon, description: 'Revenue and payment tracking' },
    { key: 'schedule', label: 'Schedule', icon: ClockIcon, description: 'Working hours and availability' },
    { key: 'analytics', label: 'Analytics', icon: ChartBarIcon, description: 'Performance metrics and insights' },
    { key: 'notifications', label: 'Notifications', icon: BellIcon, description: 'Alerts and messages', badge: badgeCounts.notifications || 0 },
    { key: 'settings', label: 'Settings', icon: Cog6ToothIcon, description: 'Account and system preferences' }
  ]
});

/**
 * Patient Dashboard Sidebar Configuration Template
 * @param {object} badgeCounts - An object containing counts for badges.
 * @returns {object} The sidebar configuration object.
 */
const getPatientSidebarConfig = (badgeCounts = {}) => ({
  title: "Patient Portal",
  items: [
    { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, description: 'Overview of your health and orders' },
    { key: 'profile', label: 'My Profile', icon: UserIcon, description: 'Manage your personal information' },
    {
      key: 'health-records',
      label: 'Health Records',
      icon: ClipboardDocumentListIcon,
      description: 'Medical history and documents',
      children: [
        { key: 'health-history', label: 'Health History', icon: ClipboardDocumentListIcon, description: 'View and manage health records' },
        { key: 'medical-documents', label: 'Medical Documents', icon: DocumentTextIcon, description: 'Uploaded medical files' },
        { key: 'test-results', label: 'Test Results', icon: ChartBarIcon, description: 'Lab and diagnostic results' }
      ]
    },
    {
      key: 'prescriptions',
      label: 'Prescriptions',
      icon: DocumentPlusIcon,
      description: 'Manage your prescriptions',
      children: [
        { key: 'upload-prescription', label: 'Upload Prescription', icon: DocumentPlusIcon, description: 'Upload new prescription' },
        { key: 'prescription-requests', label: 'My Requests', icon: DocumentTextIcon, description: 'Track prescription requests', badge: badgeCounts['my-requests'] || 0 },
        { key: 'prescription-history', label: 'Prescription History', icon: ClockIcon, description: 'Past prescriptions' }
      ]
    },
    {
      key: 'doctors',
      label: 'Doctors & Consultations',
      icon: UserIcon,
      description: 'Healthcare providers',
      children: [
        { key: 'book-doctor', label: 'Book Doctor', icon: PlusIcon, description: 'Find and book appointments', badge: badgeCounts['book-doctor'] || 0 },
        { key: 'my-consultations', label: 'My Consultations', icon: VideoCameraIcon, description: 'Upcoming and past consultations' },
        { key: 'my-doctors', label: 'My Doctors', icon: UserGroupIcon, description: 'Your healthcare providers' }
      ]
    },
    {
      key: 'pharmacy',
      label: 'Pharmacy Services',
      icon: BuildingStorefrontIcon,
      description: 'Pharmacy and medications',
      children: [
        { key: 'find-pharmacy', label: 'Find Pharmacy', icon: MapPinIcon, description: 'Locate nearby pharmacies' },
        { key: 'reminders', label: 'Medication Reminders', icon: BellIcon, description: 'Set up medication alerts', badge: badgeCounts.reminders || 0 },
        { key: 'refill-requests', label: 'Refill Requests', icon: ClockIcon, description: 'Request prescription refills' }
      ]
    },
    {
      key: 'orders',
      label: 'Orders & Delivery',
      icon: ShoppingCartIcon,
      description: 'Order management',
      children: [
        { key: 'order-management', label: 'My Orders', icon: ShoppingCartIcon, description: 'View and manage orders' },
        { key: 'order-tracking', label: 'Order Tracking', icon: TruckIcon, description: 'Track delivery status', badge: badgeCounts['order-tracking'] || 0 },
        { key: 'delivery-history', label: 'Delivery History', icon: ClockIcon, description: 'Past deliveries' }
      ]
    },
    {
      key: 'ai-assistant',
      label: 'AI Health Assistant',
      icon: CpuChipIcon,
      description: 'AI-powered health tools',
      children: [
        { key: 'chatbot', label: 'Health Chatbot', icon: ChatBubbleLeftRightIcon, description: 'Chat with AI health assistant', route: '/chatbot' },
        { key: 'symptom-analyzer', label: 'Symptom Analyzer', icon: HeartIcon, description: 'AI symptom analysis', route: '/chatbot/symptoms' },
        { key: 'doctor-finder', label: 'Doctor Finder', icon: UserIcon, description: 'Find doctors with AI recommendations', route: '/chatbot/doctors' },
        { key: 'health-education', label: 'Health Education', icon: AcademicCapIcon, description: 'Learn about health topics', route: '/chatbot/education' }
      ]
    },
    { key: 'payments', label: 'Payments', icon: CreditCardIcon, description: 'Payment methods and history' },
    { key: 'notifications', label: 'Notifications', icon: BellIcon, description: 'Alerts and messages', badge: badgeCounts.notifications || 0 },
    { key: 'settings', label: 'Settings', icon: Cog6ToothIcon, description: 'Account preferences' }
  ]
});

/**
 * Admin Dashboard Sidebar Configuration Template
 * @param {object} badgeCounts - An object containing counts for badges.
 * @returns {object} The sidebar configuration object.
 */
const getAdminSidebarConfig = (badgeCounts = {}) => ({
  title: "Admin Portal",
  items: [
    { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, description: 'System overview and statistics' },
    {
      key: 'user-management',
      label: 'User Management',
      icon: UserGroupIcon,
      description: 'Manage system users',
      children: [
        { key: 'all-users', label: 'All Users', icon: UserGroupIcon, description: 'View all registered users' },
        { key: 'doctors', label: 'Doctors', icon: UserIcon, description: 'Manage doctor accounts', badge: badgeCounts['pending-verifications'] || 0 },
        { key: 'patients', label: 'Patients', icon: HeartIcon, description: 'Manage patient accounts' },
        { key: 'pharmacies', label: 'Pharmacies', icon: BuildingStorefrontIcon, description: 'Manage pharmacy partners', badge: badgeCounts['pending-verifications'] || 0 },
        { key: 'user-verification', label: 'User Verification', icon: ShieldCheckIcon, description: 'Verify user credentials' }
      ]
    },
    {
      key: 'content-management',
      label: 'Content Management',
      icon: DocumentTextIcon,
      description: 'System content and data',
      children: [
        { key: 'prescriptions', label: 'Prescriptions', icon: DocumentTextIcon, description: 'Review all prescriptions' },
        { key: 'orders', label: 'Orders', icon: ShoppingCartIcon, description: 'Monitor order activity' },
        { key: 'consultations', label: 'Consultations', icon: VideoCameraIcon, description: 'Consultation oversight' }
      ]
    },
    { key: 'notifications', label: 'Notification System', icon: BellIcon, description: 'Notification management', badge: badgeCounts['system-alerts'] || 0 },
    {
      key: 'analytics',
      label: 'Analytics & Reports',
      icon: ChartBarIcon,
      description: 'System analytics and insights',
      children: [
        { key: 'user-analytics', label: 'User Analytics', icon: UserGroupIcon, description: 'User behavior and metrics' },
        { key: 'financial-reports', label: 'Financial Reports', icon: CurrencyDollarIcon, description: 'Revenue and financial data' },
        { key: 'system-performance', label: 'System Performance', icon: ChartBarIcon, description: 'Technical performance metrics' }
      ]
    },
    {
      key: 'security',
      label: 'Security & Compliance',
      icon: ShieldCheckIcon,
      description: 'Security monitoring',
      children: [
        { key: 'security-logs', label: 'Security Logs', icon: DocumentTextIcon, description: 'System security events' },
        { key: 'compliance', label: 'Compliance', icon: CheckCircleIcon, description: 'Regulatory compliance' },
        { key: 'audit-trail', label: 'Audit Trail', icon: ClipboardDocumentListIcon, description: 'System audit logs' }
      ]
    },
    { key: 'system-health', label: 'System Health', icon: HeartIcon, description: 'System status and monitoring', badge: badgeCounts['system-alerts'] || 0 },
    { key: 'settings', label: 'System Settings', icon: Cog6ToothIcon, description: 'System configuration' }
  ]
});

/**
 * Pharmacy Dashboard Sidebar Configuration Template
 * @param {object} badgeCounts - An object containing counts for badges.
 * @returns {object} The sidebar configuration object.
 */
const getPharmacySidebarConfig = (badgeCounts = {}) => ({
  title: "Pharmacy Portal",
  items: [
    { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, description: 'Overview and statistics' },
    { key: 'registration', label: 'Pharmacy Setup', icon: BuildingStorefrontIcon, description: 'Pharmacy registration & profile' },
    {
      key: 'prescription-management',
      label: 'Prescription Management',
      icon: DocumentTextIcon,
      description: 'Handle prescription requests',
      children: [
        { key: 'prescription-queue', label: 'Prescription Queue', icon: ClockIcon, description: 'Incoming requests', badge: badgeCounts['prescription-queue'] || 0 },
        { key: 'prescription-viewer', label: 'Prescription Viewer', icon: EyeIcon, description: 'Review prescriptions' },
        { key: 'prescription-history', label: 'Prescription History', icon: CalendarIcon, description: 'Past prescriptions' }
      ]
    },
    { key: 'inventory', label: 'Inventory Management', icon: ArchiveBoxIcon, description: 'Manage medication stock', badge: badgeCounts['low-stock'] || 0 },
    {
      key: 'orders',
      label: 'Order Management',
      icon: ShoppingCartIcon,
      description: 'Process and track orders',
      children: [
        { key: 'order-management', label: 'Active Orders', icon: ShoppingCartIcon, description: 'Current orders', badge: badgeCounts['active-orders'] || 0 },
        { key: 'order-fulfillment', label: 'Order Fulfillment', icon: CheckCircleIcon, description: 'Prepare and dispatch' },
        { key: 'delivery-tracking', label: 'Delivery Tracking', icon: TruckIcon, description: 'Track deliveries' }
      ]
    },
    {
      key: 'patient-interaction',
      label: 'Patient Interaction',
      icon: UserGroupIcon,
      description: 'Communicate with patients',
      children: [
        { key: 'chat', label: 'Patient Chat', icon: ChatBubbleLeftRightIcon, description: 'Live chat support', badge: badgeCounts['chat-messages'] || 0 },
        { key: 'video-consultation', label: 'Video Consultation', icon: VideoCameraIcon, description: 'Virtual consultations' },
        { key: 'patient-records', label: 'Patient Records', icon: ClipboardDocumentListIcon, description: 'Patient medication history' }
      ]
    },
    {
      key: 'financial',
      label: 'Financial Management',
      icon: CurrencyDollarIcon,
      description: 'Revenue and transactions',
      children: [
        { key: 'transactions', label: 'Transactions', icon: BanknotesIcon, description: 'Revenue tracking' },
        { key: 'payouts', label: 'Payouts', icon: CreditCardIcon, description: 'Payment processing' },
        { key: 'financial-reports', label: 'Financial Reports', icon: ChartBarIcon, description: 'Revenue analytics' }
      ]
    },
    {
      key: 'quality-assurance',
      label: 'Quality Assurance',
      icon: ShieldCheckIcon,
      description: 'Quality control and compliance',
      children: [
        { key: 'quality-checks', label: 'Quality Checks', icon: CheckCircleIcon, description: 'Medication quality control' },
        { key: 'compliance', label: 'Compliance', icon: DocumentTextIcon, description: 'Regulatory compliance' },
        { key: 'audit-logs', label: 'Audit Logs', icon: ClipboardDocumentListIcon, description: 'Activity tracking' }
      ]
    },
    { key: 'analytics', label: 'Analytics', icon: ChartBarIcon, description: 'Performance metrics and insights' },
    { key: 'notifications', label: 'Notifications', icon: BellIcon, description: 'Alerts and messages', badge: badgeCounts.notifications || 0 },
    { key: 'settings', label: 'Settings', icon: Cog6ToothIcon, description: 'Pharmacy preferences' }
  ]
});

// ===================================================================================
// EXPORTED FUNCTIONS
// These are the main functions to be used throughout the application.
// ===================================================================================

/**
 * Fetches and returns the sidebar configuration with DYNAMIC badge counts.
 * It makes an API call to get the latest data.
 * @param {string} userRole - The role of the current user (e.g., 'doctor', 'patient').
 * @param {string} userId - The ID of the current user for fetching personalized data.
 * @returns {Promise<object>} A promise that resolves to the sidebar configuration object.
 */
export const getSidebarConfig = async (userRole, userId) => {
  let badgeCounts = {};

  try {
    // Attempt to fetch dynamic counts from the data service
    badgeCounts = await SidebarDataService.getAllBadgeCounts(userRole, userId);
  } catch (error) {
    console.error('Error fetching sidebar badge counts, using default empty counts:', error);
    // On error, badgeCounts remains an empty object, ensuring the UI doesn't break.
  }

  switch (userRole) {
    case 'doctor':
      return getDoctorSidebarConfig(badgeCounts);
    case 'patient':
      return getPatientSidebarConfig(badgeCounts);
    case 'admin':
      return getAdminSidebarConfig(badgeCounts);
    case 'pharmacy':
      return getPharmacySidebarConfig(badgeCounts);
    default:
      // Fallback to a default configuration (e.g., patient) if the role is unknown
      return getPatientSidebarConfig(badgeCounts);
  }
};

/**
 * Returns a STATIC sidebar configuration without making an API call.
 * All badge counts will be zero. Useful for initial renders, tests, or Storybook.
 * @param {string} userRole - The role of the current user (e.g., 'doctor', 'patient').
 * @returns {object} The sidebar configuration object with empty badge counts.
 */
export const getStaticSidebarConfig = (userRole) => {
  const emptyBadgeCounts = {}; // Always use empty counts for the static version
  switch (userRole) {
    case 'doctor':
      return getDoctorSidebarConfig(emptyBadgeCounts);
    case 'patient':
      return getPatientSidebarConfig(emptyBadgeCounts);
    case 'admin':
      return getAdminSidebarConfig(emptyBadgeCounts);
    case 'pharmacy':
      return getPharmacySidebarConfig(emptyBadgeCounts);
    default:
      return getPatientSidebarConfig(emptyBadgeCounts);
  }
};