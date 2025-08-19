# Advanced Frontend Task List

This document outlines the step-by-step tasks to scaffold and build a robust React frontend for the Unified Patient–Pharmacy–Practitioner System using Vite and TailwindCSS, fully integrated with the existing backend.

---

## 1. Project Setup

- [x] Initialize a new Vite React project:
  ```powershell
  cd frontend; npm create vite@latest . -- --template react
  ```
- [x] Install core dependencies:
  ```powershell
  npm install react-router-dom @reduxjs/toolkit react-redux axios
  npm install tailwindcss postcss autoprefixer --save-dev
  ```
- [x] Configure TailwindCSS:
  ```powershell
  npx tailwindcss init -p
  ```
  - Update `tailwind.config.js`:
    ```js
    module.exports = {
      content: ['./index.html', './src/**/*.{js,jsx}'],
      theme: { extend: {} },
      plugins: []
    }
    ```
  - Add imports to `src/index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```
- [x] Update `package.json` scripts:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "serve": "vite preview"  
  }
  ```

## 2. Recommended Folder Structure (Completed)

```
frontend/
├── public/                        # static HTML and assets
│   └── index.html
├── src/
│   ├── api/                       # API client, generated types, RTK Query services
│   │   ├── apiClient.js
│   │   └── openapi/               # generated Swagger/OpenAPI files
│   ├── app/                       # root application and routing
│   │   ├── App.jsx
│   │   └── AppRoutes.jsx
│   ├── features/                  # feature modules, domain-specific code
│   │   ├── auth/                  # authentication feature
│   │   │   ├── components/        # auth-specific UI components
│   │   │   ├── hooks/             # auth custom hooks
│   │   │   ├── authAPI.js         # RTK Query endpoints or service calls
│   │   │   └── authSlice.js       # Redux slice
│   │   ├── user/                  # user profile and settings
│   │   ├── prescription/          # upload and OCR flow
│   │   ├── pharmacy/              # discovery and matching
│   │   └── payment/               # payment integration
│   ├── components/                # shared/UI library components
│   │   ├── common/                # buttons, inputs, modals
│   │   ├── layout/                # header, footer, nav
│   │   └── widgets/               # reusable widgets
│   ├── hooks/                     # global custom React hooks
│   ├── store/                     # Redux Toolkit store setup
│   │   ├── index.js               # configureStore
│   │   └── slices/                # central slice directory
│   ├── utils/                     # helpers, constants, types
│   ├── assets/                    # images, icons, fonts
│   ├── theme/                     # Tailwind config overrides, design tokens
│   ├── styles/                    # global CSS (index.css)
│   └── main.jsx                   # root render, providers
└── tests/                         # unit, integration, e2e tests
    ├── unit/
    ├── integration/
    └── e2e/
 tests/e2e/**

## 2.3 Additional Pages & Components to Create

- [x] src/pages/Orders.jsx                     # Patient order history & records
- [x] src/pages/PharmacyInventory.jsx          # Pharmacy inventory management
- [x] src/pages/PharmacyMatchings.jsx          # Pharmacy prescription match requests
- [x] src/pages/PharmacySettings.jsx           # Pharmacy profile & settings
- [x] src/features/prescription/components/PrescriptionViewer.jsx  # OCR prescription viewer
- [x] src/features/pharmacy/components/Fulfillment.jsx         # Confirm fulfillment & delivery
- [x] src/pages/admin/UserManagement.jsx       # Admin manage users
- [x] src/pages/admin/PharmacyValidation.jsx   # Admin pharmacy intake validation
- [x] src/pages/admin/ChatMonitor.jsx          # Admin chat session monitor
- [x] src/pages/admin/VideoMonitor.jsx         # Admin video session monitor
- [x] src/pages/admin/AIRules.jsx              # Admin AI rules management
- [x] src/pages/admin/Transactions.jsx         # Admin transactions & logs
- [x] src/pages/admin/Reports.jsx              # Admin reports dashboard

## 2.1 Redux Toolkit Store Setup

- [x] Ensure `@reduxjs/toolkit` and `react-redux` are installed:
  ```powershell
  npm install @reduxjs/toolkit react-redux
  ```
- [x] Create `src/store/index.js`:
  ```js
  import { configureStore } from '@reduxjs/toolkit';
  import authReducer from './slices/authSlice';
  import userReducer from './slices/userSlice';

  export const store = configureStore({
    reducer: {
      auth: authReducer,
      user: userReducer,
      // ... add other slice reducers here
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
  ```
- [x] Wrap your app with the Redux Provider in `src/main.jsx`:
  ```js
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import { Provider } from 'react-redux';
  import { store } from './store';
  import App from './App';

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
  ```

## 3. Core Feature Development

 ### 3.1 Authentication

- [x] Build `Register` and `Login` pages under `src/pages/`
- [x] Create `authSlice` to manage JWT, user info, status flags
- [x] Protect routes using a `ProtectedRoute` component
- [x] Integrate 2FA flow: prompt OTP post-login (SMS/email)

 ### 3.2 Profile & Health History

- `Profile.jsx` to edit patient name, avatar, health history fields
- File upload component for avatar using Cloudinary-signed URLs
- Store chronologically in Redux & persist via `userService`

 ### 3.3 Prescription Upload & Processing

- [x] `PrescriptionUpload.jsx` with drag-and-drop + file preview
- [x] Trigger OCR request to backend via `prescriptionService`
- [x] Display extracted text for patient confirmation

### 3.4 Pharmacy Discovery & Matching

- [x] `PharmacyDiscovery.jsx` to show map (Google Maps React) and list
- [x] Call `pharmacyService.getNearby({ lat, lng })`
- [x] Rank and filter list client-side by rating, distance, availability

 ### 3.5 Real-time Chat & Video
 
 ### 3.0 Dashboard Routing
 - [x] Create a `Dashboard.jsx` that renders based on `user.role`: `PatientDashboard`, `PharmacyDashboard`, or `AdminDashboard` under `src/pages`.
 - [x] Update `AppRoutes.jsx` root path (`/`) to render `<ProtectedRoute><Dashboard/></ProtectedRoute>` instead of `Home`.

- [x] Use `socket.io-client` to connect to backend chat namespace
- [x] `ChatInterface.jsx` for message threads
- [x] Integrate WebRTC signaling via `webrtcSignaling.js` service
- [x] Build `VideoConsultation.jsx` component with mute/video controls

### 3.6 Payment Integration

- [x] Install `@stripe/stripe-js` and `@stripe/react-stripe-js`
- [x] Build `Payment.jsx` with Stripe Elements
- [x] Process payments via `paymentService.createPaymentIntent`

### 3.7 Notifications & Refill Reminders

- Leverage browser notifications
- Poll or subscribe to `notificationService`
- Build UI in header or dashboard for alerts

## 4. State Management & API Integration

- [x] Centralize API URLs and tokens in `apiClient.js`
- [x] Use Redux Toolkit `createAsyncThunk` for side effects
- [x] Handle loading, success, error states in slices
- [x] Implement global error handler (modals/toasts)

## 5. Styling & Theming

- [x] Leverage Tailwind CSS for utility-first styling
- [x] Create custom color palette in `tailwind.config.js`
- Use CSS modules or styled-components for scoped styles if needed

## 6. Testing & Quality

- Install Jest and React Testing Library
  ```powershell
  npm install --save-dev jest @testing-library/react @testing-library/jest-dom
  ```
- Write unit tests for slices and services
- Write integration tests for critical flows (login, upload)
- Add ESLint + Prettier and configure VSCode settings

## 7. CI/CD & Deployment

- [x] Add GitHub Actions workflow for lint, test, build
- [x] Configure environment variables (.env.development, .env.production)
- [x] Build static assets and serve via backend or CDN

## 8. Advanced Backend Integration & Operations

- Centralize API URL in `.env` as `VITE_API_URL` and access via `import.meta.env.VITE_API_URL`
- In `src/services/apiClient.js`:
  - Set `baseURL` to `VITE_API_URL`
  - Attach JWT from Redux in request interceptor
  - Handle 401 responses: automatically refresh tokens and retry
- Generate TypeScript API clients and hooks from the backend OpenAPI/Swagger spec using `openapi-generator-cli` or `swagger-typescript-api`
- Migrate data fetching to Redux Toolkit Query (RTK Query) for caching, automatic cache invalidation on mutations, and polling
- Add global error and performance monitoring with Sentry (`@sentry/react` and `@sentry/tracing`)
- Use React Hook Form combined with Yup for form management and map backend validation errors to form fields
- Integrate feature flagging (e.g., LaunchDarkly or Unleash) to control rollout of new UI and API features
- Implement WebSocket middleware or RTK Query subscriptions for real-time chat and prescription status updates with reconnection logic and deduplication

## 9. Testing & Quality Enhancement

- Write contract tests with Pact to validate REST API interactions against backend
- Implement end-to-end tests using Cypress covering full critical journeys: auth, prescription upload, matching, chat, video consult, payment
- Use MSW (Mock Service Worker) in unit and integration tests to simulate API responses, offline mode, and error scenarios
- Measure code coverage and enforce thresholds via GitHub Actions

## 2.2 File Manifest

Below is a comprehensive list of files to create under the above structure:

- public/index.html
- src/api/apiClient.js
- src/api/openapi/* (generated API schemas & clients)
- src/app/App.jsx
- src/app/AppRoutes.jsx

- src/features/auth/authAPI.js
- src/features/auth/authSlice.js
- src/features/auth/components/LoginForm.jsx
- src/features/auth/components/RegisterForm.jsx
- src/features/auth/hooks/useAuth.js

- src/features/user/userAPI.js
- src/features/user/userSlice.js
- src/features/user/components/Profile.jsx

- src/features/prescription/prescriptionAPI.js
- src/features/prescription/components/PrescriptionUpload.jsx
- src/features/prescription/components/FilePreview.jsx

- src/features/pharmacy/pharmacyAPI.js
- src/features/pharmacy/components/PharmacyDiscovery.jsx

- src/features/payment/paymentAPI.js
- src/features/payment/components/Payment.jsx

- src/components/common/Button.jsx
- src/components/common/Input.jsx
- src/components/layout/Header.jsx
- src/components/layout/Footer.jsx
- src/components/widgets/*

- src/hooks/useFetch.js (example shared hook)

- src/store/index.js
- src/store/slices/authSlice.js
- src/store/slices/userSlice.js

- src/utils/constants.js
- src/utils/apiUtils.js

- src/theme/tailwind.config.js
- src/styles/index.css

- src/main.jsx

- tests/unit/**
- tests/integration/**
- tests/e2e/**

---

> **Note:** Ensure CORS settings on the Express backend allow requests from the Vite dev server and production domain. Use `dotenv` on both ends to manage API endpoints and secrets.
