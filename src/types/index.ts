export interface Profile {
  id: string;
  role: 'admin' | 'emprendedora';
  full_name: string;
  auth_id: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: 'activo' | 'potencial' | 'inactivo';
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProductAttribute {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[]; // Para tipo select
}

export interface VinylRoll {
  width_cm: number;
  cost_per_m: number;
}

export interface PriceRule {
  type: 'base_modifier' | 'area' | 'volume' | 'vinyl_nesting' | 'custom_cost';
  attribute?: string;
  value?: string;
  price_increase?: number;
  width_attr?: string;
  height_attr?: string;
  price_per_m2?: number;
  rolls?: VinylRoll[];
  margin_multiplier?: number;
}

export interface ProductConfig {
  id: string;
  name: string;
  description: string;
  base_price: number;
  attributes_schema: ProductAttribute[];
  price_rules: PriceRule[];
  created_at: string;
}

export type OrderStatus = 'nuevo_pedido' | 'presupuestado' | 'diseno' | 'produccion' | 'control_calidad' | 'entregado' | 'facturado';

export interface Order {
  id: string;
  order_number: number;
  client_id: string;
  client?: Client;
  status: OrderStatus;
  total_amount?: number; // legacy
  total: number;
  total_uyu?: number;
  currency: 'UYU' | 'USD';
  exchange_rate?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_config_id: string;
  product?: ProductConfig;
  products_config?: ProductConfig; // Compatibility with legacy joins
  selected_attributes: Record<string, any>;
  quantity: number;
  calculated_price: number;
  supplier_id?: string;
  suppliers?: Supplier; // For joins
  created_at: string;
}
