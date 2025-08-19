# Form Components

This directory contains reusable form components designed for the doctor profile management feature. These components provide consistent UI/UX patterns with built-in validation, accessibility features, and responsive design.

## Components

### 1. EditableField

A versatile inline editing component that allows users to edit field values directly in the interface.

**Features:**
- Inline editing with click-to-edit functionality
- Built-in validation (email, phone, custom validators)
- Support for text inputs and textareas
- Real-time validation feedback
- Keyboard shortcuts (Enter to save, Escape to cancel)
- Loading states and error handling
- Customizable display and edit components

**Usage:**
```jsx
import { EditableField } from '@/components/forms';

<EditableField
  value={doctorProfile.firstName}
  onSave={(value) => updateProfile('firstName', value)}
  label="First Name"
  type="text"
  required
  validation={(value) => value.length >= 2 ? true : 'Name must be at least 2 characters'}
/>
```

**Props:**
- `value`: Current field value
- `onSave`: Function called when saving changes
- `type`: Input type ('text', 'email', 'tel', etc.)
- `validation`: Custom validation function
- `multiline`: Enable textarea mode
- `required`: Mark field as required
- `maxLength`: Maximum character limit

### 2. MultiSelectField

A dropdown component for selecting multiple options with search and custom option support.

**Features:**
- Multi-selection with visual chips
- Search/filter functionality
- Custom option creation
- Maximum selection limits
- Keyboard navigation
- Validation support
- Customizable option and selection renderers

**Usage:**
```jsx
import { MultiSelectField } from '@/components/forms';

<MultiSelectField
  value={selectedSpecializations}
  onChange={setSelectedSpecializations}
  options={availableSpecializations}
  label="Medical Specializations"
  maxSelections={3}
  allowCustom
  searchable
  required
/>
```

**Props:**
- `value`: Array of selected values
- `onChange`: Function called when selection changes
- `options`: Array of available options
- `maxSelections`: Maximum number of selections allowed
- `allowCustom`: Enable custom option creation
- `searchable`: Enable search functionality
- `validation`: Custom validation function

### 3. TimeSlotPicker

A comprehensive component for configuring weekly working hours and break times.

**Features:**
- Day-by-day availability configuration
- Multiple time slots per day
- Break time management
- Time format support (12/24 hour)
- Overlap detection and validation
- Copy schedule to all days
- Expandable day details
- Comprehensive validation

**Usage:**
```jsx
import { TimeSlotPicker } from '@/components/forms';

<TimeSlotPicker
  value={workingHours}
  onChange={setWorkingHours}
  label="Weekly Schedule"
  timeFormat="24"
  slotDuration={30}
  required
  validation={(schedule) => {
    // Custom validation logic
    return true;
  }}
/>
```

**Props:**
- `value`: Object containing weekly schedule
- `onChange`: Function called when schedule changes
- `timeFormat`: Time display format ('12' or '24')
- `slotDuration`: Default slot duration in minutes
- `allowOverlaps`: Allow overlapping time slots
- `required`: Require at least one available day

### 4. DocumentUploader

A drag-and-drop file upload component with progress tracking and validation.

**Features:**
- Drag and drop interface
- Multiple file support
- File type and size validation
- Upload progress tracking
- File preview capabilities
- Retry failed uploads
- Document management (view, delete)
- Comprehensive error handling

**Usage:**
```jsx
import { DocumentUploader } from '@/components/forms';

<DocumentUploader
  value={uploadedDocuments}
  onChange={setUploadedDocuments}
  onUpload={handleFileUpload}
  onDelete={handleFileDelete}
  label="Medical License Documents"
  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
  maxFiles={5}
  maxFileSize={10 * 1024 * 1024} // 10MB
  multiple
  required
/>
```

**Props:**
- `value`: Array of uploaded files
- `onChange`: Function called when file list changes
- `onUpload`: Function to handle file upload
- `onDelete`: Function to handle file deletion
- `accept`: Accepted file types
- `maxFiles`: Maximum number of files
- `maxFileSize`: Maximum file size in bytes
- `multiple`: Allow multiple file selection

## Common Features

All components share these common features:

- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Dark Mode**: Full dark mode support with proper contrast
- **Responsive Design**: Mobile-first responsive layout
- **Validation**: Built-in and custom validation support
- **Error Handling**: Comprehensive error states and messaging
- **Loading States**: Visual feedback during async operations
- **Customization**: Extensive prop-based customization options

## Styling

Components use Tailwind CSS classes and follow the design system:

- **Colors**: Emerald for primary actions, red for errors, gray for neutral elements
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standard padding and margin scales
- **Borders**: Rounded corners and consistent border styles
- **Shadows**: Subtle shadows for depth and hierarchy

## Requirements Mapping

These components fulfill the following requirements from the doctor profile management spec:

- **Requirement 1.2**: Personal information editing with validation
- **Requirement 3.2**: Specialization management with multi-select
- **Requirement 4.2**: Working hours configuration
- **Requirement 5.2**: Consultation mode settings

## Testing

Components include comprehensive test coverage:

- Unit tests for component rendering and behavior
- Integration tests for user interactions
- Validation testing for all input scenarios
- Accessibility testing for keyboard navigation and screen readers

## Demo

See `FormComponentsDemo.jsx` for a complete demonstration of all components with sample data and interactions.