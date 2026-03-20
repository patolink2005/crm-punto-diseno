import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orders';
import { pipelineService } from '../services/pipeline';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import type { Order } from '../types';
import { Plus, Eye } from 'lucide-react';
import { OrderEditorModal } from '../components/orders/OrderEditorModal';
import { OrderDetailModal } from '../components/orders/OrderDetailModal';
import { useSystemSettings } from '../context/SystemSettingsContext';
import './Pipeline.css';

function formatOrderNumber(order: Order): string {
  if (order.order_number) {
    return `#${String(order.order_number).padStart(4, '0')}`;
  }
  return `#${order.id.slice(0, 6)}`;
}

function formatCurrency(amount: number, currency?: string): string {
  const cur = currency || 'UYU';
  const symbol = cur === 'USD' ? 'U$S' : '$';
  return `${symbol}${Number(amount || 0).toLocaleString('es-UY')}`;
}

function DraggableCard({ order, onClickDetail }: { order: Order; onClickDetail: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} className="kanban-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
        <div className="card-title" {...listeners} {...attributes} style={{ cursor: 'grab', flex: 1 }}>Pedido {formatOrderNumber(order)}</div>
        <button
          className="card-edit-btn"
          onClick={() => onClickDetail(order.id)}
          title="Ver detalle"
        >
          <Eye size={14} />
        </button>
      </div>
      <div {...listeners} {...attributes} style={{ cursor: 'grab' }}>
        <div className="card-subtitle">{(order as any).clients?.name || 'Cliente Desconocido'}</div>
        <div className="card-footer">
          <span>{formatCurrency((order as any).total, (order as any).currency)}</span>
          <span>{new Date(order.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ id, title, color, orders, onClickDetail }: { id: string, title: string, color: string, orders: Order[], onClickDetail: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="kanban-column" ref={setNodeRef} style={{ borderColor: isOver ? color : undefined }}>
      <div className="kanban-column-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
          {title}
        </span>
        <span className="badge-role" style={{ background: 'rgba(255,255,255,0.1)' }}>{orders.length}</span>
      </div>
      <div className="kanban-column-content">
        {orders.map(order => (
          <DraggableCard key={order.id} order={order} onClickDetail={onClickDetail} />
        ))}
      </div>
    </div>
  );
}

export function Pipeline() {
  const queryClient = useQueryClient();
  const { settings } = useSystemSettings();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.getAll
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: pipelineService.getStages
  });

  const filteredOrders = orders?.filter(o => 
    formatOrderNumber(o).toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((o as any).clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => orderService.updateStatus(id, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      alert('Error al mover pedido: ' + (err.message || 'Error desconocido'));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const handleDragStart = (event: any) => {
    const { active } = event;
    const order = orders?.find(o => o.id === active.id);
    if (order) setActiveOrder(order);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveOrder(null);
    if (!over) return;

    const orderId = active.id;
    const newStatus = over.id as string;
    const order = orders?.find(o => o.id === orderId);

    if (order && (order as any).status !== newStatus) {
      // Plan C: Security check
      const isInitialStage = ['nuevo_pedido', 'presupuestado'].includes((order as any).status);
      const isMovingForward = !['nuevo_pedido', 'presupuestado'].includes(newStatus);
      const noDeposit = !(order as any).deposit_amount || (order as any).deposit_amount <= 0;

      if (settings?.branding?.enforce_deposit_on_move && isInitialStage && isMovingForward && noDeposit) {
        alert('❌ SEGURIDAD: No se puede mover el pedido a producción/diseño sin registrar una seña previa.');
        return;
      }

      queryClient.setQueryData(['orders'], (oldData: Order[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
      });
      updateStatusMutation.mutate({ id: orderId as string, status: newStatus });
    }
  };

  if (ordersLoading || stagesLoading) return <div style={{ padding: '2rem' }}>Cargando pipeline...</div>;

  const columns = stages || [];

  return (
    <div style={{ padding: '0 1rem' }}>
      <div className="page-header">
        <h2>Pipeline de Pedidos</h2>
        <button className="btn btn-primary" onClick={() => setIsOrderModalOpen(true)}>
          <Plus size={18} /> Nuevo Pedido
        </button>
      </div>

      <div className="search-container" style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por Nº de pedido o cliente..." 
          className="input-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map(col => (
            <DroppableColumn 
              key={col.slug} 
              id={col.slug} 
              title={col.name} 
              color={col.color}
              orders={filteredOrders?.filter(o => (o as any).status === col.slug) || []} 
              onClickDetail={(id) => setDetailOrderId(id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeOrder ? <DraggableCard order={activeOrder} onClickDetail={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {isOrderModalOpen && <OrderEditorModal onClose={() => setIsOrderModalOpen(false)} />}
      {detailOrderId && <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />}
    </div>
  );
}
