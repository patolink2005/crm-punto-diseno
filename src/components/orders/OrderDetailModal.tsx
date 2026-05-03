import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../services/orders';
import { 
  X, 
  FileText, 
  Archive, 
  Package, 
  Edit, 
  Calendar, 
  Trash2, 
  MessageSquare, 
  Clock, 
  Download, 
  ExternalLink,
  Eye,
  Hash,
  User,
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { OrderEditorModal } from './OrderEditorModal';
import { OrderStatusStepper } from './OrderStatusStepper';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { generateAndSendWhatsApp, formatOrderNumber, formatCurrency } from '../../services/whatsapp';

interface OrderItemDetail {
  id: string;
  products_config?: { name: string };
  selected_attributes: Record<string, string | number>;
  suppliers?: { name: string };
  quantity: number;
  calculated_price: number;
}

export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId),
    enabled: !!orderId,
  });

  const archiveMutation = useMutation({
    mutationFn: orderService.archiveOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err: Error) => alert('Error al archivar: ' + err.message)
  });

  const deleteOrderMutation = useMutation({
    mutationFn: orderService.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err: Error) => alert('Error al eliminar pedido: ' + err.message)
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) => {
      setIsSavingNotes(true);
      return orderService.updateInternalNotes(orderId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setIsSavingNotes(false);
    },
    onError: () => setIsSavingNotes(false)
  });

  const { settings } = useSystemSettings();

  if (isLoading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-industrial-cyan/20 blur-2xl animate-pulse rounded-full" />
          <Loader2 size={48} className="text-industrial-cyan animate-spin relative z-10" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-industrial-cyan animate-pulse">Sincronizando Expediente</p>
      </div>
    </div>
  );

  if (!order) return null;

  if (isEditingOrder) {
    return (
      <OrderEditorModal 
        orderId={orderId} 
        onClose={() => setIsEditingOrder(false)} 
        onOrderCreated={async () => {
          setIsEditingOrder(false);
          if (confirm("Pedido actualizado con éxito. ¿Deseas enviar la actualización por WhatsApp ahora?")) {
            await generateAndSendWhatsApp(orderId, 'update', settings);
          }
        }}
      />
    );
  }

  const orderNum = formatOrderNumber(order);
  const balance = order.total - (order.deposit_amount || 0);
  const isJPG = order.design_url?.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,1)] flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <header className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-industrial-cyan/5 border border-industrial-cyan/20 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(0,210,255,0.1)]">
              <Hash size={24} className="text-industrial-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                  Orden <span className="text-industrial-cyan">#{orderNum}</span>
                </h2>
                <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  order.status === 'entregado' || order.status === 'facturado' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                    : 'bg-industrial-cyan/10 border-industrial-cyan/20 text-industrial-cyan'
                }`}>
                  {order.status.replace('_', ' ')}
                </div>
              </div>
              <div className="flex items-center gap-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-industrial-magenta" />
                  {new Date(order.created_at).toLocaleDateString('es-UY', { day: '2-digit', month: 'long' })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-gray-700" />
                  ID: {order.id.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsEditingOrder(true)}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-industrial-cyan/30 active:scale-95 flex items-center gap-3"
            >
              <Edit size={16} /> Editar
            </button>
            <button 
              onClick={onClose}
              className="p-4 bg-white/5 hover:bg-industrial-magenta/20 text-gray-500 hover:text-industrial-magenta rounded-2xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Column: Flow & Design */}
            <div className="lg:col-span-8 space-y-12">
              
              {/* Stepper Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <Clock size={14} className="text-industrial-cyan" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Progresión de Manufactura</span>
                </div>
                <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                  <OrderStatusStepper 
                    orderId={order.id} 
                    currentStatus={order.status} 
                  />
                </div>
              </section>

              {/* Design Visualization */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <Eye size={14} className="text-industrial-cyan" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Documentación Gráfica</span>
                </div>
                {order.design_url ? (
                  <div className="group relative rounded-[2.5rem] overflow-hidden border-2 border-white/5 bg-black/40 min-h-[400px] flex items-center justify-center">
                    {isJPG ? (
                      <div className="p-8 w-full h-full flex items-center justify-center">
                        <img 
                          src={order.design_url} 
                          alt="Diseño" 
                          className="max-h-[500px] w-auto rounded-xl shadow-2xl transition-transform duration-1000 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-12">
                          <a 
                            href={order.design_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-10 py-5 bg-industrial-cyan text-black rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:scale-110 transition-all shadow-[0_0_40px_rgba(0,210,255,0.3)]"
                          >
                            <ExternalLink size={18} /> Abrir en Pantalla Completa
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-20">
                        <div className="w-24 h-24 bg-industrial-cyan/10 border border-industrial-cyan/20 rounded-[2rem] flex items-center justify-center text-industrial-cyan mx-auto mb-8 shadow-inner animate-pulse">
                          <FileText size={48} />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest text-lg mb-4">Especificación PDF Detectada</h4>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-10 max-w-xs mx-auto">El archivo requiere visualizador externo para inspección técnica detallada.</p>
                        <a 
                          href={order.design_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-4 px-10 py-5 bg-white/5 hover:bg-industrial-cyan hover:text-black border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                          <Download size={18} /> Descargar Documento
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-20 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-800">
                    <AlertCircle size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Pendiente de Carga de Diseño</p>
                  </div>
                )}
              </section>

              {/* Internal Notes */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <FileText size={14} className="text-industrial-cyan" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Bitácora de Control Interno</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSavingNotes ? (
                      <span className="text-[8px] font-black text-industrial-cyan uppercase tracking-widest flex items-center gap-2">
                        <Loader2 size={10} className="animate-spin" /> Sincronizando
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-green-500/50 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={10} /> Sincronizado
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  defaultValue={order.notes || ''}
                  onBlur={(e) => updateNotesMutation.mutate(e.target.value)}
                  placeholder="Instrucciones tácticas para el taller, detalles de material, observaciones de calidad..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-sm font-medium text-gray-300 focus:outline-none focus:border-industrial-cyan/30 focus:bg-white/[0.04] transition-all h-32 resize-none custom-scrollbar placeholder:text-zinc-800"
                />
              </section>

              {/* Items Breakdown - MOVED HERE FOR BETTER VISIBILITY */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3 text-industrial-cyan">
                    <Package size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Especificaciones Técnicas y Unidades</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">{order.items?.length || 0} COMPONENTES</span>
                </div>
                
                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/[0.01] border-b border-white/5">
                        <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Producto / Configuración</th>
                        <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Cantidad</th>
                        <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Precio Unit.</th>
                        <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {order.items?.map((item: OrderItemDetail) => (
                        <tr key={item.id} className="group hover:bg-white/[0.04] transition-all">
                          <td className="px-10 py-6">
                            <p className="text-sm font-black text-white uppercase tracking-tight mb-2 group-hover:text-industrial-cyan transition-colors">
                              {item.products_config?.name}
                            </p>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                              {Object.entries(item.selected_attributes || {}).map(([k, v]) => (
                                <div key={k} className="flex gap-2 text-[10px] uppercase font-bold tracking-widest">
                                  <span className="text-gray-700">{k}:</span>
                                  <span className="text-gray-400">{v}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="text-sm font-mono font-black text-white bg-white/10 px-4 py-1.5 rounded-xl border border-white/5">
                              x{item.quantity}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right font-mono text-sm font-bold text-gray-500">
                            {formatCurrency(item.calculated_price, order.currency)}
                          </td>
                          <td className="px-10 py-6 text-right font-mono text-sm font-black text-industrial-cyan">
                            {formatCurrency(item.calculated_price * item.quantity, order.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Right Column: Financials & Items */}
            <aside className="lg:col-span-4 space-y-10">
              
              {/* Financial Summary */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-industrial-magenta">
                    <CreditCard size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Estado Financiero</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Inversión Total</span>
                      <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(order.total, order.currency)}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Depósito Inicial</span>
                      <span className="text-xl font-black text-industrial-cyan tracking-tighter">{formatCurrency(order.deposit_amount || 0, order.currency)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4">
                      <span className="text-[11px] font-black text-industrial-magenta uppercase tracking-widest">Saldo Deudor</span>
                      <span className={`text-3xl font-black tracking-tighter ${balance > 0 ? 'text-industrial-magenta' : 'text-green-500'}`}>
                        {formatCurrency(balance, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>



              {/* Client Quick Contact */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-[1.25rem] flex items-center justify-center text-gray-500">
                    <User size={20} />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Titular Responsable</span>
                    <span className="block text-sm font-black text-white uppercase tracking-tight truncate max-w-[150px]">
                      {order.clients?.name}
                    </span>
                  </div>
                </div>
                
                <a
                  href={`https://wa.me/${order.clients?.phone?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-green-500 transition-all shadow-lg shadow-green-500/5 active:scale-95"
                >
                  <MessageSquare size={16} /> Enviar WhatsApp
                </a>
              </div>

              {/* Danger Zone */}
              <div className="px-10 space-y-4">
                {!order.archived_at && (['facturado', 'entregado'].includes(order.status)) && (
                  <button
                    onClick={() => { if (confirm('¿Deseas archivar este pedido para sacarlo del flujo activo?')) archiveMutation.mutate(orderId); }}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all"
                  >
                    <Archive size={14} /> Archivar Expediente
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('❌ ATENCIÓN: Esta acción eliminará permanentemente el pedido y sus items. ¿Proceder?')) deleteOrderMutation.mutate(orderId); }}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-900/50 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} /> Eliminar Registro
                </button>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-12 py-10 border-t border-white/5 flex justify-end items-center bg-white/[0.01]">
          <button 
            onClick={onClose}
            className="px-14 py-5 bg-industrial-cyan text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-industrial-cyan/80 transition-all shadow-[0_0_50px_rgba(0,210,255,0.2)] active:scale-95"
          >
            Finalizar Inspección
          </button>
        </footer>
      </div>
    </div>
  );
}
