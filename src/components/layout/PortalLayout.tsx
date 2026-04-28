
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogOut, Package } from 'lucide-react';
import '../../pages/portal/Portal.css'; // Import newly created CSS

export function PortalLayout() {
  const { signOut, clientProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="portal-layout">
      {/* Top Navbar */}
      <header className="portal-header">
        <div className="portal-brand">
          <div className="portal-brand-icon">
            <Package size={24} />
          </div>
          <span>Portal de Clientes</span>
        </div>
        
        <div className="portal-header-actions">
          <div className="portal-user-info">
            <span className="portal-user-name">{clientProfile?.name || 'Cliente'}</span>
            <span className="portal-user-email">{clientProfile?.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="btn-icon-danger"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="portal-main">
        <Outlet />
      </main>
    </div>
  );
}
