import { createContext, useState, useContext, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authData, setAuthData] = useState(() => {
    try {
      const s = localStorage.getItem('fundzola_auth');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const login = useCallback((data) => {
    localStorage.setItem('fundzola_auth', JSON.stringify(data));
    setAuthData(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fundzola_auth');
    setAuthData(null);
  }, []);

  const isAdmin = authData?.user?.role === 'admin';

  /** Check if the logged-in user has a given permission on a module.
   *  Admins always return true.  action = 'can_view' | 'can_create' | 'can_edit' | 'can_delete' */
  const hasPermission = useCallback((module, action = 'can_view') => {
    if (!authData) return false;
    if (isAdmin) return true;
    const perm = (authData.permissions || []).find(p => p.module === module);
    return perm ? Boolean(perm[action]) : false;
  }, [authData, isAdmin]);

  return (
    <AuthContext.Provider value={{
      user: authData?.user || null,
      token: authData?.token || null,
      permissions: authData?.permissions || [],
      isAuthenticated: Boolean(authData?.token),
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
