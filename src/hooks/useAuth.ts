import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
  const {
    user,
    session,
    profile,
    clientProfile,
    isInitialized,
    initialize,
    signOut: storeSignOut,
  } = useAuthStore();

  // Inicialización automática del estado de autenticación
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  /**
   * Inicia sesión con Google (OAuth)
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  /**
   * Cerrar sesión
   */
  const signOut = async () => {
    try {
      await storeSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  /**
   * Exportar el rol actual
   * Prioriza el rol del perfil de empleado/admin, luego el de cliente.
   */
  const role = profile?.role || (clientProfile ? 'cliente' : null);

  return {
    // Estado
    user,
    session,
    profile,
    clientProfile,
    role,
    isAuthenticated: !!user,
    isInitialized,
    
    // Acciones
    signInWithGoogle,
    signOut,
    
    // Utils
    isAdmin: role === 'admin',
    isEmprendedora: role === 'emprendedora',
    isCliente: role === 'cliente',
  };
};

export type UseAuthReturn = ReturnType<typeof useAuth>;
