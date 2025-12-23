import React from 'react';
import ReactDOM from 'react-dom/client';
import "./index.css"
import App from './App';
import { BrowserRouter } from "react-router-dom";
// 1. You must import QueryClientProvider separately
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 2. Capitalize QueryClient for standard naming (optional but recommended)
const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 3. Use QueryClientProvider here */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);