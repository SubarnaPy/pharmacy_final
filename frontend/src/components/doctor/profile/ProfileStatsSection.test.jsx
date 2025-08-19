import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { toast } from 'react-toastify';
import ProfileStatsSection from './ProfileStatsSection.jsx';
import apiClient from '../../../api/apiClient.js';

// Mock dependencies
jest.mock('../../../api/apiClient.js');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ChartBarIcon: () => <div data-testid="chart-bar-icon" />,
  CurrencyRupeeIcon: () => <div data-testid="currency-rupee-icon" />,
  UserGroupIcon: () => <div data-testid="user-group-icon" />,
  StarIcon: () => <div data-testid="star-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  TrendingUpIcon: () => <div data-testid="trending-up-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="exclamation-triangle-icon" />,
  ArrowPathIcon: () => <div data-testid="arrow-path-icon" />
}));

jest.mock('@heroicons/react/24/solid', () => ({
  StarIcon: ({ className }) => <div data-testid="star-icon-solid" className={className} />
}));

describe('ProfileStatsSection', () => {
  const mockDoctorId = 'doctor123';
  
  const mockStatsData = {
    appointmentStats: [
      { _id: 'completed', count: 25 },
      { _id: 'cancelled', count: 3 },
      { _id: 'pending', count: 2 }
    ],
    ratingStats: {
      average: 4.5,
      totalReviews: 20
    },
    consultationTypeStats: [
      { _id: 'video', count: 15 },
      { _id: 'chat', count: 8 },
      { _id: 'phone', count: 2 }
    ],
    totalPatients: 28,
    period: 'month'
  };

  const mockEarningsData = {
    earnings: {
      totalEarnings: 45000,
      thisMonth: 15000,
      platformFee: 4500
    },
    earningsTrend: [
      {
        _id: { year: 2024, month: 1 },
        totalEarnings: 12000,
        totalConsultations: 8,
        averageEarning: 1500
      },
      {
        _id: { year: 2024, month: 2 },
        totalEarnings: 18000,
        totalConsultations: 12,
        averageEarning: 1500
      }
    ],
    period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful API responses
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/stats')) {
        return Promise.resolve({ data: { data: mockStatsData } });
      }
      if (url.includes('/earnings')) {
        return Promise.resolve({ data: { data: mockEarningsData } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      expect(screen.getByText('Profile Statistics & Earnings')).toBeInTheDocument();
      expect(screen.getByTestId('chart-bar-icon')).toBeInTheDocument();
      
      // Check for loading skeleton
      const skeletonElements = screen.getAllByRole('generic');
      expect(skeletonElements.some(el => el.className.includes('animate-pulse'))).toBe(true);
    });

    it('renders statistics data after loading', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument(); // Total consultations
        expect(screen.getByText('83.3%')).toBeInTheDocument(); // Completion rate
        expect(screen.getByText('4.5')).toBeInTheDocument(); // Average rating
        expect(screen.getByText('₹45,000')).toBeInTheDocument(); // Total earnings
      });
    });

    it('renders period selector with correct options', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        const periodSelector = screen.getByRole('combobox');
        expect(periodSelector).toBeInTheDocument();
        expect(screen.getByText('This Week')).toBeInTheDocument();
        expect(screen.getByText('This Month')).toBeInTheDocument();
        expect(screen.getByText('This Year')).toBeInTheDocument();
      });
    });

    it('renders refresh button', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh statistics');
        expect(refreshButton).toBeInTheDocument();
        expect(screen.getByTestId('arrow-path-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('displays consultation statistics correctly', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Consultations')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument(); // 25 + 3 + 2
        expect(screen.getByText('25 completed')).toBeInTheDocument();
        
        expect(screen.getByText('Completion Rate')).toBeInTheDocument();
        expect(screen.getByText('83.3%')).toBeInTheDocument(); // 25/30 * 100
        expect(screen.getByText('3 cancelled')).toBeInTheDocument();
      });
    });

    it('displays rating statistics correctly', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Average Rating')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('20 reviews')).toBeInTheDocument();
        
        // Check for star icons
        const starIcons = screen.getAllByTestId('star-icon-solid');
        expect(starIcons).toHaveLength(5);
      });
    });

    it('displays earnings statistics correctly', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Earnings')).toBeInTheDocument();
        expect(screen.getAllByText('₹45,000')).toHaveLength(2); // Appears in card and breakdown
        expect(screen.getByText('This period: ₹15,000')).toBeInTheDocument();
      });
    });

    it('displays consultation types breakdown', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Consultation Types')).toBeInTheDocument();
        expect(screen.getByText('video')).toBeInTheDocument();
        expect(screen.getByText('chat')).toBeInTheDocument();
        expect(screen.getByText('phone')).toBeInTheDocument();
        
        // Check counts
        expect(screen.getByText('15')).toBeInTheDocument(); // Video count
        expect(screen.getByText('8')).toBeInTheDocument(); // Chat count
        expect(screen.getByText('2')).toBeInTheDocument(); // Phone count
      });
    });

    it('displays earnings breakdown', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Earnings Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Gross Earnings')).toBeInTheDocument();
        expect(screen.getByText('Platform Fee')).toBeInTheDocument();
        expect(screen.getByText('Net Earnings')).toBeInTheDocument();
        
        // Check calculated net earnings (45000 - 4500 = 40500)
        expect(screen.getByText('₹40,500')).toBeInTheDocument();
      });
    });

    it('displays monthly earnings trend when available', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly Earnings Trend')).toBeInTheDocument();
        expect(screen.getByText('January 2024')).toBeInTheDocument();
        expect(screen.getByText('February 2024')).toBeInTheDocument();
        expect(screen.getByText('₹12,000')).toBeInTheDocument();
        expect(screen.getByText('₹18,000')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API calls fail', async () => {
      const errorMessage = 'Failed to fetch statistics';
      apiClient.get.mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
        expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
      });
    });

    it('displays placeholder data when statistics are unavailable', async () => {
      apiClient.get.mockRejectedValue(new Error('Network error'));

      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        // Should show zero values and placeholder messages
        expect(screen.getAllByText('0')).toHaveLength(2); // Total consultations and completed
        expect(screen.getAllByText('₹0')).toHaveLength(6); // Multiple zero currency values
        expect(screen.getByText('No consultation data available for this period')).toBeInTheDocument();
        expect(screen.getByText('No earnings data available for this period')).toBeInTheDocument();
      });
    });
    });
  });

  describe('User Interactions', () => {
    it('changes period when selector is changed', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        const periodSelector = screen.getByRole('combobox');
        fireEvent.change(periodSelector, { target: { value: 'week' } });
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('period=week')
      );
    });

    it('refreshes data when refresh button is clicked', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh statistics');
        fireEvent.click(refreshButton);
      });

      // Should call API again
      expect(apiClient.get).toHaveBeenCalledTimes(4); // 2 initial + 2 refresh
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Statistics refreshed successfully');
      });
    });

    it('shows loading state during refresh', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByText('Total Consultations')).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByTitle('Refresh statistics');
      fireEvent.click(refreshButton);
      
      // Check for spinning icon during refresh
      const arrowIcon = screen.getByTestId('arrow-path-icon');
      expect(arrowIcon.className).toContain('animate-spin');
    });
  });

  describe('Data Formatting', () => {
    it('formats currency correctly', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        // Check Indian Rupee formatting - use getAllByText for multiple occurrences
        expect(screen.getAllByText('₹45,000')).toHaveLength(2); // Total earnings appears twice
        expect(screen.getByText('This period: ₹15,000')).toBeInTheDocument();
        expect(screen.getByText('-₹4,500')).toBeInTheDocument();
      });
    });

    it('formats percentages correctly', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('83.3%')).toBeInTheDocument(); // Completion rate
        expect(screen.getByText('(60.0%)')).toBeInTheDocument(); // Video consultation percentage
      });
    });

    it('handles zero values gracefully', async () => {
      const emptyStatsData = {
        appointmentStats: [],
        ratingStats: { average: 0, totalReviews: 0 },
        consultationTypeStats: [],
        totalPatients: 0,
        period: 'month'
      };

      const emptyEarningsData = {
        earnings: { totalEarnings: 0, thisMonth: 0, platformFee: 0 },
        earningsTrend: [],
        period: { start: new Date(), end: new Date() }
      };

      apiClient.get.mockImplementation((url) => {
        if (url.includes('/stats')) {
          return Promise.resolve({ data: { data: emptyStatsData } });
        }
        if (url.includes('/earnings')) {
          return Promise.resolve({ data: { data: emptyEarningsData } });
        }
      });

      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getAllByText('0')).toHaveLength(2); // Total consultations and completed
        expect(screen.getByText('0.0%')).toBeInTheDocument(); // Completion rate
        expect(screen.getByText('0.0')).toBeInTheDocument(); // Average rating
        expect(screen.getAllByText('₹0')).toHaveLength(6); // Multiple zero currency values
      });
    });
  });

  describe('API Integration', () => {
    it('makes correct API calls on mount', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(`/doctors/${mockDoctorId}/stats?period=month`);
        expect(apiClient.get).toHaveBeenCalledWith(`/doctors/${mockDoctorId}/earnings?period=month`);
      });
    });

    it('handles API call failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      apiClient.get.mockRejectedValue(new Error('Network error'));

      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching stats:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        const periodSelector = screen.getByRole('combobox');
        expect(periodSelector).toBeInTheDocument();
        
        const refreshButton = screen.getByTitle('Refresh statistics');
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('provides meaningful text for screen readers', async () => {
      render(<ProfileStatsSection doctorId={mockDoctorId} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Consultations')).toBeInTheDocument();
        expect(screen.getByText('Completion Rate')).toBeInTheDocument();
        expect(screen.getByText('Average Rating')).toBeInTheDocument();
        expect(screen.getByText('Total Earnings')).toBeInTheDocument();
      });
    });
  });
});