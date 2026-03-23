export interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: 'activo' | 'potencial' | 'inactivo';
    created_at: string;
}

export interface Order {
    id: string;
    order_number: number;
    client_id: string;
    clients: { name: string, phone?: string };
    status: string;
    total: number;
    currency: 'UYU' | 'USD';
    notes: string | null;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
    deposit_amount: number;
    payment_method: string | null;
    exchange_rate: number | null;
    total_uyu: number | null;
    balance_due: number;
    items: any[];
}

export interface ProductConfig {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    attributes_schema: any[];
    price_rules: any[];
}

export interface Supplier {
    id: string;
    name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
}

export interface BrandingSettings {
    app_name: string;
    primary_color: string;
    border_radius: string;
    logo_url: string;
    background_color: string;
    surface_color: string;
    text_color: string;
    enforce_deposit_on_move: boolean;
    whatsapp_new_order_template: string;
    whatsapp_pickup_template: string;
}