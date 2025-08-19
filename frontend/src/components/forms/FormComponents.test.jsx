import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import EditableField from './EditableField';
import MultiSelectField from './MultiSelectField';
import TimeSlotPicker from './TimeSlotPicker';
import DocumentUploader from './DocumentUploader';

describe('EditableField', () => {
  test('renders display mode by default', () => {
    render(
      <EditableField
        value="Test Value"
        onSave={jest.fn()}
        label="Test Field"
      />
    );
    
    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByText('Test Value')).toBeInTheDocument();
  });

  test('switches to edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditableField
        value="Test Value"
        onSave={jest.fn()}
        label="Test Field"
      />
    );
    
    const editButton = screen.getByTitle('Edit');
    await user.click(editButton);
    
    expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument();
  });

  test('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    const mockSave = jest.fn().mockResolvedValue();
    
    render(
      <EditableField
        value="Test Value"
        onSave={mockSave}
        label="Test Field"
      />
    );
    
    const editButton = screen.getByTitle('Edit');
    await user.click(editButton);
    
    const input = screen.getByDisplayValue('Test Value');
    await user.clear(input);
    await user.type(input, 'New Value');
    
    const saveButton = screen.getByTitle('Save');
    await user.click(saveButton);
    
    expect(mockSave).toHaveBeenCalledWith('New Value');
  });

  test('validates email format', async () => {
    const user = userEvent.setup();
    const mockSave = jest.fn().mockResolvedValue();
    
    render(
      <EditableField
        value=""
        onSave={mockSave}
        type="email"
        label="Email Field"
      />
    );
    
    const editButton = screen.getByTitle('Edit');
    await user.click(editButton);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'invalid-email');
    
    const saveButton = screen.getByTitle('Save');
    await user.click(saveButton);
    
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('MultiSelectField', () => {
  const mockOptions = ['Option 1', 'Option 2', 'Option 3'];

  test('renders with label and placeholder', () => {
    render(
      <MultiSelectField
        value={[]}
        onChange={jest.fn()}
        options={mockOptions}
        label="Test Multi Select"
        placeholder="Select options..."
      />
    );
    
    expect(screen.getByText('Test Multi Select')).toBeInTheDocument();
    expect(screen.getByText('Select options...')).toBeInTheDocument();
  });

  test('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectField
        value={[]}
        onChange={jest.fn()}
        options={mockOptions}
        label="Test Multi Select"
      />
    );
    
    const dropdown = screen.getByRole('button');
    await user.click(dropdown);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  test('selects and deselects options', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <MultiSelectField
        value={[]}
        onChange={mockOnChange}
        options={mockOptions}
        label="Test Multi Select"
      />
    );
    
    const dropdown = screen.getByRole('button');
    await user.click(dropdown);
    
    const option1 = screen.getByText('Option 1');
    await user.click(option1);
    
    expect(mockOnChange).toHaveBeenCalledWith(['Option 1']);
  });

  test('respects maxSelections limit', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <MultiSelectField
        value={['Option 1']}
        onChange={mockOnChange}
        options={mockOptions}
        maxSelections={1}
        label="Test Multi Select"
      />
    );
    
    const dropdown = screen.getByRole('button');
    await user.click(dropdown);
    
    const option2 = screen.getByText('Option 2');
    await user.click(option2);
    
    expect(screen.getByText('Maximum 1 selections allowed')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalledWith(['Option 1', 'Option 2']);
  });
});

describe('TimeSlotPicker', () => {
  test('renders with label', () => {
    render(
      <TimeSlotPicker
        value={{}}
        onChange={jest.fn()}
        label="Working Hours"
      />
    );
    
    expect(screen.getByText('Working Hours')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
  });

  test('toggles day availability', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <TimeSlotPicker
        value={{}}
        onChange={mockOnChange}
        label="Working Hours"
      />
    );
    
    const mondayCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(mondayCheckbox);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      monday: {
        available: true,
        slots: [{ start: '09:00', end: '17:00' }],
        breaks: []
      }
    });
  });

  test('expands day schedule when clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <TimeSlotPicker
        value={{
          monday: {
            available: true,
            slots: [{ start: '09:00', end: '17:00' }],
            breaks: []
          }
        }}
        onChange={jest.fn()}
        label="Working Hours"
      />
    );
    
    const mondayRow = screen.getByText('Monday').closest('div');
    await user.click(mondayRow);
    
    expect(screen.getByText('Time Slots')).toBeInTheDocument();
    expect(screen.getByText('Breaks')).toBeInTheDocument();
  });
});

describe('DocumentUploader', () => {
  test('renders with label and upload area', () => {
    render(
      <DocumentUploader
        value={[]}
        onChange={jest.fn()}
        label="Upload Documents"
      />
    );
    
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop files here/)).toBeInTheDocument();
  });

  test('validates file size', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    // Create a mock file that's too large
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf'
    });
    
    render(
      <DocumentUploader
        value={[]}
        onChange={mockOnChange}
        maxFileSize={10 * 1024 * 1024} // 10MB
        label="Upload Documents"
      />
    );
    
    const input = screen.getByRole('textbox', { hidden: true });
    await user.upload(input, largeFile);
    
    expect(screen.getByText(/is too large/)).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  test('validates file type', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    const invalidFile = new File(['content'], 'test.txt', {
      type: 'text/plain'
    });
    
    render(
      <DocumentUploader
        value={[]}
        onChange={mockOnChange}
        allowedTypes={['application/pdf']}
        label="Upload Documents"
      />
    );
    
    const input = screen.getByRole('textbox', { hidden: true });
    await user.upload(input, invalidFile);
    
    expect(screen.getByText(/has unsupported format/)).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  test('accepts valid files', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    const validFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf'
    });
    
    render(
      <DocumentUploader
        value={[]}
        onChange={mockOnChange}
        allowedTypes={['application/pdf']}
        label="Upload Documents"
      />
    );
    
    const input = screen.getByRole('textbox', { hidden: true });
    await user.upload(input, validFile);
    
    expect(mockOnChange).toHaveBeenCalled();
    const callArgs = mockOnChange.mock.calls[0][0];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0].name).toBe('test.pdf');
  });

  test('removes files when remove button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    const existingFile = {
      id: 'test-id',
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      status: 'success'
    };
    
    render(
      <DocumentUploader
        value={[existingFile]}
        onChange={mockOnChange}
        label="Upload Documents"
      />
    );
    
    const removeButton = screen.getByTitle('Remove file');
    await user.click(removeButton);
    
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});