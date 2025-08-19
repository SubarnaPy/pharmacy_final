import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

// Import components and hooks to test
import ErrorBoundary from '../../common/ErrorBoundary.jsx';
import ProfileSectionErrorBoundary from './ProfileSectionErrorBoundary.jsx';
import ProfileErrorHandler from './ProfileErrorHandler.jsx';
import ProfileSaveStatus from './ProfileSaveStatus.jsx';
import useRetryOperation from '../../../hooks/useRetryOperation.js';
import useOfflineState from '../../../hooks/useOfflineState.js';
import useEnhancedProfileSave from '../../../hooks/useEnhancedProfileSave.js';
import notificationService from '../../../services/notificationService.js';

// Mock dependencies
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    dismiss: jest.fn(),
    promise: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('../../../api/apiClient.js', () => ({
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn()
}));

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: { _id: 'test-user', role: 'doctor' } }) => state,
      doctorProfile: (state = { 
        activeSection: 'personal',
        unsavedChanges: {},
        ...initialState.doctorProfile 
      }) => state
    }
  });
};

// Test component that throws an error
const ErrorThrowingComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
};

describe('Error Handling System', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = createMockStore();
    jest.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should render error UI when error occurs', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should call retry function when retry button is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { rerender } = render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try Again'));

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should render custom fallback when provided', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const customFallback = (error, retry) => (
        <div>
          <p>Custom error: {error.message}</p>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
      expect(screen.getByText('Custom Retry')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('ProfileSectionErrorBoundary', () => {
    it('should render section-specific error UI', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ProfileSectionErrorBoundary sectionName="Personal Information">
          <ErrorThrowingComponent shouldThrow={true} />
        </ProfileSectionErrorBoundary>
      );

      expect(screen.getByText('Error in Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Retry Section')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('ProfileErrorHandler', () => {
    it('should render network error correctly', () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred'
      };

      render(
        <ProfileErrorHandler
          error={networkError}
          sectionName="Personal Information"
          onRetry={jest.fn()}
        />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Unable to connect to the server. Please check your internet connection.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should render validation error correctly', () => {
      const validationError = {
        response: { status: 400 },
        message: 'Email is required'
      };

      render(
        <ProfileErrorHandler
          error={validationError}
          sectionName="Personal Information"
        />
      );

      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should render server error correctly', () => {
      const serverError = {
        response: { status: 500 },
        message: 'Internal server error'
      };

      render(
        <ProfileErrorHandler
          error={serverError}
          sectionName="Personal Information"
          onRetry={jest.fn()}
        />
      );

      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText('The server encountered an error. Please try again in a moment.')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const onRetry = jest.fn();
      const error = { code: 'NETWORK_ERROR' };

      render(
        <ProfileErrorHandler
          error={error}
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('ProfileSaveStatus', () => {
    it('should render saving status', () => {
      const saveStatus = {
        isSaving: true,
        isRetrying: false,
        retryCount: 0,
        isOnline: true,
        queuedSaves: 0
      };

      render(
        <ProfileSaveStatus
          saveStatus={saveStatus}
          sectionName="Personal Information"
        />
      );

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should render retry status', () => {
      const saveStatus = {
        isSaving: false,
        isRetrying: true,
        retryCount: 2,
        isOnline: true,
        queuedSaves: 0
      };

      render(
        <ProfileSaveStatus
          saveStatus={saveStatus}
          sectionName="Personal Information"
        />
      );

      expect(screen.getByText('Retrying... (2/3)')).toBeInTheDocument();
    });

    it('should render offline status', () => {
      const saveStatus = {
        isSaving: false,
        isRetrying: false,
        retryCount: 0,
        isOnline: false,
        queuedSaves: 2
      };

      render(
        <ProfileSaveStatus
          saveStatus={saveStatus}
          sectionName="Personal Information"
        />
      );

      expect(screen.getByText('2 changes queued')).toBeInTheDocument();
    });

    it('should render success status', () => {
      const saveStatus = {
        isSaving: false,
        isRetrying: false,
        retryCount: 0,
        isOnline: true,
        queuedSaves: 0,
        lastSave: { success: true, timestamp: Date.now() }
      };

      render(
        <ProfileSaveStatus
          saveStatus={saveStatus}
          sectionName="Personal Information"
        />
      );

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  describe('useRetryOperation', () => {
    it('should retry failed operations', async () => {
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Operation failed');
        }
        return 'success';
      });

      const TestComponent = () => {
        const { executeWithRetry } = useRetryOperation({
          maxRetries: 3,
          retryDelay: 100,
          showNotifications: false
        });

        const handleClick = async () => {
          try {
            const result = await executeWithRetry(operation, 'Test Operation');
            screen.getByTestId('result').textContent = result;
          } catch (error) {
            screen.getByTestId('result').textContent = 'failed';
          }
        };

        return (
          <div>
            <button onClick={handleClick}>Execute</button>
            <div data-testid="result"></div>
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Execute'));

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('success');
      }, { timeout: 1000 });

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('useOfflineState', () => {
    it('should detect offline state', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const TestComponent = () => {
        const { isOnline } = useOfflineState();
        return <div>{isOnline ? 'Online' : 'Offline'}</div>;
      };

      render(<TestComponent />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should queue operations when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const TestComponent = () => {
        const { queueOperation, queuedOperations } = useOfflineState();

        const handleQueue = () => {
          queueOperation(() => Promise.resolve('test'), 'Test Operation');
        };

        return (
          <div>
            <button onClick={handleQueue}>Queue Operation</button>
            <div data-testid="queue-count">{queuedOperations.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Queue Operation'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-count')).toHaveTextContent('1');
      });
    });
  });

  describe('notificationService', () => {
    it('should show success notifications', () => {
      notificationService.success('Test success message');
      expect(toast.success).toHaveBeenCalledWith('Test success message', expect.any(Object));
    });

    it('should show error notifications with retry', () => {
      const onRetry = jest.fn();
      notificationService.error('Test error message', { onRetry });
      expect(toast.error).toHaveBeenCalled();
    });

    it('should show profile-specific notifications', () => {
      notificationService.profileSaved('Personal Information');
      expect(toast.success).toHaveBeenCalledWith('Personal Information updated successfully', expect.any(Object));
    });

    it('should show offline notifications', () => {
      notificationService.offlineMode();
      expect(toast.warning).toHaveBeenCalledWith(
        'You are offline. Changes will be saved when connection is restored.',
        expect.objectContaining({ autoClose: false })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error flow in profile section', async () => {
      const mockApiClient = require('../../../api/apiClient.js');
      mockApiClient.put.mockRejectedValueOnce(new Error('Network error'));

      const TestComponent = () => {
        const { saveSection, getSaveStatus } = useEnhancedProfileSave('test-doctor', 'Personal Information');
        const [error, setError] = React.useState(null);

        const handleSave = async () => {
          try {
            await saveSection({ firstName: 'John' });
          } catch (err) {
            setError(err);
          }
        };

        return (
          <Provider store={mockStore}>
            <div>
              <button onClick={handleSave}>Save</button>
              <ProfileSaveStatus saveStatus={getSaveStatus()} />
              {error && (
                <ProfileErrorHandler
                  error={error}
                  onRetry={handleSave}
                  sectionName="Personal Information"
                />
              )}
            </div>
          </Provider>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});