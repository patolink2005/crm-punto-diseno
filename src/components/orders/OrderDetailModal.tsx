import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../services/orders';
import { pipelineService } from '../../services/pipeline';
import { X, FileText, Archive, Package, Edit, Calendar, Trash2 } from 'lucide-react';
import { OrderEditorModal } from './OrderEditorModal';

export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId),
    enabled: !!orderId,
  });

  const { data: stages } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages
  });

  const archiveMutation = useMutation({
    mutationFn: orderService.archiveOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err: any) => alert('Error al archivar: ' + err.message)
  });

  const deleteOrderMutation = useMutation({
    mutationFn: orderService.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err: any) => alert('Error al eliminar pedido: ' + err.message)
  });

  if (isLoading) return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '700px', textAlign: 'center', padding: '3rem' }}>
        Cargando pedido...
      </div>
    </div>
  );

  if (!order) return null;

  if (isEditingOrder) {
    return <OrderEditorModal orderId={orderId} onClose={() => setIsEditingOrder(false)} />;
  }

  const orderNum = order.order_number ? `#${String(order.order_number).padStart(4, '0')}` : `#${order.id.slice(0, 6)}`;
  const cur = order.currency || 'UYU';
  const sym = cur === 'USD' ? 'U$S' : '$';
  const stageName = stages?.find(s => s.slug === order.status)?.name || order.status;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '750px', padding: 0, overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h3 style={{ margin: 0 }}>Pedido {orderNum}</h3>
              <span className={`badge-status status-${order.status}`} style={{ fontSize: '0.7rem' }}>{stageName}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setIsEditingOrder(true)}>
                <Edit size={14} /> Editar Pedido
              </button>
              <button className="btn-close" onClick={onClose}><X size={18} /></button>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Order Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
              <div className="text-secondary text-sm" style={{ marginBottom: '0.25rem' }}>Cliente</div>
              <div style={{ fontWeight: 600 }}>{order.clients?.name || 'Desconocido'}</div>
            </div>
            
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
              <div className="text-secondary text-sm" style={{ marginBottom: '0.25rem' }}>Total ({cur})</div>
              <div style={{ fontWeight: 600, color: 'var(--success-color)', fontSize: '1.2rem' }}>{sym}{order.total?.toLocaleString('es-UY')}</div>
              {cur === 'USD' && order.total_uyu && (
                <div className="text-secondary text-xs">≈ ${Number(order.total_uyu).toLocaleString('es-UY')} UYU (TC: {order.exchange_rate})</div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
              <div className="text-secondary text-sm" style={{ marginBottom: '0.25rem' }}>Estado Actual</div>
              <div style={{ fontWeight: 600 }}>{stageName}</div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
              <div className="text-secondary text-sm" style={{ marginBottom: '0.25rem' }}>
                <span><Calendar size={12} /> Creación</span>
              </div>
              <div style={{ fontWeight: 600 }}>{new Date(order.created_at).toLocaleDateString('es-UY')}</div>
            </div>
          </div>

          {/* Notes */}
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)' }}>
            <div className="text-secondary text-sm" style={{ marginBottom: '0.5rem' }}>
              <span><FileText size={12} /> Notas / Instrucciones</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{order.notes || 'Sin notas.'}</div>
          </div>

          {/* Items */}
          <div>
            <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={16} /> Ítems del Pedido ({order.items?.length || 0})
            </h4>
            {(!order.items || order.items.length === 0) ? (
              <p className="text-secondary text-sm">Este pedido no tiene ítems.</p>
            ) : (
              <div className="table-container">
                <table className="table" style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Detalles</th>
                      <th>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item: any) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.products_config?.name || 'Producto'}</td>
                        <td style={{ fontSize: '0.8rem' }} className="text-secondary">
                          {item.selected_attributes && Object.entries(item.selected_attributes).map(([k, v]) => (
                            <div key={k}>{k}: {String(v)}</div>
                          ))}
                          {item.suppliers?.name && <div style={{ color: 'var(--primary-color)', marginTop: '0.25rem' }}>📦 {item.suppliers.name}</div>}
                        </td>
                        <td>x{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-color)' }}>
                          {sym}{(item.calculated_price * item.quantity)?.toLocaleString('es-UY')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="text-secondary text-xs">
            Última actualización: {new Date(order.updated_at || order.created_at).toLocaleString('es-UY')}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!order.archived_at && (order.status === 'facturado' || order.status === 'entregado') && (
              <button 
                className="btn btn-primary" 
                style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onClick={() => {
                  if (confirm('¿Deseas archivar este pedido? Se moverá al historial de pedidos finalizados.')) {
                    archiveMutation.mutate(orderId);
                  }
                }}
                disabled={archiveMutation.isPending}
              >
                <Archive size={16} /> Archivar
              </button>
            )}
            
            <button 
              className="btn btn-outline" 
              style={{ color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              onClick={() => {
                if (confirm('¿ELIMINAR PEDIDO PERMANENTEMENTE? Esta acción no se puede deshacer.')) {
                  deleteOrderMutation.mutate(orderId);
                }
              }}
              disabled={deleteOrderMutation.isPending}
            >
              <Trash2 size={16} /> Eliminar
            </button>

            <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
