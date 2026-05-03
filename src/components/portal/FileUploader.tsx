import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './FileUploader.css';

interface FileUploaderProps {
  orderId: string;
  onUploadSuccess?: (url: string) => void;
}

/**
 * Componente FileUploader Premium
 * Permite subir archivos .pdf y .jpg al bucket 'designs' de Supabase
 * y vincula la URL al pedido correspondiente.
 */
export const FileUploader: React.FC<FileUploaderProps> = ({ orderId, onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validar tipos de archivo (.pdf, .jpg)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setStatus('error');
      setErrorMessage('Solo se permiten archivos .pdf y .jpg');
      return;
    }

    // Validar tamaño (ej. 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('El archivo es demasiado grande (máx 10MB)');
      return;
    }

    setIsUploading(true);
    setStatus('idle');
    setFileName(file.name);

    try {
      // 1. Subir al bucket 'designs'
      // Organizamos por orderId para mantener el bucket limpio
      const fileExt = file.name.split('.').pop();
      const uniquePath = `${orderId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('designs')
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(uniquePath);

      // 3. Registrar en la base de datos (columna design_url en orders)
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          design_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      setStatus('success');
      if (onUploadSuccess) onUploadSuccess(publicUrl);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error en FileUploader:', error);
      setStatus('error');
      setErrorMessage(msg || 'Error al procesar la subida');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div 
      className={`file-uploader ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input 
        type="file" 
        className="file-input" 
        accept=".pdf,.jpg,.jpeg"
        onChange={onFileChange}
        ref={fileInputRef}
        disabled={isUploading}
      />

      {status === 'idle' && !isUploading && (
        <>
          <div className="uploader-icon">
            <Upload size={40} />
          </div>
          <div className="uploader-text">
            <h4>Sube tu diseño</h4>
            <p>Arrastra y suelta o haz clic para buscar</p>
            <p className="text-xs mt-2 opacity-50">Solo .PDF o .JPG (Máx 10MB)</p>
          </div>
        </>
      )}

      {isUploading && (
        <div className="status-overlay">
          <Loader2 size={40} className="loader-spin" />
          <div className="uploader-text">
            <h4>Subiendo archivo...</h4>
            <p>{fileName}</p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="status-overlay">
          <CheckCircle size={40} className="status-success" />
          <div className="uploader-text">
            <h4 className="status-success">¡Archivo subido!</h4>
            <p>El diseño ha sido vinculado a tu pedido.</p>
          </div>
          <button 
            onClick={() => setStatus('idle')}
            className="btn-retry"
            style={{ borderColor: '#28a745', color: '#28a745' }}
          >
            Subir otro
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="status-overlay">
          <AlertCircle size={40} className="status-error" />
          <div className="uploader-text">
            <h4 className="status-error">Error al subir</h4>
            <p>{errorMessage}</p>
          </div>
          <button onClick={() => setStatus('idle')} className="btn-retry">
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
};
