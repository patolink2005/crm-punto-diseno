import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/products';
import { ProductAttributesEditor } from '../components/catalog/ProductAttributesEditor';
import type { Attribute } from '../components/catalog/ProductAttributesEditor';
import type { ProductConfig } from '../types';
import { Plus, Trash2, Settings } from 'lucide-react';

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
      // Determine price mode
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Gestión de Catálogo</h2>
          <p className="text-secondary text-sm">Configura los productos y servicios que ofreces.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="glass-panel table-container">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando catálogo...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Estado Precio</th>
                <th>Atributos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => {
                const isManual = product.price_rules?.some(r => r.type === 'custom_cost');
                return (
                  <tr key={product.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                      <div className="text-secondary text-xs">{product.description || 'Sin descripción'}</div>
                    </td>
                    <td>
                      <span className="badge-role" style={{ 
                        background: isManual ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        color: isManual ? '#3b82f6' : '#10b981' 
                      }}>
                        {isManual ? 'Ingreso Manual' : 'Auto-Calculado'}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary text-sm">
                        {product.attributes_schema?.length || 0} opciones
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openModal(product)}>
                          <Settings size={16} /> Configurar
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger-color)' }} onClick={() => {
                          if (window.confirm('¿Eliminar producto?')) deleteMutation.mutate(product.id);
                        }}>
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>{editingProduct ? `Editar ${editingProduct.name}` : 'Nuevo Tipo de Producto'}</h3>
              <button className="btn-close" onClick={closeModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="input-base" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej: Corpóreos"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de Precio</label>
                  <select 
                    className="input-base" 
                    value={priceMode} 
                    onChange={e => setPriceMode(e.target.value as 'manual' | 'calculated')}
                  >
                    <option value="manual">Ingreso Manual (Al crear pedido)</option>
                    <option value="calculated">Precio Base / Auto-Calculado</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Descripción Informativa</label>
                <input 
                  type="text" 
                  className="input-base" 
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Ej: Letras volumétricas en diversos materiales"
                />
              </div>

              {priceMode === 'calculated' && (
                <div className="form-group glass-panel" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', marginBottom: '2rem' }}>
                  <label className="form-label">Precio Base del Producto ($)</label>
                  <input 
                    type="number" 
                    className="input-base" 
                    value={formData.base_price || 0} 
                    onChange={e => setFormData({...formData, base_price: Number(e.target.value)})} 
                  />
                  <p className="text-secondary text-xs" style={{ marginTop: '0.5rem' }}>
                    Sugerencia: Usa 0 si el precio se calculará 100% por reglas avanzadas (Área, m2, etc).
                  </p>
                </div>
              )}

              <ProductAttributesEditor 
                attributes={attributes} 
                onChange={setAttributes} 
              />

              {formError && (
                <div className="alert-danger" style={{ marginTop: '1rem' }}>
                  ⚠️ {formError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
