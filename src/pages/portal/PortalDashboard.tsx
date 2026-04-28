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
    <div className="portal-dashboard">
      <div className="portal-welcome">
        <h1>Hola, {clientProfile?.name || 'Cliente'}</h1>
        <p>Aquí puedes ver el estado de tus pedidos y realizar pagos.</p>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card glass-panel" style={{ '--stat-color': 'var(--primary-color)' } as React.CSSProperties}>
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <Package size={20} />
            </div>
            <span>Total Pedidos</span>
          </div>
          <p className="stat-value">{orders?.length || 0}</p>
        </div>
        
        <div className="stat-card glass-panel" style={{ '--stat-color': 'var(--warning-color)' } as React.CSSProperties}>
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <Clock size={20} />
            </div>
            <span>En Proceso</span>
          </div>
          <p className="stat-value">{activeOrders.length}</p>
        </div>
        
        <div className="stat-card glass-panel" style={{ '--stat-color': 'var(--success-color)' } as React.CSSProperties}>
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <CheckCircle size={20} />
            </div>
            <span>Para Retirar</span>
          </div>
          <p className="stat-value">{pickupOrders.length}</p>
        </div>
        
        <div className="stat-card glass-panel" style={{ '--stat-color': 'var(--danger-color)' } as React.CSSProperties}>
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <CreditCard size={20} />
            </div>
            <span>Saldo Pendiente</span>
          </div>
          <p className="stat-value">${totalBalanceDue.toFixed(2)}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-section glass-panel">
        <h2 className="orders-section-title">
          <Package size={24} className="text-primary" />
          Tus Pedidos
        </h2>
        
        {isLoading ? (
          <div className="empty-state">
            <div className="loader"></div>
            <p>Cargando pedidos...</p>
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="table-responsive">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Detalle</th>
                  <th>Total</th>
                  <th>Saldo Pendiente</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="order-number-cell">
                        <span className="order-number">#{order.order_number}</span>
                        <span className={`badge-status ${
                          order.status === 'para_retirar' ? 'para-retirar' :
                          ['entregado', 'facturado'].includes(order.status) ? 'entregado' :
                          'default'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="order-date-cell">
                      {new Date(order.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td>
                      <div className="order-items-cell">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="order-item-row">
                            {item.quantity}x {item.product?.name || 'Producto'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="order-total-cell">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="order-balance-cell">
                      {order.balance_due > 0 ? (
                        <span className="balance-amount text-danger font-bold">${order.balance_due.toFixed(2)}</span>
                      ) : (
                        <span className="text-success font-medium">Pagado</span>
                      )}
                    </td>
                    <td className="order-action-cell">
                      {order.balance_due > 0 && order.status !== 'entregado' && (
                        <button 
                          onClick={() => handlePayClick(order)}
                          className="btn btn-primary btn-sm pay-btn"
                        >
                          Pagar Saldo
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package size={48} />
            </div>
            <h3>Sin pedidos activos</h3>
            <p>Aún no tienes pedidos registrados en tu cuenta.</p>
          </div>
        )}
      </div>
    </div>
  );
}
