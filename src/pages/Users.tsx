import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { UserPlus, X, Lock, Unlock, CheckCircle, Ban, Mail, Fingerprint, ShieldCheck, ShieldHalf } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface UserAccount {
  authId: string;
  fullName: string;
  email: string | null;
  role: 'admin' | 'emprendedora' | 'cliente';
  isActive: boolean;
  mfaEnabled: boolean;
  profileId: string | null;
  clientId: string | null;
}

export function Users() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.profile);
  const [showInviteInfo, setShowInviteInfo] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['user-accounts'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .not('user_id', 'is', null);

      if (clientsError) throw clientsError;

      const userMap = new Map<string, UserAccount>();

      profiles?.forEach(p => {
        userMap.set(p.id, {
          authId: p.id,
          fullName: p.full_name || 'Sin Nombre',
          email: null,
          role: p.role as 'admin' | 'emprendedora',
          isActive: p.is_active,
          mfaEnabled: p.mfa_enabled,
          profileId: p.id,
          clientId: null
        });
      });

      clients?.forEach(c => {
        if (!c.user_id) return;
        
        if (userMap.has(c.user_id)) {
          const u = userMap.get(c.user_id)!;
          u.clientId = c.id;
          u.email = c.email;
        } else {
          userMap.set(c.user_id, {
            authId: c.user_id,
            fullName: c.name || 'Sin Nombre',
            email: c.email,
            role: 'cliente',
            isActive: c.status === 'activo',
            mfaEnabled: false,
            profileId: null,
            clientId: c.id
          });
        }
      });

      return Array.from(userMap.values());
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ user, newRole }: { user: UserAccount, newRole: 'admin' | 'emprendedora' | 'cliente' }) => {
      if (newRole === 'cliente') {
        if (user.profileId) {
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.profileId);
          if (deleteError) throw deleteError;
        }
        
        if (!user.clientId) {
          const { error: insertClientError } = await supabase
            .from('clients')
            .insert([{
              user_id: user.authId,
              name: user.fullName,
              email: user.email || '',
              status: 'activo'
            }]);
          if (insertClientError) throw insertClientError;
        }
      } else {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert([{
            id: user.authId,
            full_name: user.fullName,
            role: newRole,
            is_active: user.isActive,
            mfa_enabled: user.mfaEnabled
          }]);
        if (upsertError) throw upsertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
      setEditingRole(null);
    },
    onError: (err: Error) => {
      alert('Error al actualizar el rol: ' + err.message);
    }
  });

  const updateMfaMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string, enabled: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ mfa_enabled: enabled })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
    },
    onError: (err: Error) => {
      alert('Error al actualizar seguridad: ' + err.message);
    }
  });
  
  const updateActiveMutation = useMutation({
    mutationFn: async ({ user, active }: { user: UserAccount, active: boolean }) => {
      if (user.role === 'cliente' && user.clientId) {
        const { error } = await supabase
          .from('clients')
          .update({ status: active ? 'activo' : 'inactivo' })
          .eq('id', user.clientId);
        if (error) throw error;
      } else if (user.profileId) {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: active })
          .eq('id', user.profileId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
    },
    onError: (err: Error) => {
      alert('Error al actualizar estado de cuenta: ' + err.message);
    }
  });

  const handleRoleChange = (user: UserAccount, newRole: string) => {
    if (user.authId === currentUser?.id) {
      alert('No puedes cambiar tu propio rol por seguridad.');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de convertir esta cuenta en ${newRole.toUpperCase()}?`)) {
      updateRoleMutation.mutate({ user, newRole: newRole as 'admin' | 'emprendedora' | 'cliente' });
    }
  };

  const handleMfaToggle = (id: string, currentlyEnabled: boolean) => {
    const action = currentlyEnabled ? 'desactivar' : 'activar';
    if (window.confirm(`¿Quieres ${action} la verificación de dos pasos (2FA)?`)) {
      updateMfaMutation.mutate({ id, enabled: !currentlyEnabled });
    }
  };

  const handleActiveToggle = (user: UserAccount) => {
    if (user.authId === currentUser?.id) {
      alert('No puedes desactivar tu propia cuenta.');
      return;
    }
    const action = user.isActive ? 'desactivar' : 'activar';
    if (window.confirm(`¿Quieres ${action} esta cuenta? El usuario ${user.isActive ? 'perderá' : 'recuperará'} el acceso al sistema.`)) {
      updateActiveMutation.mutate({ user, active: !user.isActive });
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header with Glassmorphism */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-industrial-magenta/10 to-transparent rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 p-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-industrial-magenta/20 rounded-2xl text-industrial-magenta shadow-[0_0_20px_rgba(230,0,126,0.2)]">
                <ShieldCheck size={28} strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                GESTIÓN DE <span className="text-industrial-magenta">USUARIOS</span>
              </h1>
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] ml-16">
              Protocolos de seguridad y control de privilegios.
            </p>
          </div>
          
          <button 
            onClick={() => setShowInviteInfo(true)}
            className="group relative flex items-center justify-center gap-3 bg-industrial-magenta text-white px-8 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_30px_rgba(230,0,126,0.2)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <UserPlus size={18} strokeWidth={3} className="relative z-10" />
            <span className="relative z-10">Expandir Equipo</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-b from-white/5 to-transparent rounded-[3rem] blur-sm opacity-50" />
        <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-10 py-8 text-[9px] font-black uppercase tracking-[0.5em] text-gray-500">Miembro / Identidad</th>
                  <th className="px-10 py-8 text-[9px] font-black uppercase tracking-[0.5em] text-gray-500">Rango de Acceso</th>
                  <th className="px-10 py-8 text-[9px] font-black uppercase tracking-[0.5em] text-gray-500">Blindaje 2FA</th>
                  <th className="px-10 py-8 text-[9px] font-black uppercase tracking-[0.5em] text-gray-500 text-center">Estado Operativo</th>
                  <th className="px-10 py-8 text-[9px] font-black uppercase tracking-[0.5em] text-gray-500 text-right">Controles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-industrial-magenta border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(230,0,126,0.2)]" />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] animate-pulse">Sincronizando Directorio</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users?.map((user: UserAccount) => {
                    const isSelf = user.authId === currentUser?.id;
                    const roleStyles = {
                      admin: 'text-industrial-magenta bg-industrial-magenta/10 border-industrial-magenta/20',
                      emprendedora: 'text-industrial-cyan bg-industrial-cyan/10 border-industrial-cyan/20',
                      cliente: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    };

                    return (
                      <tr key={user.authId} className="group hover:bg-white/[0.01] transition-all duration-500">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 transition-all duration-500 ${
                                user.role === 'admin' 
                                  ? 'border-industrial-magenta/30 bg-industrial-magenta/10 text-industrial-magenta' 
                                  : 'border-white/5 bg-white/[0.02] text-gray-500 group-hover:border-industrial-cyan/30'
                              }`}>
                                {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-black text-white/90 flex items-center gap-3">
                                {user.fullName}
                                {isSelf && (
                                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-industrial-magenta text-white font-black uppercase tracking-tighter">MÍ</span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight flex items-center gap-2">
                                <Mail size={12} className="text-gray-700" />
                                {user.email || 'Sin vínculo'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8">
                          {editingRole === user.authId ? (
                            <select 
                              value={user.role} 
                              onChange={(e) => handleRoleChange(user, e.target.value)}
                              className="bg-black border border-industrial-cyan/30 rounded-xl px-4 py-2 text-[10px] font-black text-white focus:outline-none focus:ring-2 focus:ring-industrial-cyan/20 transition-all"
                              disabled={updateRoleMutation.isPending}
                              onBlur={() => setEditingRole(null)}
                              autoFocus
                            >
                              <option value="cliente">Cliente</option>
                              <option value="emprendedora">Emprendedora</option>
                              <option value="admin">Administradora</option>
                            </select>
                          ) : (
                            <button 
                              onClick={() => !isSelf && setEditingRole(user.authId)}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border-2 transition-all duration-300 ${roleStyles[user.role]} ${!isSelf && 'hover:scale-105 active:scale-95'}`}
                            >
                              {user.role}
                            </button>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          {user.role === 'cliente' ? (
                            <span className="text-[9px] font-black text-gray-800 uppercase tracking-[0.4em]">Protección N/A</span>
                          ) : (
                            <div className="flex items-center gap-3">
                              {user.mfaEnabled ? (
                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/5 px-3 py-1.5 rounded-lg border border-emerald-400/10 shadow-[0_0_15px_rgba(52,211,153,0.05)]">
                                  <Lock size={14} strokeWidth={3} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">ENCRIPTADO</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-400/50 bg-red-400/5 px-3 py-1.5 rounded-lg border border-red-400/10">
                                  <Unlock size={14} strokeWidth={3} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.1em]">VULNERABLE</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${user.isActive ? 'text-emerald-400' : 'text-red-500'}`}>
                              {user.isActive ? 'OPERATIVO' : 'RESTRINGIDO'}
                            </span>
                            <div className={`w-12 h-1 rounded-full ${user.isActive ? 'bg-emerald-400/20' : 'bg-red-500/20'}`}>
                              <div className={`h-full rounded-full ${user.isActive ? 'bg-emerald-400 w-full shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-red-500 w-1/3'}`} />
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex justify-end gap-3">
                            {isSelf ? (
                              <button 
                                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border ${user.mfaEnabled ? 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10' : 'bg-emerald-500 border-emerald-400 text-black hover:scale-105 active:scale-95 shadow-[0_10px_20px_rgba(16,185,129,0.2)]'}`}
                                onClick={() => handleMfaToggle(user.authId, !!user.mfaEnabled)}
                                disabled={updateMfaMutation.isPending}
                              >
                                {user.mfaEnabled ? 'RECONFIGURAR 2FA' : 'BLINDAR CUENTA'}
                              </button>
                            ) : (
                              <>
                                <button 
                                  className={`p-3 rounded-2xl border transition-all duration-300 ${user.isActive ? 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'}`}
                                  onClick={() => handleActiveToggle(user)}
                                  disabled={updateActiveMutation.isPending}
                                  title={user.isActive ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                                >
                                  {user.isActive ? <Ban size={20} /> : <CheckCircle size={20} />}
                                </button>
                                <button 
                                  className="p-3 bg-white/[0.02] border border-white/5 text-gray-500 hover:text-industrial-cyan hover:border-industrial-cyan/30 hover:bg-industrial-cyan/5 rounded-2xl transition-all duration-300"
                                  disabled={updateRoleMutation.isPending}
                                  onClick={() => setEditingRole(user.authId === editingRole ? null : user.authId)}
                                  title="Cambiar Privilegios"
                                >
                                  <Fingerprint size={20} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern Industrial Invite Modal */}
      {showInviteInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-12">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-700" onClick={() => setShowInviteInfo(false)} />
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-industrial-magenta/10 to-transparent">
              <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">
                  PROTOCOLO DE <span className="text-industrial-magenta">INCORPORACIÓN</span>
                </h3>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.5em] mt-2">Seguridad de nivel industrial</p>
              </div>
              <button 
                onClick={() => setShowInviteInfo(false)}
                className="p-4 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl transition-all border border-white/10 hover:rotate-90"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="grid gap-6">
                {[
                  { step: "01", text: "Proporcione la URL corporativa al nuevo integrante del equipo." },
                  { step: "02", text: "El usuario debe completar el registro mediante autenticación biométrica o correo." },
                  { step: "03", text: "El sistema lo clasificará automáticamente con nivel de acceso 'Cliente'." },
                  { step: "04", text: "Eleve los privilegios aquí para otorgar acceso a herramientas industriales." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 p-6 bg-white/[0.01] border border-white/5 rounded-[1.5rem] group hover:border-industrial-magenta/20 transition-all duration-500">
                    <span className="text-3xl font-black italic text-industrial-magenta/20 group-hover:text-industrial-magenta transition-colors">{item.step}</span>
                    <p className="text-gray-400 text-sm leading-relaxed font-bold group-hover:text-white/90 transition-colors">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-industrial-cyan/10 border border-industrial-cyan/20 rounded-[2rem] flex gap-6 items-center">
                <div className="p-3 bg-industrial-cyan/20 rounded-xl text-industrial-cyan">
                  <ShieldHalf size={24} />
                </div>
                <p className="text-[10px] text-industrial-cyan font-black uppercase tracking-[0.15em] leading-relaxed">
                  IMPORTANTE: Todo personal con rango superior a 'Cliente' tiene la obligación contractual de mantener activo el blindaje MFA (2FA).
                </p>
              </div>
            </div>

            <div className="p-10 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button 
                onClick={() => setShowInviteInfo(false)}
                className="group relative bg-industrial-magenta text-white px-12 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_15px_40px_rgba(230,0,126,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                <span className="relative z-10">Confirmar Protocolo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

