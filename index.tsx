
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Global error handler to capture boot-up issues in production
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global System Error:", message, "at", source, lineno, colno);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical: Root element #root not found in DOM.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Swiss Intelligence Dashboard initialized successfully.");
  } catch (err) {
    console.error("Failed to render React application:", err);
  }
}
