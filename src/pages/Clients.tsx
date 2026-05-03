import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientInput } from '../lib/schemas';
import { clientService } from '../services/clients';
import type { Client } from '../types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  User, 
  Users,
  Mail, 
  Phone, 
  LayoutGrid, 
  List, 
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Clients() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', status: 'potencial' }
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getAll
  });

  const filteredClients = (clients || [])?.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortOrder === 'asc') return a.name.localeCompare(b.name);
    return b.name.localeCompare(a.name);
  });

  const createMutation = useMutation({
    mutationFn: clientService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
      toast.success('Cliente creado correctamente');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al crear cliente: ' + msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Client> }) => clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
    },
    onError: (err: Error) => {
      alert('Error al actualizar cliente: ' + (err.message || 'Error desconocido'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clientService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    onError: (err: Error) => {
      alert('Error al eliminar cliente: ' + (err.message || 'Error desconocido'));
    }
  });

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      reset({ 
        name: client.name, 
        email: client.email || '', 
        phone: client.phone || '', 
        status: client.status || 'potencial' 
      });
    } else {
      setEditingClient(null);
      reset({ name: '', email: '', phone: '', status: 'potencial' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    reset();
  };

  const onFormSubmit: SubmitHandler<ClientInput> = (data) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'activo': return {
        label: 'Activo',
        classes: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        icon: <CheckCircle2 size={12} />
      };
      case 'potencial': return {
        label: 'Potencial',
        classes: 'text-[#00D2FF] bg-[#00D2FF]/10 border-[#00D2FF]/20',
        icon: <Target size={12} />
      };
      default: return {
        label: 'Inactivo',
        classes: 'text-white/20 bg-white/5 border-white/10',
        icon: <Clock size={12} />
      };
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-[#00D2FF]/10 rounded-2xl border border-[#00D2FF]/20 text-[#00D2FF]">
              <Users size={28} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
              Base de <span className="text-[#00D2FF]">Clientes</span>
            </h1>
          </div>
          <p className="text-white/30 text-sm font-medium tracking-wide">Gestión centralizada de socios estratégicos y clientes potenciales.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-[#00D2FF] text-black shadow-lg shadow-[#00D2FF]/20' : 'text-white/40 hover:text-white'}`}
              title="Vista de Lista"
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-[#00D2FF] text-black shadow-lg shadow-[#00D2FF]/20' : 'text-white/40 hover:text-white'}`}
              title="Vista de Cuadrícula"
            >
              <LayoutGrid size={20} />
            </button>
          </div>

          <button 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#E6007E] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#E6007E]/20"
            onClick={() => openModal()}
          >
            <Plus size={20} strokeWidth={3} /> Nuevo Registro
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#00D2FF] transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR POR NOMBRE, EMAIL O TELÉFONO..." 
            className="w-full pl-16 pr-8 py-5 bg-white/[0.02] border border-white/10 rounded-2xl text-[11px] font-black tracking-widest text-white placeholder:text-white/10 focus:outline-none focus:border-[#00D2FF]/30 focus:bg-white/[0.04] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/20">
              <Filter size={16} />
            </div>
            <select 
              className="pl-12 pr-10 py-5 bg-white/[0.02] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none focus:border-[#00D2FF]/30 transition-all appearance-none cursor-pointer min-w-[220px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">TODOS LOS ESTADOS</option>
              <option value="activo">SOLO ACTIVOS</option>
              <option value="potencial">SOLO POTENCIALES</option>
              <option value="inactivo">SOLO INACTIVOS</option>
            </select>
          </div>

          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center gap-3 px-8 py-5 bg-white/[0.02] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/[0.05] transition-all min-w-[180px]"
          >
            <ArrowUpDown size={16} className={`transition-transform duration-500 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            ORDEN: {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-6">
          <div className="w-12 h-12 border-4 border-[#00D2FF]/20 border-t-[#00D2FF] rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00D2FF] animate-pulse">Sincronizando Directorio</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients?.map((client) => {
            const status = getStatusInfo(client.status);
            return (
              <div 
                key={client.id} 
                className="group relative bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:border-white/20 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D2FF]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#00D2FF]/10 transition-colors" />
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 group-hover:text-[#00D2FF] transition-all duration-500 shadow-inner">
                    <User size={28} />
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.classes}`}>
                    {status.icon}
                    {status.label}
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-[#00D2FF] transition-colors truncate tracking-tight mb-1">
                      {client.name}
                    </h3>
                    <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">ID: {client.id.split('-')[0]}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-[11px] font-bold text-white/40 group-hover:text-white/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                        <Mail size={14} />
                      </div>
                      <span className="truncate">{client.email || 'SIN EMAIL'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-white/40 group-hover:text-white/60 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                        <Phone size={14} />
                      </div>
                      <span>{client.phone || 'SIN TELÉFONO'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-3 gap-3 relative z-10">
                  <button 
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 text-white/30 rounded-2xl hover:bg-[#00D2FF]/10 hover:border-[#00D2FF]/20 hover:text-[#00D2FF] transition-all duration-300"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                    title="Ver Ficha"
                  >
                    <ExternalLink size={18} />
                    <span className="text-[8px] font-black uppercase">Ficha</span>
                  </button>
                  <button 
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 text-white/30 rounded-2xl hover:bg-white/10 hover:text-white transition-all duration-300"
                    onClick={() => openModal(client)}
                    title="Editar"
                  >
                    <Edit2 size={18} />
                    <span className="text-[8px] font-black uppercase">Editar</span>
                  </button>
                  <button 
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 text-white/30 rounded-2xl hover:bg-[#E6007E]/10 hover:border-[#E6007E]/20 hover:text-[#E6007E] transition-all duration-300"
                    onClick={() => {
                      if (window.confirm('¿ELIMINAR REGISTRO DE CLIENTE?')) deleteMutation.mutate(client.id);
                    }}
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                    <span className="text-[8px] font-black uppercase">Borrar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/5">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/20">Identidad / Empresa</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/20">Contacto</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/20 text-center">Estado</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients?.map((client) => {
                  const status = getStatusInfo(client.status);
                  return (
                    <tr key={client.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/20 group-hover:text-[#00D2FF] group-hover:scale-110 transition-all duration-500">
                            <User size={22} />
                          </div>
                          <div>
                            <span className="block text-sm font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-tight">{client.name}</span>
                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-1 block">ID: {client.id.split('-')[0]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 text-[11px] font-bold text-white/40 group-hover:text-white/60 transition-colors">
                            <Mail size={12} className="text-white/20" />
                            {client.email || 'N/A'}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-bold text-white/40 group-hover:text-white/60 transition-colors">
                            <Phone size={12} className="text-white/20" />
                            {client.phone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-center">
                          <span className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.classes}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-end gap-3">
                          <button 
                            className="p-3 bg-white/5 border border-white/10 text-white/20 hover:text-[#00D2FF] hover:border-[#00D2FF]/30 rounded-xl transition-all"
                            onClick={() => navigate(`/admin/clients/${client.id}`)}
                            title="Ver Ficha"
                          >
                            <ExternalLink size={18} />
                          </button>
                          <button 
                            className="p-3 bg-white/5 border border-white/10 text-white/20 hover:text-white hover:border-white/20 rounded-xl transition-all"
                            onClick={() => openModal(client)}
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            className="p-3 bg-white/5 border border-white/10 text-white/20 hover:text-[#E6007E] hover:border-[#E6007E]/30 rounded-xl transition-all"
                            onClick={() => {
                              if (window.confirm('¿ELIMINAR REGISTRO DE CLIENTE?')) deleteMutation.mutate(client.id);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredClients?.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-32 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[4rem] text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10 mb-6 border border-white/5">
            <Search size={32} />
          </div>
          <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em] max-w-sm leading-relaxed">
            Sin resultados tácticos para la búsqueda actual.
          </p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={closeModal}></div>
          <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 lg:p-12 shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#E6007E]/5 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">{editingClient ? 'Modificar' : 'Nuevo'} <span className="text-[#00D2FF]">Registro</span></h3>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">Configuración de parámetros del cliente</p>
              </div>
              <button 
                className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white/20 hover:text-[#E6007E] transition-all" 
                onClick={closeModal}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => onFormSubmit(data))} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Nombre Completo / Empresa</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center text-white/10">
                    <User size={20} />
                  </div>
                  <input 
                    type="text" 
                    className={`w-full pl-14 pr-6 py-5 bg-white/[0.03] border ${errors.name ? 'border-red-500/50' : 'border-white/10'} rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#00D2FF]/40 focus:bg-white/[0.05] transition-all placeholder:text-white/10`}
                    {...register('name')}
                    placeholder="EJ: TECNO-INDUSTRIAS S.A."
                  />
                </div>
                {errors.name && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-4">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Email Corporativo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-5 flex items-center text-white/10">
                      <Mail size={20} />
                    </div>
                    <input 
                      type="email" 
                      className={`w-full pl-14 pr-6 py-5 bg-white/[0.03] border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#00D2FF]/40 focus:bg-white/[0.05] transition-all placeholder:text-white/10`}
                      {...register('email')}
                      placeholder="CONTACTO@EMPRESA.COM"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-4">{errors.email.message}</p>}
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Teléfono Móvil</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-5 flex items-center text-white/10">
                      <Phone size={20} />
                    </div>
                    <input 
                      type="text" 
                      className={`w-full pl-14 pr-6 py-5 bg-white/[0.03] border ${errors.phone ? 'border-red-500/50' : 'border-white/10'} rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#00D2FF]/40 focus:bg-white/[0.05] transition-all placeholder:text-white/10`}
                      {...register('phone')}
                      placeholder="+598 ..."
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest ml-4">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Estado de la Relación</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center text-white/10">
                    <Filter size={20} />
                  </div>
                  <select 
                    className="w-full pl-14 pr-12 py-5 bg-white/[0.03] border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-[#00D2FF]/40 transition-all appearance-none uppercase"
                    {...register('status')}
                  >
                    <option value="activo" className="bg-[#0a0a0a]">Relación Activa</option>
                    <option value="potencial" className="bg-[#0a0a0a]">Lead Potencial</option>
                    <option value="inactivo" className="bg-[#0a0a0a]">Inactivo / Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-10">
                <button 
                  type="button" 
                  className="flex-1 py-5 border border-white/10 text-white/30 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all" 
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-5 bg-[#E6007E] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#E6007E]/20"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingClient ? 'Actualizar Base' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
