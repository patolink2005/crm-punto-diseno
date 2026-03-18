import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, File, Download } from 'lucide-react';
import type { Client } from '../types';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id
  });

  const fetchFiles = async () => {
    if (!id) return;
    const { data, error } = await supabase.storage.from('client_documents').list(id + '/');
    if (!error && data) {
      setFiles(data);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    const filePath = `${id}/${Date.now()}_${file.name}`;
    
    const { error } = await supabase.storage.from('client_documents').upload(filePath, file);
    if (!error) {
      fetchFiles();
    } else {
      console.error(error);
      alert('Error al subir archivo');
    }
    setUploading(false);
    e.target.value = '';
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from('client_documents').getPublicUrl(`${id}/${filePath}`);
    return data.publicUrl;
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Cargando ficha del cliente...</div>;
  if (!client) return <div style={{ padding: '2rem' }}>Cliente no encontrado</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-outline" onClick={() => navigate('/clients')}>
          <ArrowLeft size={18} /> Volver
        </button>
        <h2 style={{ margin: 0 }}>Ficha de Cliente</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Información General</h3>
          <div className="form-group">
            <label className="text-secondary text-sm">Nombre</label>
            <div style={{ fontSize: '1.125rem', fontWeight: 500 }}>{client.name}</div>
          </div>
          <div className="form-group">
            <label className="text-secondary text-sm">Email</label>
            <div>{client.email || 'No especificado'}</div>
          </div>
          <div className="form-group">
            <label className="text-secondary text-sm">Teléfono</label>
            <div>{client.phone || 'No especificado'}</div>
          </div>
          <div className="form-group">
            <label className="text-secondary text-sm">Estado</label>
            <div style={{ marginTop: '0.25rem' }}>
              <span className={`badge-status status-${client.status}`}>{client.status}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Documentos Adjuntos</h3>
            <div>
              <input type="file" id="upload-doc" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
              <label htmlFor="upload-doc" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={16} /> {uploading ? 'Subiendo...' : 'Subir Archivo'}
              </label>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {files.length === 0 ? (
              <p className="text-secondary text-sm text-center" style={{ margin: '2rem 0' }}>No hay documentos adjuntos</p>
            ) : (
              files.map((file) => (
                <div key={file.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <File size={16} className="text-secondary" />
                    <span className="text-sm">{file.name.split('_').slice(1).join('_') || file.name}</span>
                  </div>
                  <a href={getFileUrl(file.name)} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>
                    <Download size={14} />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
