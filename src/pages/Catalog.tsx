import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/products';
import { ProductAttributesEditor } from '../components/catalog/ProductAttributesEditor';
import type { Attribute } from '../components/catalog/ProductAttributesEditor';
import type { ProductConfig } from '../types';
import { Plus, Trash2, Settings, Package, X } from 'lucide-react';

export function Catalog() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductConfig | null>(null);
  const [formData, setFormData] = useState<Partial<ProductConfig>>({
    name: '', description: '', base_price: 0, attributes_schema: [], price_rules: []
  });

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [priceMode, setPriceMode] = useState<'manual' | 'calculated'>('calculated');
  const [formError, setFormError] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal(); },
    onError: (error: Error) => { setFormError('Error al crear el producto: ' + error.message); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<ProductConfig> }) => productService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal(); },
    onError: (error: Error) => { setFormError('Error al actualizar el producto: ' + error.message); }
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  const openModal = (product?: ProductConfig) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
      setAttributes((product.attributes_schema || []).map((attr, idx) => ({
        ...attr,
        id: `attr_${idx}_${Date.now()}`
      })));
      const isManual = product.price_rules?.some(r => r.type === 'custom_cost');
      setPriceMode(isManual ? 'manual' : 'calculated');
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', base_price: 0, attributes_schema: [], price_rules: [] });
      setAttributes([]);
      setPriceMode('calculated');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name?.trim()) {
      setFormError('El nombre del producto no puede estar vacío.');
      return;
    }

    const priceRules = priceMode === 'manual' 
      ? [{ type: 'custom_cost' as const }] 
      : (formData.price_rules || []);

    const submitData = { 
      ...formData, 
      attributes_schema: attributes.map((a) => ({
        name: a.name,
        label: a.label,
        type: a.type,
        options: a.options
      })),
      price_rules: priceRules
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: submitData });
    } else {
      createMutation.mutate(submitData as ProductConfig);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
            <Package className="text-industrial-cyan" />
            GESTIÓN DE <span className="text-industrial-cyan">CATÁLOGO</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-medium">
            Configura los productos y servicios de Punto Diseño.
          </p>
        </div>
        <button 
          className="flex items-center gap-2 bg-industrial-cyan hover:bg-industrial-cyan/80 text-black px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-industrial-cyan/20 active:scale-95"
          onClick={() => openModal()}
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-industrial-cyan border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Cargando catálogo...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Producto</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Estado Precio</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Atributos</th>
                  <th className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products?.length === 0 ? (
                   <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-gray-500">
                      No hay productos en el catálogo.
                    </td>
                  </tr>
                ) : products?.map((product) => {
                  const isManual = product.price_rules?.some(r => r.type === 'custom_cost');
                  return (
                    <tr key={product.id} className="group hover:bg-white/[0.02] transition-colors duration-300">
                      <td className="px-8 py-6">
                        <div className="font-bold text-sm tracking-tight group-hover:text-industrial-cyan transition-colors">{product.name}</div>
                        <div className="text-gray-500 text-xs mt-1 line-clamp-1">{product.description || 'Sin descripción'}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                          isManual 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isManual ? 'Ingreso Manual' : 'Auto-Calculado'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10">
                            {product.attributes_schema?.length || 0}
                          </span>
                          <span className="text-gray-500 text-xs">opciones</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-2.5 bg-white/5 hover:bg-industrial-cyan/20 text-gray-400 hover:text-industrial-cyan border border-white/10 rounded-xl transition-all duration-300"
                            onClick={() => openModal(product)}
                            title="Configurar"
                          >
                            <Settings size={16} />
                          </button>
                          <button 
                            className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 rounded-xl transition-all duration-300"
                            onClick={() => {
                              if (window.confirm('¿Eliminar producto?')) deleteMutation.mutate(product.id);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="relative w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div>
                <h3 className="text-xl font-bold tracking-tighter uppercase">
                  {editingProduct ? 'Editar' : 'Nuevo'} <span className="text-industrial-cyan">Producto</span>
                </h3>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Configuración técnica del servicio</p>
              </div>
              <button 
                onClick={closeModal}
                className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 focus:border-industrial-cyan/50 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-medium"
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej: Corpóreos"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Método de Precio</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 focus:border-industrial-cyan/50 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-medium appearance-none"
                    value={priceMode} 
                    onChange={e => setPriceMode(e.target.value as 'manual' | 'calculated')}
                  >
                    <option value="manual" className="bg-zinc-900">Ingreso Manual (Al crear pedido)</option>
                    <option value="calculated" className="bg-zinc-900">Precio Base / Auto-Calculado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descripción Informativa</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 focus:border-industrial-cyan/50 rounded-2xl px-6 py-4 outline-none transition-all text-sm font-medium min-h-[100px] resize-none"
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Ej: Letras volumétricas en diversos materiales para exteriores e interiores"
                />
              </div>

              {priceMode === 'calculated' && (
                <div className="p-6 bg-industrial-cyan/5 border border-industrial-cyan/20 rounded-[2rem] space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-industrial-cyan uppercase tracking-widest ml-1">Precio Base del Producto ($)</label>
                    <span className="text-[9px] text-industrial-cyan/60 uppercase font-bold tracking-tighter">Automático habilitado</span>
                  </div>
                  <input 
                    type="number" 
                    className="w-full bg-black/40 border border-white/10 focus:border-industrial-cyan/50 rounded-xl px-6 py-4 outline-none transition-all text-xl font-mono text-industrial-cyan"
                    value={formData.base_price || 0} 
                    onChange={e => setFormData({...formData, base_price: Number(e.target.value)})} 
                  />
                  <p className="text-gray-500 text-[10px] leading-relaxed px-1">
                    <span className="text-industrial-cyan font-bold">INFO:</span> El precio final se calculará sumando este base más los modificadores de los atributos.
                  </p>
                </div>
              )}

              <div className="pt-4">
                <ProductAttributesEditor 
                  attributes={attributes} 
                  onChange={setAttributes} 
                />
              </div>

              {formError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <span>⚠️</span> {formError}
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex justify-end gap-4">
              <button 
                type="button" 
                className="px-8 py-4 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit}
                className="bg-industrial-cyan hover:bg-industrial-cyan/80 text-black px-10 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-industrial-cyan/20 active:scale-95 disabled:opacity-50"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
