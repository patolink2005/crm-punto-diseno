import { supabase } from '../lib/supabase';
import type { Order, OrderStatus, OrderItem } from '../types';

// Define a type for the shape of an order returned from a join
// This helps ensure the 'clients' property is recognized by TypeScript
type OrderWithClient = Order & {
  clients: { name: string, phone: string } | null;
};

export const orderService = {
  getAll: async (): Promise<OrderWithClient[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(name, phone)')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data as OrderWithClient[]) || [];
  },

  getArchived: async (): Promise<OrderWithClient[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(name, phone)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false });
    
    if (error) throw error;
    return (data as OrderWithClient[]) || [];
  },

  archiveOrder: async (id: string): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error(`Order with id ${id} not found to archive.`);
    return data;
  },

  deleteOrder: async (id: string): Promise<void> => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
  },

  async getById(id: string): Promise<Order> {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, clients(name, phone)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!order) throw new Error(`Order with id ${id} not found.`);

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products_config(name), suppliers(name)')
      .eq('order_id', id);

    if (itemsError) throw itemsError;

    return { ...order, items: items || [] };
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Order with id ${id} not found to update.`);
    return data;
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error(`Order with id ${id} not found to update status.`);
    return data;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase.from('order_items').delete().eq('id', itemId);
    if (error) throw error;
  },

  async updateInternalNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  async addItem(item: Partial<OrderItem> & { order_id: string }): Promise<OrderItem> {
    const { data, error } = await supabase.from('order_items').insert([item]).select().single();
    if (error) throw error;
    if (!data) throw new Error('Failed to create item.');
    return data;
  },

  async updateWithItems(orderId: string, orderData: Partial<Order>, items: Partial<OrderItem>[]): Promise<Order> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ ...orderData, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    
    if (orderError) throw orderError;
    if (!order) throw new Error(`Order with id ${orderId} not found to update.`);

    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
    
    if (deleteError) throw deleteError;

    if (items.length > 0) {
      // The 'any' casts are removed as we trust the incoming partial type
      const itemsToInsert = items.map(item => ({
        ...item,
        order_id: orderId,
        supplier_id: item.supplier_id || null
      }));
      const { error: insertError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);
      
      if (insertError) throw insertError;
    }

    return order;
  },

  async createWithItems(orderData: Partial<Order>, items: Partial<OrderItem>[]): Promise<Order> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError || new Error('User not found');

    const { data: order, error } = await supabase
      .from('orders')
      .insert([{ ...orderData, user_id: userData.user.id }])
      .select()
      .single();
    if (error) throw error;
    if (!order) throw new Error('Failed to create order.');

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        order_id: order.id,
        supplier_id: item.supplier_id || null,
      }));
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
