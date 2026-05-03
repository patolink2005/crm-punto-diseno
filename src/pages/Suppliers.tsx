import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/suppliers';
import type { Supplier } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Phone, 
  Mail, 
  User, 
  X, 
  Search, 
  Truck, 
  LayoutGrid, 
  List, 
  ArrowUpDown,
  ShieldCheck,
  Package,
  ChevronRight
} from 'lucide-react';

export function Suppliers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Supplier>>({ 
    name: '', 
    contact_name: '', 
    phone: '', 
    email: '', 
    notes: '' 
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: suppliers, isLoading } = useQuery({ 
    queryKey: ['suppliers'], 
    queryFn: supplierService.getAll 
  });

  const filteredSuppliers = suppliers?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone || '').includes(searchTerm)
  ).sort((a, b) => {
    if (sortOrder === 'asc') return a.name.localeCompare(b.name);
    return b.name.localeCompare(a.name);
  });

  const createMutation = useMutation({
    mutationFn: supplierService.create,
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['suppliers'] }); 
      closeModal(); 
    },
    onError: (error: Error) => alert('Error al crear proveedor: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => supplierService.update(id, data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['suppliers'] }); 
      closeModal(); 
    },
    onError: (error: Error) => alert('Error al actualizar proveedor: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (err: Error) => alert('Error al eliminar proveedor: ' + err.message)
  });

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ 
        name: supplier.name, 
        contact_name: supplier.contact_name, 
        phone: supplier.phone, 
        email: supplier.email, 
        notes: supplier.notes 
      });
    } else {
      setEditingSupplier(null);
      setFormData({ 
        name: '', 
        contact_name: '', 
        phone: '', 
        email: '', 
        notes: '' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingSupplier(null); 
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-industrial-cyan">
            <div className="p-2 bg-industrial-cyan/10 rounded-xl backdrop-blur-md border border-industrial-cyan/20">
              <Truck size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Logística & Supply Chain</span>
          </div>
          <h2 className="text-6xl font-black tracking-tighter uppercase leading-none text-white">
            NUESTROS <span className="text-industrial-cyan">PROVEEDORES</span>
          </h2>
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            Gestión estratégica de activos y materias primas industriales
          </p>
        </div>
        
        <button 
          className="group relative flex items-center justify-center gap-4 px-10 py-5 bg-industrial-cyan text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_20px_50px_rgba(0,174,239,0.2)] overflow-hidden"
          onClick={() => openModal()}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Plus size={20} strokeWidth={3} className="relative" />
          <span className="relative">Registrar Proveedor</span>
        </button>
      </div>

      {/* Modern Toolbar */}
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-between">
        <div className="relative group flex-1 w-full max-w-3xl">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-gray-500 group-focus-within:text-industrial-cyan transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR PROVEEDOR, CONTACTO O REGISTRO..." 
            className="w-full pl-16 pr-8 py-6 bg-white/[0.03] border border-white/5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] text-white placeholder:text-gray-700 focus:outline-none focus:border-industrial-cyan/30 focus:bg-white/[0.05] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="flex flex-1 items-center bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-white/5">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-industrial-cyan text-black shadow-lg shadow-industrial-cyan/20' : 'text-gray-500 hover:text-white'}`}
            >
              <List size={14} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-industrial-cyan text-black shadow-lg shadow-industrial-cyan/20' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutGrid size={14} /> Grid
            </button>
          </div>
          
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-6 py-4 bg-white/[0.03] border border-white/5 rounded-[1.5rem] flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-industrial-cyan/20 transition-all group"
          >
            <ArrowUpDown size={14} className={`transition-transform duration-500 text-industrial-cyan group-hover:rotate-180 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>

      {/* Content Engine */}
      <div className="relative">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-8">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-industrial-cyan/5 rounded-full" />
              <div className="absolute inset-0 border-4 border-industrial-cyan/40 border-t-industrial-cyan rounded-full animate-spin" />
              <div className="absolute inset-0 bg-industrial-cyan/10 blur-2xl rounded-full" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-industrial-cyan animate-pulse">Analizando Registros</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredSuppliers?.map(s => (
              <div 
                key={s.id} 
                className="group relative bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-12 hover:bg-zinc-900/20 transition-all duration-700 hover:border-industrial-cyan/20 hover:-translate-y-2 overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-industrial-cyan/5 blur-[60px] rounded-full group-hover:bg-industrial-cyan/10 transition-colors" />
                
                <div className="relative flex flex-col h-full">
                  <div className="flex justify-between items-start mb-12">
                    <div className="p-4 bg-white/5 rounded-2xl text-gray-500 group-hover:bg-industrial-cyan/10 group-hover:text-industrial-cyan transition-all duration-500 shadow-inner ring-1 ring-white/5">
                      <Truck size={32} />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-industrial-cyan hover:bg-industrial-cyan/10 hover:border-industrial-cyan/20 transition-all group/btn" 
                        onClick={() => openModal(s)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-industrial-magenta hover:bg-industrial-magenta/10 hover:border-industrial-magenta/20 transition-all" 
                        onClick={() => { if (confirm('¿Dar de baja este registro?')) deleteMutation.mutate(s.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck size={14} className="text-industrial-cyan" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Proveedor Homologado</span>
                      </div>
                      <h3 className="text-3xl font-black text-white group-hover:text-industrial-cyan transition-colors tracking-tighter uppercase leading-[0.95]">
                        {s.name}
                      </h3>
                    </div>

                    <div className="space-y-4 pt-10 border-t border-white/5">
                      <div className="flex items-center gap-4 group/item">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 group-hover/item:text-industrial-cyan transition-colors">
                          <User size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Contacto Directo</span>
                          <span className="font-black text-xs tracking-tight text-white/90 uppercase">{s.contact_name || 'SIN REFERENTE'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group/item">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 group-hover/item:text-industrial-cyan transition-colors">
                          <Phone size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Línea Operativa</span>
                          <span className="font-mono font-bold text-xs tracking-widest text-white/90">{s.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 group/item">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 group-hover/item:text-industrial-cyan transition-colors">
                          <Mail size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Email Corporativo</span>
                          <span className="font-bold text-xs tracking-tight text-white/90 truncate max-w-[180px]">{s.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {s.notes && (
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] group-hover:bg-white/[0.04] transition-all">
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed line-clamp-3">
                          {s.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-industrial-cyan/10 to-transparent rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative overflow-hidden bg-[#0a0a0a] border border-white/5 rounded-[3rem] shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Corporación</th>
                      <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Representante</th>
                      <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Comunicaciones</th>
                      <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 text-right">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSuppliers?.map(s => (
                      <tr key={s.id} className="group/row hover:bg-white/[0.01] transition-all">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-gray-600 group-hover/row:bg-industrial-cyan/10 group-hover/row:text-industrial-cyan transition-all ring-1 ring-white/5">
                              <Truck size={24} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-black text-white group-hover/row:text-industrial-cyan transition-colors uppercase tracking-tight">{s.name}</span>
                              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">ID SISTEMA: {s.id.slice(0,12)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-industrial-cyan shadow-[0_0_10px_rgba(0,174,239,0.5)] animate-pulse" />
                            <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{s.contact_name || 'PENDIENTE'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 hover:text-white transition-colors">
                              <Mail size={12} className="text-industrial-cyan" />
                              {s.email || 'N/A'}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 hover:text-white transition-colors">
                              <Phone size={12} className="text-industrial-cyan" />
                              {s.phone || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex justify-end gap-3">
                            <button 
                              className="p-3 bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-industrial-cyan/10 hover:border-industrial-cyan/20 rounded-xl transition-all"
                              onClick={() => openModal(s)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="p-3 bg-white/5 border border-white/10 text-gray-500 hover:text-industrial-magenta hover:bg-industrial-magenta/10 hover:border-industrial-magenta/20 rounded-xl transition-all"
                              onClick={() => { if (confirm('¿Eliminar registro?')) deleteMutation.mutate(s.id); }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Engine */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-y-auto py-10">
          <div className="fixed inset-0 bg-[#050505]/95 backdrop-blur-3xl transition-opacity duration-700" onClick={closeModal} />
          <div className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-[4rem] p-12 md:p-20 shadow-[0_40px_120px_rgba(0,0,0,0.9)] animate-in zoom-in-95 fade-in duration-500">
            {/* Ambient Background for Modal */}
            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-industrial-cyan/30 to-transparent" />
            
            <div className="flex justify-between items-start mb-16">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-industrial-cyan">
                  <div className="p-2 bg-industrial-cyan/10 rounded-lg backdrop-blur-md">
                    <Package size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em]">Protocolo de Registro</span>
                </div>
                <h3 className="text-5xl font-black text-white uppercase tracking-tighter leading-[0.9]">
                  {editingSupplier ? 'EDITAR' : 'NUEVO'} <br />
                  <span className="text-industrial-cyan">PROVEEDOR</span>
                </h3>
              </div>
              <button 
                className="p-5 bg-white/5 hover:bg-industrial-magenta/20 text-gray-500 hover:text-industrial-magenta rounded-3xl transition-all group active:scale-90 border border-white/5" 
                onClick={closeModal}
              >
                <X size={28} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 px-2 flex items-center gap-2">
                  <Truck size={12} className="text-industrial-cyan" /> Razón Social / Empresa
                </label>
                <input 
                  className="w-full px-10 py-7 bg-white/[0.03] border border-white/5 rounded-[2rem] text-white font-black text-lg tracking-tighter focus:outline-none focus:border-industrial-cyan/40 focus:bg-white/[0.05] transition-all uppercase placeholder:text-zinc-800 ring-1 ring-white/5 focus:ring-industrial-cyan/20"
                  value={formData.name || ''} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                  placeholder="NOMBRE CORPORATIVO"
                />
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 px-2 flex items-center gap-2">
                  <User size={12} className="text-industrial-cyan" /> Referente Operativo
                </label>
                <input 
                  className="w-full px-10 py-7 bg-white/[0.03] border border-white/5 rounded-[2rem] text-white font-bold tracking-widest focus:outline-none focus:border-industrial-cyan/40 focus:bg-white/[0.05] transition-all uppercase placeholder:text-zinc-800 ring-1 ring-white/5"
                  value={formData.contact_name || ''} 
                  onChange={e => setFormData({ ...formData, contact_name: e.target.value })} 
                  placeholder="NOMBRE DEL CONTACTO"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 px-2 flex items-center gap-2">
                  <Phone size={12} className="text-industrial-cyan" /> Teléfono
                </label>
                <input 
                  className="w-full px-10 py-7 bg-white/[0.03] border border-white/5 rounded-[2rem] text-white font-mono font-bold tracking-[0.2em] focus:outline-none focus:border-industrial-cyan/40 focus:bg-white/[0.05] transition-all placeholder:text-zinc-800 ring-1 ring-white/5"
                  value={formData.phone || ''} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="+00 000..."
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 px-2 flex items-center gap-2">
                  <Mail size={12} className="text-industrial-cyan" /> Email
                </label>
                <input 
                  className="w-full px-10 py-7 bg-white/[0.03] border border-white/5 rounded-[2rem] text-white font-bold tracking-widest focus:outline-none focus:border-industrial-cyan/40 focus:bg-white/[0.05] transition-all placeholder:text-zinc-800 ring-1 ring-white/5 uppercase"
                  type="email" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="CORREO@EMPRESA.COM"
                />
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 px-2 flex items-center gap-2">
                  <ShieldCheck size={12} className="text-industrial-cyan" /> Notas Técnicas
                </label>
                <textarea 
                  className="w-full px-10 py-7 bg-white/[0.03] border border-white/5 rounded-[2.5rem] text-white font-medium focus:outline-none focus:border-industrial-cyan/40 focus:bg-white/[0.05] transition-all resize-none placeholder:text-zinc-800 h-40 ring-1 ring-white/5"
                  value={formData.notes || ''} 
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                  placeholder="ESPECIFICACIONES DE LOGÍSTICA O ACUERDOS..."
                />
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 pt-10">
                <button 
                  type="button" 
                  className="flex-1 py-8 border border-white/10 text-gray-500 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white/5 hover:text-white transition-all active:scale-95" 
                  onClick={closeModal}
                >
                  ABORTAR
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-8 bg-industrial-cyan text-black rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] hover:brightness-110 transition-all shadow-[0_25px_60px_rgba(0,174,239,0.3)] active:scale-95 group"
                >
                  {editingSupplier ? 'ACTUALIZAR REGISTRO' : 'CONFIRMAR ALTA'}
                  <ChevronRight size={18} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
