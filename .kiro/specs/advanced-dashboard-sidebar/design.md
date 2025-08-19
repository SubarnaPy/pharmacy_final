# Design Document

## Overview

The Advanced Dashboard Sidebar is a comprehensive navigation component that provides role-specific navigation for healthcare platform users (doctors, patients, and pharmacies). The sidebar features scrollable content, interactive tabs with active states, real-time notification counters, and responsive design with collapse functionality.

## Architecture

### Component Hierarchy

```
AdvancedSidebar (Main Component)
├── SidebarHeader
│   ├── Title & Subtitle
│   ├── User Info Section
│   └── Collapse Toggle Button
├── SidebarNavigation (Scrollable)
│   ├── NavigationItem[]
│   │   ├── Icon Component
│   │   ├── Label & Description
│   │   ├── NotificationBadge
│   │   └── SubItems[] (Expandable)
│   └── ScrollIndicators
└── SidebarFooter
    └── Version Info
```

### State Management

```javascript
// Sidebar State Structure
{
  isCollapsed: boolean,
  activeTab: string,
  hoveredTab: string,
  expandedSections: string[],
  notificationCounts: {
    [tabKey]: {
      count: number,
      type: 'urgent' | 'warning' | 'info' | 'success' | 'new',
      pulse: boolean
    }
  },
  userInfo: {
    name: string,
    role: string,
    avatar: string
  }
}
```

## Components and Interfaces

### 1. AdvancedSidebar Component

**Props Interface:**
```typescript
interface AdvancedSidebarProps {
  items: NavigationItem[];
  title: string;
  subtitle?: string;
  userInfo: UserInfo;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}
```

**Key Features:**
- Responsive design (mobile overlay, desktop fixed)
- Smooth collapse/expand animations
- Theme-aware styling
- Accessibility support (ARIA labels, keyboard navigation)

### 2. NavigationItem Interface

```typescript
interface NavigationItem {
  key: string;
  label: string;
  description?: string;
  icon: React.ComponentType;
  path?: string;
  onClick?: () => void;
  badge?: NotificationBadge;
  subItems?: SubNavigationItem[];
  disabled?: boolean;
  tooltip?: string;
}

interface NotificationBadge {
  count: number;
  type: 'urgent' | 'warning' | 'info' | 'success' | 'new';
  pulse?: boolean;
  urgent?: boolean;
}
```

### 3. Role-Specific Configurations

#### Doctor Sidebar Configuration
- **Primary Sections:** Dashboard, Appointments, Patients, Consultations, Prescriptions
- **Secondary Sections:** Messages, Earnings, Analytics, Education
- **Utility Sections:** Profile, Notifications, Settings
- **Notification Priorities:** Urgent appointments, new consultations, pending prescriptions

#### Patient Sidebar Configuration
- **Primary Sections:** Dashboard, Appointments, Prescriptions, Orders
- **Secondary Sections:** Health Records, Consultations, Messages, Pharmacy Finder
- **Utility Sections:** Payments, Profile, Notifications, Settings
- **Notification Priorities:** Upcoming appointments, new prescriptions, order updates

#### Pharmacy Sidebar Configuration
- **Primary Sections:** Dashboard, Orders, Prescriptions, Inventory
- **Secondary Sections:** Customers, Messages, Transactions, Analytics
- **Utility Sections:** Compliance, Profile, Notifications, Settings
- **Notification Priorities:** Pending orders, new prescriptions, low stock alerts

## Data Models

### 1. Sidebar Configuration Model

```javascript
class SidebarConfig {
  constructor(role, userInfo, counts) {
    this.role = role;
    this.userInfo = userInfo;
    this.items = this.generateItems(role, counts);
    this.title = this.getTitle(role);
    this.subtitle = this.getSubtitle(role);
  }

  generateItems(role, counts) {
    // Role-specific item generation logic
  }
}
```

### 2. Notification Counter Model

```javascript
class NotificationCounter {
  constructor(key, count, type, options = {}) {
    this.key = key;
    this.count = count;
    this.type = type;
    this.pulse = options.pulse || false;
    this.urgent = options.urgent || false;
    this.lastUpdated = new Date();
  }

  update(newCount) {
    this.count = newCount;
    this.lastUpdated = new Date();
  }

  shouldDisplay() {
    return this.count > 0;
  }

  getDisplayText() {
    return this.count > 99 ? '99+' : this.count.toString();
  }
}
```

## Visual Design Specifications

### 1. Layout Dimensions

```css
/* Desktop Sidebar */
.sidebar-expanded {
  width: 280px;
  min-width: 280px;
}

.sidebar-collapsed {
  width: 72px;
  min-width: 72px;
}

/* Mobile Sidebar */
.sidebar-mobile {
  width: 100vw;
  max-width: 320px;
}
```

### 2. Color Scheme

#### Light Theme
```css
:root {
  --sidebar-bg: #ffffff;
  --sidebar-border: #e5e7eb;
  --sidebar-text: #374151;
  --sidebar-text-secondary: #6b7280;
  --sidebar-hover: #f3f4f6;
  --sidebar-active: linear-gradient(135deg, #3b82f6, #1d4ed8);
  --sidebar-active-text: #ffffff;
}
```

