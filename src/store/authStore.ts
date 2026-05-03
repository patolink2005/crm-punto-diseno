import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  role: 'admin' | 'emprendedora' | 'cliente';
  full_name: string;
  mfa_enabled: boolean;
  is_active: boolean;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string | null;
  status: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  clientProfile: ClientProfile | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  clientProfile: null,
  isInitialized: false,
  
  initialize: async () => {
    // Safety timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth initialization timeout')), 5000)
    );

    try {
      // 1. Get current session with timeout
      const { data: { session }, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise as Promise<never>
      ]);
      
      if (sessionError) throw sessionError;

      let currentProfile = null;
      let currentClientProfile = null;

      // 2. If session exists, fetch the user profile
      if (session?.user) {
        // Try to get employee profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!profileError && profileData) {
          currentProfile = profileData;
        }

        // Buscamos datos de cliente si no hay perfil o si el rol es 'cliente'
        if ((!currentProfile || currentProfile.role === 'cliente') && session.user.email) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('email', session.user.email)
            .single();
            
          if (!clientError && clientData) {
            currentClientProfile = clientData;
            // Link user_id to client if not already linked
            if (!clientData.user_id) {
              await supabase.from('clients').update({ user_id: session.user.id }).eq('id', clientData.id);
            }
          }
        }
      }

      set({ 
        session, 
        user: session?.user ?? null, 
        profile: currentProfile,
        clientProfile: currentClientProfile,
        isInitialized: true 
      });
    } catch (error) {
      console.error('Initialization error:', error);
      // Even on error, mark as initialized to allow the app to show login or handle the state
      set({ isInitialized: true });
    }

    // 3. Listen to state changes
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
        let newProfile = null;
        let newClientProfile = null;
        
        if (newSession?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
            
          if (profileData) {
            newProfile = profileData;
          } else if (newSession.user.email) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('*')
              .eq('email', newSession.user.email)
              .single();
              
            if (clientData) {
              newClientProfile = clientData;
            }
          }
        }
        
        set({ 
          session: newSession, 
          user: newSession?.user ?? null, 
          profile: newProfile,
          clientProfile: newClientProfile
        });
      });
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, clientProfile: null });
  }
}));
