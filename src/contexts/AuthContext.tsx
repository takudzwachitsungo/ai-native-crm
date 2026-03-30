import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import type { User, LoginRequest, RegisterRequest } from '../lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        tenant: {
          id: response.tenantId,
          name: response.tenantName,
          slug: response.tenantSlug,
          tier: response.tenantTier,
        },
      };
      setToken(response.accessToken);
      setUser(user);
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(user));
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
        tenant: {
          id: response.tenantId,
          name: response.tenantName,
          slug: response.tenantSlug,
          tier: response.tenantTier,
        },
      };
      setToken(response.accessToken);
      setUser(user);
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
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
