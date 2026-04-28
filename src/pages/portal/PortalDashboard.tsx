import { useAuthStore } from '../../store/authStore';
import { Package, Clock, CheckCircle, CreditCard, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';

export function PortalDashboard() {
  const { clientProfile } = useAuthStore();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['portal-orders', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:product_config_id(*)
          )
        `)
        .eq('client_id', clientProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!clientProfile?.id
  });

  const activeOrders = orders?.filter(o => !['entregado', 'facturado'].includes(o.status)) || [];
  const pickupOrders = orders?.filter(o => o.status === 'para_retirar') || [];
  
  // Calcular saldo pendiente
  const totalBalanceDue = orders?.reduce((sum, order) => {
    // Si la orden no está facturada/entregada y tiene balance_due
    if (!['entregado', 'facturado'].includes(order.status)) {
      return sum + (order.balance_due || 0);
    }
    return sum;
  }, 0) || 0;

  const handlePayClick = async (order: Order) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: order.id,
          amount: order.balance_due,
          title: `Pago Saldo Pedido #${order.order_number}`
        }
      });
      
      if (error) throw error;
      
      // En producción usarías data.init_point, pero puedes usar sandbox_init_point para pruebas
      if (data.sandbox_init_point) {
        window.location.href = data.sandbox_init_point; 
      } else if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error('Error al generar pago:', error);
      alert('Error al generar el pago. Por favor intenta de nuevo más tarde.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Hola, {clientProfile?.name || 'Cliente'}</h1>
          <p className="text-text-muted mt-1">Aquí puedes ver el estado de tus pedidos y realizar pagos.</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-border p-5 rounded-xl">
          <div className="flex items-center gap-3 text-text-muted mb-2">
            <Package size={20} />
            <span className="font-medium">Total Pedidos</span>
          </div>
          <p className="text-3xl font-bold text-text">{orders?.length || 0}</p>
        </div>
        <div className="bg-surface-card border border-border p-5 rounded-xl">
          <div className="flex items-center gap-3 text-warning mb-2">
            <Clock size={20} />
            <span className="font-medium">En Proceso</span>
          </div>
          <p className="text-3xl font-bold text-text">{activeOrders.length}</p>
        </div>
        <div className="bg-surface-card border border-border p-5 rounded-xl">
          <div className="flex items-center gap-3 text-success mb-2">
            <CheckCircle size={20} />
            <span className="font-medium">Para Retirar</span>
          </div>
          <p className="text-3xl font-bold text-text">{pickupOrders.length}</p>
        </div>
        <div className="bg-surface-card border border-border p-5 rounded-xl">
          <div className="flex items-center gap-3 text-danger mb-2">
            <CreditCard size={20} />
            <span className="font-medium">Saldo Pendiente</span>
          </div>
          <p className="text-3xl font-bold text-text">${totalBalanceDue.toFixed(2)}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-surface-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-bold text-text mb-4">Tus Pedidos</h2>
        
        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Cargando pedidos...</div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-text">#{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'para_retirar' ? 'bg-success/10 text-success' :
                      ['entregado', 'facturado'].includes(order.status) ? 'bg-text-muted/10 text-text-muted' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {new Date(order.created_at).toLocaleDateString('es-AR')}
                  </p>
                  <div className="mt-2 text-sm text-text">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {order.items?.map((item: any) => (
                      <div key={item.id}>• {item.quantity}x {item.product?.name || 'Producto'}</div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-sm text-text-muted">Total: ${order.total.toFixed(2)}</div>
                    {order.balance_due > 0 && (
                      <div className="font-medium text-danger">Resta: ${order.balance_due.toFixed(2)}</div>
                    )}
                  </div>
                  
                  {order.balance_due > 0 && order.status !== 'entregado' && (
                    <button 
                      onClick={() => handlePayClick(order)}
                      className="btn btn-primary text-sm px-4 py-2 flex items-center gap-2"
                    >
                      Pagar Saldo
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-border mb-4" />
            <p className="text-text-muted">Aún no tienes pedidos registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
