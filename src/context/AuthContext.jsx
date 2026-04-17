import { createContext, useState, useContext, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authData, setAuthData] = useState(() => {
    try {
      // sessionStorage clears automatically when the browser/tab is closed,
      // so reopening always lands on the login page.
      const s = sessionStorage.getItem('fundzola_auth');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  // Listen for forced logout fired by api.js when refresh token is invalid/expired
  useEffect(() => {
    const handle = () => { setAuthData(null); };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  const login = useCallback((data) => {
    sessionStorage.setItem('fundzola_auth', JSON.stringify(data));
    setAuthData(data);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('fundzola_auth');
    setAuthData(null);
  }, []);

  const isAdmin = authData?.user?.role === 'admin';

  const hasPermission = useCallback((module, action = 'can_view') => {
    if (!authData) return false;
    if (isAdmin) return true;
    const perm = (authData.permissions || []).find(p => p.module === module);
    return perm ? Boolean(perm[action]) : false;
  }, [authData, isAdmin]);

  // Support both old shape { token } and new shape { accessToken }
  const token = authData?.accessToken || authData?.token || null;

  return (
    <AuthContext.Provider value={{
      user:            authData?.user || null,
      token,
      permissions:     authData?.permissions || [],
      isAuthenticated: Boolean(token),
      isAdmin,
      hasPermission,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
