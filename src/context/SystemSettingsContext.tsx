import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface BrandingSettings {
  logo_url?: string;
  primary_color: string;
  primary_hover: string;
  border_radius: string;
  app_name: string;
  background_color?: string;
  surface_color?: string;
  text_color?: string;
}

interface SystemSettings {
  branding: BrandingSettings;
}

interface SystemSettingsContextType {
  settings: SystemSettings | undefined;
  isLoading: boolean;
  updateBranding: (newBranding: Partial<BrandingSettings>) => void;
  isUpdating: boolean;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const branding = data.find(s => s.key === 'branding')?.value as BrandingSettings;
      return { branding };
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newBranding: Partial<BrandingSettings>) => {
      const updatedBranding = { ...settings?.branding, ...newBranding };
      const { error } = await supabase
        .from('system_settings')
        .update({ value: updatedBranding, updated_at: new Date().toISOString() })
        .eq('key', 'branding');
      
      if (error) throw error;
      return updatedBranding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });

  useEffect(() => {
    if (settings?.branding) {
      const b = settings.branding;
      const root = document.documentElement;
      
      // Apply CSS variables dynamically
      if (b.primary_color) root.style.setProperty('--primary-color', b.primary_color);
      if (b.primary_hover) root.style.setProperty('--primary-hover', b.primary_hover);
      if (b.border_radius) root.style.setProperty('--border-radius', b.border_radius);
      if (b.background_color) root.style.setProperty('--background-color', b.background_color);
      if (b.surface_color) {
        root.style.setProperty('--surface-color', b.surface_color);
        // Also update glass background base
        root.style.setProperty('--glass-bg', `color-mix(in srgb, ${b.surface_color}, transparent 40%)`);
      }
      if (b.text_color) root.style.setProperty('--text-primary', b.text_color);
    }
  }, [settings]);

  return (
    <SystemSettingsContext.Provider value={{ 
      settings, 
      isLoading, 
      updateBranding: updateMutation.mutate, 
      isUpdating: updateMutation.isPending 
    }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
}
