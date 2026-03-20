import { supabase } from '../lib/supabase';
import type { Client } from '../types';

export const clientService = {
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as Client[];
  },

  async create(client: Partial<Client>) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const payload = { ...client, user_id: userData.user.id };
    
    const { data, error } = await supabase
      .from('clients')
      .insert([payload])
      .select()
      .single();
      
    if (error) throw error;
    return data as Client;
  },

  async update(id: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as Client;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
