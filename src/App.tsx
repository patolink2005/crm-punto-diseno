import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Catalog } from './pages/Catalog';
import { Pipeline } from './pages/Pipeline';
import { Invoices } from './pages/Invoices';
import { Users } from './pages/Users';
import { Suppliers } from './pages/Suppliers';
import { Settings } from './pages/Settings';
import { OrderHistory } from './pages/OrderHistory';
import { Reports } from './pages/Reports';

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isInitialized } = useAuthStore();
  
  if (!isInitialized) return <div className="loading-screen">Cargando...</div>;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="users" element={<Users />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="history" element={<OrderHistory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            {/* Add more routes here like /others */}
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
