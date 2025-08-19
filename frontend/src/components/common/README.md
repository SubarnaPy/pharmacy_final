# Advanced Sidebar System

A comprehensive, scrollable sidebar system with interactive navigation, notification counters, and role-based configurations for all dashboard types.

## 🚀 Features

### Core Features
- **Fully Scrollable Navigation**: Smooth scrolling with custom scrollbar styling
- **Interactive Tabs**: Hover effects, active states, and smooth transitions
- **Notification Counters**: Real-time badge notifications with WebSocket support
- **Collapsible Groups**: Hierarchical navigation with expandable sections
- **Role-Based Configuration**: Customized navigation for each user type
- **Responsive Design**: Mobile-friendly with overlay and touch support
- **Dark Mode Support**: Seamless theme switching
- **Accessibility**: Keyboard navigation and screen reader support

### Visual Enhancements
- **Smooth Animations**: CSS transitions and keyframe animations
- **Gradient Backgrounds**: Beautiful gradient overlays and effects
- **Glass Morphism**: Backdrop blur effects for modern UI
- **Active State Indicators**: Visual feedback for current section
- **Hover Effects**: Interactive feedback on navigation items
- **Loading States**: Skeleton loading and animation delays

## 📁 File Structure

```
frontend/src/
├── components/
│   ├── common/
│   │   └── AdvancedSidebar.jsx          # Main sidebar component
│   ├── layout/
│   │   └── DashboardLayout.jsx          # Layout wrapper with sidebar
│   └── demo/
│       └── DashboardDemo.jsx            # Interactive demo
├── config/
│   └── sidebarConfigs.js                # Navigation configurations
├── hooks/
│   └── useSidebarNotifications.js       # Notification management
├── styles/
│   └── sidebar-animations.css           # CSS animations and styles
└── pages/
    ├── DoctorDashboard.enhanced.jsx     # Enhanced doctor dashboard
    ├── PatientDashboard.enhanced.jsx    # Enhanced patient dashboard
    ├── AdminDashboard.enhanced.jsx      # Enhanced admin dashboard
    └── PharmacyDashboard.enhanced.jsx   # Enhanced pharmacy dashboard
```

## 🛠️ Usage

### Basic Implementation

```jsx
import DashboardLayout from '../components/layout/DashboardLayout';

function MyDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <DashboardLayout
      userRole="patient"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      showWelcome={activeSection === 'dashboard'}
      welcomeMessage="Welcome back!"
    >
      {/* Your dashboard content */}
    </DashboardLayout>
  );
}
```

### Custom Sidebar Configuration

```jsx
import { getSidebarConfig } from '../config/sidebarConfigs';

// Get configuration for specific user role
const config = getSidebarConfig('doctor');

// Custom configuration
const customConfig = {
  title: "Custom Portal",
  items: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: HomeIcon,
      description: 'Overview and statistics',
      badge: 5, // Notification counter
      children: [
        {
          key: 'sub-item',
          label: 'Sub Item',
          icon: UserIcon,
          description: 'Sub navigation item'
        }
      ]
    }
  ]
};
```

### Notification Management

```jsx
import useSidebarNotifications from '../hooks/useSidebarNotifications';

function MyComponent() {
  const {
    notifications,
    updateNotificationCount,
    incrementNotification,
    clearNotification
  } = useSidebarNotifications('patient');

  // Update notification count
  updateNotificationCount('appointments', 5);

  // Increment notification
  incrementNotification('messages', 1);

  // Clear notification
  clearNotification('appointments');
}
```

## 🎨 Customization

### Styling

The sidebar uses CSS custom properties for easy theming:

```css
:root {
  --sidebar-width: 320px;
  --sidebar-bg: rgba(255, 255, 255, 0.95);
  --sidebar-border: rgba(255, 255, 255, 0.2);
  --sidebar-item-hover: rgba(59, 130, 246, 0.1);
  --sidebar-item-active: linear-gradient(45deg, #3b82f6, #8b5cf6);
}
```

### Animation Customization

