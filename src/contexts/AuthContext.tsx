import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import { apiClient } from '../lib/api-client';
import type { User, LoginRequest, RegisterRequest } from '../lib/types';
import { disableLocalPushSubscription } from '../lib/browser-notifications';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ONBOARDING_COMPLETE_KEY = 'crm_onboarding_complete';
const ONBOARDING_PENDING_KEY = 'crm_onboarding_pending';

function onboardingKey(user: Pick<User, 'tenantId' | 'id'>, key: string): string {
  return `${key}:${user.tenantId}:${user.id}`;
}

function markExistingAccountOnboardingComplete(user: User) {
  localStorage.setItem(onboardingKey(user, ONBOARDING_COMPLETE_KEY), 'true');
  localStorage.removeItem(onboardingKey(user, ONBOARDING_PENDING_KEY));
}

function markNewAccountOnboardingPending(user: User) {
  localStorage.setItem(onboardingKey(user, ONBOARDING_PENDING_KEY), 'true');
  localStorage.removeItem(onboardingKey(user, ONBOARDING_COMPLETE_KEY));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and user on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser) as Partial<User>;
        setUser({
          id: parsedUser.id || '',
          firstName: parsedUser.firstName || '',
          lastName: parsedUser.lastName || '',
          email: parsedUser.email || '',
          role: parsedUser.role || 'USER',
          tenantId: parsedUser.tenantId || '',
          tenantName: parsedUser.tenantName || parsedUser.tenant?.name || 'Workspace',
          tenantSlug: parsedUser.tenantSlug || parsedUser.tenant?.slug || '',
          tenantTier: parsedUser.tenantTier || parsedUser.tenant?.tier || 'FREE',
          permissions: parsedUser.permissions || [],
          dataScopes: parsedUser.dataScopes || [],
          tenant: {
            id: parsedUser.tenant?.id || parsedUser.tenantId || '',
            name: parsedUser.tenant?.name || parsedUser.tenantName || 'Workspace',
            slug: parsedUser.tenant?.slug || parsedUser.tenantSlug || '',
            tier: parsedUser.tenant?.tier || parsedUser.tenantTier || 'FREE',
          },
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    const validateSession = async () => {
      try {
        const response = await apiClient.get('/api/v1/account/profile');
        if (isCancelled) {
          return;
        }

        const profile = response.data;
        setUser((current) => {
          if (!current) {
            return current;
          }

          const nextUser: User = {
            ...current,
            firstName: profile.firstName || current.firstName,
            lastName: profile.lastName || current.lastName,
            email: profile.email || current.email,
            role: profile.role || current.role,
            tenantId: profile.tenantId || current.tenantId,
            tenantName: profile.tenantName || current.tenantName,
            tenantSlug: profile.tenantSlug || current.tenantSlug,
            tenantTier: profile.tenantTier || current.tenantTier,
            permissions: profile.permissions || current.permissions || [],
            dataScopes: profile.dataScopes || current.dataScopes || [],
            tenant: {
              id: profile.tenantId || current.tenant.id,
              name: profile.tenantName || current.tenant.name,
              slug: profile.tenantSlug || current.tenant.slug,
              tier: profile.tenantTier || current.tenant.tier,
            },
          };
          localStorage.setItem('user', JSON.stringify(nextUser));
          return nextUser;
        });
      } catch (error: any) {
        if (isCancelled) {
          return;
        }

        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('ai_user_id');
          setToken(null);
          setUser(null);

          const path = window.location.pathname;
          if (path !== '/login' && path !== '/signup' && path !== '/reset-password') {
            window.location.href = '/login?reason=session-reset';
          }
        }
      }
    };

    void validateSession();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      const user: User = {
        id: response.userId,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        role: response.role,
        tenantId: response.tenantId,
        tenantName: response.tenantName,
        tenantSlug: response.tenantSlug,
        tenantTier: response.tenantTier,
        permissions: response.permissions || [],
        dataScopes: response.dataScopes || [],
        tenant: {
          id: response.tenantId,
          name: response.tenantName,
          slug: response.tenantSlug,
          tier: response.tenantTier,
        },
      };
      setToken(response.accessToken);
      setUser(user);
      localStorage.removeItem('ai_user_id');
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      markExistingAccountOnboardingComplete(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      const user: User = {
        id: response.userId,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        role: response.role,
        tenantId: response.tenantId,
        tenantName: response.tenantName,
        tenantSlug: response.tenantSlug,
        tenantTier: response.tenantTier,
        permissions: response.permissions || [],
        dataScopes: response.dataScopes || [],
        tenant: {
          id: response.tenantId,
          name: response.tenantName,
          slug: response.tenantSlug,
          tier: response.tenantTier,
        },
      };
      setToken(response.accessToken);
      setUser(user);
      localStorage.removeItem('ai_user_id');
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      markNewAccountOnboardingPending(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    authApi.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('ai_user_id');
    localStorage.removeItem('crm_onboarding');
    localStorage.removeItem('crm_onboarding_step');
    localStorage.removeItem('crm_onboarding_complete');
    void disableLocalPushSubscription();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const nextUser: User = {
        ...current,
        ...updates,
        tenant: {
          ...current.tenant,
          id: updates.tenant?.id || updates.tenantId || current.tenant.id,
          name: updates.tenant?.name || updates.tenantName || current.tenant.name,
          slug: updates.tenant?.slug || updates.tenantSlug || current.tenant.slug,
          tier: updates.tenant?.tier || updates.tenantTier || current.tenant.tier,
        },
        permissions: updates.permissions || current.permissions || [],
        dataScopes: updates.dataScopes || current.dataScopes || [],
      };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
