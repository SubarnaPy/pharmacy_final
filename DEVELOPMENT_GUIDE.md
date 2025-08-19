# Patient Pharmacy System - Development Guide

## Quick Start

### Frontend Development Server
```bash
cd frontend
npm run dev
```
Server runs on: http://localhost:5173

### Backend Development Server
```bash
cd backend
npm run dev
```
Server runs on: http://localhost:3000

## Patient Dashboard Features

The Patient Dashboard now includes a comprehensive sidebar navigation with all 11 patient functionalities:

### 🏠 Dashboard Overview
- Quick stats and recent activity
- Upcoming appointments and reminders
- Health metrics at a glance

### 👤 Profile Management
- Personal information updates
- Health history tracking
- Emergency contacts
- Insurance information

### 📤 Prescription Upload
- Upload prescription images with OCR processing
- Smart text extraction using Tesseract.js
- Form validation and error handling
- Progress tracking

### 🏪 Pharmacy Search
- Location-based pharmacy finder
- Google Maps integration
- Pharmacy details and ratings
- Distance calculation

### 📹 Virtual Consultations
- Book consultations with pharmacists
- Video call integration
- Consultation history
- Real-time chat

### 🔁 Refill Reminders
- Smart medication reminders
- Custom scheduling options
- Multiple reminder types
- Status tracking

### 📦 Order Tracking
- Real-time order status updates
- Delivery tracking
- Order history
- Prescription fulfillment progress

### 💳 Payment Management
- Stripe payment integration
- Payment history
- Billing information
- Transaction records

### 💬 Chat System
- Real-time messaging with pharmacies
- File sharing capabilities
- Message history
- Notification system

## Testing the Application

### 1. User Registration & Login
- Navigate to `/register` to create a new account
- Use `/login` to access existing account
- Email verification flow available

### 2. Dashboard Navigation
- Access `/dashboard` after login
- Use sidebar navigation to switch between sections
- Mobile-responsive design with collapsible sidebar

### 3. API Integration
- All components use the comprehensive `patientAPI.js` client
- Error handling with toast notifications
- Loading states and progress indicators

## Development Features

### State Management
- Redux Toolkit for global state
- Authentication context
- Dark mode toggle
- Responsive design system

### UI/UX Features
- Modern glass morphism design
- Tailwind CSS styling
- Heroicons for consistent iconography
- Toast notifications for user feedback
- Loading spinners and progress bars
- Mobile-first responsive design

### API Architecture
- RESTful endpoints
- JWT authentication
- Error handling middleware
- File upload capabilities
- Real-time features with Socket.io

## Component Structure

```
src/
├── components/patient/
│   ├── UserProfile.jsx
│   ├── HealthHistory.jsx
│   ├── PrescriptionUpload.jsx
│   ├── PharmacySearch.jsx
│   ├── ConsultationBook.jsx
│   ├── RefillReminders.jsx
│   ├── OrderTracking.jsx
│   └── PaymentManagement.jsx
├── api/
│   └── patientAPI.js
├── utils/
│   └── toast.js
└── pages/
    └── PatientDashboard.jsx
```

## Next Steps

1. **Test all components** - Navigate through each section and test functionality
2. **API connections** - Verify backend integration for each feature
3. **Authentication** - Test user registration and login flows
4. **Mobile responsiveness** - Test on different screen sizes
5. **Error handling** - Test error scenarios and toast notifications

## Database Requirements

Make sure MongoDB is running for full functionality:
- User profiles and authentication
- Prescription records
- Order tracking
- Chat messages
- Appointment scheduling

## Environment Variables

Backend `.env` file should include:
```
MONGODB_URI=mongodb://localhost:27017/pharmacy-system
JWT_SECRET=your-jwt-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
STRIPE_SECRET_KEY=your-stripe-secret
```

The application is now ready for comprehensive testing and development!
