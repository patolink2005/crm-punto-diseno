import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/suppliers';
import type { Supplier } from '../types';
import { Plus, Trash2, Edit2, Phone, Mail, User, X } from 'lucide-react';
import './Clients.css'; // Reuse table and modal styles

export function Suppliers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Supplier>>({ name: '', contact_name: '', phone: '', email: '', notes: '' });

  const { data: suppliers, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.getAll });

  const filteredSuppliers = suppliers?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone || '').includes(searchTerm)
  );

  const createMutation = useMutation({
    mutationFn: supplierService.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    onError: (error: any) => alert('Error al crear proveedor: ' + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => supplierService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    onError: (error: any) => alert('Error al actualizar proveedor: ' + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    onError: (err: any) => alert('Error al eliminar proveedor: ' + err.message)
  });

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.name, contact_name: supplier.contact_name, phone: supplier.phone, email: supplier.email, notes: supplier.notes });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', contact_name: '', phone: '', email: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingSupplier(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div style={{ padding: '0 1rem' }}>
      <div className="page-header">
        <h2>Proveedores</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="search-container" style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar proveedor..." 
          className="input-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem' }}>Cargando proveedores...</div>
      ) : (!filteredSuppliers || filteredSuppliers.length === 0) ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="text-secondary">No se encontraron proveedores.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredSuppliers.map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{s.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem', borderRadius: '10px' }} 
                    onClick={() => openModal(s)}
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.5rem', borderRadius: '10px', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                    onClick={() => { if (confirm('¿Seguro que deseas eliminar este proveedor?')) deleteMutation.mutate(s.id); }}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                {s.contact_name && <div className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem' }}><User size={14} style={{ color: 'var(--primary-color)' }} /> {s.contact_name}</div>}
                {s.phone && <div className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem' }}><Phone size={14} style={{ color: 'var(--primary-color)' }} /> {s.phone}</div>}
                {s.email && <div className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem' }}><Mail size={14} style={{ color: 'var(--primary-color)' }} /> {s.email}</div>}
              </div>
              {s.notes && <div className="text-secondary" style={{ fontSize: '0.85rem', fontStyle: 'italic', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>{s.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button className="btn-close" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre / Razón Social *</label>
                <input className="input-base" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contacto</label>
                <input className="input-base" value={formData.contact_name || ''} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="input-base" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input-base" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="input-base" rows={3} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
