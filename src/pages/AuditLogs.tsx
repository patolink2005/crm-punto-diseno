import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../services/audit';
import { 
  ShieldAlert, 
  History, 
  Search, 
  Database, 
  Eye, 
  AlertCircle,
  Clock,
  Terminal,
  Activity,
  Filter,
  X
} from 'lucide-react';

import type { AuditLog } from '../types/audit';

export function AuditLogs() {
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: () => auditService.getLogs(limit),
  });

  const filteredLogs = logs?.filter((log: AuditLog) => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.table_name?.toLowerCase().includes(filter.toLowerCase()) ||
    log.record_id?.toLowerCase().includes(filter.toLowerCase())
  );

  const getSeverityColor = (action: string): string => {
    if (action.toLowerCase().includes('error') || action.toLowerCase().includes('fail')) return 'text-industrial-magenta bg-industrial-magenta/10 border-industrial-magenta/20';
    if (action.toLowerCase().includes('delete')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    if (action.toLowerCase().includes('update')) return 'text-industrial-cyan bg-industrial-cyan/10 border-industrial-cyan/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Cinematic Header */}
      <div className="relative overflow-hidden rounded-[3rem] p-12 bg-black border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-industrial-magenta/5 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-industrial-cyan/5 blur-[100px] -ml-20 -mb-20 pointer-events-none" />
        
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                <div className="w-2 h-2 rounded-full bg-industrial-magenta shadow-[0_0_10px_#E6007E]" />
                <div className="w-2 h-2 rounded-full bg-industrial-magenta/30" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">Security & Operational Intelligence</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">
                REGISTROS DE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-industrial-magenta via-white to-industrial-cyan">AUDITORÍA</span>
              </h1>
              <div className="flex items-center gap-6 pt-4">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                  <ShieldAlert size={16} className="text-industrial-magenta" />
                  Nivel de Amenaza: <span className="text-green-500 font-mono uppercase tracking-widest">Nominal</span>
                </p>
                <div className="h-4 w-[1px] bg-white/10" />
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                  Monitoreo: <span className="text-white font-mono animate-pulse uppercase">Activo</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-industrial-cyan transition-colors" size={18} />
              <input 
                type="text"
                placeholder="FILTRAR EVENTOS..."
                className="pl-14 pr-8 py-6 bg-white/[0.02] border border-white/5 rounded-[2rem] text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-industrial-cyan/30 transition-all w-[300px] placeholder:text-gray-700"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Statistics */}
        <div className="space-y-8">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-industrial-magenta/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-industrial-magenta mb-8 flex items-center gap-3">
                <Activity size={14} strokeWidth={3} /> Diagnóstico de Sistema
              </h3>
              <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Total Eventos</span>
                    <span className="text-2xl font-black text-white">{logs?.length || 0}</span>
                  </div>
                  <History className="text-industrial-cyan" size={24} />
                </div>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Errores Detectados</span>
                    <span className="text-2xl font-black text-industrial-magenta">
                      {logs?.filter(l => l.action.toLowerCase().includes('error')).length || 0}
                    </span>
                  </div>
                  <AlertCircle className="text-industrial-magenta" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-industrial-cyan/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-industrial-cyan mb-8 flex items-center gap-3">
                <Database size={14} strokeWidth={3} /> Configuración de Red
              </h3>
              <div className="space-y-4">
                <button 
                  onClick={() => setLimit(100)}
                  className={`w-full py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${limit === 100 ? 'bg-industrial-cyan text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                >
                  Últimos 100 Registros
                </button>
                <button 
                  onClick={() => setLimit(500)}
                  className={`w-full py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${limit === 500 ? 'bg-industrial-cyan text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                >
                  Últimos 500 Registros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Log Terminal */}
        <div className="lg:col-span-3">
          <div className="relative bg-black border border-white/5 rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl h-full min-h-[600px]">
            <div className="p-10 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-industrial-magenta/10 rounded-xl text-industrial-magenta">
                  <Terminal size={18} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">Terminal de Eventos Críticos</h3>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] font-black text-gray-600 uppercase tracking-widest">
                Nodes: SUPABASE-SA-1
              </div>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Timestamp</th>
                    <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Acción / Evento</th>
                    <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Entidad</th>
                    <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">ID Registro</th>
                    <th className="px-10 py-6 text-center text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center">
                        <div className="w-12 h-12 border-4 border-industrial-magenta/20 border-t-industrial-magenta rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredLogs?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center opacity-20">
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">No se detectaron eventos con los criterios actuales</span>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs?.map((log: AuditLog) => (
                      <tr key={log.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                            <Clock size={12} />
                            {new Date(log.created_at).toLocaleString('es-UY')}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getSeverityColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-[11px] font-black text-white uppercase tracking-tighter">
                          {log.table_name || 'SISTEMA'}
                        </td>
                        <td className="px-10 py-6 font-mono text-[10px] text-industrial-cyan">
                          {log.record_id ? log.record_id.slice(0, 8) + '...' : 'N/A'}
                        </td>
                        <td className="px-10 py-6 text-center">
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl border ${getSeverityColor(selectedLog.action)}`}>
                  <Terminal size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedLog.action}</h2>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-1">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Tabla</span>
                  <span className="text-sm font-black text-white uppercase">{selectedLog.table_name || 'Global'}</span>
                </div>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Usuario ID</span>
                  <span className="text-sm font-black text-industrial-cyan uppercase font-mono">{selectedLog.user_id?.slice(0, 12) || 'SYSTEM'}</span>
                </div>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Timestamp</span>
                  <span className="text-sm font-black text-white">{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-industrial-magenta flex items-center gap-3">
                  <Filter size={14} /> Payload / Detalles
                </h3>
                <div className="relative p-8 bg-black/50 border border-white/5 rounded-3xl font-mono text-xs overflow-auto max-h-[400px] custom-scrollbar">
                  <pre className="text-industrial-cyan">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
