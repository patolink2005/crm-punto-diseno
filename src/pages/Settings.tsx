import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineService } from '../services/pipeline';
import type { PipelineStage } from '../services/pipeline';
import { Plus, Trash2, GripVertical, Save, X, ArrowUp, ArrowDown } from 'lucide-react';

export function Settings() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: stages, isLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages
  });

  const createMutation = useMutation({
    mutationFn: pipelineService.createStage,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }); setNewName(''); setNewSlug(''); },
    onError: (err: any) => alert('Error al crear etapa: ' + err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PipelineStage> }) => pipelineService.updateStage(id, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }); setEditingId(null); },
    onError: (err: any) => alert('Error al actualizar etapa: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: pipelineService.deleteStage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
    onError: (err: any) => alert('Error al eliminar etapa: ' + err.message)
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

  if (isLoading) return <div style={{ padding: '2rem' }}>Cargando configuración...</div>;

  return (
    <div style={{ padding: '0 1rem', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Configuración</h2>
      <p className="text-secondary" style={{ marginBottom: '2rem' }}>Personaliza las etapas del pipeline y otros ajustes del sistema.</p>

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
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Moneda y Cotización</h3>
        <p className="text-secondary text-sm">
          Los pedidos se registran en la moneda seleccionada al momento de crearlos (<strong>$ UYU</strong> o <strong>U$S USD</strong>).
          El sistema automáticamente calcula el equivalente en UYU usando la cotización del Banco República (BROU) para la contabilidad interna.
        </p>
      </div>
    </div>
  );
}
