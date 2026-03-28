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
  
  // Clean non-digit characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Standard formatting for Uruguay (598)
  // If starts with 09... -> 5989...
  if (cleanPhone.startsWith('09')) {
    cleanPhone = '598' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    // If starts with 9... (9 digits) -> 598...
    cleanPhone = '598' + cleanPhone;
  }

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
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
    const statusText = type === 'new_order' ? 'hemos ingresado' : 'hemos actualizado';
    const defaultTemplate = `\u{00A1}Hola {clientName}! \u{1F4B0}\n\n${statusText} exitosamente tu pedido n\u00FAmero *{orderNumber}* con el siguiente detalle de producci\u00F3n:\n\n\u{1F4E6} Detalle:\n{items}\n\n\u{1F4B5} Se\u00F1a Registrada: {deposit}\n\u{1F4C9} Saldo a Pagar: {balance}\n\n\u00A1Gracias! \u{2728}`;
    const storedTemplate = settings?.branding?.whatsapp_new_order_template;
    // If the stored template contains corruption tokens (), fallback to default
    const template = (!storedTemplate || storedTemplate.includes('\uFFFD')) ? defaultTemplate : storedTemplate;
    
    const itemsText = (order.items || [])
      .filter((item: OrderItem) => !item.supplier_id)
      .map((item: OrderItem) => {
        const pName = item.products_config?.name || item.product?.name || 'Producto';
        return `- ${pName} (${formatCurrency(item.calculated_price * item.quantity, order.currency)})`;
      })
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
