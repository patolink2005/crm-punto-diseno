import { supabase } from '../lib/supabase';
import type { Order, OrderStatus, OrderItem } from '../types';

export const orderService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Order[];
  },

  getArchived: async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });
    
    if (error) throw error;
    return data as Order[];
  },

  archiveOrder: async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .eq('id', id)
      .single();
    if (error) throw error;

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products_config(name), suppliers(name)')
      .eq('order_id', id);
    if (itemsError) throw itemsError;

    return { ...order, items: items || [] };
  },

  async updateOrder(id: string, updates: { notes?: string; status?: OrderStatus; estimated_delivery_date?: string }) {
    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: OrderStatus) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteItem(itemId: string) {
    const { error } = await supabase.from('order_items').delete().eq('id', itemId);
    if (error) throw error;
  },

  async addItem(item: Partial<OrderItem> & { order_id: string }) {
    const { data, error } = await supabase.from('order_items').insert([item]).select().single();
    if (error) throw error;
    return data;
  },

  async updateWithItems(orderId: string, orderData: Partial<Order>, items: Partial<OrderItem>[]) {
    // 1. Update order metadata
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ ...orderData, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    
    if (orderError) throw orderError;

    // 2. Delete existing items
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
    
    if (deleteError) throw deleteError;

    // 3. Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => {
        const { id, created_at, products_config, suppliers, ...rest } = item as any;
        return { ...rest, order_id: orderId };
      });
      const { error: insertError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);
      
      if (insertError) throw insertError;
    }

    return order;
  },

  async createWithItems(orderData: Partial<Order>, items: Partial<OrderItem>[]) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: order, error } = await supabase
      .from('orders')
      .insert([{ ...orderData, user_id: userData.user.id }])
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({ ...item, order_id: order.id }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) {
        console.error("Error inserting items, deleting order...", itemsError);
        await supabase.from('orders').delete().eq('id', order.id);
        throw itemsError;
      }
    }

    return order;
  }
};
