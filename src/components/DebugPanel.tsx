import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function DebugPanel() {
  const { user, token, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        setTokenInfo({
          ...payload,
          isExpired: payload.exp < now,
          expiresIn: Math.max(0, Math.round((payload.exp - now) / 60)),
        });
      } catch (e) {
        setTokenInfo({ error: 'Invalid token' });
      }
    } else {
      setTokenInfo(null);
    }
  }, [token]);

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-blue-700"
      >
        🐛 Debug
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-white border border-gray-300 rounded-lg shadow-xl p-4 text-xs">
          <div className="space-y-2">
            <div>
              <strong>Auth Status:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </div>
            
            {user && (
              <div>
                <strong>User:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            )}
            
            {token && (
              <div>
                <strong>Token:</strong>
                <div className="bg-gray-100 p-2 rounded mt-1 break-all">
                  {token.substring(0, 50)}...
                </div>
              </div>
            )}
            
            {tokenInfo && (
              <div>
                <strong>Token Info:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                  {JSON.stringify(tokenInfo, null, 2)}
                </pre>
                {tokenInfo.isExpired && (
                  <div className="text-red-600 font-bold mt-1">
                    ⚠️ TOKEN EXPIRED - Please log in again!
                  </div>
                )}
                {tokenInfo.expiresIn !== undefined && !tokenInfo.isExpired && (
                  <div className="text-green-600 mt-1">
                    ⏱️ Expires in {tokenInfo.expiresIn} minutes
                  </div>
                )}
              </div>
            )}
            
            {!token && (
              <div className="text-red-600">
                ⚠️ No token found - Please log in!
              </div>
            )}
            
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full bg-red-500 text-white px-3 py-2 rounded mt-2 hover:bg-red-600"
            >
              Clear Storage & Re-login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
