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
        <div className="sidebar-header" style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            {logoUrl ? (
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem', color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                {appName.charAt(0)}
              </div>
            )}
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1, flex: 1 }}>
              {appName}
            </h2>
            <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          {profile && (
            <span className="badge-role" style={{ 
              background: 'color-mix(in srgb, var(--primary-color), transparent 85%)',
              color: 'var(--primary-color)',
              padding: '0.35rem 0.75rem',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              borderRadius: '8px',
              border: '1px solid color-mix(in srgb, var(--primary-color), transparent 70%)',
              display: 'inline-block'
            }}>
              {profile.role === 'admin' ? 'Administradora' : 'Emprendedora'}
            </span>
          )}
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
