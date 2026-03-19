import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingBag, Users as UsersIcon, BarChart } from 'lucide-react';
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
        <div className="glass-panel dashboard-kpi-card kpi-card-merged" style={{ padding: '2rem' }}>
          <div className="kpi-icon" style={{ 
            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))', 
            color: '#fff',
            boxShadow: '0 8px 16px color-mix(in srgb, var(--primary-color), transparent 80%)'
          }}>
            <DollarSign size={28} />
          </div>
          <div className="kpi-dual-content">
            <div>
              <div className="text-secondary text-sm" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Ingresos (UYU)</div>
              <div className="kpi-value" style={{ fontSize: '1.75rem' }}>${m.revenueUyu.toLocaleString('es-UY')}</div>
            </div>
            <div className="kpi-divider">
              <div className="text-secondary text-sm" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Ingresos (USD)</div>
              <div className="kpi-value" style={{ fontSize: '1.75rem' }}>U$S{m.revenueUsd.toLocaleString('es-UY')}</div>
            </div>
          </div>
        </div>

        <div className="glass-panel dashboard-kpi-card" style={{ padding: '1.75rem' }}>
          <div className="kpi-icon" style={{ 
            background: 'color-mix(in srgb, var(--success-color), transparent 85%)', 
            color: 'var(--success-color)',
            border: '1px solid color-mix(in srgb, var(--success-color), transparent 70%)'
          }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-secondary text-sm" style={{ fontWeight: 600 }}>Pedidos Activos</div>
            <div className="kpi-value">{m.activeOrders}</div>
          </div>
        </div>

        <div className="glass-panel dashboard-kpi-card" style={{ padding: '1.75rem' }}>
          <div className="kpi-icon" style={{ 
            background: 'color-mix(in srgb, #8b5cf6, transparent 85%)', 
            color: '#8b5cf6',
            border: '1px solid color-mix(in srgb, #8b5cf6, transparent 70%)'
          }}>
            <UsersIcon size={24} />
          </div>
          <div>
            <div className="text-secondary text-sm" style={{ fontWeight: 600 }}>Clientes Registrados</div>
            <div className="kpi-value">{m.clientsCount}</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-charts-grid" style={{ marginTop: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart size={20} style={{ color: 'var(--primary-color)' }} />
            Evolución de Ingresos
          </h3>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `$${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="var(--primary-color)" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: 'var(--primary-color)', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8, strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem' }}>Resumen Rápido</h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>Las proyecciones indican un crecimiento sostenido en la unidad de ploteo vehicular con respecto al mes anterior.</p>
          
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 500 }}>Ploteo</span>
              <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>+24%</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: '70%', height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--primary-hover))', borderRadius: '10px' }}></div>
            </div>
          </div>
          
          <div style={{ marginTop: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 500 }}>Personalizados</span>
              <span style={{ color: 'var(--warning-color)', fontWeight: 700 }}>+5%</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: '45%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)', borderRadius: '10px' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
