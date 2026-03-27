import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineService } from '../services/pipeline';
import type { PipelineStage } from '../services/pipeline';
import { Plus, Trash2, GripVertical, Save, X, ArrowUp, ArrowDown, Download, Shield, Palette, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSystemSettings } from '../context/SystemSettingsContext';

export function Settings() {
  const queryClient = useQueryClient();
  const { settings, updateBranding, isUpdating } = useSystemSettings();

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  // Branding local state
  const [brandForm, setBrandForm] = useState({
    app_name: '',
    primary_color: '#6366f1',
    border_radius: '12px',
    logo_url: '',
    background_color: '#0c111d',
    surface_color: '#1a202c',
    text_color: '#f8fafc',
    enforce_deposit_on_move: false,
    whatsapp_new_order_template: '',
    whatsapp_pickup_template: ''
  });

  useEffect(() => {
    if (settings?.branding) {
      setBrandForm({
        app_name: settings.branding.app_name || '',
        primary_color: settings.branding.primary_color || '#6366f1',
        border_radius: settings.branding.border_radius || '12px',
        logo_url: settings.branding.logo_url || '',
        background_color: settings.branding.background_color || '#0c111d',
        surface_color: settings.branding.surface_color || '#1a202c',
        text_color: settings.branding.text_color || '#f8fafc',
        enforce_deposit_on_move: settings.branding.enforce_deposit_on_move || false,
        whatsapp_new_order_template: settings.branding.whatsapp_new_order_template ?? '',
        whatsapp_pickup_template: settings.branding.whatsapp_pickup_template ?? ''
      });
    }
  }, [settings]);

  const { data: stages, isLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages
  });

  const createMutation = useMutation({
    mutationFn: pipelineService.createStage,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }); setNewName(''); setNewSlug(''); },
    onError: (err: Error) => alert('Error al crear etapa: ' + err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PipelineStage> }) => pipelineService.updateStage(id, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }); setEditingId(null); },
    onError: (err: Error) => alert('Error al actualizar etapa: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: pipelineService.deleteStage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
    onError: (err: Error) => alert('Error al eliminar etapa: ' + err.message)
  });

  const reorderMutation = useMutation({
    mutationFn: pipelineService.reorderStages,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
  });

  const handleAdd = () => {
    if (!newName.trim()) return alert('Ingresa un nombre para la etapa');
    const slug = newSlug.trim() || newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const position = (stages?.length || 0) + 1;
    createMutation.mutate({ name: newName, slug, position, color: newColor });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!stages) return;
    const newStages = [...stages];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newStages.length) return;
    [newStages[index], newStages[swapIdx]] = [newStages[swapIdx], newStages[index]];
    const reordered = newStages.map((s, i) => ({ id: s.id, position: i + 1 }));
    reorderMutation.mutate(reordered);
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMsg('');
    try {
      const [clients, orders, orderItems, products, suppliers, pipelineStages] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('order_items').select('*'),
        supabase.from('products_config').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('pipeline_stages').select('*'),
      ]);

      const backup = {
        version: '1.0',
        generated_at: new Date().toISOString(),
        tables: {
          clients: clients.data || [],
          orders: orders.data || [],
          order_items: orderItems.data || [],
          products_config: products.data || [],
          suppliers: suppliers.data || [],
          pipeline_stages: pipelineStages.data || [],
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0'); // Los meses son 0-indexed
      const year = now.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      a.href = url;
      a.download = `crmpunto_backup_${formattedDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(backup.tables).reduce((acc, t) => acc + t.length, 0);
      setBackupMsg(`✅ Respaldo descargado: ${totalRecords} registros en total.`);
    } catch (err) {
      if (err instanceof Error) {
        setBackupMsg('❌ Error al generar respaldo: ' + err.message);
      } else {
        setBackupMsg('❌ Error al generar respaldo: Ha ocurrido un error desconocido.');
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSaveBranding = () => {
    // Generate hover color automatically (darker)
    const primary = brandForm.primary_color;
    // Simple way to get a darker shade: hex to something else or just trust the user will change it?
    // Let's just pass the same or a slightly modified one.
    updateBranding({
      ...brandForm,
      primary_hover: primary // For now same, context could handle complex shade math if needed
    });
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Cargando configuración...</div>;

  return (
    <div style={{ padding: '0 1rem', maxWidth: '800px', paddingBottom: '4rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Configuración</h2>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>Personaliza las etapas del pipeline y otros ajustes del sistema.</p>

      {/* Branding Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Palette size={20} style={{ color: 'var(--primary-color)' }} />
          Personalización (Imagen de Marca)
        </h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
          Define la identidad visual de la aplicación para tu empresa.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre de la Aplicación</label>
            <input
              className="input-base"
              value={brandForm.app_name}
              onChange={e => setBrandForm({ ...brandForm, app_name: e.target.value })}
              placeholder="Ej: Punto Diseño"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Logo URL</label>
            <input
              className="input-base"
              value={brandForm.logo_url}
              onChange={e => setBrandForm({ ...brandForm, logo_url: e.target.value })}
              placeholder="https://ejemplo.com/logo.png"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Color Principal</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={brandForm.primary_color}
                onChange={e => setBrandForm({ ...brandForm, primary_color: e.target.value })}
                style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{brandForm.primary_color}</span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fondo (Body)</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={brandForm.background_color || '#0c111d'}
                onChange={e => setBrandForm({ ...brandForm, background_color: e.target.value })}
                style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{brandForm.background_color || '#0c111d'}</span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Paneles (Surface)</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={brandForm.surface_color || '#1a202c'}
                onChange={e => setBrandForm({ ...brandForm, surface_color: e.target.value })}
                style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{brandForm.surface_color || '#1a202c'}</span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Color de Texto</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="color"
                value={brandForm.text_color || '#f8fafc'}
                onChange={e => setBrandForm({ ...brandForm, text_color: e.target.value })}
                style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              />
              <span className="text-secondary" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{brandForm.text_color || '#f8fafc'}</span>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Redondeado ({brandForm.border_radius})</label>
            <input
              type="range"
              min="0"
              max="24"
              step="2"
              value={parseInt(brandForm.border_radius)}
              onChange={e => setBrandForm({ ...brandForm, border_radius: `${e.target.value}px` })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Security & Workflow Section within Visibility */}
        <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <Shield size={16} style={{ color: 'var(--success-color)' }} />
            Seguridad y Flujo de Trabajo
          </h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Exigir seña para mover pedidos</span>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.75rem' }}>
                Si está activo, no se permitirán mover pedidos desde "Presupuesto" a otros estados sin registrar una seña previa.
              </p>
            </div>
            <input
              type="checkbox"
              checked={brandForm.enforce_deposit_on_move}
              onChange={e => setBrandForm({ ...brandForm, enforce_deposit_on_move: e.target.checked })}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveBranding}
            disabled={isUpdating}
          >
            {isUpdating ? 'Guardando...' : 'Guardar Cambios Visuales'}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} style={{ color: 'var(--primary-color)' }} />
          Plantillas de Notificaciones (WhatsApp)
        </h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
          Personaliza los mensajes automáticos. Puedes usar variables como:
          <code className="text-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>{`{clientName}`}</code>,
          <code className="text-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>{`{orderNumber}`}</code>,
          <code className="text-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>{`{items}`}</code>,
          <code className="text-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>{`{total}`}</code>,
          <code className="text-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>{`{deposit}`}</code>,
          <code className="text-xs" style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px' }}>{`{balance}`}</code>.
        </p>
        <div className="form-group">
          <label className="form-label">Mensaje de Nuevo Pedido</label>
          <textarea
            className="input-base"
            rows={5}
            value={brandForm.whatsapp_new_order_template}
            onChange={e => setBrandForm({ ...brandForm, whatsapp_new_order_template: e.target.value })}
            placeholder="Ej: Hola {clientName}, hemos creado tu pedido {orderNumber} con el siguiente detalle..."
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mensaje de Pedido Listo para Retirar</label>
          <textarea
            className="input-base"
            rows={3}
            value={brandForm.whatsapp_pickup_template}
            onChange={e => setBrandForm({ ...brandForm, whatsapp_pickup_template: e.target.value })}
            placeholder="Ej: ¡Hola {clientName}! Tu pedido {orderNumber} está listo para retirar."
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveBranding}
            disabled={isUpdating}
          >
            {isUpdating ? 'Guardando...' : 'Guardar Plantillas'}
          </button>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Etapas del Pipeline</h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
          Define las etapas por las que pasa cada pedido. Usa las flechas para reordenarlas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {stages?.map((stage, index) => (
            <div key={stage.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
              background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)'
            }}>
              <GripVertical size={16} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stage.color, flexShrink: 0 }} />

              {editingId === stage.id ? (
                <>
                  <input className="input-base" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} />
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }} />
                  <button className="btn btn-primary" style={{ padding: '0.35rem' }} onClick={() => updateMutation.mutate({ id: stage.id, updates: { name: editName, color: editColor } })}>
                    <Save size={14} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => setEditingId(null)}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 500 }}>{stage.name}</span>
                  <span className="text-secondary text-sm" style={{ fontFamily: 'monospace' }}>{stage.slug}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.3rem' }} onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                      <ArrowUp size={12} />
                    </button>
                    <button className="btn btn-outline" style={{ padding: '0.3rem' }} onClick={() => handleMove(index, 'down')} disabled={index === (stages?.length || 0) - 1}>
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => { setEditingId(stage.id); setEditName(stage.name); setEditColor(stage.color); }}>✏️</button>
                  <button className="btn btn-outline" style={{ padding: '0.35rem', color: 'var(--danger-color)' }} onClick={() => { if (confirm(`¿Eliminar la etapa "${stage.name}"? Los pedidos en esa etapa perderán su estado.`)) deleteMutation.mutate(stage.id); }}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new stage */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label text-sm">Nombre de la etapa</label>
            <input className="input-base" placeholder="Ej: Esperando Material" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="form-group" style={{ width: '160px', marginBottom: 0 }}>
            <label className="form-label text-sm">Slug (identificador)</label>
            <input className="input-base" placeholder="auto_generado" value={newSlug} onChange={e => setNewSlug(e.target.value)} />
          </div>
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} />
          <button className="btn btn-primary" style={{ padding: '0.6rem 1rem' }} onClick={handleAdd}>
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      {/* Currency info */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Moneda y Cotización</h3>
        <p className="text-secondary text-sm">
          Los pedidos se registran en la moneda seleccionada al momento de crearlos (<strong>$ UYU</strong> o <strong>U$S USD</strong>).
          El sistema automáticamente consulta la cotización del Banco Central del Uruguay (BCU) para la contabilidad interna.
        </p>
      </div>

      {/* Backup Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} style={{ color: 'var(--success-color)' }} />
          Respaldo de Datos
        </h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
          Genera y descarga una copia completa de todos tus datos: clientes, pedidos, ítems, productos, proveedores y etapas del pipeline.
          Se recomienda hacer un respaldo <strong>al menos una vez por semana</strong>.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleBackup}
            disabled={backupLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            {backupLoading ? 'Generando respaldo...' : 'Descargar Respaldo Ahora'}
          </button>
          {backupMsg && (
            <span style={{
              fontSize: '0.875rem',
              color: backupMsg.startsWith('✅') ? 'var(--success-color)' : 'var(--danger-color)'
            }}>
              {backupMsg}
            </span>
          )}
        </div>
        <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
          💡 Supabase también realiza respaldos automáticos diarios con retención de 7 días accesibles desde su panel de administración.
        </p>
      </div>
    </div>
  );
}
