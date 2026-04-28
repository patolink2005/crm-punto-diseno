import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Shield, ShieldAlert, UserCog, UserPlus, X, Info, Lock, Unlock, CheckCircle, Ban, Users as UsersIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './Clients.css';

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
      // 1. Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // 2. Fetch all clients that are linked to an auth user
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .not('user_id', 'is', null);

      if (clientsError) throw clientsError;

      const userMap = new Map<string, UserAccount>();

      // Merge profiles
      profiles?.forEach(p => {
        userMap.set(p.id, {
          authId: p.id,
          fullName: p.full_name || 'Sin Nombre',
          email: null, // We might not have email in profiles, but we will try to get it from clients if exists
          role: p.role as 'admin' | 'emprendedora',
          isActive: p.is_active,
          mfaEnabled: p.mfa_enabled,
          profileId: p.id,
          clientId: null
        });
      });

      // Merge clients
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
        // If changing TO cliente, we remove them from profiles
        if (user.profileId) {
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.profileId);
          if (deleteError) throw deleteError;
        }
        
        // If they don't have a client record, create one
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
        // Changing TO admin or emprendedora
        // We upsert into profiles
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
    <div style={{ padding: '0 1rem' }}>
      <div className="page-header">
        <div>
          <h2>Cuentas de Usuarios</h2>
          <p className="text-secondary text-sm">Administra los accesos al sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInviteInfo(true)}>
          <UserPlus size={18} /> Agregar Miembro
        </button>
      </div>

      {showInviteInfo && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Cómo Agregar un Miembro</h3>
              <button className="btn-close" onClick={() => setShowInviteInfo(false)}><X size={18} /></button>
            </div>
            <div style={{ lineHeight: 1.6 }}>
              <p>Para agregar un nuevo miembro al equipo o un cliente:</p>
              <ol style={{ paddingLeft: '1.25rem' }}>
                <li>Comparte la URL de la aplicación con el nuevo usuario.</li>
                <li>La persona debe ir a la página de ingreso y hacer clic en <strong>"Regístrate aquí"</strong>.</li>
                <li>Una vez registrado, aparecerá en esta lista automáticamente como <strong>"Cliente"</strong>.</li>
                <li>Puedes cambiarle el rol a "Emprendedora" o "Admin" usando el botón de opciones en su cuenta.</li>
              </ol>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Info size={18} style={{ flexShrink: 0, color: 'var(--primary-color)', marginTop: '2px' }} />
                <div className="text-sm">
                  La autenticación 2FA es opcional y cada usuario puede activarla desde esta pantalla. Solo aplica para miembros del equipo.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowInviteInfo(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel table-container desktop-only">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando usuarios...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Seguridad 2FA</th>
                <th>Estado Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user: UserAccount) => (
                <tr key={user.authId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        background: user.role === 'cliente' 
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold'
                      }}>
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.fullName}</div>
                        {user.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>}
                        {user.authId === currentUser?.id && <span className="badge-role" style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-color)', marginTop: '0.25rem', display: 'inline-block' }}>Tú</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {editingRole === user.authId ? (
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="form-control"
                        style={{ padding: '0.25rem', fontSize: '0.8rem', width: 'auto' }}
                        disabled={updateRoleMutation.isPending}
                        onBlur={() => setEditingRole(null)}
                        autoFocus
                      >
                        <option value="cliente">Cliente</option>
                        <option value="emprendedora">Emprendedora</option>
                        <option value="admin">Administradora</option>
                      </select>
                    ) : (
                      <div onClick={() => setEditingRole(user.authId)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {user.role === 'admin' ? (
                          <span className="badge-role" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
                            <ShieldAlert size={14} style={{ marginRight: '0.25rem' }} /> Admin
                          </span>
                        ) : user.role === 'emprendedora' ? (
                          <span className="badge-role" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
                            <UserCog size={14} style={{ marginRight: '0.25rem' }} /> Emprendedora
                          </span>
                        ) : (
                          <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                            <UsersIcon size={14} style={{ marginRight: '0.25rem' }} /> Cliente
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {user.role === 'cliente' ? (
                      <span className="text-secondary text-sm">No aplicable</span>
                    ) : user.mfaEnabled ? (
                      <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                        <Lock size={14} style={{ marginRight: '0.25rem' }} /> Protegido
                      </span>
                    ) : (
                      <span className="badge-role" style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--color-text-secondary)' }}>
                        <Unlock size={14} style={{ marginRight: '0.25rem' }} /> Básico
                      </span>
                    )}
                  </td>
                  <td>
                    {user.isActive ? (
                      <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                        <CheckCircle size={14} style={{ marginRight: '0.25rem' }} /> Activo
                      </span>
                    ) : (
                      <span className="badge-role" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
                        <Ban size={14} style={{ marginRight: '0.25rem' }} /> Inactivo
                      </span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    {user.authId === currentUser?.id ? (
                      <button 
                        className={`btn ${user.mfaEnabled ? 'btn-outline' : 'btn-primary'}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleMfaToggle(user.authId, !!user.mfaEnabled)}
                        disabled={updateMfaMutation.isPending}
                      >
                        {user.mfaEnabled ? 'Desactivar 2FA' : 'Activar 2FA'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className={`btn ${user.isActive ? 'btn-outline' : 'btn-primary'}`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: user.isActive ? 'var(--danger-color)' : undefined, color: user.isActive ? 'var(--danger-color)' : undefined }}
                          onClick={() => handleActiveToggle(user)}
                          disabled={updateActiveMutation.isPending}
                        >
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem 0.5rem' }}
                          disabled={updateRoleMutation.isPending}
                          onClick={() => setEditingRole(user.authId === editingRole ? null : user.authId)}
                          title="Cambiar Rol"
                        >
                          <Shield size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile view - Cards */}
      <div className="mobile-only">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando usuarios...</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {users?.map((user: UserAccount) => (
              <div key={user.authId} className="glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: user.role === 'cliente' 
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold'
                    }}>
                      {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{user.fullName}</div>
                      {user.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>}
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {user.authId === currentUser?.id && <span className="badge-role" style={{ fontSize: '0.6rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-color)' }}>Tú</span>}
                        {user.role !== 'cliente' && (
                          user.mfaEnabled ? (
                            <span className="badge-role" style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>2FA ON</span>
                          ) : (
                            <span className="badge-role" style={{ fontSize: '0.6rem', background: 'rgba(107, 114, 128, 0.1)', color: 'var(--color-text-secondary)' }}>2FA OFF</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  {editingRole === user.authId ? (
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="form-control"
                      style={{ padding: '0.25rem', fontSize: '0.7rem', width: 'auto' }}
                      disabled={updateRoleMutation.isPending}
                      onBlur={() => setEditingRole(null)}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="emprendedora">Emprendedora</option>
                      <option value="admin">Administradora</option>
                    </select>
                  ) : (
                    <div onClick={() => setEditingRole(user.authId)}>
                      {user.role === 'admin' ? (
                        <span className="badge-role" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>Admin</span>
                      ) : user.role === 'emprendedora' ? (
                        <span className="badge-role" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>Emprendedora</span>
                      ) : (
                        <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>Cliente</span>
                      )}
                    </div>
                  )}
                </div>
                
                {user.authId === currentUser?.id ? (
                  <button 
                    className={`btn ${user.mfaEnabled ? 'btn-outline' : 'btn-primary'}`}
                    style={{ width: '100%' }}
                    onClick={() => handleMfaToggle(user.authId, !!user.mfaEnabled)}
                    disabled={updateMfaMutation.isPending}
                  >
                    {user.mfaEnabled ? <Unlock size={16} /> : <Lock size={16} />} 
                    {user.mfaEnabled ? ' Desactivar 2FA' : ' Activar 2FA'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className={`btn ${user.isActive ? 'btn-outline' : 'btn-primary'}`}
                      style={{ flex: 1, borderColor: user.isActive ? 'var(--danger-color)' : undefined, color: user.isActive ? 'var(--danger-color)' : undefined }}
                      onClick={() => handleActiveToggle(user)}
                      disabled={updateActiveMutation.isPending}
                    >
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ flex: 1 }}
                      disabled={updateRoleMutation.isPending}
                      onClick={() => setEditingRole(user.authId === editingRole ? null : user.authId)}
                    >
                      <Shield size={16} /> Rol
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
