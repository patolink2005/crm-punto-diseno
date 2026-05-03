import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { 
  Package, 
  Eye, 
  CheckCircle2, 
  Loader2,
  ChevronDown,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import { ClientOrderDetailModal } from '../../components/portal/ClientOrderDetailModal';

interface OrderItem {
  id: string;
  quantity: number;
  calculated_price: number;
  products_config: {
    name: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  description: string;
  status: string;
  total: number;
  deposit_amount: number;
  balance_due: number;
  currency: string;
  created_at: string;
  estimated_delivery_date: string;
  design_url: string;
  order_items: OrderItem[];
}

export const ClientPortal: React.FC = () => {
  const { clientProfile } = useAuthStore();

  const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);
  const [expandedOrders, setExpandedOrders] = React.useState<string[]>([]);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('table');
  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['client-portal-orders', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            calculated_price,
            products_config (name)
          )
        `)
        .eq('client_id', clientProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!clientProfile?.id
  });

  const [isProcessing, setIsProcessing] = React.useState(false);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelect = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBatchPayment = async (targetOrderIds?: string[]) => {
    const idsToPay = targetOrderIds || selectedOrders;
    if (idsToPay.length === 0) return;

    setIsProcessing(true);
    try {
      const ordersToPay = orders?.filter(o => idsToPay.includes(o.id)) || [];
      const totalAmount = ordersToPay.reduce((sum, o) => sum + (o.balance_due || 0), 0);
      const title = idsToPay.length === 1 
        ? `Pedido #${ordersToPay[0].order_number || ordersToPay[0].id.slice(0, 8)}`
        : `Pago Consolidado (${idsToPay.length} pedidos)`;

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          orderIds: idsToPay,
          amount: totalAmount,
          title: title,
          currency: 'UYU',
          buyer_email: clientProfile?.email
        }
      });

      if (error) throw error;

      if (data?.sandbox_init_point || data?.init_point) {
        window.location.href = data.sandbox_init_point || data.init_point;
      }
    } catch (err: unknown) {
      console.error('Error initiating payment:', err);
      alert('Error al iniciar el proceso de pago. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedAmount = React.useMemo(() => {
    return orders?.filter(o => selectedOrders.includes(o.id))
      .reduce((sum, o) => sum + (o.balance_due || 0), 0) || 0;
  }, [selectedOrders, orders]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'nuevo_pedido': return { color: 'text-white', bg: 'bg-white/10', label: 'Nuevo' };
      case 'diseno': return { color: 'text-industrial-magenta', bg: 'bg-industrial-magenta/10', label: 'En Diseño' };
      case 'produccion': return { color: 'text-industrial-cyan', bg: 'bg-industrial-cyan/10', label: 'Producción' };
      case 'para_retirar': return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Listo para Retiro' };
      case 'entregado': return { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Entregado' };
      default: return { color: 'text-gray-400', bg: 'bg-gray-400/10', label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-industrial-cyan mb-4" />
        <p className="text-gray-500 font-medium tracking-widest text-[10px] uppercase">Sincronizando expedientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
            Hola, <span className="text-industrial-cyan">{clientProfile?.name?.split(' ')[0] || 'Cliente'}</span>
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-industrial-cyan animate-pulse" />
            Central de Seguimiento de Proyectos
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-6 py-3 rounded-xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-industrial-cyan text-black shadow-lg shadow-industrial-cyan/20' : 'text-gray-500 hover:text-white'}`}
          >
            Tarjetas
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-6 py-3 rounded-xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${viewMode === 'table' ? 'bg-industrial-cyan text-black shadow-lg shadow-industrial-cyan/20' : 'text-gray-500 hover:text-white'}`}
          >
            Tabla
          </button>
        </div>
      </header>

      {orders && orders.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {orders.map((order) => {
              const status = getStatusInfo(order.status);
              return (
                <div 
                  key={order.id} 
                  className={`group relative bg-white/[0.02] border rounded-[3rem] p-10 transition-all duration-700 ${
                    selectedOrders.includes(order.id) ? 'border-industrial-cyan bg-industrial-cyan/[0.03] ring-1 ring-industrial-cyan/20' : 'border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Selection Checkbox */}
                    {order.balance_due > 0 && (
                      <div 
                        onClick={() => toggleSelect(order.id)}
                        className={`absolute top-10 right-10 w-8 h-8 rounded-xl border-2 cursor-pointer flex items-center justify-center transition-all ${
                          selectedOrders.includes(order.id) ? 'bg-industrial-cyan border-industrial-cyan shadow-[0_0_20px_rgba(0,210,255,0.4)]' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        {selectedOrders.includes(order.id) && <CheckCircle2 size={18} className="text-black" strokeWidth={3} />}
                      </div>
                    )}

                  <div className="flex justify-between items-start mb-10 pr-16">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Expediente</span>
                      <h3 className="text-2xl font-black font-mono text-white tracking-tighter">#{order.order_number || order.id.slice(0, 8)}</h3>
                    </div>
                  </div>

                  <div className={`inline-flex px-4 py-1.5 rounded-full ${status.bg} ${status.color} text-[9px] font-black uppercase tracking-[0.2em] border border-current/20 mb-8`}>
                    {status.label}
                  </div>

                  <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-relaxed mb-8 line-clamp-2 min-h-[3rem]">
                    {order.description || 'S/D Técnica.'}
                  </p>
                  
                  {/* Items Toggle */}
                  <div className="flex items-center gap-3 mb-8">
                    <button 
                      onClick={() => toggleExpand(order.id)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-industrial-cyan transition-colors group/btn"
                    >
                      <div className="p-2 bg-white/5 rounded-lg group-hover/btn:bg-industrial-cyan/10 transition-all">
                        {expandedOrders.includes(order.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                      {expandedOrders.includes(order.id) ? 'Ocultar Items' : 'Especificaciones'}
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();

                        setViewingOrder(order);
                      }}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-industrial-cyan transition-colors group/btn ml-auto pointer-events-auto"
                      title="Ver detalles del pedido"
                    >
                      <div className="p-2 bg-white/5 rounded-lg group-hover/btn:bg-industrial-cyan/10 transition-all">
                        <Eye size={14} />
                      </div>
                      <span className="hidden sm:inline">Detalles</span>
                    </button>
                  </div>

                  {expandedOrders.includes(order.id) && (
                    <div className="mb-8 overflow-hidden rounded-[1.5rem] border border-white/5 bg-black/40 animate-in slide-in-from-top-2 duration-300">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-white/5 text-gray-600 font-black uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-6 py-4">Componente</th>
                            <th className="px-6 py-4 text-center">Unidades</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {order.order_items?.map((item) => (
                            <tr key={item.id} className="text-gray-400">
                              <td className="px-6 py-4 font-black text-white uppercase">{item.products_config?.name}</td>
                              <td className="px-6 py-4 text-center font-black">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 p-8 bg-black/40 rounded-[2rem] border border-white/5 mb-8">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Saldo Pendiente</span>
                      <div className={`text-lg font-black ${order.balance_due > 0 ? 'text-industrial-magenta' : 'text-green-500'}`}>
                        ${order.balance_due?.toLocaleString('es-UY') || '0'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Fecha Est.</span>
                      <div className="text-lg font-black text-white">
                        {order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString('es-UY') : 'TBD'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {order.design_url && (
                      <a 
                        href={order.design_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-industrial-cyan hover:text-black hover:border-industrial-cyan transition-all duration-500"
                      >
                        <Eye size={16} /> Ver Diseño
                      </a>
                    )}
                    {order.balance_due > 0 && (
                      <button 
                        onClick={() => handleBatchPayment([order.id])}
                        disabled={isProcessing}
                        className="flex items-center justify-center gap-3 px-6 py-4 bg-industrial-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-industrial-cyan/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} 
                        Pagar Ahora
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Referencia</th>
                  <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Estado</th>
                  <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Items</th>
                  <th className="px-8 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 text-right">Saldo</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => {
                  const status = getStatusInfo(order.status);
                  return (
                    <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-10 py-8">
                        <div className="text-xl font-black font-mono text-white tracking-tighter">#{order.order_number || order.id.slice(0, 8)}</div>
                        <div className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">
                          {order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString() : 'Fecha Pendiente'}
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <span className={`px-4 py-1.5 rounded-full ${status.bg} ${status.color} text-[9px] font-black uppercase tracking-widest border border-current/20`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-wrap gap-2">
                          {order.order_items?.map(item => (
                            <span key={item.id} className="text-[10px] font-black text-gray-400 bg-white/5 px-2 py-1 rounded-lg uppercase">
                              {item.quantity}x {item.products_config?.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className={`text-lg font-black ${order.balance_due > 0 ? 'text-industrial-magenta' : 'text-green-500'}`}>
                          ${order.balance_due?.toLocaleString('es-UY')}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex justify-end gap-3">
                          {order.balance_due > 0 && (
                            <button 
                              onClick={() => handleBatchPayment([order.id])}
                              disabled={isProcessing}
                              className="p-4 bg-industrial-cyan text-black rounded-xl hover:scale-105 transition-all shadow-lg shadow-industrial-cyan/20 disabled:opacity-50"
                            >
                              <CreditCard size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => setViewingOrder(order)}
                            className="p-4 bg-white/5 text-gray-500 hover:text-white rounded-xl transition-all"
                            title="Ver detalles completos"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 text-gray-600">
            <Package size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">No hay pedidos activos</h3>
          <p className="text-gray-500 font-light max-w-xs">
            Cuando iniciemos un nuevo proyecto juntos, aparecerá en esta sección para que lo gestiones.
          </p>
        </div>
      )}

      {/* Batch Payment Footer */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-black/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl z-50 animate-in slide-in-from-bottom duration-500 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-industrial-cyan rounded-full flex items-center justify-center text-black">
              <CheckCircle2 size={24} strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold uppercase tracking-widest text-gray-400">
                {selectedOrders.length} {selectedOrders.length === 1 ? 'Pedido seleccionado' : 'Pedidos seleccionados'}
              </p>
              <p className="text-2xl font-bold text-white font-mono">
                Total: <span className="text-industrial-cyan">${selectedAmount.toLocaleString('es-UY')}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setSelectedOrders([])}
              className="px-6 py-3 text-gray-500 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={() => handleBatchPayment()}
              disabled={isProcessing}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-industrial-magenta text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg shadow-industrial-magenta/20 disabled:opacity-50"
            >
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              <CreditCard size={16} /> Pagar Consolidado
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewingOrder && (
        <ClientOrderDetailModal 
          order={viewingOrder} 
          onClose={() => setViewingOrder(null)}
          onPay={viewingOrder.balance_due > 0 ? () => handleBatchPayment([viewingOrder.id]) : undefined}
        />
      )}
    </div>
  );
};
