import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orders';
import { Download, Trash2, Calendar, FileText, TrendingUp, Activity, Zap, BarChart3 } from 'lucide-react';

export function Reports() {
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['reports-orders'],
    queryFn: async () => {
      const archived = await orderService.getArchived();
      const active = await orderService.getAll();
      return [...active, ...archived];
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => orderService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-orders'] });
    },
    onError: (err: Error) => {
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
      o.clients?.name || 'Desconocido',
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
    link.setAttribute('download', `reporte_contable_${dateRange.start}_a_${dateRange.end}.csv`);
    link.click();
  };

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
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">Módulo de Auditoría Financiera</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">
                INFORMES <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-industrial-cyan via-white to-industrial-magenta">CONTABLES</span>
              </h1>
              <div className="flex items-center gap-6 pt-4">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 size={16} className="text-industrial-cyan" />
                  Estado: <span className="text-white font-mono uppercase tracking-widest">Generando Reporte</span>
                </p>
                <div className="h-4 w-[1px] bg-white/10" />
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                  Periodo: <span className="text-white italic">{dateRange.start} — {dateRange.end}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
            <button 
              onClick={exportReport}
              disabled={!reportData?.length}
              className="group relative px-10 py-6 bg-industrial-cyan text-black rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-[0_10px_40px_rgba(0,210,255,0.3)] hover:scale-[1.02] active:scale-95 overflow-hidden disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Download size={20} strokeWidth={3} />
                Exportar CSV Táctico
              </div>
            </button>

            <div className="px-10 py-6 bg-industrial-magenta/5 backdrop-blur-3xl border border-industrial-magenta/20 rounded-[2rem] flex items-center gap-5 shadow-2xl relative group overflow-hidden">
              <Zap size={24} className="text-industrial-magenta relative z-10 fill-industrial-magenta/20 animate-pulse" />
              <div className="flex flex-col relative z-10">
                <span className="text-[9px] font-black text-industrial-magenta/60 uppercase tracking-widest">Registros Detectados</span>
                <span className="text-xs font-black text-white uppercase">{reportData?.length || 0} Operaciones</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Period Filter Card - Industrial Terminal Style */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-industrial-cyan/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-xl transition-all duration-500 group-hover:border-white/10 shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-industrial-cyan mb-8 flex items-center gap-3">
                <Calendar size={14} strokeWidth={3} /> Filtro Temporal
              </h3>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 px-1">Punto de Inicio</label>
                  <div className="relative group">
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-industrial-cyan/30 transition-all appearance-none" 
                      value={dateRange.start} 
                      onChange={e => setDateRange({ ...dateRange, start: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 px-1">Punto de Cierre</label>
                  <div className="relative group">
                    <input 
                      type="date" 
                      className="w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-industrial-magenta/30 transition-all appearance-none" 
                      value={dateRange.end} 
                      onChange={e => setDateRange({ ...dateRange, end: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Card - High Fidelity */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-industrial-magenta/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-transparent border border-white/5 rounded-[2.5rem] p-10 transition-all duration-500 group-hover:border-white/10 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-industrial-cyan/10 rounded-full blur-[40px] -mr-16 -mt-16" />
              
              <h3 className="relative z-10 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-10">Resumen del Periodo</h3>
              
              <div className="relative z-10 space-y-10">
                <div className="space-y-2">
                  <div className="text-[9px] font-black text-industrial-magenta uppercase tracking-[0.3em] mb-1">Volumen USD</div>
                  <div className="text-4xl font-black font-mono text-white tracking-tighter group-hover:text-industrial-magenta transition-colors">
                    U$S {totals.usd.toLocaleString('es-UY')}
                  </div>
                </div>
                
                <div className="pt-10 border-t border-white/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-industrial-cyan animate-pulse shadow-[0_0_10px_#00AEEF]" />
                    <div className="text-[10px] font-black text-industrial-cyan uppercase tracking-[0.3em]">Consolidado Pesos</div>
                  </div>
                  <div className="text-5xl font-black font-mono text-white tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left duration-500">
                    $ {totalGeneralUyu.toLocaleString('es-UY')}
                  </div>
                  <div className="flex items-center gap-2 text-[8px] font-black text-gray-700 uppercase tracking-[0.4em] italic mt-4">
                    <Activity size={10} />
                    Sincronizado con TC Supabase
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {/* Main Data Terminal */}
          <div className="relative group h-full">
            <div className="absolute -inset-1 bg-gradient-to-tr from-industrial-cyan/5 via-transparent to-industrial-magenta/5 rounded-[3rem] blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-1000" />
            
            <div className="relative h-full bg-black border border-white/5 rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-10 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-industrial-cyan/10 rounded-xl text-industrial-cyan">
                    <TrendingUp size={18} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">Libro de Operaciones Detallado</h3>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] font-black text-gray-600 uppercase tracking-widest">
                  Terminal ID: PD-REP-01
                </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5">
                      <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Fecha Operación</th>
                      <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">ID Pedido</th>
                      <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Operador / Cliente</th>
                      <th className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Importe Bruto</th>
                      <th className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Consolidado UYU</th>
                      <th className="px-10 py-6 text-center text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                              <div className="w-12 h-12 border-4 border-industrial-cyan/20 border-t-industrial-cyan rounded-full animate-spin" />
                              <div className="absolute inset-0 bg-industrial-cyan/20 blur-xl rounded-full" />
                            </div>
                            <span className="text-[10px] font-black text-industrial-cyan uppercase tracking-[0.5em] animate-pulse">Compilando flujo de datos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : reportData?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-32 text-center opacity-20">
                          <div className="max-w-xs mx-auto space-y-6">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                              <FileText size={32} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                              Sin registros tácticos en el rango seleccionado
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      reportData?.map((o) => {
                        const orderNum = o.order_number ? `#${String(o.order_number).padStart(4, '0')}` : o.id.slice(0, 6);
                        const isUsd = o.currency === 'USD';
                        const uyuVal = isUsd ? (o.total_uyu || 0) : o.total;
                        return (
                          <tr key={o.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-3">
                                <Calendar size={14} className="text-gray-700" />
                                <span className="text-[11px] font-black text-gray-500 uppercase">
                                  {new Date(o.created_at).toLocaleDateString('es-UY')}
                                </span>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <span className="text-sm font-black font-mono text-industrial-cyan group-hover:shadow-[0_0_15px_rgba(0,174,239,0.3)] transition-all">
                                {orderNum}
                              </span>
                            </td>
                            <td className="px-10 py-6">
                              <div className="text-sm font-black text-white group-hover:text-industrial-cyan transition-colors uppercase tracking-tight">
                                {o.clients?.name || 'Operador Desconocido'}
                              </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <span className={`text-sm font-black font-mono ${isUsd ? 'text-industrial-magenta' : 'text-white'}`}>
                                {isUsd ? 'U$S' : '$'} {o.total.toLocaleString('es-UY')}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <span className="text-base font-black font-mono text-industrial-cyan">
                                $ {uyuVal.toLocaleString('es-UY')}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <button
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-600 hover:text-industrial-magenta hover:bg-industrial-magenta/10 hover:border-industrial-magenta/20 border border-transparent transition-all duration-300"
                                onClick={() => { if (confirm(`¿ELIMINAR REGISTRO ${orderNum}? Esta acción es irreversible.`)) deleteOrderMutation.mutate(o.id); }}
                                title="Eliminar Registro"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Terminal Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-between items-center text-[8px] font-black text-gray-700 uppercase tracking-[0.5em]">
                <span>Status: Fully Synchronized</span>
                <div className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-industrial-cyan shadow-[0_0_5px_#00AEEF]" />
                  <div className="w-1 h-1 rounded-full bg-industrial-magenta shadow-[0_0_5px_#E6007E]" />
                  <div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

