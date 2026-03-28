import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { ProductAttribute } from '../../types';

// We extend the shared ProductAttribute to include an ID for React keys
export interface Attribute extends Omit<ProductAttribute, 'type'> {
  id: string;
  type: 'select' | 'text' | 'number' | 'toggle';
}

interface Props {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
}

export function ProductAttributesEditor({ attributes, onChange }: Props) {
  const addAttribute = () => {
    const newAttr: Attribute = {
      id: `attr_${Date.now()}`,
      name: 'nueva_opcion',
      label: 'Nueva Opción',
      type: 'select',
      options: ['Ej: Opción 1']
    };
    onChange([...attributes, newAttr]);
  };

  const removeAttribute = (index: number) => {
    const newAttrs = [...attributes];
    newAttrs.splice(index, 1);
    onChange(newAttrs);
  };

  const updateAttribute = (index: number, updates: Partial<Attribute>) => {
    const newAttrs = [...attributes];
    newAttrs[index] = { ...newAttrs[index], ...updates };
    onChange(newAttrs);
  };

  const addOption = (attrIndex: number) => {
    const attr = attributes[attrIndex];
    const newOptions = [...(attr.options || []), 'Nueva Opción'];
    updateAttribute(attrIndex, { options: newOptions });
  };

  const updateOption = (attrIndex: number, optIndex: number, value: string) => {
    const attr = attributes[attrIndex];
    const newOptions = [...(attr.options || [])];
    newOptions[optIndex] = value;
    updateAttribute(attrIndex, { options: newOptions });
  };

  const removeOption = (attrIndex: number, optIndex: number) => {
    const attr = attributes[attrIndex];
    const newOptions = [...(attr.options || [])];
    newOptions.splice(optIndex, 1);
    updateAttribute(attrIndex, { options: newOptions });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium">Campos de Personalización</h4>
        <button 
          type="button" 
          className="btn btn-outline btn-sm" 
          onClick={addAttribute}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
        >
          <Plus size={14} /> Añadir Campo
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {attributes.length === 0 && (
          <div className="text-center p-4 border border-dashed rounded-lg text-secondary text-sm">
            No hay campos configurados. El producto no tendrá opciones extras.
          </div>
        )}
        
        {attributes.map((attr, attrIdx) => (
          <div key={attr.id} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <GripVertical size={20} className="text-secondary" style={{ marginTop: '0.5rem' }} />
              
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">Etiqueta (Lo que ve el usuario)</label>
                  <input 
                    className="input-base" 
                    value={attr.label || attr.name} 
                    onChange={e => updateAttribute(attrIdx, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label text-xs">Tipo de Campo</label>
                  <select 
                    className="input-base" 
                    value={attr.type}
                    onChange={e => updateAttribute(attrIdx, { type: e.target.value as 'select' | 'text' | 'number' | 'toggle' })}
                  >
                    <option value="select">Lista de Opciones (Desplegable)</option>
                    <option value="text">Texto Libre</option>
                    <option value="number">Número</option>
                    <option value="toggle">Si / No (Interruptor)</option>
                  </select>
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-outline btn-sm text-danger" 
                onClick={() => removeAttribute(attrIdx)}
                style={{ marginTop: '1.25rem', border: 'none', color: 'var(--danger-color)' }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {attr.type === 'select' && (
              <div style={{ marginLeft: '2.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                <label className="form-label text-xs" style={{ marginBottom: '0.5rem', display: 'block' }}>Opciones de la lista:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {attr.options?.map((opt, optIdx) => (
                    <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input 
                        className="input-base" 
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', width: '120px' }}
                        value={opt}
                        onChange={e => updateOption(attrIdx, optIdx, e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeOption(attrIdx, optIdx)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-outline btn-xs" 
                    onClick={() => addOption(attrIdx)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                  >
                    + Añadir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
