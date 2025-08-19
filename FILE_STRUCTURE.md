# File and Folder Structure

This document lists the complete file and folder layout of the project.

## Frontend
```bash
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   ├── apiClient.js
│   │   └── openapi/
│   ├── app/
│   │   ├── App.jsx
│   │   └── AppRoutes.jsx
│   ├── components/
## Frontend
```bash
frontend/
├── public/
│   ├── index.html
│   └── vite.svg
├── src/
│   ├── api/
│   │   ├── apiClient.js
│   │   └── openapi/
│   ├── app/
│   │   ├── App.jsx
│   │   └── AppRoutes.jsx
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   │   ├── NavBar.jsx
│   │   │   └── Footer.jsx
│   │   └── widgets/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── authAPI.js
│   │   │   ├── authSlice.js
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   └── RegisterForm.jsx
│   │   │   └── hooks/
│   │   │       └── useAuth.js
│   │   ├── user/
│   │   │   ├── userAPI.js
│   │   │   ├── userSlice.js
│   │   │   └── components/
│   │   │       └── Profile.jsx
│   │   ├── prescription/
│   │   │   ├── prescriptionAPI.js
│   │   │   └── components/
│   │   │       ├── PrescriptionUpload.jsx
│   │   │       ├── PrescriptionViewer.jsx
│   │   │       └── FilePreview.jsx
│   │   ├── pharmacy/
│   │   │   ├── pharmacyAPI.js
│   │   │   └── components/
│   │   │       ├── PharmacyDiscovery.jsx
│   │   │       └── Fulfillment.jsx
│   │   ├── chat/
│   │   │   ├── chatAPI.js
│   │   │   ├── webrtcSignaling.js
│   │   │   └── components/
│   │   │       ├── ChatInterface.jsx
│   │   │       └── VideoConsultation.jsx
│   │   ├── payment/
│   │   │   ├── paymentAPI.js
│   │   │   └── components/
│   │   │       └── Payment.jsx
│   │   └── notification/
│   │       └── components/
│   │           └── NotificationList.jsx
│   ├── hooks/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── PatientDashboard.jsx
│   │   ├── PharmacyDashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── Orders.jsx
│   │   ├── PharmacyInventory.jsx
│   │   ├── PharmacyMatchings.jsx
│   │   ├── PharmacySettings.jsx
│   │   └── admin/
│   │       ├── UserManagement.jsx
│   │       ├── PharmacyValidation.jsx
│   │       ├── ChatMonitor.jsx
│   │       ├── VideoMonitor.jsx
│   │       ├── AIRules.jsx
│   │       ├── Transactions.jsx
│   │       └── Reports.jsx
│   ├── store/
│   │   ├── index.js
│   │   └── slices/
│   │       ├── authSlice.js
│   │       └── userSlice.js
│   ├── styles/
│   │   └── index.css
   ├── utils/
│   ├── main.jsx
   └── index.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── babel.config.js
├── eslint.config.js
├── index.html
├── jest.config.js
├── jest.setup.js
├── package.json
├── postcss.config.js
├── postcss.config.mjs
├── tailwind.config.js
├── vite.config.js
└── README.md
```
│   │   ├── PharmacyInventory.jsx
│   │   ├── PharmacyMatchings.jsx
│   │   ├── PharmacySettings.jsx
│   │   ├── admin/
│   │   │   ├── UserManagement.jsx
│   │   │   ├── PharmacyValidation.jsx
│   │   │   ├── ChatMonitor.jsx
│   │   │   ├── VideoMonitor.jsx
│   │   │   ├── AIRules.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── Reports.jsx
│   ├── store/
│   │   ├── index.js
│   │   └── slices/
│   ├── styles/
│   │   └── index.css
│   ├── utils/
│   ├── main.jsx
│   └── index.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── babel.config.js
├── eslint.config.js
├── jest.config.js
├── jest.setup.js
├── package.json
├── postcss.config.js
├── postcss.config.mjs
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Backend
```bash
backend/
├── babel.config.json
├── Dockerfile
├── eng.traineddata
├── INSTALLATION.md
├── package.json
├── server.js
├── server_minimal.js
├── TASK_6_COMPLETION.md
├── src/
│   ├── config/
│   │   ├── cloudinary.js
│   │   ├── database.js
│   │   └── redis.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── fileController.js
│   │   ├── OrderStatusController.js
│   │   ├── PaymentController.js
│   │   ├── pharmacyController.js
│   │   ├── PrescriptionController.js
│   │   ├── PrescriptionRequestController.js
│   │   └── twoFactorController.js
│   ├── middleware/
│   ├── models/
│   │   ├── AuditLog.js
│   │   ├── Inventory.js
│   │   ├── Order.js
│   │   ├── Pharmacy.js
│   │   ├── PrescriptionNote.js
│   │   ├── PrescriptionRequest.js
│   │   └── User.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── fileRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── pharmacyRoutes.js
│   │   ├── prescriptionRequestRoutes.js
│   │   ├── prescriptionRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   ├── templates/
│   └── utils/
└── uploads/
```
