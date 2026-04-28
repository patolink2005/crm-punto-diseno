import { useAuthStore } from '../../store/authStore';
import { Package, Clock, CheckCircle, CreditCard, ChevronRight, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

export function PortalDashboard() {
  const { clientProfile } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const orderId = searchParams.get('order_id');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'timeout' | 'error'>('verifying');
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['portal-orders', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          payment_status,
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

  useEffect(() => {
    if (paymentStatus && orderId) {
      setShowSuccessModal(true);
      
      // Intentar cargar la orden específica inmediatamente para tener el order_number
      const fetchSpecificOrder = async () => {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (data) setTargetOrder(data as Order);
      };

      if (!targetOrder) {
        fetchSpecificOrder();
      }

      if (paymentStatus === 'failure') {
        setVerificationStatus('error');
      } else if (paymentStatus === 'pending') {
        setVerificationStatus('timeout');
      } else {
        setVerificationStatus('verifying');
      }

      let attempts = 0;
      const maxAttempts = 12; // 24 segundos total (2s x 12)
      
      const pollInterval = setInterval(async () => {
        // No polleamos en caso de falla explícita desde el inicio
        if (paymentStatus === 'failure') {
          clearInterval(pollInterval);
          return;
        }

        attempts++;
        
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderData) {
          const status = orderData.payment_status;
          setTargetOrder(orderData as Order);
          
          if (status === 'approved') {
            setVerificationStatus('success');
            clearInterval(pollInterval);
            refetch();
          } else if (status === 'rejected') {
            setVerificationStatus('error');
            clearInterval(pollInterval);
            refetch();
          } else if (status === 'pending' && attempts >= 4) {
            setVerificationStatus('timeout');
            clearInterval(pollInterval);
            refetch();
          }
        }
        
        if (attempts >= maxAttempts) {
          setVerificationStatus('timeout');
          clearInterval(pollInterval);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [paymentStatus, orderId, refetch, targetOrder]);

  useEffect(() => {
    // Si hay parámetros de pago pero el modal está cerrado, limpiar la URL después de un tiempo
    if (paymentStatus && !showSuccessModal) {
      const timer = setTimeout(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('payment');
        newParams.delete('order_id');
        setSearchParams(newParams);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, showSuccessModal, searchParams, setSearchParams]);

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
      setIsPaying(order.id);
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          orderId: order.id,
          amount: order.balance_due,
          title: `Pago Saldo Pedido #${order.order_number}`,
          currency: order.currency || 'UYU',
          // En producción se usará este email para el payer.
          // En sandbox, la función lo reemplaza por el email de la cuenta TEST COMPRADORA.
          buyer_email: clientProfile?.email || 'cliente@crmpunto.com'
        }
      });
      
      if (error) throw error;
      
      // La Edge Function nos indica si está en modo sandbox.
      // En sandbox usamos sandbox_init_point; en producción, init_point.
      const redirectUrl = data.isSandbox
        ? (data.sandbox_init_point || data.init_point)
        : (data.init_point || data.sandbox_init_point);

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No se recibió URL de pago desde Mercado Pago.');
      }
    } catch (error) {
      console.error('Error al generar pago:', error);
      alert('Error al generar el pago. Por favor intenta de nuevo más tarde.');
    } finally {
      setIsPaying(null);
    }
  };


  return (
    <div className="portal-dashboard">
      <div className="portal-welcome">
        <h1>Hola, {clientProfile?.name || 'Cliente'}</h1>
        <p>Aquí puedes ver el estado de tus pedidos y realizar pagos.</p>
      </div>

      {paymentStatus && !showSuccessModal && (
        <div className={`p-4 rounded-md mb-6 flex items-start justify-between gap-3 ${
          paymentStatus === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          paymentStatus === 'failure' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            {paymentStatus === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <div>
              <h3 className="font-bold">
                {paymentStatus === 'success' ? 'Pago Exitoso' : 
                 paymentStatus === 'failure' ? 'Error en el Pago' : 'Pago Pendiente'}
              </h3>
              <p className="text-sm">
                {paymentStatus === 'success' ? `El pago del pedido #${targetOrder?.order_number || '...'} se procesó correctamente.` : 
                 paymentStatus === 'failure' ? `Hubo un problema al procesar el pago del pedido #${targetOrder?.order_number || '...'}.` : 
                 `El pago del pedido #${targetOrder?.order_number || '...'} está pendiente de confirmación.`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('payment');
              newParams.delete('order_id');
              setSearchParams(newParams);
            }}
            className="text-current opacity-50 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>
      )}

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
                        <div className="flex flex-col gap-1">
                          <span className="balance-amount text-danger font-bold">${order.balance_due.toFixed(2)}</span>
                          {/* @ts-expect-error - payment_status exists in DB but maybe not in local Type yet */}
                          {order.payment_status === 'pending' && (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Clock size={10} /> Pago pendiente
                            </span>
                          )}
                          {/* @ts-expect-error - payment_status exists in DB but maybe not in local Type yet */}
                          {order.payment_status === 'rejected' && (
                            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertCircle size={10} /> Pago rechazado
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-success font-medium">Pagado</span>
                      )}
                    </td>
                    <td className="order-action-cell">
                      {order.balance_due > 0 && order.status !== 'entregado' && (
                        <button 
                          onClick={() => handlePayClick(order)}
                          className="btn btn-primary btn-sm pay-btn"
                          disabled={!!isPaying}
                        >
                          {isPaying === order.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              Pagar Saldo
                              <ChevronRight size={16} />
                            </>
                          )}
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

      {/* Success/Verification Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <h3>Confirmación de Pago</h3>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  searchParams.delete('payment');
                  searchParams.delete('order_id');
                  setSearchParams(searchParams);
                }} 
                className="btn-icon"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1rem 0' }}>
              {verificationStatus === 'verifying' && (
                <div className="verifying-state">
                  <div className="loader" style={{ margin: '0 auto 1.5rem', width: '48px', height: '48px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Verificando su pago...</h4>
                  <p className="text-secondary text-sm">Estamos confirmando la transacción con Mercado Pago. Por favor no cierre esta ventana.</p>
                </div>
              )}

              {verificationStatus === 'success' && (
                <div className="success-state">
                  <div className="success-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <CheckCircle size={32} />
                  </div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--success-color)' }}>¡Pago Aprobado!</h4>
                  <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
                    El pago del pedido <strong>#{targetOrder?.order_number}</strong> ha sido confirmado. Su saldo se ha actualizado correctamente.
                  </p>
                  <button 
                    onClick={() => {
                      setShowSuccessModal(false);
                      searchParams.delete('payment');
                      searchParams.delete('order_id');
                      setSearchParams(searchParams);
                    }}
                    className="btn btn-primary w-full"
                    style={{ width: '100%' }}
                  >
                    Entendido
                  </button>
                </div>
              )}

              {verificationStatus === 'timeout' && (
                <div className="timeout-state">
                  <div className="timeout-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Clock size={32} />
                  </div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--warning-color)' }}>Pago en Proceso</h4>
                  <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
                    Su pago está siendo procesado por Mercado Pago. Recibirá una notificación automática cuando se acredite el saldo.
                  </p>
                  <button 
                    onClick={() => {
                      setShowSuccessModal(false);
                      searchParams.delete('payment');
                      searchParams.delete('order_id');
                      setSearchParams(searchParams);
                    }}
                    className="btn btn-outline w-full"
                    style={{ width: '100%' }}
                  >
                    Entendido, volver al panel
                  </button>
                </div>
              )}

              {verificationStatus === 'error' && (
                <div className="error-state">
                  <div className="error-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <AlertCircle size={32} />
                  </div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--danger-color)' }}>Pago Rechazado</h4>
                  <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
                    Lo sentimos, la transacción no pudo ser completada. Por favor intente con otro método de pago.
                  </p>
                  <button 
                    onClick={() => {
                      setShowSuccessModal(false);
                      searchParams.delete('payment');
                      searchParams.delete('order_id');
                      setSearchParams(searchParams);
                    }}
                    className="btn btn-primary w-full"
                    style={{ width: '100%', background: 'var(--danger-color)' }}
                  >
                    Reintentar Pago
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
}
