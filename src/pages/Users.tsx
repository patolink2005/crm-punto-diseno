import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Shield, ShieldAlert, UserCog, UserPlus, X, Info, Lock, Unlock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import './Clients.css'; // Reuse common responsive styles

export function Users() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.profile);
  const [showInviteInfo, setShowInviteInfo] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, newRole }: { id: string, newRole: 'admin' | 'emprendedora' }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (err: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (err: any) => {
      alert('Error al actualizar seguridad: ' + err.message);
    }
  });

  const handleRoleChange = (id: string, currentRole: string) => {
    if (id === currentUser?.id) {
      alert('No puedes cambiar tu propio rol por seguridad.');
      return;
    }
    const newRole = currentRole === 'admin' ? 'emprendedora' : 'admin';
    
    if (window.confirm(`¿Estás seguro de convertir esta cuenta en ${newRole.toUpperCase()}?`)) {
      updateRoleMutation.mutate({ id, newRole });
    }
  };

  const handleMfaToggle = (id: string, currentlyEnabled: boolean) => {
    const action = currentlyEnabled ? 'desactivar' : 'activar';
    if (window.confirm(`¿Quieres ${action} la verificación de dos pasos (2FA)?`)) {
      updateMfaMutation.mutate({ id, enabled: !currentlyEnabled });
    }
  };

  return (
    <div style={{ padding: '0 1rem' }}>
      <div className="page-header">
        <div>
          <h2>Gestión de Equipo y Roles</h2>
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
              <p>Para agregar un nuevo miembro al equipo:</p>
              <ol style={{ paddingLeft: '1.25rem' }}>
                <li>Comparte la URL de la aplicación con el nuevo miembro.</li>
                <li>La persona debe ir a la página de ingreso y hacer clic en <strong>"Regístrate aquí"</strong>.</li>
                <li>Una vez registrado, aparecerá en esta lista automáticamente para que le asignes un rol (Admin o Emprendedora).</li>
              </ol>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <Info size={18} style={{ flexShrink: 0, color: 'var(--primary-color)', marginTop: '2px' }} />
                <div className="text-sm">
                  La autenticación 2FA es opcional y cada usuario puede activarla desde esta pantalla.
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
                <th>Rol Actual</th>
                <th>Seguridad 2FA</th>
                <th>Miembro Desde</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((profile: any) => (
                <tr key={profile.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold'
                      }}>
                        {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{profile.full_name || 'Sin Nombre'}</div>
                        {profile.email && <div className="text-sm text-secondary">{profile.email}</div>}
                        {profile.id === currentUser?.id && <span className="badge-role" style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-color)' }}>Tú</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {profile.role === 'admin' ? (
                      <span className="badge-role" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
                        <ShieldAlert size={14} style={{ marginRight: '0.25rem' }} /> Admin
                      </span>
                    ) : (
                      <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                        <UserCog size={14} style={{ marginRight: '0.25rem' }} /> Emprendedora
                      </span>
                    )}
                  </td>
                  <td>
                    {profile.mfa_enabled ? (
                      <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                        <Lock size={14} style={{ marginRight: '0.25rem' }} /> Protegido
                      </span>
                    ) : (
                      <span className="badge-role" style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--color-text-secondary)' }}>
                        <Unlock size={14} style={{ marginRight: '0.25rem' }} /> Básico
                      </span>
                    )}
                  </td>
                  <td className="text-secondary">
                    {new Date(profile.created_at).toLocaleDateString('es-UY')}
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    {profile.id === currentUser?.id ? (
                      <button 
                        className={`btn ${profile.mfa_enabled ? 'btn-outline' : 'btn-primary'}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleMfaToggle(profile.id, !!profile.mfa_enabled)}
                        disabled={updateMfaMutation.isPending}
                      >
                        {profile.mfa_enabled ? 'Desactivar 2FA' : 'Activar 2FA'}
                      </button>
                    ) : (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem' }}
                        disabled={updateRoleMutation.isPending}
                        onClick={() => handleRoleChange(profile.id, profile.role)}
                      >
                        <Shield size={16} /> Rol
                      </button>
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
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando equipo...</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {profiles?.map((profile: any) => (
              <div key={profile.id} className="glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold'
                    }}>
                      {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{profile.full_name || 'Sin Nombre'}</div>
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {profile.id === currentUser?.id && <span className="badge-role" style={{ fontSize: '0.6rem', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-color)' }}>Tú</span>}
                        {profile.mfa_enabled ? (
                          <span className="badge-role" style={{ fontSize: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>2FA ON</span>
                        ) : (
                          <span className="badge-role" style={{ fontSize: '0.6rem', background: 'rgba(107, 114, 128, 0.1)', color: 'var(--color-text-secondary)' }}>2FA OFF</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {profile.role === 'admin' ? (
                    <span className="badge-role" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>Admin</span>
                  ) : (
                    <span className="badge-role" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>Emprendedora</span>
                  )}
                </div>
                {profile.email && <div className="text-secondary text-sm" style={{ marginBottom: '1rem', wordBreak: 'break-all' }}>{profile.email}</div>}
                
                {profile.id === currentUser?.id ? (
                  <button 
                    className={`btn ${profile.mfa_enabled ? 'btn-outline' : 'btn-primary'}`}
                    style={{ width: '100%' }}
                    onClick={() => handleMfaToggle(profile.id, !!profile.mfa_enabled)}
                    disabled={updateMfaMutation.isPending}
                  >
                    {profile.mfa_enabled ? <Unlock size={16} /> : <Lock size={16} />} 
                    {profile.mfa_enabled ? ' Desactivar 2FA' : ' Activar 2FA'}
                  </button>
                ) : (
                  <button 
                    className="btn btn-outline" 
                    style={{ width: '100%' }}
                    disabled={updateRoleMutation.isPending}
                    onClick={() => handleRoleChange(profile.id, profile.role)}
                  >
                    <Shield size={16} /> Cambiar Nivel de Acceso
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
