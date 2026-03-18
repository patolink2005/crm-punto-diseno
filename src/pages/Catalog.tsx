import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/products';
import type { ProductConfig } from '../types';
import { Plus, Trash2, Settings } from 'lucide-react';

export function Catalog() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductConfig | null>(null);
  const [formData, setFormData] = useState<Partial<ProductConfig>>({
    name: '', description: '', base_price: 0, attributes_schema: [], price_rules: []
  });

  const [attributesText, setAttributesText] = useState('[]');
  const [priceRulesText, setPriceRulesText] = useState('[]');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal(); },
    onError: (error: any) => { alert('Error al crear el producto: ' + error.message); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<ProductConfig> }) => productService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeModal(); },
    onError: (error: any) => { alert('Error al actualizar el producto: ' + error.message); }
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  const openModal = (product?: ProductConfig) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
      setAttributesText(JSON.stringify(product.attributes_schema || [], null, 2));
      setPriceRulesText(JSON.stringify(product.price_rules || [], null, 2));
    } else {
      setEditingProduct(null);
      setFormData({ name: '', description: '', base_price: 0, attributes_schema: [], price_rules: [] });
      setAttributesText('[]');
      setPriceRulesText('[]');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedAttributes = JSON.parse(attributesText);
      const parsedRules = JSON.parse(priceRulesText);
      const submitData = { 
        ...formData, 
        attributes_schema: parsedAttributes, 
        price_rules: parsedRules 
      };

      if (editingProduct) {
        updateMutation.mutate({ id: editingProduct.id, data: submitData });
      } else {
        createMutation.mutate(submitData);
      }
    } catch (error: any) {
      alert('Error en formato JSON. Verifica que los corchetes y comillas estén correctos.\n' + error.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Catálogo de Productos y Servicios</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo Tipo de Producto
        </button>
      </div>

      <div className="glass-panel table-container">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando catálogo...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Precio Base</th>
                <th>Atributos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product.id}>
                  <td><strong>{product.name}</strong></td>
                  <td className="text-secondary">{product.description || '-'}</td>
                  <td>${product.base_price}</td>
                  <td>
                    <span className="badge-role" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                      {product.attributes_schema?.length || 0} configurados
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openModal(product)}>
                        <Settings size={16} /> Configurar
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)' }} onClick={() => {
                        if (window.confirm('¿Eliminar producto?')) deleteMutation.mutate(product.id);
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Configurar Tipo de Producto' : 'Nuevo Tipo de Producto'}</h3>
              <button className="btn-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nombre del Producto (Ej: Ploteo)</label>
                  <input type="text" className="input-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Base ($) <span className="text-secondary" style={{fontWeight:400, fontSize:'0.8rem'}}>(Usar 0 si el precio es calculado por reglas)</span></label>
                  <input type="number" min={0} className="input-base" value={formData.base_price} onChange={e => setFormData({...formData, base_price: Number(e.target.value)})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input type="text" className="input-base" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div style={{ marginTop: '2rem', marginBottom: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <h4>Configuración Avanzada (JSON)</h4>
                <p className="text-sm text-secondary">Los atributos dictan qué campos se solicitan al crear un pedido. Las reglas de precios definen cómo impactan esos atributos en el costo total.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Esquema de Atributos</label>
                  <textarea 
                    className="input-base" 
                    style={{ height: '200px', fontFamily: 'monospace' }} 
                    value={attributesText}
                    onChange={(e) => setAttributesText(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reglas de Precios</label>
                  <textarea 
                    className="input-base" 
                    style={{ height: '200px', fontFamily: 'monospace' }} 
                    value={priceRulesText}
                    onChange={(e) => setPriceRulesText(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
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
