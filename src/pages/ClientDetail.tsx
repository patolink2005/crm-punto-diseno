import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, File, Download, User, Mail, Phone, Shield, FileText, ChevronLeft } from 'lucide-react';
import type { Client } from '../types';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id
  });

  const { data: files, isLoading: isLoadingFiles, refetch: fetchFiles } = useQuery({
    queryKey: ['client_files', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.storage.from('client_documents').list(id + '/');
      if (error) {
        console.error('Error fetching files:', error);
        return [];
      }
      return data;
    },
    enabled: !!id
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    const filePath = `${id}/${Date.now()}_${file.name}`;
    
    const { error } = await supabase.storage.from('client_documents').upload(filePath, file);
    if (!error) {
      fetchFiles(); // refetch the files list
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

  if (isLoadingClient || isLoadingFiles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-2 border-industrial-cyan border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sincronizando ficha del cliente...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-600">
          <User size={40} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Cliente no encontrado en la base de datos</p>
        <button 
          onClick={() => navigate('/admin/clients')}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={16} /> Volver a Clientes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button 
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-industrial-cyan transition-colors group" 
            onClick={() => navigate('/admin/clients')}
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Volver a Clientes
          </button>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-white">
            Ficha de<span className="text-industrial-cyan ml-2">Cliente</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            client.status === 'activo' 
              ? 'bg-industrial-cyan/10 text-industrial-cyan border-industrial-cyan/20' 
              : 'bg-industrial-magenta/10 text-industrial-magenta border-industrial-magenta/20'
          }`}>
            Estado: {client.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="lg:col-span-1 space-y-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-industrial-cyan/20 to-industrial-magenta/20 rounded-[2rem] blur-xl opacity-25" />
            <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-industrial-cyan border border-white/10">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{client.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 italic">Identificador ID: #{client.id.slice(0,8)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 block">Contacto Email</label>
                  <div className="flex items-center gap-3 text-sm text-gray-300 font-medium bg-white/[0.03] p-4 rounded-xl border border-white/5">
                    <Mail size={16} className="text-industrial-cyan" />
                    {client.email || 'No especificado'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 block">Teléfono de Enlace</label>
                  <div className="flex items-center gap-3 text-sm text-gray-300 font-medium bg-white/[0.03] p-4 rounded-xl border border-white/5">
                    <Phone size={16} className="text-industrial-magenta" />
                    {client.phone || 'No especificado'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 block">Seguridad del Sistema</label>
                  <div className="flex items-center gap-3 text-sm text-gray-300 font-medium bg-white/[0.03] p-4 rounded-xl border border-white/5">
                    <Shield size={16} className="text-gray-500" />
                    <span>Nivel de acceso estándar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Documentos Adjuntos</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1 flex items-center gap-2">
                  <FileText size={14} className="text-industrial-cyan" />
                  Almacenamiento de planos y contratos
                </p>
              </div>
              
              <div>
                <input type="file" id="upload-doc" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <label 
                  htmlFor="upload-doc" 
                  className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-industrial-cyan hover:border-industrial-cyan hover:text-black transition-all cursor-pointer group disabled:opacity-50"
                >
                  <Upload size={16} className={uploading ? 'animate-bounce' : 'group-hover:-translate-y-1 transition-transform'} /> 
                  {uploading ? 'SUBIENDO...' : 'SUBIR DOCUMENTO'}
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(files || []).length === 0 ? (
                <div className="col-span-full py-20 bg-white/[0.02] border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-700 mb-4">
                    <File size={32} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 leading-relaxed">
                    No hay documentos vinculados a este perfil técnico.
                  </p>
                </div>
              ) : (
                (files || []).map((file) => (
                  <div key={file.name} className="group/file relative bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.05] hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-gray-500 group-hover/file:text-industrial-cyan transition-colors">
                        <File size={18} />
                      </div>
                      <div className="max-w-[120px] sm:max-w-[200px]">
                        <p className="text-sm font-bold text-gray-300 truncate tracking-tight">
                          {file.name.split('_').slice(1).join('_') || file.name}
                        </p>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Digital Asset</p>
                      </div>
                    </div>
                    <a 
                      href={getFileUrl(file.name)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-white hover:bg-industrial-cyan hover:border-industrial-cyan hover:text-black transition-all"
                      title="Descargar"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


