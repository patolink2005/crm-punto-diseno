import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Download, FileText, Calendar, User, Search, FileCheck, ArrowRight, Clock } from 'lucide-react';
import { formatOrderNumber } from '../services/whatsapp';
import { useState } from 'react';

export function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders')
        .select('*, clients(name, phone)')
        .in('status', ['facturado', 'entregado', 'para_retirar'])
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const filteredInvoices = invoices?.filter(inv => 
    formatOrderNumber(inv).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-industrial-cyan">
            <div className="p-2 bg-industrial-cyan/10 rounded-xl backdrop-blur-md border border-industrial-cyan/20">
              <FileText size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Gestión Financiera</span>
          </div>
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none text-white">
            CENTRAL DE <span className="text-industrial-cyan">FACTURACIÓN</span>
          </h2>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            Auditoría de comprobantes y estados de pago en tiempo real
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96 group">
            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-industrial-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="BUSCAR POR Nº O CLIENTE..." 
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-16 pr-8 py-5 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-industrial-cyan/30 focus:bg-white/[0.05] transition-all placeholder:text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="relative group">
        {/* Cinematic Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-industrial-cyan/10 via-transparent to-industrial-magenta/10 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000" />
        
        <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-industrial-cyan/20 border-t-industrial-cyan rounded-full animate-spin" />
                <div className="absolute inset-0 bg-industrial-cyan/20 blur-xl rounded-full" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">Sincronizando registros financieros...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Documento</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Operador / Cliente</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Registro</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Auditoría de Montos</th>
                    <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 text-right">Operaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredInvoices?.map(inv => (
                    <tr key={inv.id} className="group/row hover:bg-white/[0.01] transition-all">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-2xl text-industrial-cyan group-hover/row:scale-110 transition-transform">
                            <FileCheck size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-mono text-white font-black text-base tracking-tighter">#{formatOrderNumber(inv)}</span>
                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.2em] mt-1">UUID: {inv.id.slice(0,12)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-white/40 border border-white/5 group-hover/row:border-industrial-cyan/30 transition-colors">
                            <User size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm tracking-tight text-white/90 uppercase">{inv.clients?.name || 'Operador Externo'}</span>
                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{inv.clients?.phone || 'Sin contacto'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            <Calendar size={12} className="text-industrial-cyan" />
                            {new Date(inv.created_at).toLocaleDateString('es-UY')}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-[9px] font-bold uppercase tracking-widest">
                            <Clock size={11} />
                            {new Date(inv.created_at).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between max-w-[150px]">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Bruto:</span>
                            <span className="text-sm font-black text-white tracking-tighter">${inv.total.toLocaleString()}</span>
                          </div>
                          <div className="h-px w-full bg-white/5" />
                          <div className="flex items-center justify-between max-w-[150px]">
                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Pendiente:</span>
                            <span className={`text-xs font-black tracking-tighter ${inv.balance_due > 0 ? 'text-industrial-magenta' : 'text-emerald-400'}`}>
                              ${(inv.balance_due || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-industrial-cyan hover:border-industrial-cyan hover:text-black transition-all duration-500 hover:shadow-[0_0_20px_-5px_rgba(0,174,239,0.5)] group/btn"
                            title="Generar Comprobante PDF"
                          >
                            <Download size={14} className="group-hover/btn:translate-y-0.5 transition-transform" /> 
                            Exportar PDF
                          </button>
                          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all">
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(filteredInvoices?.length === 0 || !filteredInvoices) && (
                    <tr>
                      <td colSpan={5} className="px-10 py-40 text-center">
                        <div className="max-w-md mx-auto space-y-6">
                          <div className="relative inline-block">
                            <div className="w-24 h-24 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto text-gray-800">
                              <FileText size={48} />
                            </div>
                            <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">Sin Coincidencias</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700 leading-relaxed italic">
                              {searchTerm ? 'No se detectaron registros para el parámetro ingresado.' : 'La terminal de facturación está a la espera de nuevos cierres de producción.'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

