import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineService } from '../services/pipeline';
import type { PipelineStage } from '../services/pipeline';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Shield, 
  Palette, 
  MessageSquare,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Layout,
  RefreshCw,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSystemSettings } from '../context/SystemSettingsContext';

export function Settings() {
  const queryClient = useQueryClient();
  const { settings, updateBranding, isUpdating } = useSystemSettings();

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newColor, setNewColor] = useState('#00AEEF');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  // Branding local state
  const [brandForm, setBrandForm] = useState({
    app_name: '',
    primary_color: '#00AEEF',
    border_radius: '12px',
    logo_url: '',
    background_color: '#0a0a0a',
    surface_color: 'rgba(255, 255, 255, 0.03)',
    text_color: '#ffffff',
    enforce_deposit_on_move: false,
    whatsapp_new_order_template: '',
    whatsapp_pickup_template: ''
  });

  useEffect(() => {
    if (settings?.branding) {
      setBrandForm({
        app_name: settings.branding.app_name || '',
        primary_color: settings.branding.primary_color || '#00AEEF',
        border_radius: settings.branding.border_radius || '12px',
        logo_url: settings.branding.logo_url || '',
        background_color: settings.branding.background_color || '#0a0a0a',
        surface_color: settings.branding.surface_color || 'rgba(255, 255, 255, 0.03)',
        text_color: settings.branding.text_color || '#ffffff',
        enforce_deposit_on_move: settings.branding.enforce_deposit_on_move || false,
        whatsapp_new_order_template: settings.branding.whatsapp_new_order_template ?? '',
        whatsapp_pickup_template: settings.branding.whatsapp_pickup_template ?? ''
      });
    }
  }, [settings]);

  const { data: stages, isLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages
  });

  const createMutation = useMutation({
    mutationFn: pipelineService.createStage,
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }); 
      setNewName(''); 
      setNewSlug(''); 
    },
    onError: (err: Error) => alert('Error al crear etapa: ' + err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PipelineStage> }) => 
      pipelineService.updateStage(id, updates),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }); 
      setEditingId(null); 
    },
    onError: (err: Error) => alert('Error al actualizar etapa: ' + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: pipelineService.deleteStage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
    onError: (err: Error) => alert('Error al eliminar etapa: ' + err.message)
  });

  const reorderMutation = useMutation({
    mutationFn: pipelineService.reorderStages,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] })
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    const slug = newSlug.trim() || newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const position = (stages?.length || 0) + 1;
    createMutation.mutate({ name: newName, slug, position, color: newColor });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!stages) return;
    const newStages = [...stages];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newStages.length) return;
    [newStages[index], newStages[swapIdx]] = [newStages[swapIdx], newStages[index]];
    const reordered = newStages.map((s, i) => ({ id: s.id, position: i + 1 }));
    reorderMutation.mutate(reordered);
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupMsg('');
    try {
      const [clients, orders, orderItems, products, suppliers, pipelineStages] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('order_items').select('*'),
        supabase.from('products_config').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('pipeline_stages').select('*'),
      ]);

      const backup = {
        version: '1.0',
        generated_at: new Date().toISOString(),
        tables: {
          clients: clients.data || [],
          orders: orders.data || [],
          order_items: orderItems.data || [],
          products_config: products.data || [],
          suppliers: suppliers.data || [],
          pipeline_stages: pipelineStages.data || [],
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const formattedDate = now.toLocaleDateString('es-UY').replace(/\//g, '-');
      a.href = url;
      a.download = `crmpunto_backup_${formattedDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRecords = Object.values(backup.tables).reduce((acc, t) => acc + (Array.isArray(t) ? t.length : 0), 0);
      setBackupMsg(`✅ Respaldo descargado: ${totalRecords} registros.`);
    } catch (err) {
      setBackupMsg('❌ Error al generar respaldo: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSaveBranding = () => {
    updateBranding({
      ...brandForm,
      primary_hover: brandForm.primary_color
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-white/5 border-t-[#00AEEF] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#00AEEF] rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      {/* Cinematic Header */}
      <div className="relative group">
        <div className="absolute -inset-x-8 -top-8 h-[200px] bg-gradient-to-b from-[#00AEEF]/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00AEEF] to-[#E6007E] rounded-xl opacity-20 group-hover:opacity-40 transition-opacity blur" />
                <div className="relative p-3 bg-black border border-white/10 rounded-xl">
                  <SettingsIcon className="w-8 h-8 text-[#00AEEF]" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                  Configuración <span className="text-[#00AEEF]">Global</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1 w-12 bg-gradient-to-r from-[#00AEEF] to-transparent rounded-full" />
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Industrial System Control</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-full flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-black bg-white/10" />
                ))}
              </div>
              <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Admin Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Visuals & Security */}
        <div className="lg:col-span-8 space-y-12">
          {/* Branding Section */}
          <section className="relative group">
            <div className="absolute -inset-px bg-gradient-to-b from-white/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-[#00AEEF]/10 border border-[#00AEEF]/20 rounded-xl">
                    <Palette className="w-5 h-5 text-[#00AEEF]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight uppercase">Identidad Visual</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">Visual Branding Engine</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-[#00AEEF]/5 border border-[#00AEEF]/20 rounded-full">
                  <span className="text-[10px] font-black text-[#00AEEF] uppercase tracking-widest">Active UI</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group/input">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-focus-within/input:text-[#00AEEF] transition-colors ml-1">
                    Nombre de la Aplicación
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-5 py-3.5 focus:border-[#00AEEF]/50 focus:bg-white/[0.04] transition-all outline-none text-sm font-medium"
                      value={brandForm.app_name}
                      onChange={e => setBrandForm({ ...brandForm, app_name: e.target.value })}
                      placeholder="Punto Diseño"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group/input">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-focus-within/input:text-[#00AEEF] transition-colors ml-1">
                    Logo de Marca (URL)
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-5 py-3.5 focus:border-[#00AEEF]/50 focus:bg-white/[0.04] transition-all outline-none text-sm font-mono"
                      value={brandForm.logo_url}
                      onChange={e => setBrandForm({ ...brandForm, logo_url: e.target.value })}
                      placeholder="https://images.punto.com/logo.svg"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                      <Layout className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6 pt-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 border-b border-white/5 pb-2">Sistema de Color Cromático</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Primario', key: 'primary_color', color: brandForm.primary_color },
                      { label: 'Fondo', key: 'background_color', color: brandForm.background_color },
                      { label: 'Paneles', key: 'surface_color', color: brandForm.surface_color.startsWith('rgba') ? '#1a1a1a' : brandForm.surface_color },
                      { label: 'Texto', key: 'text_color', color: brandForm.text_color }
                    ].map((item) => (
                      <div key={item.key} className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/color hover:border-white/10 transition-colors">
                        <label className="text-[9px] uppercase tracking-widest font-black text-white/30 block">{item.label}</label>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={item.color}
                              onChange={e => setBrandForm({ ...brandForm, [item.key]: e.target.value })}
                              className="w-10 h-10 rounded-lg border-none bg-transparent cursor-pointer relative z-10"
                            />
                            <div 
                              className="absolute inset-0 rounded-lg blur-md opacity-30 group-hover/color:opacity-60 transition-opacity"
                              style={{ backgroundColor: item.color }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase text-white/60">{item.color}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Suavizado de Bordes (Industrial Radius)</label>
                    <span className="text-xs font-mono font-bold text-[#00AEEF] px-2 py-0.5 bg-[#00AEEF]/10 rounded border border-[#00AEEF]/20">{brandForm.border_radius}</span>
                  </div>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden group/range">
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="2"
                      value={parseInt(brandForm.border_radius)}
                      onChange={e => setBrandForm({ ...brandForm, border_radius: `${e.target.value}px` })}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                    />
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00AEEF] to-[#E6007E] transition-all duration-300"
                      style={{ width: `${(parseInt(brandForm.border_radius) / 24) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  className="group relative flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-black uppercase tracking-tighter italic transition-all hover:scale-105 active:scale-95 disabled:opacity-50 overflow-hidden"
                  onClick={handleSaveBranding}
                  disabled={isUpdating}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00AEEF] to-[#E6007E] opacity-0 group-hover:opacity-10 transition-opacity" />
                  {isUpdating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span className="relative z-10">{isUpdating ? 'Procesando' : 'Guardar Configuración'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Workflow & Security */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative group">
              <div className="absolute -inset-px bg-gradient-to-b from-emerald-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-tight">Seguridad</h2>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">Protocol Guard</p>
                  </div>
                </div>

                <div 
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 cursor-pointer group/toggle hover:bg-white/[0.04] transition-all"
                  onClick={() => setBrandForm({ ...brandForm, enforce_deposit_on_move: !brandForm.enforce_deposit_on_move })}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60 group-hover/toggle:text-white transition-colors">Exigir Seña Obligatoria</span>
                    <div className={`w-12 h-6 rounded-full transition-all relative ${brandForm.enforce_deposit_on_move ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${brandForm.enforce_deposit_on_move ? 'left-7' : 'left-1'}`} />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                    Impide que los pedidos avancen de "Presupuesto" sin pagos registrados. Optimización de flujo de caja garantizada.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-px bg-gradient-to-b from-[#E6007E]/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2.5 bg-[#E6007E]/10 border border-[#E6007E]/20 rounded-xl">
                    <Download className="w-5 h-5 text-[#E6007E]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-tight">Base de Datos</h2>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">System Architecture</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium mb-6">
                    Exporta una copia íntegra del núcleo del sistema (clientes, órdenes, stock) en formato JSON estandarizado.
                  </p>
                  
                  <button
                    className="w-full flex items-center justify-center gap-3 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 text-white py-4 rounded-2xl font-bold transition-all disabled:opacity-50 group/btn"
                    onClick={handleBackup}
                    disabled={backupLoading}
                  >
                    {backupLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-[#00AEEF]" />
                    ) : (
                      <Download className="w-5 h-5 text-[#E6007E] group-hover/btn:scale-110 transition-transform" />
                    )}
                    <span className="text-xs uppercase tracking-widest">{backupLoading ? 'Compilando...' : 'Descargar Backup'}</span>
                  </button>

                  {backupMsg && (
                    <div className={`mt-4 p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 border animate-in slide-in-from-top-2 ${
                      backupMsg.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {backupMsg.startsWith('✅') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {backupMsg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* WhatsApp Templates */}
          <section className="relative group">
            <div className="absolute -inset-px bg-gradient-to-b from-[#00AEEF]/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-2.5 bg-[#00AEEF]/10 border border-[#00AEEF]/20 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-[#00AEEF]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight">Plantillas de Notificación</h2>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">WhatsApp Communication Hub</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { 
                    label: 'Nuevo Pedido', 
                    value: brandForm.whatsapp_new_order_template, 
                    key: 'whatsapp_new_order_template',
                    desc: 'Enviado al crear la orden'
                  },
                  { 
                    label: 'Pedido para Retiro', 
                    value: brandForm.whatsapp_pickup_template, 
                    key: 'whatsapp_pickup_template',
                    desc: 'Enviado al marcar como listo'
                  }
                ].map(tpl => (
                  <div key={tpl.key} className="space-y-4">
                    <div className="flex justify-between items-end px-1">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block mb-1">{tpl.label}</label>
                        <p className="text-[9px] text-[#00AEEF]/60 uppercase tracking-tighter">{tpl.desc}</p>
                      </div>
                      <span className="text-[9px] font-mono text-white/20 italic">{`{clientName}, {orderNumber}`}</span>
                    </div>
                    <div className="relative group/area">
                      <div className="absolute -inset-px bg-gradient-to-r from-[#00AEEF]/20 to-transparent rounded-2xl opacity-0 group-hover/area:opacity-100 transition-opacity" />
                      <textarea
                        className="relative w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:border-[#00AEEF]/50 outline-none min-h-[160px] text-sm leading-relaxed font-medium text-white/80 transition-all"
                        value={tpl.value}
                        onChange={e => setBrandForm({ ...brandForm, [tpl.key]: e.target.value })}
                        placeholder="Ej: Hola {clientName}, tu orden {orderNumber} ha sido procesada..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  className="flex items-center gap-3 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                  onClick={handleSaveBranding}
                  disabled={isUpdating}
                >
                  <Save className="w-4 h-4 text-[#00AEEF]" />
                  Guardar Plantillas
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Pipeline Stages */}
        <div className="lg:col-span-4 space-y-8">
          <section className="relative group">
            <div className="absolute -inset-px bg-gradient-to-b from-[#00AEEF]/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 h-full">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-[#00AEEF]/10 border border-[#00AEEF]/20 rounded-xl">
                    <GripVertical className="w-5 h-5 text-[#00AEEF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-tight">Pipeline</h2>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest">Stage Manager</p>
                  </div>
                </div>
                <div className="h-6 px-2 bg-white/5 rounded border border-white/10 flex items-center">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{stages?.length} Stages</span>
                </div>
              </div>

              <div className="space-y-3 mb-10 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {stages?.map((stage, index) => (
                  <div 
                    key={stage.id} 
                    className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                      editingId === stage.id ? 'bg-[#00AEEF]/5 border-[#00AEEF]/30 scale-[1.02]' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-40 transition-opacity">
                      <button 
                        onClick={() => handleMove(index, 'up')} 
                        disabled={index === 0}
                        className="p-1 hover:text-[#00AEEF] disabled:opacity-0 transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleMove(index, 'down')} 
                        disabled={index === (stages?.length || 0) - 1}
                        className="p-1 hover:text-[#00AEEF] disabled:opacity-0 transition-colors"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="relative">
                      <div className="w-3 h-3 rounded-full relative z-10" style={{ background: stage.color }} />
                      <div className="absolute inset-0 rounded-full blur-[6px] opacity-60 animate-pulse" style={{ background: stage.color }} />
                    </div>

                    {editingId === stage.id ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <input 
                          className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#00AEEF] font-bold" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          autoFocus
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={editColor} 
                              onChange={e => setEditColor(e.target.value)} 
                              className="w-5 h-5 border-none bg-transparent cursor-pointer rounded" 
                            />
                            <span className="text-[9px] font-mono text-white/40 uppercase">{editColor}</span>
                          </div>
                          <div className="flex gap-1">
                            <button className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg" onClick={() => updateMutation.mutate({ id: stage.id, updates: { name: editName, color: editColor } })}>
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 bg-white/5 text-white/40 rounded-lg" onClick={() => setEditingId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold tracking-tight text-white/80 group-hover:text-white transition-colors">{stage.name}</p>
                          <p className="text-[9px] text-white/20 font-mono uppercase tracking-tighter truncate">{stage.slug}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button 
                            className="p-2 hover:bg-white/10 rounded-xl text-white/30 hover:text-white transition-colors"
                            onClick={() => { setEditingId(stage.id); setEditName(stage.name); setEditColor(stage.color); }}
                          >
                            <SettingsIcon className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            className="p-2 hover:bg-rose-500/10 rounded-xl text-white/20 hover:text-rose-400 transition-colors"
                            onClick={() => { if (confirm(`¿Eliminar etapa "${stage.name}"?`)) deleteMutation.mutate(stage.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 px-1">Integrar Nueva Etapa</h4>
                <div className="space-y-3">
                  <div className="relative group/field">
                    <input 
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#00AEEF]/30 focus:bg-white/[0.05] transition-all font-bold" 
                      placeholder="NOMBRE DE ETAPA" 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)} 
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-[10px] outline-none focus:border-[#00AEEF]/30 transition-all font-mono uppercase text-white/40" 
                      placeholder="SLUG_IDENTIFICADOR" 
                      value={newSlug} 
                      onChange={e => setNewSlug(e.target.value)} 
                    />
                    <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4">
                      <div className="relative">
                        <input 
                          type="color" 
                          value={newColor} 
                          onChange={e => setNewColor(e.target.value)} 
                          className="w-5 h-5 border-none bg-transparent cursor-pointer relative z-10" 
                        />
                        <div className="absolute inset-0 blur-[4px] opacity-40" style={{ backgroundColor: newColor }} />
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  className="w-full group flex items-center justify-center gap-3 bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-black py-4 rounded-2xl font-black uppercase tracking-tighter italic transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#00AEEF]/10"
                  onClick={handleAdd}
                >
                  <Plus className="w-5 h-5" /> 
                  <span>Integrar Etapa</span>
                </button>
              </div>
            </div>
          </section>

          {/* System Footer Info */}
          <div className="px-4 py-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center gap-4 group">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">System Status: Optimal</p>
              <p className="text-[9px] text-white/30 uppercase tracking-tighter">Latencia 24ms • Supabase v2.43.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
