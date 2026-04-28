import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { SystemSettingsProvider } from './context/SystemSettingsContext';
import { AppLayout } from './components/layout/AppLayout';
import { PortalLayout } from './components/layout/PortalLayout';
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
import { PortalDashboard } from './pages/portal/PortalDashboard';

const queryClient = new QueryClient();

// Protected Route Component for Employees (Admin/Emprendedora)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, clientProfile, isInitialized } = useAuthStore();
  
  if (!isInitialized) return <div className="loading-screen">Cargando...</div>;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Si es un cliente, no puede entrar al CRM, lo mandamos al portal
  if (clientProfile && !profile) {
    return <Navigate to="/portal" replace />;
  }
  
  return <>{children}</>;
};

// Protected Route Component for Clients
const ClientProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, clientProfile, isInitialized } = useAuthStore();
  
  if (!isInitialized) return <div className="loading-screen">Cargando...</div>;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Si es un empleado intentando entrar al portal de clientes (opcionalmente lo dejamos, pero mejor redirigir al CRM)
  if (profile && !clientProfile) {
     // Podemos permitir que los admins vean el portal si queremos, pero por ahora redirigimos.
    return <Navigate to="/" replace />;
  }

  if (!clientProfile) {
    return <div className="p-8 text-center text-danger">No tienes acceso al portal de clientes. Comunícate con Punto Diseño.</div>;
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
      <SystemSettingsProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Rutas Internas del CRM (Empleados) */}
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
            </Route>

            {/* Rutas del Portal de Clientes */}
            <Route path="/portal" element={
              <ClientProtectedRoute>
                <PortalLayout />
              </ClientProtectedRoute>
            }>
              <Route index element={<PortalDashboard />} />
            </Route>

          </Routes>
        </Router>
      </SystemSettingsProvider>
    </QueryClientProvider>
  );
}
