import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogOut, Package } from 'lucide-react';

export function PortalLayout() {
  const { signOut, clientProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navbar */}
      <header className="bg-surface-card border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Package size={24} />
          <span>Portal de Clientes</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-text">{clientProfile?.name || 'Cliente'}</span>
            <span className="text-xs text-text-muted">{clientProfile?.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-text-muted hover:text-danger hover:bg-danger-bg rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
