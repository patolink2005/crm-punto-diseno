import { supabase } from '../lib/supabase';
import type { ProductConfig } from '../types';

export const productService = {
  async getAll() {
    const { data, error } = await supabase
      .from('products_config')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as ProductConfig[];
  },

  async create(product: Partial<ProductConfig>) {
    const { data, error } = await supabase
      .from('products_config')
      .insert([product])
      .select()
      .single();
    if (error) throw error;
    return data as ProductConfig;
  },

  async update(id: string, updates: Partial<ProductConfig>) {
    const { data, error } = await supabase
      .from('products_config')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ProductConfig;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products_config')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
