import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'admin' | 'emprendedora';
  full_name: string;
  mfa_enabled: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isInitialized: false,
  
  initialize: async () => {
    try {
      // 1. Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      let currentProfile = null;

      // 2. If session exists, fetch the user profile
      if (session?.user) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!profileError && data) {
          currentProfile = data;
        }
      }

      set({ 
        session, 
        user: session?.user ?? null, 
        profile: currentProfile, 
        isInitialized: true 
      });

      // 3. Listen to state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        let newProfile = null;
        if (newSession?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          if (data) newProfile = data;
        }
        
        set({ 
          session: newSession, 
          user: newSession?.user ?? null, 
          profile: newProfile 
        });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isInitialized: true });
    }
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  }
}));
