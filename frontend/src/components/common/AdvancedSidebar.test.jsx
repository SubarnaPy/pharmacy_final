import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DarkModeContext } from '../../app/DarkModeContext';
import AdvancedSidebar from './AdvancedSidebar';
import { HomeIcon, UserIcon, BellIcon } from '@heroicons/react/24/outline';

// Mock context
const mockDarkModeContext = {
  isDarkMode: false
};

// Mock sidebar items
const mockItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: HomeIcon,
    description: 'Overview and statistics'
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: UserIcon,
    description: 'User profile management'
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: BellIcon,
    description: 'Alerts and messages',
    badge: 5,
    children: [
      {
        key: 'unread',
        label: 'Unread',
        icon: BellIcon,
        description: 'Unread notifications',
        badge: 3
      }
    ]
  }
];

const defaultProps = {
  title: 'Test Portal',
  items: mockItems,
  activeSection: 'dashboard',
  onSectionChange: jest.fn(),
  isOpen: true,
  onToggle: jest.fn(),
  userInfo: 'Test User • Test Role'
};

const renderWithContext = (props = {}) => {
  return render(
    <DarkModeContext.Provider value={mockDarkModeContext}>
      <AdvancedSidebar {...defaultProps} {...props} />
    </DarkModeContext.Provider>
  );
};

describe('AdvancedSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders sidebar with title and user info', () => {
    renderWithContext();
    
    expect(screen.getByText('Test Portal')).toBeInTheDocument();
    expect(screen.getByText('Test User • Test Role')).toBeInTheDocument();
  });

  test('renders all sidebar items', () => {
    renderWithContext();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  test('displays notification badges correctly', () => {
    renderWithContext();
    
    // Check for notification badge
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('handles item selection', () => {
    const onSectionChange = jest.fn();
    renderWithContext({ onSectionChange });
    
    fireEvent.click(screen.getByText('Profile'));
    
    expect(onSectionChange).toHaveBeenCalledWith('profile');
  });

  test('expands and collapses groups', async () => {
    renderWithContext();
    
    // Initially, child items should not be visible
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
    
    // Click on notifications to expand
    fireEvent.click(screen.getByText('Notifications'));
    
    // Child item should now be visible
    await waitFor(() => {
      expect(screen.getByText('Unread')).toBeInTheDocument();
    });
  });

  test('shows active state for current section', () => {
    renderWithContext({ activeSection: 'profile' });
    
    const profileButton = screen.getByText('Profile').closest('button');
    expect(profileButton).toHaveClass('from-blue-500', 'to-purple-500');
  });

  test('handles mobile toggle', () => {
    const onToggle = jest.fn();
    renderWithContext({ onToggle });
    
    // Find and click the close button (X icon)
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onToggle).toHaveBeenCalled();
  });

  test('renders in closed state', () => {
    renderWithContext({ isOpen: false });
    
    const sidebar = screen.getByText('Test Portal').closest('div').parentElement;
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  test('renders in open state', () => {
    renderWithContext({ isOpen: true });
    
    const sidebar = screen.getByText('Test Portal').closest('div').parentElement;
    expect(sidebar).toHaveClass('translate-x-0');
  });

  test('handles dark mode context', () => {
    const darkModeContext = { isDarkMode: true };
    
    render(
      <DarkModeContext.Provider value={darkModeContext}>
        <AdvancedSidebar {...defaultProps} />
      </DarkModeContext.Provider>
    );
    
    // Sidebar should have dark mode classes
    const sidebar = screen.getByText('Test Portal').closest('div').parentElement;
    expect(sidebar).toHaveClass('dark:bg-gray-900/95');
  });

  test('displays item descriptions', () => {
    renderWithContext();
    
    expect(screen.getByText('Overview and statistics')).toBeInTheDocument();
    expect(screen.getByText('User profile management')).toBeInTheDocument();
    expect(screen.getByText('Alerts and messages')).toBeInTheDocument();
  });

  test('handles items without badges', () => {
    const itemsWithoutBadges = [
      {
        key: 'simple',
        label: 'Simple Item',
        icon: HomeIcon,
        description: 'No badge item'
      }
    ];
    
    renderWithContext({ items: itemsWithoutBadges });
    
    expect(screen.getByText('Simple Item')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  test('handles empty items array', () => {
    renderWithContext({ items: [] });
    
    expect(screen.getByText('Test Portal')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  test('handles nested children selection', async () => {
    const onSectionChange = jest.fn();
    renderWithContext({ onSectionChange });
    
    // Expand notifications group
    fireEvent.click(screen.getByText('Notifications'));
    
    // Wait for child to appear and click it
    await waitFor(() => {
      expect(screen.getByText('Unread')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Unread'));
    
    expect(onSectionChange).toHaveBeenCalledWith('unread');
  });

  test('displays correct badge count for high numbers', () => {
    const itemsWithHighBadge = [
      {
        key: 'high-badge',
        label: 'High Badge',
        icon: BellIcon,
        description: 'Item with high badge count',
        badge: 150
      }
    ];
    
    renderWithContext({ items: itemsWithHighBadge });
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  test('animates items with proper delays', () => {
    renderWithContext();
    
    const items = screen.getAllByRole('button');
    
    // Check that items have animation classes
    items.forEach((item) => {
      expect(item.closest('div')).toHaveClass('animate-slideInLeft');
    });
  });
});

// Integration test for the complete sidebar system
describe('AdvancedSidebar Integration', () => {
  test('works with real sidebar configuration', () => {
    const realConfig = {
      title: 'Patient Portal',
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: HomeIcon,
          description: 'Overview of your health'
        },
        {
          key: 'prescriptions',
          label: 'Prescriptions',
          icon: UserIcon,
          description: 'Manage prescriptions',
          children: [
            {
              key: 'upload',
              label: 'Upload',
              icon: UserIcon,
              description: 'Upload new prescription'
            }
          ]
        }
      ]
    };
    
    renderWithContext({
      title: realConfig.title,
      items: realConfig.items
    });
    
    expect(screen.getByText('Patient Portal')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Prescriptions')).toBeInTheDocument();
  });
});