import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../services/clients';
import type { Client } from '../types';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Clients.css';

export function Clients() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<{name: string, email: string, phone: string, status: Client['status']}>({ name: '', email: '', phone: '', status: 'potencial' });
  const navigate = useNavigate();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getAll
  });

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm)
  );

  const createMutation = useMutation({
    mutationFn: clientService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Client> }) => clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clientService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] })
  });

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ 
        name: client.name, 
        email: client.email || '', 
        phone: client.phone || '', 
        status: client.status 
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', status: 'potencial' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Gestión de Clientes</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="search-container" style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar cliente por nombre, email o teléfono..." 
          className="input-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass-panel table-container desktop-only">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando clientes...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients?.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>
                    <div>{client.email || '-'}</div>
                    <div className="text-sm text-secondary">{client.phone || '-'}</div>
                  </td>
                  <td>
                    <span className={`badge-status status-${client.status}`}>
                      {client.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => navigate(`/clients/${client.id}`)} title="Ver Ficha">
                        <Eye size={16} />
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openModal(client)} title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)' }} onClick={() => {
                        if (window.confirm('¿Eliminar cliente?')) {
                          deleteMutation.mutate(client.id);
                        }
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

      {/* Mobile view - Cards */}
      <div className="mobile-only">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando clientes...</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredClients?.map((client) => (
              <div key={client.id} className="glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{client.name}</div>
                  <span className={`badge-status status-${client.status}`}>{client.status}</span>
                </div>
                <div className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
                  {client.email && <div style={{ wordBreak: 'break-all' }}>{client.email}</div>}
                  {client.phone && <div>{client.phone}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }} onClick={() => navigate(`/clients/${client.id}`)}>
                    <Eye size={16} /> Ver
                  </button>
                  <button className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }} onClick={() => openModal(client)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-outline" style={{ padding: '0.5rem', color: 'var(--color-danger)' }} onClick={() => {
                    if (window.confirm('¿Eliminar cliente?')) {
                      deleteMutation.mutate(client.id);
                    }
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(filteredClients?.length === 0 && !isLoading) && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
          No se encontraron clientes.
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button className="btn-close" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre / Empresa</label>
                <input 
                  type="text" 
                  className="input-base" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="input-base" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input 
                  type="text" 
                  className="input-base" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select 
                  className="input-base" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="activo">Activo</option>
                  <option value="potencial">Potencial</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
