import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  FileText, 
  Truck, 
  Menu, 
  X, 
  Settings, 
  History as HistoryIcon, 
  BarChart,
  ChevronRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';


export function AppLayout() {
  const { profile, signOut } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    const fullPath = path === '' ? '/admin' : `/admin/${path}`;
    if (path === '') return location.pathname === '/admin';
    return location.pathname.startsWith(fullPath);
  };

  const navLinks = [
    { path: '', label: 'Dashboard', icon: <LayoutDashboard size={18} />, show: true },
    { path: 'clients', label: 'Clientes', icon: <Users size={18} />, show: true },
    { path: 'pipeline', label: 'Pedidos', icon: <ShoppingCart size={18} />, show: true },
    { path: 'history', label: 'Historial', icon: <HistoryIcon size={18} />, show: true },
    { path: 'reports', label: 'Reportes', icon: <BarChart size={18} />, show: profile?.role === 'admin' },
    { path: 'audit', label: 'Auditoría', icon: <ShieldAlert size={18} />, show: profile?.role === 'admin' },
    { path: 'catalog', label: 'Catálogo', icon: <Package size={18} />, show: profile?.role === 'admin' },
    { path: 'suppliers', label: 'Proveedores', icon: <Truck size={18} />, show: profile?.role === 'admin' },
    { path: 'users', label: 'Usuarios', icon: <Users size={18} />, show: profile?.role === 'admin' },
    { path: 'invoices', label: 'Facturación', icon: <FileText size={18} />, show: true },
    { path: 'settings', label: 'Ajustes', icon: <Settings size={18} />, show: profile?.role === 'admin' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-80 bg-black border-r border-white/5 fixed inset-y-0 z-40 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Logo Section - Fixed */}
          <div className="p-10 pb-6">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black tracking-tighter uppercase">
                PUNTO<span className="text-industrial-cyan">DISEÑO</span>
              </span>
              <div className="h-1 w-12 bg-industrial-cyan/50 rounded-full" />
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-10 py-4 custom-scrollbar scrollbar-visible">
            {/* User Profile Section */}
            <div className="mb-10">
              <div className="relative group p-5 bg-white/[0.03] border border-white/10 rounded-[2rem] flex items-center gap-4 hover:bg-white/[0.05] transition-all duration-500 shadow-xl shadow-black/40">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-industrial-cyan/20 to-industrial-magenta/20 border border-white/10 flex items-center justify-center text-industrial-cyan font-black text-xl shadow-[0_0_20px_rgba(0,210,255,0.1)] group-hover:scale-105 transition-transform duration-500">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black border border-white/10 rounded-full flex items-center justify-center text-[8px] text-green-500 shadow-lg">
                    <ShieldCheck size={10} strokeWidth={3} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-widest text-white truncate group-hover:text-industrial-cyan transition-colors">
                    {profile?.full_name || 'Cargando...'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-industrial-cyan animate-pulse" />
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black">
                      {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'emprendedora' ? 'Colaborador' : 'Usuario'}
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-4 mt-4 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 hover:bg-industrial-magenta/10 hover:border-industrial-magenta/20 hover:text-industrial-magenta transition-all duration-500 group"
              >
                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> 
                Cerrar Sesión
              </button>
            </div>

            <nav className="space-y-3 pb-10">
              {navLinks.filter(l => l.show).map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group flex items-center justify-between px-6 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                    isActive(link.path) 
                      ? 'bg-industrial-cyan text-black shadow-[0_10px_20px_rgba(0,210,255,0.15)] scale-[1.02]' 
                      : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={isActive(link.path) ? 'text-black' : 'text-gray-600 group-hover:text-industrial-cyan transition-colors'}>
                      {link.icon}
                    </span>
                    {link.label}
                  </div>
                  {isActive(link.path) && <ChevronRight size={14} strokeWidth={3} />}
                </Link>
              ))}
            </nav>
          </div>

          {/* Fixed Footer */}
          <div className="p-10 pt-4 border-t border-white/5 bg-black/50 backdrop-blur-sm">
            <div className="text-center flex flex-col gap-2">
              <div className="space-y-1">
                <span className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">© 2026 PUNTO DISEÑO</span>
                <span className="block text-[8px] font-bold text-gray-700 uppercase tracking-[0.2em]">Desarrollado por</span>
                <span className="block text-[9px] font-black text-industrial-cyan uppercase tracking-[0.4em]">PATOLINK2005</span>
              </div>
              <span className="block text-[7px] font-black text-gray-900 uppercase tracking-[0.5em] mt-2">v2.4.0 Industrial</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full z-40 bg-black/80 backdrop-blur-xl border-b border-white/5 p-6 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter uppercase leading-none">
            PUNTO<span className="text-industrial-cyan">DISEÑO</span>
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-industrial-cyan mt-1">
            {profile?.full_name || '...'} — {profile?.role?.toUpperCase() || 'USUARIO'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSignOut}
            className="p-3 bg-white/5 border border-white/10 rounded-xl text-industrial-magenta hover:bg-industrial-magenta/10 transition-all"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 bg-black p-10 shadow-2xl animate-in slide-in-from-left duration-500 flex flex-col">
            <div className="flex justify-between items-center mb-16">
              <span className="text-xl font-black tracking-tighter uppercase">
                PUNTO<span className="text-industrial-cyan">DISEÑO</span>
              </span>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <nav className="space-y-4 flex-1">
              {navLinks.filter(l => l.show).map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-5 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                    isActive(link.path) 
                      ? 'bg-industrial-cyan text-black shadow-lg shadow-industrial-cyan/20 scale-[1.02]' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <span className={isActive(link.path) ? 'text-black' : 'text-industrial-cyan/50'}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="pt-10 border-t border-white/10 mt-auto">
              <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-industrial-cyan to-industrial-magenta p-[2px]">
                    <div className="w-full h-full rounded-2xl bg-[#0a0a0a] flex items-center justify-center text-white font-black text-lg shadow-inner">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-tighter text-white">{profile?.full_name || 'Usuario'}</div>
                    <div className="text-[9px] text-industrial-cyan uppercase tracking-widest font-black mt-1">
                      {profile?.role === 'admin' ? 'Nivel: Administrador' : 'Nivel: Colaborador'}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-4 py-5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all group"
                >
                  <LogOut size={16} className="group-hover:scale-110 transition-transform" /> Cerrar Sesión
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-80 min-h-screen relative pt-24 lg:pt-0 overflow-y-auto custom-scrollbar">
        {/* Background Accents */}
        <div className="fixed inset-0 pointer-events-none z-[-10] overflow-hidden opacity-40">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-industrial-cyan/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-industrial-magenta/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-white/[0.01] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>
        
        <div className="relative p-8 lg:p-16 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
