import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReactDOM from "react-dom/client";

import './index.css'
import App from './App.jsx'
import { DarkModeProvider } from './app/DarkModeContext';
import { Provider } from 'react-redux';
import { store } from './store';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// Import Google Fonts
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap';
// link.rel = 'stylesheet';
document.head.appendChild(link);

const root = ReactDOM.createRoot(document.getElementById("root"));
import { checkAuthStatus } from './features/auth/authSlice';

// Restore auth state on app load
store.dispatch(checkAuthStatus());

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <DarkModeProvider>
        <App />
      </DarkModeProvider>
    </Provider>
  </React.StrictMode>
)
