import { z } from 'zod';

// Regex para contraseña fuerte: Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const signUpSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().regex(
    passwordRegex,
    'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
  ),
});

export const itemSchema = z.object({
  product_config_id: z.string().uuid('ID de producto inválido'),
  selected_attributes: z.record(z.string(), z.any()),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  calculated_price: z.number().min(0, 'El precio no puede ser negativo'),
  supplier_id: z.string().uuid().optional().nullable(),
});

export const orderSchema = z.object({
  client_id: z.string().uuid('ID de cliente inválido'),
  notes: z.string().optional(),
  status: z.string(),
  currency: z.enum(['UYU', 'USD']),
  total: z.number().min(0),
  total_uyu: z.number().min(0),
  exchange_rate: z.number().min(1),
  deposit_amount: z.number().min(0),
  payment_method: z.string().optional(),
  balance_due: z.number(),
  design_url: z.string().url().optional().or(z.literal('')),
});

export const orderPayloadSchema = z.object({
  order: orderSchema,
  items: z.array(itemSchema).min(1, 'Debe haber al menos un artículo en el pedido'),
});

export const clientSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().min(6, 'Teléfono inválido').optional().or(z.literal('')),
  status: z.enum(['activo', 'potencial', 'inactivo']),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type OrderPayloadInput = z.infer<typeof orderPayloadSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
