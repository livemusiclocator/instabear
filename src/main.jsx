import React from 'react'
import ReactDOM from 'react-dom/client'
import InstagramGallery from './instagramgallery.jsx'
import './index.css'
import { config } from './config.js'

// Log environment variables on startup
console.log('Application starting...');
console.log('Environment variables:', {
  MODE: import.meta.env.MODE,
  BASE_URL: import.meta.env.BASE_URL,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  // Add our custom environment variables
  VITE_GITHUB_TOKEN: config.GITHUB_TOKEN ? 'present' : 'missing',
  VITE_INSTAGRAM_ACCESS_TOKEN: config.INSTAGRAM_ACCESS_TOKEN ? 'present' : 'missing',
  VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID: config.INSTAGRAM_BUSINESS_ACCOUNT_ID ? 'present' : 'missing',
  ADMIN_TOKEN: config.ADMIN_TOKEN ? 'present' : 'missing',
});

// Error boundary for development
if (import.meta.env.DEV) {
  window.onerror = (msg, url, lineNo, columnNo, error) => {
    console.error('Global error:', { msg, url, lineNo, columnNo, error });
    return false;
  };
}

// Get root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found! Ensure index.html has a div with id="root"');
} else {
  console.log('Root element found, mounting React app...');
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <InstagramGallery />
      </React.StrictMode>
    );
    console.log('React app mounted successfully');
  } catch (error) {
    console.error('Failed to mount React app:', error);
  }
}