```css
/* Custom animation timing */
.animate-slideInLeft {
  animation: slideInLeft 0.3s ease-out forwards;
}

/* Custom hover effects */
.sidebar-item:hover::before {
  left: 100%;
  transition: left 0.3s ease;
}
```

### Badge Styling

```jsx
// Custom badge component
const CustomBadge = ({ count, urgent }) => (
  <span className={`
    inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full
    ${urgent ? 'bg-red-500 animate-bounce' : 'bg-blue-500 animate-pulse'}
    text-white
  `}>
    {count > 99 ? '99+' : count}
  </span>
);
```

## 📱 Responsive Behavior

### Mobile (< 1024px)
- Sidebar becomes an overlay
- Touch-friendly interactions
- Swipe gestures support
- Automatic close on selection

### Desktop (≥ 1024px)
- Fixed sidebar position
- Hover interactions
- Keyboard navigation
- Multi-level expansion

## 🔔 Notification System

### Real-time Updates
- WebSocket integration for live updates
- Polling fallback for reliability
- Automatic reconnection handling
- Cross-tab synchronization

### Notification Types
- **Badge Counters**: Numeric indicators
- **Status Indicators**: Color-coded states
- **Urgent Alerts**: Animated attention grabbers
- **Sound Notifications**: Audio feedback

### API Integration

```javascript
// Fetch notification counts
const response = await apiClient.get('/users/notification-counts');

// WebSocket connection
const ws = new WebSocket('/ws/notifications/${userId}');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateNotificationCount(data.key, data.count);
};
```

## 🎯 Role-Based Navigation

### Doctor Dashboard
- Profile management with specializations
- Appointment scheduling and management
- Patient records and consultation history
- Earnings tracking and analytics
- Real-time notifications with badges

### Patient Dashboard
- Health records and prescription management
- Doctor booking and consultations
- Pharmacy search and order tracking
- Medication reminders and refills
- Interactive notification system

### Admin Dashboard
- User management and verification
- System health monitoring
- Analytics and reporting
- Security and compliance tracking
- Notification system management

### Pharmacy Dashboard
- Prescription queue and processing
- Inventory management with alerts
- Order fulfillment and tracking
- Patient communication and consultations
- Revenue tracking and analytics

## 🚀 Performance Optimizations

### Lazy Loading
- Dynamic imports for dashboard sections
- Code splitting by user role
- Progressive enhancement

### Memoization
- React.memo for sidebar items
- useMemo for configuration processing
- useCallback for event handlers

### Virtual Scrolling
- Efficient rendering for large lists
- Intersection Observer for visibility
- Debounced scroll events

## 🧪 Testing

### Unit Tests
```bash
npm test -- --testPathPattern=sidebar
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e -- --spec="sidebar.spec.js"
```

## 🔧 Troubleshooting

### Common Issues

1. **Sidebar not scrolling**
   - Check CSS overflow properties
   - Verify container height settings
   - Ensure scrollbar styles are applied

2. **Notifications not updating**
   - Verify WebSocket connection
   - Check API endpoint responses
   - Confirm notification hook usage

3. **Mobile overlay not working**
   - Check z-index values
   - Verify touch event handlers
   - Ensure responsive breakpoints

### Debug Mode

```jsx
// Enable debug logging
localStorage.setItem('sidebar-debug', 'true');

// View notification state
console.log(useSidebarNotifications('patient'));
```

## 📚 Examples

### Complete Dashboard Implementation

```jsx
import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { doctorSidebarConfig } from '../config/sidebarConfigs';

function DoctorDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'appointments':
        return <AppointmentManagement />;
      case 'patients':
        return <PatientList />;
      default:
        return <ComingSoon section={activeSection} />;
    }
  };

  return (
    <DashboardLayout
      userRole="doctor"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      showWelcome={activeSection === 'dashboard'}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
```

## 🌟 Demo

Visit `/dashboard-demo` to see the interactive demo showcasing all dashboard types with the advanced sidebar system.

## 📄 License

This sidebar system is part of the Healthcare Platform project and follows the same licensing terms.