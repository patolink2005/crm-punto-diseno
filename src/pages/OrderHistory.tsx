import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orders';
import { Download, Eye, Calendar, User } from 'lucide-react';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import './Clients.css'; // Reuse common glass panel and table styles

export function OrderHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'USD' | 'UYU'>('all');

  const { data: archivedOrders, isLoading } = useQuery({
    queryKey: ['orders-archived'],
    queryFn: orderService.getArchived
  });

  const filteredOrders = archivedOrders?.filter(o => {
    const matchesSearch = 
      (o.order_number?.toString() || '').includes(searchTerm) ||
      ((o as any).clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || (o as any).currency === filterType;
    
    return matchesSearch && matchesType;
  });

  const exportToExcel = () => {
    if (!filteredOrders || filteredOrders.length === 0) return;

    // Simple CSV export that Excel can open
    const headers = ['Fecha Archivo', 'Nro Pedido', 'Cliente', 'Moneda', 'Total', 'Total UYU', 'Estado Final'];
    const rows = filteredOrders.map(o => [
      new Date(o.archived_at!).toLocaleDateString('es-UY'),
      o.order_number ? `#${String(o.order_number).padStart(4, '0')}` : o.id.slice(0, 6),
      (o as any).clients?.name || 'Desconocido',
      (o as any).currency || 'UYU',
      (o as any).total || 0,
      (o as any).total_uyu || 0,
      o.status
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '0 1rem' }}>
      <div className="page-header">
        <div>
          <h2>Historial de Pedidos</h2>
          <p className="text-secondary text-sm">Consulta pedidos archivados y facturados.</p>
        </div>
        <button className="btn btn-outline" onClick={exportToExcel} disabled={!filteredOrders?.length}>
          <Download size={18} /> Exportar Excel (CSV)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-container" style={{ flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Buscar por Nº de pedido o cliente..." 
            className="input-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input-base" 
          style={{ width: 'auto' }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
        >
          <option value="all">Todas las Monedas</option>
          <option value="USD">Dólares (USD)</option>
          <option value="UYU">Pesos (UYU)</option>
        </select>
      </div>

      <div className="glass-panel table-container desktop-only">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha Archivo</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado Final</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders?.map((order) => {
                const orderNum = order.order_number ? `#${String(order.order_number).padStart(4, '0')}` : `#${order.id.slice(0, 6)}`;
                const sym = (order as any).currency === 'USD' ? 'U$S' : '$';
                return (
                  <tr key={order.id}>
                    <td>{new Date(order.archived_at!).toLocaleDateString('es-UY')}</td>
                    <td style={{ fontWeight: 600 }}>{orderNum}</td>
                    <td>{(order as any).clients?.name || 'Desconocido'}</td>
                    <td style={{ color: 'var(--success-color)', fontWeight: 600 }}>
                      {sym}{(order as any).total}
                    </td>
                    <td>
                      <span className={`badge-status status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setSelectedOrder(order.id)}>
                        <Eye size={16} /> Ver Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile view - Cards */}
      <div className="mobile-only">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial...</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredOrders?.map((order) => {
              const orderNum = order.order_number ? `#${String(order.order_number).padStart(4, '0')}` : `#${order.id.slice(0, 6)}`;
              const sym = (order as any).currency === 'USD' ? 'U$S' : '$';
              return (
                <div key={order.id} className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600 }}>Pedido {orderNum}</div>
                    <span className={`badge-status status-${order.status}`}>{order.status}</span>
                  </div>
                  <div className="text-sm" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14} className="text-secondary" /> {(order as any).clients?.name || 'Desconocido'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}><Calendar size={14} className="text-secondary" /> {new Date(order.archived_at!).toLocaleDateString('es-UY')}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, color: 'var(--success-color)', fontSize: '1.1rem' }}>{sym}{(order as any).total}</div>
                    <button className="btn btn-outline" onClick={() => setSelectedOrder(order.id)}>
                      <Eye size={14} /> Detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(!isLoading && filteredOrders?.length === 0) && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          No se encontraron pedidos en el historial.
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
