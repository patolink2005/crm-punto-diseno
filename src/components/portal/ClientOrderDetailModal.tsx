import React from 'react';
import { 
  X, 
  FileText, 
  Package, 
  Calendar, 
  Clock, 
  Download, 
  ExternalLink,
  Eye,
  Hash,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { OrderStatusStepper } from '../orders/OrderStatusStepper';
import { formatCurrency } from '../../services/whatsapp';

interface OrderItemDetail {
  id: string;
  products_config?: { name: string };
  selected_attributes: Record<string, string | number>;
  quantity: number;
  calculated_price: number;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  deposit_amount: number;
  balance_due: number;
  currency: string;
  description: string;
  design_url: string;
  order_items: OrderItemDetail[];
}

interface ClientOrderDetailModalProps {
  order: OrderDetail;
  onClose: () => void;
  onPay?: () => void;
}

export const ClientOrderDetailModal: React.FC<ClientOrderDetailModalProps> = ({ order, onClose, onPay }) => {
  const isJPG = order.design_url?.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
  const orderNum = order.order_number || order.id.slice(0, 8);

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
                  Proyecto <span className="text-industrial-cyan">#{orderNum}</span>
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
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-4 bg-white/5 hover:bg-industrial-magenta/20 text-gray-500 hover:text-industrial-magenta rounded-2xl transition-all"
          >
            <X size={24} />
          </button>
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Estado de Producción</span>
                </div>
                <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                  <OrderStatusStepper 
                    orderId={order.id} 
                    currentStatus={order.status} 
                    readOnly={true}
                  />
                </div>
              </section>

              {/* Design Visualization */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <Eye size={14} className="text-industrial-cyan" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Visualización de Diseño</span>
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
                            <ExternalLink size={18} /> Ver Pantalla Completa
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-20">
                        <div className="w-24 h-24 bg-industrial-cyan/10 border border-industrial-cyan/20 rounded-[2rem] flex items-center justify-center text-industrial-cyan mx-auto mb-8 shadow-inner">
                          <FileText size={48} />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest text-lg mb-4">Archivo de Diseño Técnico</h4>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-10 max-w-xs mx-auto">Haz clic abajo para descargar o visualizar el documento de diseño.</p>
                        <a 
                          href={order.design_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-4 px-10 py-5 bg-white/5 hover:bg-industrial-cyan hover:text-black border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                          <Download size={18} /> Descargar Archivo
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-20 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-800">
                    <AlertCircle size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Diseño en proceso de elaboración</p>
                  </div>
                )}
              </section>
                         {/* Items Breakdown - MOVED HERE */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3 text-industrial-cyan">
                    <Package size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Especificaciones Técnicas</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">{order.order_items?.length || 0} COMPONENTES</span>
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
                      {order.order_items?.map((item: OrderItemDetail) => (
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

            {/* Right Column: Financials */}
            <aside className="lg:col-span-4 space-y-10">
              
              {/* Financial Summary */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-industrial-magenta">
                    <CreditCard size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Resumen de Cuenta</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Inversión Total</span>
                      <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(order.total, order.currency)}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-white/5 pb-4">
                      <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Monto Pagado</span>
                      <span className="text-xl font-black text-industrial-cyan tracking-tighter">{formatCurrency(order.deposit_amount || 0, order.currency)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4">
                      <span className="text-[11px] font-black text-industrial-magenta uppercase tracking-widest">Saldo Pendiente</span>
                      <span className={`text-3xl font-black tracking-tighter ${order.balance_due > 0 ? 'text-industrial-magenta' : 'text-green-500'}`}>
                        {formatCurrency(order.balance_due, order.currency)}
                      </span>
                    </div>
                  </div>

                  {order.balance_due > 0 && onPay && (
                    <button 
                      onClick={onPay}
                      className="w-full py-5 bg-industrial-cyan text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-industrial-cyan/20 flex items-center justify-center gap-3"
                    >
                      <CreditCard size={18} /> Pagar Saldo Ahora
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-12 py-10 border-t border-white/5 flex justify-end items-center bg-white/[0.01]">
          <button 
            onClick={onClose}
            className="px-14 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 border border-white/10"
          >
            Cerrar Vista
          </button>
        </footer>
      </div>
    </div>
  );
};
