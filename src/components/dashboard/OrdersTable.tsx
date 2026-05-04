import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Eye, Edit2, Filter, Loader2, ChevronRight, Package, User, Clock } from 'lucide-react';
import { OrderDetailModal } from '../orders/OrderDetailModal';

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export const OrdersTable: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: stages } = useQuery({

    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as PipelineStage[];
    }
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['dashboard-orders-list', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          balance_due,
          design_url,
          notes,
          created_at,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getStatusBadge = (slug: string) => {
    const stage = stages?.find(s => s.slug === slug);
    if (!stage) return <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-gray-500 uppercase">INDEFINIDO</span>;
    
    return (
      <span 
        className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border transition-all shadow-sm"
        style={{ 
          backgroundColor: `${stage.color}15`, 
          color: stage.color,
          borderColor: `${stage.color}30` 
        }}
      >
        {stage.name}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Table Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4">
        <div className="flex flex-wrap gap-3">
          <button 
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
              statusFilter === 'todos' 
                ? 'bg-industrial-cyan border-industrial-cyan text-black shadow-[0_0_20px_-5px_rgba(0,174,239,0.5)]' 
                : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20 hover:text-white'
            }`}
            onClick={() => setStatusFilter('todos')}
          >
            Todos los Pedidos
          </button>
          {stages?.slice(0, 5).map(stage => (
            <button
              key={stage.id}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                statusFilter === stage.slug 
                  ? 'bg-white border-white text-black shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]' 
                  : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/20 hover:text-white'
              }`}
              onClick={() => setStatusFilter(stage.slug)}
            >
              {stage.name}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
          <Filter size={14} className="text-industrial-cyan" />
          Monitoreo Activo
        </div>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center text-gray-500 gap-6">
          <div className="relative">
            <Loader2 className="animate-spin text-industrial-cyan" size={40} />
            <div className="absolute inset-0 bg-industrial-cyan/20 blur-xl rounded-full" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Sincronizando flujo de datos...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[2.5rem] border border-white/5 bg-[#050505]/50 backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">ID Terminal</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Operador / Cliente</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Estado Producción</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Cierre Estimado</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders && orders.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                orders.map((order: any) => (
                  <tr 
                    key={order.id} 
                    className="group hover:bg-white/[0.02] transition-all cursor-pointer relative"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-gray-500 group-hover:text-industrial-cyan transition-colors">
                          <Package size={16} />
                        </div>
                        <span className="text-sm font-black font-mono text-white tracking-tighter group-hover:text-industrial-cyan transition-colors">
                          #{order.order_number || order.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500">
                          <User size={14} />
                        </div>
                        <div className="text-sm font-bold text-gray-300 tracking-tight">
                          {order.clients?.name || 'Cliente sin nombre'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-bold uppercase tracking-widest">
                        <Clock size={14} className="text-gray-700" />
                        TBD
                      </div>
                    </td>
                    <td className="px-8 py-7 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-500 hover:bg-industrial-cyan hover:text-black transition-all duration-300 shadow-lg" title="Ver detalles">
                          <Eye size={18} />
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-500 hover:bg-industrial-magenta hover:text-white transition-all duration-300 shadow-lg" title="Editar pedido">
                          <Edit2 size={18} />
                        </button>
                        <div className="pl-4">
                          <ChevronRight size={18} className="text-gray-800 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-700">
                        <Filter size={32} />
                      </div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] italic">
                        Cero registros bajo este parámetro de filtrado.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrderId && (
        <OrderDetailModal 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}

    </div>
  );
};
