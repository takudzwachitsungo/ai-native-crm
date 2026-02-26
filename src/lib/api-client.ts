import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors (401 Unauthorized or 403 Forbidden)
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired, invalid, or insufficient permissions
      console.warn('Authentication failed:', error.response?.status, error.response?.data?.message);
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        // Show alert before redirecting
        const message = error.response?.status === 401 
          ? 'Your session has expired. Please sign in again.'
          : 'Access denied. Please check your permissions.';
        
        alert(message);
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
