import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Paths that should never send a Bearer token or trigger session-clearing
const AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register'];

function isAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((p) => url.includes(p));
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    // Never attach a token to login/register — it can only cause interference
    if (!isAuthRequest(config.url)) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track whether we are already redirecting to avoid cascading alerts
let isRedirectingToLogin = false;
// Track whether a token refresh is in progress to avoid parallel refreshes
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    // Never intercept auth endpoint errors — let the calling Login/Signup page handle them
    if (isAuthRequest(error.config?.url)) {
      return Promise.reject(error);
    }

    // Handle 401 — attempt token refresh before redirecting
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        if (isRefreshing) {
          // Another refresh is in progress — queue this request
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const newToken = response.data.accessToken;
          const newRefreshToken = response.data.refreshToken;

          localStorage.setItem('token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          isRefreshing = false;
          onTokenRefreshed(newToken);

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];
          // Refresh failed — fall through to session clear
        }
      }
    }

    // Handle authentication errors (401 Unauthorized or 403 Forbidden)
    if (status === 401 || status === 403) {
      console.warn('Authentication failed:', status, error.response?.data?.message);

      // If onboarding is still in progress, don't nuke the session —
      // background dashboard requests may fail but the user hasn't
      // finished setup yet. Just silently reject.
      const onboardingComplete = localStorage.getItem('crm_onboarding_complete');
      if (onboardingComplete !== 'true') {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Redirect once, skip if already redirecting or already on login/signup
      const path = window.location.pathname;
      if (!isRedirectingToLogin && path !== '/login' && path !== '/signup') {
        isRedirectingToLogin = true;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
