import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogOut } from 'lucide-react';

export function PortalLayout() {
  const { signOut, clientProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-industrial-cyan/30">
      {/* Background Accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-industrial-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-industrial-magenta/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tighter">
              PUNTO<span className="text-industrial-cyan ml-1">DISEÑO</span>
            </span>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hidden sm:block">Portal Clientes</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden xs:block">
              <div className="text-[10px] font-bold uppercase tracking-widest text-industrial-cyan">{clientProfile?.name || 'Cliente'}</div>
              <div className="text-[9px] text-gray-500 font-medium">{clientProfile?.email}</div>
            </div>
            <button
              onClick={() => {

                handleSignOut();
              }}
              className="relative z-[100] p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-industrial-magenta/10 hover:border-industrial-magenta/30 hover:text-industrial-magenta transition-all duration-300 active:scale-95"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto py-12 px-6 lg:px-12">
        <Outlet />
      </main>

      {/* Global Portal Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 text-center flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">© 2026 PUNTO DISEÑO</p>
          <p className="text-[8px] font-bold text-gray-800 uppercase tracking-[0.3em]">Desarrollado por</p>
          <p className="text-[11px] font-black text-industrial-cyan uppercase tracking-[0.6em] hover:text-white transition-colors cursor-default">PATOLINK2005</p>
        </div>
      </footer>
    </div>
  );
}
