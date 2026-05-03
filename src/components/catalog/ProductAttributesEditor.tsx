import { Plus, Trash2, GripVertical, List } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <List size={18} className="text-industrial-cyan" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-300">Campos de Personalización</h4>
        </div>
        <button 
          type="button" 
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all" 
          onClick={addAttribute}
        >
          <Plus size={14} /> Añadir Campo
        </button>
      </div>

      <div className="space-y-4">
        {attributes.length === 0 && (
          <div className="text-center py-12 px-6 border border-dashed border-white/10 rounded-[2rem] text-gray-500 text-[10px] uppercase tracking-[0.2em] font-medium">
            No hay campos configurados. El producto no tendrá opciones extras.
          </div>
        )}
        
        {attributes.map((attr, attrIdx) => (
          <div key={attr.id} className="relative group bg-white/[0.02] border border-white/5 hover:border-industrial-cyan/30 rounded-3xl p-6 transition-all duration-300">
            <div className="flex gap-6 items-start">
              <div className="mt-4 opacity-30 group-hover:opacity-100 transition-opacity">
                <GripVertical size={20} className="text-gray-400" />
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Etiqueta (Lo que ve el usuario)</label>
                  <input 
                    className="w-full bg-black/20 border border-white/10 focus:border-industrial-cyan/50 rounded-xl px-4 py-3 outline-none transition-all text-xs font-medium" 
                    value={attr.label || attr.name} 
                    onChange={e => updateAttribute(attrIdx, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="Ej: Material"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tipo de Campo</label>
                  <select 
                    className="w-full bg-black/20 border border-white/10 focus:border-industrial-cyan/50 rounded-xl px-4 py-3 outline-none transition-all text-xs font-medium appearance-none" 
                    value={attr.type}
                    onChange={e => updateAttribute(attrIdx, { type: e.target.value as 'select' | 'text' | 'number' | 'toggle' })}
                  >
                    <option value="select" className="bg-zinc-900">Lista de Opciones (Desplegable)</option>
                    <option value="text" className="bg-zinc-900">Texto Libre</option>
                    <option value="number" className="bg-zinc-900">Número</option>
                    <option value="toggle" className="bg-zinc-900">Si / No (Interruptor)</option>
                  </select>
                </div>
              </div>

              <button 
                type="button" 
                className="mt-6 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" 
                onClick={() => removeAttribute(attrIdx)}
              >
                <Trash2 size={18} />
              </button>
            </div>

            {attr.type === 'select' && (
              <div className="mt-6 ml-11 p-6 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                <label className="text-[9px] font-bold text-industrial-cyan/60 uppercase tracking-widest block">Opciones disponibles:</label>
                <div className="flex flex-wrap gap-2">
                  {attr.options?.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 group/opt hover:border-industrial-cyan/30 transition-all">
                      <input 
                        className="bg-transparent border-none focus:ring-0 text-[10px] font-bold text-gray-300 w-24 px-2 py-1 outline-none" 
                        value={opt}
                        onChange={e => updateOption(attrIdx, optIdx, e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeOption(attrIdx, optIdx)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="flex items-center gap-1 px-3 py-1 bg-industrial-cyan/10 hover:bg-industrial-cyan/20 text-industrial-cyan border border-industrial-cyan/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all" 
                    onClick={() => addOption(attrIdx)}
                  >
                    <Plus size={12} /> Añadir
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
