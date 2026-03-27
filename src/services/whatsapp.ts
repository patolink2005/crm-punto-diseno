import { orderService } from './orders';
import type { Order, OrderItem, BrandingSettings } from '../types';

export function formatOrderNumber(order: Order): string {
  if (order.order_number) {
    return `#${String(order.order_number).padStart(4, '0')}`;
  }
  return `#${order.id.slice(0, 6)}`;
}

export function formatCurrency(amount: number, currency?: string): string {
  const cur = currency || 'UYU';
  const symbol = cur === 'USD' ? 'U$S' : '$';
  return `${symbol}${Number(amount || 0).toLocaleString('es-UY')}`;
}

/**
 * Opens WhatsApp with a pre-filled message.
 * @param phone The client's phone number.
 * @param message The message to send.
 */
export function sendWhatsAppMessage(phone: string, message: string) {
  if (!phone) {
    alert('No se puede enviar el mensaje porque el cliente no tiene un número de teléfono registrado.');
    return;
  }
  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

export async function generateAndSendWhatsApp(orderId: string, type: 'new_order' | 'pickup' | 'update', settings: { branding: BrandingSettings } | null | undefined) {
  const order = await orderService.getById(orderId);
  if (!order) {
    alert('No se encontró el pedido.');
    return;
  }

  const client = order.clients;
  if (!client) {
    alert('No se encontró el cliente asociado al pedido.');
    return;
  }

  let message = '';
  if (type === 'new_order' || type === 'update') {
    const defaultTemplate = `Hola {clientName}, ${type === 'new_order' ? 'hemos creado tu pedido' : 'tu pedido ha sido actualizado'} *{orderNumber}* con el siguiente detalle:\n\n{items}\n\n*Precio Total:* {total}\n*Seña:* {deposit}\n*Saldo:* {balance}\n\n¡Gracias!`;
    const template = settings?.branding?.whatsapp_new_order_template || defaultTemplate;
    
    const itemsText = (order.items || [])
      .filter((item: OrderItem) => !item.supplier_id)
      .map((item: OrderItem) => `- ${item.product?.name || 'Producto'} (${formatCurrency(item.calculated_price, order.currency)})`)
      .join('\n');

    message = template
      .replace('{clientName}', client.name)
      .replace('{orderNumber}', formatOrderNumber(order))
      .replace('{items}', itemsText)
      .replace('{total}', formatCurrency(order.total, order.currency))
      .replace('{deposit}', formatCurrency(order.deposit_amount, order.currency))
      .replace('{balance}', formatCurrency(order.total - order.deposit_amount, order.currency));

  } else if (type === 'pickup') {
    const template = settings?.branding?.whatsapp_pickup_template || '¡Hola {clientName}! Tu pedido *{orderNumber}* está listo para retirar.';
    message = template.replace('{clientName}', client.name).replace('{orderNumber}', formatOrderNumber(order));
  }

  sendWhatsAppMessage(client.phone || '', message);
}
