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

import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { ClientPortal } from './pages/portal/ClientPortal';
import { LandingPage } from './pages/LandingPage';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Fresh immediately to trigger background updates
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component for Employees (Admin/Emprendedora)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, clientProfile, isInitialized } = useAuthStore();
  
  if (!isInitialized) return <div className="loading-screen">Cargando...</div>;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // SEGURIDAD: Solo admin y emprendedora pueden entrar a /admin
  const isEmployee = profile && (profile.role === 'admin' || profile.role === 'emprendedora');

  if (!isEmployee) {
    // Si es un cliente, lo mandamos a su portal
    if (clientProfile || profile?.role === 'cliente') {
      return <Navigate to="/portal" replace />;
    }
  }
  
  // Si no es nada, bloqueamos acceso
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8 text-center">
        <div className="max-w-md p-8 border border-red-900/30 bg-red-900/10 rounded-lg">
          <h1 className="text-red-500 font-black text-2xl mb-4">ACCESO RESTRINGIDO</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tu cuenta no tiene permisos de administrador o colaborador. 
            Si crees que esto es un error, contacta al soporte técnico de Punto Diseño.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="mt-6 px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
          >
            VOLVER AL LOGIN
          </button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Protected Route Component for Clients
const ClientProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, clientProfile, isInitialized } = useAuthStore();
  
  if (!isInitialized) return <div className="loading-screen">Cargando...</div>;
  
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Si es un empleado intentando entrar al portal de clientes (opcionalmente lo dejamos, pero mejor redirigir al CRM)
  if (profile && !clientProfile && profile.role !== 'cliente') {
     // Podemos permitir que los admins vean el portal si queremos, pero por ahora redirigimos.
    return <Navigate to="/admin" replace />;
  }

  if (!clientProfile && profile?.role !== 'cliente') {
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
            {/* Ruta Pública: Landing Page */}
            <Route path="/" element={<LandingPage />} />

            <Route path="/login" element={<Login />} />
            
            {/* Rutas Internas del CRM (Empleados) - Ahora bajo /admin */}
            <Route path="/admin" element={
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

              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Rutas del Portal de Clientes */}
            <Route path="/portal" element={
              <ClientProtectedRoute>
                <PortalLayout />
              </ClientProtectedRoute>
            }>
              <Route index element={<ClientPortal />} />
            </Route>

          </Routes>
        </Router>
      </SystemSettingsProvider>
    </QueryClientProvider>
  );
}
