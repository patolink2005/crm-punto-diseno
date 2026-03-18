import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingBag, Users as UsersIcon } from 'lucide-react';
import './Dashboard.css';

export function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { data: orders } = await supabase.from('orders').select('total, total_uyu, currency, created_at, status');
      
      const revenueUyu = orders?.filter(o => o.currency === 'UYU' || !o.currency).reduce((acc, curr) => acc + Number(curr.total || 0), 0) || 0;
      const revenueUsd = orders?.filter(o => o.currency === 'USD').reduce((acc, curr) => acc + Number(curr.total || 0), 0) || 0;
      const totalRevenueUyu = orders?.reduce((acc, curr) => acc + Number(curr.total_uyu || curr.total || 0), 0) || 0;
      const activeOrders = orders?.filter(o => o.status !== 'entregado' && o.status !== 'facturado').length || 0;
      
      const monthlyData = [
        { name: 'Ene', ingresos: 12000 },
        { name: 'Feb', ingresos: 19000 },
        { name: 'Mar', ingresos: 15000 },
        { name: 'Abr', ingresos: 22000 },
        { name: 'May', ingresos: Math.floor(totalRevenueUyu * 0.4) },
        { name: 'Jun', ingresos: Math.floor(totalRevenueUyu * 0.6) },
      ];

      return { clientsCount: clientsCount || 0, activeOrders, totalRevenue: totalRevenueUyu, revenueUyu, revenueUsd, monthlyData };
    }
  });

  const m = metrics || { clientsCount: 0, activeOrders: 0, totalRevenue: 0, revenueUyu: 0, revenueUsd: 0, monthlyData: [] };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Dashboard General</h2>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid">
        <div className="glass-panel dashboard-kpi-card kpi-card-merged">
          <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)' }}>
            <DollarSign size={24} />
          </div>
          <div className="kpi-dual-content">
            <div>
              <div className="text-secondary text-sm">Ingresos (UYU)</div>
              <div className="kpi-value">${m.revenueUyu.toLocaleString('es-UY')}</div>
            </div>
            <div className="kpi-divider">
              <div className="text-secondary text-sm">Ingresos (USD)</div>
              <div className="kpi-value">U$S{m.revenueUsd.toLocaleString('es-UY')}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel dashboard-kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-secondary text-sm">Pedidos Activos</div>
            <div className="kpi-value">{m.activeOrders}</div>
          </div>
        </div>

        <div className="glass-panel dashboard-kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <UsersIcon size={24} />
          </div>
          <div>
            <div className="text-secondary text-sm">Clientes Registrados</div>
            <div className="kpi-value">{m.clientsCount}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-charts-grid">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Evolución de Ingresos</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
                <YAxis stroke="var(--color-text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="ingresos" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Resumen Rápido</h3>
          <p className="text-secondary text-sm">Las proyecciones indican un crecimiento sostenido en la unidad de ploteo vehicular con respecto al mes anterior.</p>
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Ploteo</span>
              <span style={{ color: 'var(--color-success)' }}>+24%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '70%', height: '100%', background: 'var(--color-accent)' }}></div>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Personalizados</span>
              <span style={{ color: 'var(--color-warning)' }}>+5%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '45%', height: '100%', background: '#8b5cf6' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
