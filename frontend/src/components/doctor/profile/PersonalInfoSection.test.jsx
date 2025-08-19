import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import PersonalInfoSection from './PersonalInfoSection.jsx';
import apiClient from '../../../api/apiClient.js';

// Mock dependencies
jest.mock('../../../api/apiClient.js');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock store
const mockStore = configureStore({
  reducer: {
    auth: (state = { user: { _id: 'test-user-id', role: 'doctor' } }) => state
  }
});

// Mock data
const mockPersonalInfo = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0123',
  address: '123 Main St\nAnytown, USA',
  profileImage: null
};

const renderComponent = (props = {}) => {
  return render(
    <Provider store={mockStore}>
      <PersonalInfoSection
        doctorId="test-doctor-id"
        personalInfo={mockPersonalInfo}
        onUpdate={jest.fn()}
        isEditable={true}
        {...props}
      />
    </Provider>
  );
};

describe('PersonalInfoSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.put.mockResolvedValue({
      data: { data: { success: true } }
    });
  });

  test('renders personal information correctly', () => {
    renderComponent();
    
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
  });

  test('shows edit buttons when hovering over fields', async () => {
    renderComponent();
    
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });
  });

  test('allows editing first name', async () => {
    renderComponent();
    
    // Find and click edit button for first name
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    // Should show input field
    const input = screen.getByDisplayValue('John');
    expect(input).toBeInTheDocument();
    
    // Change value
    fireEvent.change(input, { target: { value: 'Jane' } });
    
    // Save changes
    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/doctors/test-doctor-id/profile/section', {
        section: 'personal',
        data: { firstName: 'Jane' }
      });
    });
  });

  test('validates email format', async () => {
    renderComponent();
    
    // Find and edit email field
    const emailField = screen.getByText('john.doe@example.com').closest('.editable-field');
    fireEvent.mouseEnter(emailField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('john.doe@example.com');
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    
    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
    
    // Should not call API with invalid email
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  test('validates phone number format', async () => {
    renderComponent();
    
    // Find and edit phone field
    const phoneField = screen.getByText('+1-555-0123').closest('.editable-field');
    fireEvent.mouseEnter(phoneField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('+1-555-0123');
    fireEvent.change(input, { target: { value: '123' } });
    
    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Phone number must be between 10-15 digits')).toBeInTheDocument();
    });
    
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  test('handles profile image upload', async () => {
    // Mock successful document upload
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          uploadedDocuments: [{
            fileUrl: 'https://example.com/image.jpg',
            fileName: 'profile.jpg'
          }]
        }
      }
    });

    renderComponent();
    
    // Find file input
    const fileInput = screen.getByRole('button').querySelector('input[type="file"]');
    
    // Create mock file
    const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' });
    
    // Upload file
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Should show save button
    await waitFor(() => {
      expect(screen.getByText('Save Image')).toBeInTheDocument();
    });
    
    // Click save
    fireEvent.click(screen.getByText('Save Image'));
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/doctors/test-doctor-id/documents',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      );
    });
  });

  test('shows validation errors for required fields', async () => {
    renderComponent();
    
    // Edit first name to empty
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('John');
    fireEvent.change(input, { target: { value: '' } });
    
    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    apiClient.put.mockRejectedValue({
      response: { data: { message: 'Server error' } }
    });

    renderComponent();
    
    // Try to edit first name
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('John');
    fireEvent.change(input, { target: { value: 'Jane' } });
    
    const saveButton = screen.getByTitle('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server error');
    });
  });

  test('disables editing when isEditable is false', () => {
    renderComponent({ isEditable: false });
    
    // Should not show edit buttons
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
  });

  test('cancels editing when escape key is pressed', async () => {
    renderComponent();
    
    // Start editing
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('John');
    fireEvent.change(input, { target: { value: 'Jane' } });
    
    // Press escape
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Should revert to original value
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Jane')).not.toBeInTheDocument();
    });
  });

  test('saves on enter key press', async () => {
    renderComponent();
    
    // Start editing
    const firstNameField = screen.getByText('John').closest('.editable-field');
    fireEvent.mouseEnter(firstNameField);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('John');
    fireEvent.change(input, { target: { value: 'Jane' } });
    
    // Press enter
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith('/doctors/test-doctor-id/profile/section', {
        section: 'personal',
        data: { firstName: 'Jane' }
      });
    });
  });
});