#### Dark Theme
```css
:root[data-theme="dark"] {
  --sidebar-bg: #1f2937;
  --sidebar-border: #374151;
  --sidebar-text: #f9fafb;
  --sidebar-text-secondary: #9ca3af;
  --sidebar-hover: #374151;
  --sidebar-active: linear-gradient(135deg, #3b82f6, #1d4ed8);
  --sidebar-active-text: #ffffff;
}
```

### 3. Badge Color Coding

```css
.badge-urgent { background: #ef4444; }
.badge-warning { background: #f59e0b; }
.badge-info { background: #3b82f6; }
.badge-success { background: #10b981; }
.badge-new { background: #8b5cf6; }
```

### 4. Animation Specifications

```css
/* Sidebar Transitions */
.sidebar-transition {
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Tab Hover Effects */
.tab-hover {
  transition: all 200ms ease-in-out;
  transform: scale(1.01);
}

/* Badge Pulse Animation */
.badge-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## Scrolling Implementation

### 1. Custom Scrollbar Styling

```css
.sidebar-scroll {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}
```

### 2. Scroll Behavior

- **Smooth Scrolling:** Enabled for programmatic navigation
- **Scroll Indicators:** Fade-in/out based on scroll position
- **Keyboard Navigation:** Arrow keys for tab navigation
- **Focus Management:** Proper focus handling for accessibility

## Real-time Updates

### 1. WebSocket Integration

```javascript
class SidebarNotificationService {
  constructor(userId, userRole) {
    this.userId = userId;
    this.userRole = userRole;
    this.websocket = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    // WebSocket connection logic
    this.websocket = new WebSocket(`ws://api/notifications/${this.userId}`);
    this.websocket.onmessage = this.handleNotificationUpdate.bind(this);
  }

  handleNotificationUpdate(event) {
    const { type, count, section } = JSON.parse(event.data);
    // Update notification counters
    this.updateSidebarCount(section, count, type);
  }
}
```

### 2. Polling Fallback

```javascript
class SidebarPollingService {
  constructor(interval = 30000) {
    this.interval = interval;
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => {
      this.fetchNotificationCounts();
    }, this.interval);
  }

  async fetchNotificationCounts() {
    // API call to get updated counts
    const counts = await api.getNotificationCounts();
    return counts;
  }
}
```

## Error Handling

### 1. Network Errors

```javascript
class SidebarErrorHandler {
  handleNetworkError(error) {
    // Show cached counts
    // Display offline indicator
    // Retry mechanism
  }

  handleAPIError(error) {
    // Graceful degradation
    // Error logging
    // User notification
  }
}
```

### 2. Fallback States

- **Offline Mode:** Show cached notification counts
- **API Failures:** Graceful degradation with default counts
- **Loading States:** Skeleton loaders for notification badges
- **Error States:** Clear error messaging without breaking functionality

## Testing Strategy

### 1. Unit Tests

- **Component Rendering:** Test all sidebar configurations
- **State Management:** Test collapse/expand functionality
- **Notification Updates:** Test counter updates and badge display
- **Theme Switching:** Test light/dark mode transitions

### 2. Integration Tests

- **Navigation:** Test routing and active state updates
- **Real-time Updates:** Test WebSocket and polling mechanisms
- **Responsive Behavior:** Test mobile and desktop layouts
- **Accessibility:** Test keyboard navigation and screen readers

### 3. Performance Tests

- **Scroll Performance:** Test smooth scrolling with many items
- **Memory Usage:** Test for memory leaks in real-time updates
- **Bundle Size:** Ensure optimal code splitting
- **Render Performance:** Test re-render optimization

### 4. User Experience Tests

- **Cross-browser Compatibility:** Test on major browsers
- **Mobile Responsiveness:** Test on various device sizes
- **Touch Interactions:** Test mobile gesture support
- **Loading Performance:** Test initial load and subsequent updates

## Accessibility Considerations

### 1. ARIA Implementation

```html
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="menuitem" aria-current="page">
      <button aria-expanded="false" aria-haspopup="true">
        Appointments
        <span aria-label="3 new appointments" class="sr-only">
      </button>
    </li>
  </ul>
</nav>
```

### 2. Keyboard Navigation

- **Tab Order:** Logical tab sequence through navigation items
- **Arrow Keys:** Navigate between sidebar items
- **Enter/Space:** Activate navigation items
- **Escape:** Close mobile sidebar or collapse expanded sections

### 3. Screen Reader Support

- **Semantic HTML:** Proper use of nav, ul, li elements
- **ARIA Labels:** Descriptive labels for all interactive elements
- **Live Regions:** Announce notification count changes
- **Focus Management:** Proper focus handling during navigation

## Performance Optimizations

### 1. Rendering Optimizations

```javascript
// Memoized sidebar items
const MemoizedNavigationItem = React.memo(NavigationItem);

// Virtual scrolling for large item lists
const VirtualizedSidebar = ({ items }) => {
  // Implementation for virtual scrolling
};
```

### 2. Bundle Optimization

- **Code Splitting:** Separate bundles for each role configuration
- **Tree Shaking:** Remove unused navigation items
- **Icon Optimization:** Use icon libraries with tree shaking support
- **CSS Optimization:** Critical CSS inlining for sidebar styles

### 3. Caching Strategy

```javascript
// Cache sidebar configurations
const sidebarCache = new Map();

// Cache notification counts
const notificationCache = {
  data: {},
  timestamp: null,
  ttl: 30000 // 30 seconds
};
```