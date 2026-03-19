import { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { LogOut, LayoutDashboard, Users, UserPlus, Package, ShoppingCart, FileText, Truck, Menu, X, Settings, History as HistoryIcon, BarChart } from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  const { profile, signOut } = useAuthStore();
  const { settings } = useSystemSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const branding = settings?.branding;
  const logoUrl = branding?.logo_url;
  const appName = branding?.app_name || 'CRMPunto';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} />, show: true },
    { path: '/clients', label: 'Clientes', icon: <Users size={18} />, show: true },
    { path: '/pipeline', label: 'Pedidos', icon: <ShoppingCart size={18} />, show: true },
    { path: '/history', label: 'Historial', icon: <HistoryIcon size={18} />, show: true },
    { path: '/reports', label: 'Reportes', icon: <BarChart size={18} />, show: profile?.role === 'admin' },
    { path: '/catalog', label: 'Catálogo', icon: <Package size={18} />, show: profile?.role === 'admin' },
    { path: '/suppliers', label: 'Proveedores', icon: <Truck size={18} />, show: profile?.role === 'admin' },
    { path: '/users', label: 'Equipo', icon: <UserPlus size={18} />, show: profile?.role === 'admin' },
    { path: '/invoices', label: 'Facturación', icon: <FileText size={18} />, show: true },
    { path: '/settings', label: 'Configuración', icon: <Settings size={18} />, show: profile?.role === 'admin' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '24px', width: 'auto' }} />}
          <span className="mobile-title">{appName}</span>
        </div>
        <span className="badge-role">{profile?.role || 'Emprendedora'}</span>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ height: '32px', width: 'auto', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', background: 'var(--primary-color)', borderRadius: '8px' }} />
              )}
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{appName}</h2>
            </div>
            <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <span className="user-role badge-role">{profile?.role === 'admin' ? 'Administradora' : 'Emprendedora'}</span>
        </div>
        
        <nav className="sidebar-nav">
          {navLinks.filter(l => l.show).map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-item ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{profile?.full_name || 'Usuario'}</span>
          </div>
          <button onClick={signOut} className="btn btn-outline btn-logout">
            <LogOut size={18} /> Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
