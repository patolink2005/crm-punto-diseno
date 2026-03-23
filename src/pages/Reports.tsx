import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orders';
import { Download, Trash2 } from 'lucide-react';
import './Clients.css';

export function Reports() {
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['reports-orders'],
    queryFn: async () => {
      // For reports, we want potentially both archived and active?
      // Actually, usually reports are for "Facturado" (Invoiced) orders.
      const archived = await orderService.getArchived();
      const active = await orderService.getAll();
      return [...active, ...archived].filter(o => o.status === 'facturado');
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-orders'] });
    },
    onError: (err: any) => {
      alert('Error al eliminar el pedido: ' + err.message);
    },
  });

  const reportData = allOrders?.filter(o => {
    const orderDate = new Date(o.created_at).toISOString().split('T')[0];
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const totals = reportData?.reduce((acc, o) => {
    if (o.currency === 'USD') {
      acc.usd += o.total;
      acc.uyu_from_usd += (o.total_uyu || 0);
    } else {
      acc.uyu += o.total;
    }
    return acc;
  }, { usd: 0, uyu: 0, uyu_from_usd: 0 }) || { usd: 0, uyu: 0, uyu_from_usd: 0 };

  const totalGeneralUyu = totals.uyu + totals.uyu_from_usd;

  const exportReport = () => {
    if (!reportData || reportData.length === 0) return;
    const headers = ['Fecha', 'Nro Pedido', 'Cliente', 'Moneda', 'Monto', 'TC', 'Monto UYU'];
    const rows = reportData.map(o => [
      new Date(o.created_at).toLocaleDateString('es-UY'),
      o.order_number ? `#${String(o.order_number).padStart(4, '0')}` : o.id.slice(0, 6),
      (o as any).clients?.name || 'Desconocido',
      o.currency,
      o.total,
      o.exchange_rate || 1,
      o.currency === 'USD' ? (o.total_uyu || 0) : o.total
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_dgi_${dateRange.start}_a_${dateRange.end}.csv`);
    link.click();
  };

  return (
    <div style={{ padding: '0 1rem' }}>
      <div className="page-header">
        <div>
          <h2>Informes Contables / DGI</h2>
          <p className="text-secondary text-sm">Resumen de ventas facturadas para declaraciones.</p>
        </div>
        <button className="btn btn-primary" onClick={exportReport} disabled={!reportData?.length}>
          <Download size={18} /> Exportar Reporte (CSV)
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Desde</label>
          <input type="date" className="input-base" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Hasta</label>
          <input type="date" className="input-base" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="text-center" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-secondary text-xs">Total USD</div>
            <div style={{ fontWeight: 600, color: 'var(--success-color)' }}>U$S {totals.usd.toLocaleString('es-UY')}</div>
          </div>
          <div className="text-center" style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-secondary text-xs">Total UYU (Eq.)</div>
            <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>$ {totalGeneralUyu.toLocaleString('es-UY')}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel table-container">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Generando informe...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Monto Orig.</th>
                <th style={{ textAlign: 'right' }}>T.C.</th>
                <th style={{ textAlign: 'right' }}>Eq. UYU</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reportData?.map((o) => {
                const orderNum = o.order_number ? `#${String(o.order_number).padStart(4, '0')}` : o.id.slice(0, 6);
                const sym = o.currency === 'USD' ? 'U$S' : '$';
                const uyuVal = o.currency === 'USD' ? (o.total_uyu || 0) : o.total;
                return (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString('es-UY')}</td>
                    <td style={{ fontWeight: 600 }}>{orderNum}</td>
                    <td>{(o as any).clients?.name || 'Desconocido'}</td>
                    <td style={{ textAlign: 'right', color: o.currency === 'USD' ? '#fbbf24' : 'inherit' }}>
                      {sym}{o.total.toLocaleString('es-UY')}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.85rem' }} className="text-secondary">
                      {o.exchange_rate || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-color)' }}>
                      ${uyuVal.toLocaleString('es-UY')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem', color: 'var(--danger-color)' }}
                        onClick={() => { if (confirm(`¿Estás seguro de que quieres eliminar el pedido ${orderNum}? Esta acción no se puede deshacer.`)) deleteOrderMutation.mutate(o.id); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(!isLoading && (!reportData || reportData.length === 0)) && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
          No hay datos para el período seleccionado. Asegúrate de tener pedidos en estado "Facturado".
        </div>
      )}
    </div>
  );
}
