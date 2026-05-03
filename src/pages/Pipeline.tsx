import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orders';
import { pipelineService } from '../services/pipeline';
import type { PipelineStage } from '../services/pipeline';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { Order, OrderSubmitResponse, OrderStatus } from '../types';
import { Plus, Eye, ChevronDown, Search, ShoppingCart, MoreVertical, LayoutGrid } from 'lucide-react';
import { OrderEditorModal } from '../components/orders/OrderEditorModal';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { useSystemSettings } from '../context/SystemSettingsContext';
import { generateAndSendWhatsApp, formatOrderNumber } from '../services/whatsapp';

type OrderWithClient = Order & {
  clients: { name: string, phone: string } | null;
};

function DraggableRowItem({ order, onClickDetail }: { order: OrderWithClient; onClickDetail: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
    position: 'relative' as const
  } : undefined;

  const total = order.total || 0;
  const deposit = order.deposit_amount || 0;
  const balance = total - deposit;

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`group hover:bg-white/[0.04] transition-all duration-300 border-b border-white/5 ${isDragging ? 'shadow-2xl shadow-[#00D2FF]/20 border-[#00D2FF]/30 bg-[#00D2FF]/10' : ''}`}
    >
      <td className="pl-6 pr-2 py-4" {...listeners} {...attributes}>
        <div className="flex items-center gap-3">
          <div className="cursor-grab active:cursor-grabbing text-white/20 group-hover:text-[#00D2FF] transition-colors">
            <MoreVertical size={14} strokeWidth={3} />
          </div>
          <span className="text-[16px] font-mono font-black text-[#00D2FF]">
            {formatOrderNumber(order)}
          </span>
        </div>
      </td>
      <td className="px-2 py-4">
        <div className="text-[15px] font-black text-white uppercase truncate max-w-[200px]">
          {order.clients?.name || 'S/N'}
        </div>
      </td>
      <td className="px-2 py-4 text-center">
        <div className="text-[12px] text-white/40 font-bold uppercase tracking-widest">
          {new Date(order.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-2 py-4 text-right">
        <div className="text-[15px] font-black text-white/60 font-mono">
          ${total.toLocaleString()}
        </div>
      </td>
      <td className="px-2 py-4 text-right">
        <div className="text-[15px] font-black text-[#00D2FF]/60 font-mono">
          ${deposit.toLocaleString()}
        </div>
      </td>
      <td className="px-2 py-4 text-right">
        <div className="text-[15px] font-black text-[#E6007E] font-mono">
          ${balance.toLocaleString()}
        </div>
      </td>
      <td className="pl-2 pr-6 py-4 text-right">
        <button 
          onClick={(e) => { e.stopPropagation(); onClickDetail(order.id); }}
          className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-[#00D2FF] hover:border-[#00D2FF]/30 transition-all"
        >
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );
}

function DroppableRow({ stage, orders, onClickDetail }: { stage: PipelineStage, orders: OrderWithClient[], onClickDetail: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      ref={setNodeRef}
      className={`border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-500 ${
        isOver ? 'bg-[#00D2FF]/5 border-[#00D2FF]/30 ring-1 ring-[#00D2FF]/20' : 'bg-white/[0.02]'
      }`}
    >
      <div 
        className="px-6 py-4 flex justify-between items-center cursor-pointer select-none hover:bg-white/[0.02] transition-all group"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full blur-[4px] absolute inset-0 opacity-50" style={{ backgroundColor: stage.color }} />
            <div className="w-2.5 h-2.5 rounded-full relative z-10" style={{ backgroundColor: stage.color }} />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.2em] text-white/90 group-hover:text-[#00D2FF] transition-colors">
            {stage.name}
          </span>
          <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-white/30">
            {orders.length}
          </span>
        </div>
        <div className={`text-white/20 group-hover:text-[#00D2FF] transition-all duration-500 ${isCollapsed ? '-rotate-90' : ''}`}>
          <ChevronDown size={18} />
        </div>
      </div>

      {!isCollapsed && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 border-t border-white/5 overflow-x-auto custom-scrollbar">
          {orders.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white/[0.01]">
                  <th className="pl-6 pr-2 py-3 text-[11px] font-black uppercase tracking-widest text-white/30">ID Pedido</th>
                  <th className="px-2 py-3 text-[11px] font-black uppercase tracking-widest text-white/30">Cliente</th>
                  <th className="px-2 py-3 text-[11px] font-black uppercase tracking-widest text-white/30 text-center">Fecha</th>
                  <th className="px-2 py-3 text-[11px] font-black uppercase tracking-widest text-white/30 text-right">Total</th>
                  <th className="px-2 py-3 text-[11px] font-black uppercase tracking-widest text-white/30 text-right">Seña</th>
                  <th className="px-2 py-3 text-[11px] font-black uppercase tracking-widest text-white/30 text-right">Saldo</th>
                  <th className="pl-2 pr-6 py-3 text-[11px] font-black uppercase tracking-widest text-white/30 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(order => (
                  <DraggableRowItem key={order.id} order={order} onClickDetail={onClickDetail} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center opacity-20">
              <ShoppingCart size={24} className="mb-2" />
              <span className="text-[10px] uppercase tracking-widest font-black">Sin pedidos en esta etapa</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Pipeline() {
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const [activeOrder, setActiveOrder] = useState<OrderWithClient | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getAll
  });

  const filteredOrders = orders?.filter(o =>
    formatOrderNumber(o).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOrderCreation = async (response: OrderSubmitResponse) => {
    setIsOrderModalOpen(false);
    if (confirm("Pedido creado con éxito. ¿Deseas enviar el resumen por WhatsApp ahora?")) {
      await generateAndSendWhatsApp(response.order.id, 'new_order', settings);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => orderService.updateStatus(id, status as OrderStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: Error) => {
      alert('Error al mover pedido: ' + (err.message || 'Error desconocido'));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders?.find(o => o.id === active.id);
    if (order) setActiveOrder(order);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);
    if (!over) return;

    const orderId = active.id as string;
    const targetStageId = over.id as string;
    const order = orders?.find(o => o.id === orderId);

    if (order && stages) {
      const targetStage = stages.find(s => s.id === targetStageId);
      if (!targetStage) return;

      const newStatus = targetStage.slug;

      if (order.status !== newStatus) {
        // Safety check for deposit
        const isInitialStage = order.status === 'nuevo_pedido' || order.status === 'presupuestado';
        const isMovingForward = newStatus !== 'nuevo_pedido' && newStatus !== 'presupuestado';
        const noDeposit = !order.deposit_amount || order.deposit_amount <= 0;

        if (settings?.branding?.enforce_deposit_on_move && isInitialStage && isMovingForward && noDeposit) {
          alert('❌ REQUERIDO: No se puede mover a producción/diseño sin una seña registrada.');
          return;
        }

        queryClient.setQueryData(['orders'], (oldData: OrderWithClient[] | undefined) => {
          if (!oldData) return [];
          return oldData.map(o => o.id === orderId ? { ...o, status: newStatus as OrderStatus } : o);
        });

        updateStatusMutation.mutate({ id: orderId, status: newStatus });

        if (newStatus === 'para_retirar') {
          if (confirm('¿Notificar al cliente que su pedido está listo para retirar?')) {
            generateAndSendWhatsApp(orderId, 'pickup', settings);
          }
        }
      }
    }
  };

  if (stagesLoading || ordersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00D2FF]"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Cargando Tablero...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Header with Glassmorphism */}
      <div className="relative group p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D2FF]/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-all duration-700 group-hover:bg-[#00D2FF]/10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E6007E]/5 rounded-full blur-[80px] -ml-32 -mb-32 opacity-50" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-5 mb-4">
              <div className="p-4 bg-gradient-to-br from-[#00D2FF]/20 to-transparent rounded-2xl border border-[#00D2FF]/20 text-[#00D2FF] shadow-[0_0_30px_rgba(0,210,255,0.1)]">
                <LayoutGrid size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                  Pipeline <span className="text-[#00D2FF]">Operativo</span>
                </h1>
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 mt-1">Control de flujo industrial en tiempo real</p>
              </div>
            </div>
            <p className="text-white/40 text-sm font-medium max-w-xl leading-relaxed">
              Gestión centralizada por etapas. Visualiza y desplaza pedidos verticalmente para optimizar la cadena de producción y entrega.
            </p>
          </div>
          <button 
            className="group relative flex items-center justify-center gap-3 bg-[#00D2FF] text-black px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_10px_40px_rgba(0,210,255,0.3)] hover:scale-[1.02] active:scale-95 overflow-hidden"
            onClick={() => setIsOrderModalOpen(true)}
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            <Plus size={20} strokeWidth={3} /> Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Toolbar - Search Hardened */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex-1 group w-full">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/10 group-focus-within:text-[#00D2FF] transition-colors">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder="LOCALIZAR PEDIDO POR CLIENTE O IDENTIFICADOR..."
            className="w-full bg-white/[0.02] border border-white/5 focus:border-[#00D2FF]/30 rounded-2xl pl-16 pr-8 py-5 outline-none transition-all text-xs font-black uppercase tracking-widest placeholder:text-white/5 focus:bg-white/[0.04]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Board - Strict Vertical Layout */}
      <div className="flex-1">
        <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-8">
            {stages?.sort((a, b) => a.position - b.position).map(stage => (
              <DroppableRow
                key={stage.id}
                stage={stage}
                orders={filteredOrders?.filter(o => o.status === stage.slug) || []}
                onClickDetail={(id) => setDetailOrderId(id)}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeOrder ? (
              <div className="bg-[#1a1a1a] border-2 border-[#00D2FF]/50 p-4 rounded-xl shadow-2xl backdrop-blur-xl min-w-[320px] ring-4 ring-black/50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-black text-[#00D2FF] bg-[#00D2FF]/10 px-2 py-1 rounded">
                      #{formatOrderNumber(activeOrder)}
                    </span>
                    <span className="text-xs font-black text-white uppercase truncate max-w-[140px]">
                      {activeOrder.clients?.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-[#E6007E]">
                    ${(activeOrder.total! - activeOrder.deposit_amount!).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {isOrderModalOpen && <OrderEditorModal onClose={() => setIsOrderModalOpen(false)} onOrderCreated={handleOrderCreation} />}
      {detailOrderId && <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />}
    </div>
  );
}
