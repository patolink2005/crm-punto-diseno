import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Download } from 'lucide-react';

export function Invoices() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders')
        .select('*, clients(name)')
        .eq('status', 'facturado')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Facturas Emitidas</h2>
      </div>

      <div className="glass-panel table-container">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando facturas...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Monto Total</th>
                <th>Adjunto</th>
              </tr>
            </thead>
            <tbody>
              {invoices?.map(inv => (
                <tr key={inv.id}>
                  <td>#{inv.id.slice(0,6)}</td>
                  <td>{inv.clients?.name || 'Desconocido'}</td>
                  <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>${inv.total}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} title="Descargar PDF (Proximamente)">
                      <Download size={16} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {invoices?.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay facturas emitidas aún. Para generar una, arrastra un pedido al estado "Facturado" en el Pipeline.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
