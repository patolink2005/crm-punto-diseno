import { supabase } from '../lib/supabase';
import type { AuditLog } from '../types';

export const auditService = {
  async getLogs(limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as AuditLog[];
  },
  
  async getLogsByAction(action: string, limit = 100) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as AuditLog[];
  }
};
