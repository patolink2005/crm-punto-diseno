import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DollarSign, Users as UsersIcon, TrendingUp, Activity, Sparkles, Zap, Package, Layout } from 'lucide-react';
import { OrdersTable } from '../components/dashboard/OrdersTable';
import { useAuthStore } from '../store/authStore';

export function Dashboard() {
  const { profile } = useAuthStore();
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
        { name: 'ENE', ingresos: 12000 },
        { name: 'FEB', ingresos: 19000 },
        { name: 'MAR', ingresos: 15000 },
        { name: 'ABR', ingresos: 22000 },
        { name: 'MAY', ingresos: Math.floor(totalRevenueUyu * 0.4) },
        { name: 'JUN', ingresos: Math.floor(totalRevenueUyu * 0.6) },
      ];

      return { clientsCount: clientsCount || 0, activeOrders, totalRevenue: totalRevenueUyu, revenueUyu, revenueUsd, monthlyData };
    }
  });

  const m = metrics || { clientsCount: 0, activeOrders: 0, totalRevenue: 0, revenueUyu: 0, revenueUsd: 0, monthlyData: [] };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Cinematic Header - Industrial Terminal Style */}
      <div className="relative overflow-hidden rounded-[3rem] p-12 bg-black border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-industrial-cyan/5 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-industrial-magenta/5 blur-[100px] -ml-20 -mb-20 pointer-events-none" />
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                <div className="w-2 h-2 rounded-full bg-industrial-cyan shadow-[0_0_10px_#00AEEF]" />
                <div className="w-2 h-2 rounded-full bg-industrial-cyan/30" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">Módulo de Control Central</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">
                NIVEL <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-industrial-cyan via-white to-industrial-magenta">OPERATIVO</span>
              </h1>
              <div className="flex items-center gap-6 pt-4">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                  <Activity size={16} className="text-green-500" />
                  Terminal ID: <span className="text-white font-mono">PD-ADMIN-2026</span>
                </p>
                <div className="h-4 w-[1px] bg-white/10" />
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                  Usuario: <span className="text-white italic">{profile?.full_name?.split(' ')[0] || 'Cargando...'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
            <div className="px-10 py-6 bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2rem] flex flex-col justify-center gap-1 shadow-2xl group hover:border-industrial-cyan/30 transition-all duration-500">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Sincronización de Red</span>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                <span className="text-sm font-black text-white uppercase tracking-tighter">Latencia Nominal</span>
              </div>
            </div>

            <div className="px-10 py-6 bg-industrial-cyan/5 backdrop-blur-3xl border border-industrial-cyan/20 rounded-[2rem] flex items-center gap-5 shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-industrial-cyan/10 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
              <Zap size={24} className="text-industrial-cyan relative z-10 fill-industrial-cyan/20 animate-pulse" />
              <div className="flex flex-col relative z-10">
                <span className="text-[9px] font-black text-industrial-cyan/60 uppercase tracking-widest">Estado del Sistema</span>
                <span className="text-xs font-black text-white uppercase">V2.9 Premium Enterprise</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Industrial Aesthetics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            label: 'Ingresos Pesos',
            value: `$${m.revenueUyu.toLocaleString('es-UY')}`,
            trend: '+12.5%',
            trendLabel: 'VOLUMEN MENSUAL',
            icon: DollarSign,
            color: 'industrial-cyan',
            accent: 'cyan'
          },
          {
            label: 'Ingresos Dólares',
            value: `U$S ${m.revenueUsd.toLocaleString('es-UY')}`,
            trend: '+5.2%',
            trendLabel: 'EXPORTACIÓN / SERVICIOS',
            icon: DollarSign,
            color: 'industrial-magenta',
            accent: 'magenta'
          },
          {
            label: 'Producción Activa',
            value: m.activeOrders,
            trend: 'FLOW',
            trendLabel: 'PEDIDOS EN LÍNEA',
            icon: Package,
            color: 'white',
            accent: 'white'
          },
          {
            label: 'Base de Datos',
            value: m.clientsCount,
            trend: 'LIVE',
            trendLabel: 'CLIENTES REGISTRADOS',
            icon: UsersIcon,
            color: 'emerald-400',
            accent: 'emerald'
          }
        ].map((kpi, i) => (
          <div key={i} className="group relative">
            {/* Outer Glow */}
            <div className={`absolute -inset-0.5 bg-industrial-${kpi.accent === 'white' ? 'cyan' : kpi.accent}/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700`} />
            
            <div className="relative overflow-hidden bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 transition-all duration-500 group-hover:border-white/10 shadow-2xl">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">{kpi.label}</span>
                    <div className="h-0.5 w-6 bg-industrial-cyan/30 rounded-full" />
                  </div>
                  <div className={`p-4 bg-${kpi.color}/5 rounded-2xl text-${kpi.color} border border-${kpi.color}/10 group-hover:scale-110 transition-all duration-500 shadow-lg shadow-${kpi.color}/5`}>
                    <kpi.icon size={24} />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-4xl lg:text-5xl font-black tracking-tighter text-white font-mono leading-none">
                    {kpi.value}
                  </div>
                </div>

                <div className="mt-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${kpi.color} shadow-[0_0_10px_currentColor] animate-pulse`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest text-${kpi.color}`}>{kpi.trend}</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-700">{kpi.trendLabel}</span>
                </div>
              </div>
              
              {/* Background Geometric Accent */}
              <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <kpi.icon size={120} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Performance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Performance Chart */}
        <div className="lg:col-span-2 group relative">
          <div className="absolute -inset-1 bg-industrial-cyan/5 rounded-[3rem] blur-2xl opacity-50" />
          <div className="relative bg-black border border-white/5 rounded-[3.5rem] p-12 overflow-hidden shadow-2xl h-full">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-16">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-industrial-cyan/10 rounded-2xl text-industrial-cyan border border-industrial-cyan/10">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white italic">Rendimiento Financiero</h3>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] mt-1">Análisis de facturación mensual consolidada</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(dot => (
                    <div key={dot} className={`w-1.5 h-1.5 rounded-full ${dot === 1 ? 'bg-industrial-cyan shadow-[0_0_8px_#00AEEF]' : 'bg-white/10'}`} />
                  ))}
                </div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Reporte Live</span>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#333" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={20}
                    fontWeight={900}
                    style={{ letterSpacing: '0.1em' }}
                  />
                  <YAxis 
                    stroke="#333" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value/1000}K`}
                    fontWeight={900}
                    style={{ letterSpacing: '0.1em' }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#00AEEF', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: '#050505', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '24px',
                      padding: '20px',
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(20px)'
                    }}
                    itemStyle={{ color: '#00AEEF', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase' }}
                    labelStyle={{ color: '#555', marginBottom: '8px', fontWeight: 900, fontSize: '10px', letterSpacing: '0.2em' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#00AEEF" 
                    strokeWidth={5}
                    fillOpacity={1} 
                    fill="url(#colorIngresos)" 
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Industrial Status / Efficiency Section */}
        <div className="group relative">
          <div className="absolute -inset-1 bg-industrial-magenta/5 rounded-[3rem] blur-2xl opacity-50" />
          <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] p-12 flex flex-col shadow-2xl h-full overflow-hidden">
            <div className="relative z-10 flex items-center gap-4 mb-12">
              <div className="p-3 bg-industrial-magenta/10 rounded-2xl text-industrial-magenta border border-industrial-magenta/10">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Estado Crítico</h3>
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] mt-1">Monitoreo de línea productiva</p>
              </div>
            </div>
            
            <div className="space-y-12 flex-1 relative z-10">
              {[
                { label: 'PLOTEO VEHICULAR', value: 70, color: 'industrial-cyan', shadow: 'shadow-[0_0_20px_#00AEEF60]' },
                { label: 'DISEÑO ESTRATÉGICO', value: 45, color: 'industrial-magenta', shadow: 'shadow-[0_0_20px_#E6007E60]' },
                { label: 'PRODUCCIÓN CORP.', value: 85, color: 'white', shadow: 'shadow-[0_0_20px_#ffffff40]' }
              ].map((skill, i) => (
                <div key={i} className="space-y-5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{skill.label}</span>
                    <span className="text-sm font-mono font-black text-white">{skill.value}%</span>
                  </div>
                  <div className="h-3 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full bg-${skill.color} ${skill.shadow} transition-all duration-[2500ms] ease-out group-hover:opacity-100 opacity-80`}
                      style={{ width: `${skill.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] relative z-10 backdrop-blur-xl group-hover:border-industrial-cyan/20 transition-all duration-500">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={16} className="text-industrial-cyan animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">IA Predictive Insight</span>
              </div>
              <p className="text-xs text-gray-400 font-bold leading-relaxed italic">
                "Incremento proyectado de demanda: <span className="text-industrial-cyan font-black">+18.4%</span> para el próximo ciclo basado en tendencias de mercado."
              </p>
            </div>

            {/* Industrial Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          </div>
        </div>
      </div>

      {/* Production Management Terminal */}
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-industrial-cyan">
              <Layout size={20} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.6em]">Terminal de Gestión</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none italic">
              FLUJO DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-industrial-cyan to-white">PRODUCCIÓN</span>
            </h2>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-[0.3em]">Monitor central de pedidos en tiempo real</p>
          </div>
          
          <button className="group relative px-10 py-5 bg-white/[0.03] border border-white/10 rounded-[1.5rem] overflow-hidden transition-all hover:bg-white/[0.06] hover:border-white/20 active:scale-95">
            <div className="absolute inset-0 bg-gradient-to-r from-industrial-cyan/0 via-industrial-cyan/10 to-industrial-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.3em] text-white">Acceder al Historial Completo</span>
          </button>
        </div>

        <div className="relative group">
          {/* Advanced Background Glow */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-industrial-cyan/10 via-transparent to-industrial-magenta/10 rounded-[4rem] blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-1000" />
          
          <div className="relative bg-black border border-white/5 rounded-[3.5rem] overflow-hidden p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-industrial-cyan/20 to-transparent" />
            <OrdersTable />
          </div>
        </div>
      </div>
    </div>
  );
}
