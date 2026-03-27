import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProviders } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Donors } from './pages/Donors';
import { DonorDetail } from './pages/DonorDetail';
import { Deals } from './pages/Deals';
import { Programs } from './pages/Programs';
import { ProgramDetail } from './pages/ProgramDetail';
import { Donations } from './pages/Donations';
import { Expenses } from './pages/Expenses';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { NotFound } from './pages/NotFound';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/donors" element={<Donors />} />
        <Route path="/donors/:id" element={<DonorDetail />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/programs/:id" element={<ProgramDetail />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/donations" element={<Donations />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppProviders>
            <AppRoutes />
          </AppProviders>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
