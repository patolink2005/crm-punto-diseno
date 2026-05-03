import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Check, Loader2 } from 'lucide-react';

interface Stage {
  slug: string;
  label: string;
}

const STAGES: Stage[] = [
  { slug: 'nuevo_pedido', label: 'Recepción' },
  { slug: 'diseno', label: 'Diseño' },
  { slug: 'produccion', label: 'Producción' },
  { slug: 'para_retirar', label: 'Entrega' },
  { slug: 'entregado', label: 'Finalizado' }
];

interface OrderStatusStepperProps {
  orderId: string;
  currentStatus: string;
  readOnly?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({ 
  orderId, 
  currentStatus, 
  readOnly = false,
  orientation = 'horizontal'
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  const currentIndex = STAGES.findIndex(s => s.slug === currentStatus);

  if (orientation === 'vertical') {
    return (
      <div className="flex flex-col gap-8">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;
          const isMutating = mutation.isPending && mutation.variables === stage.slug;

          return (
            <div 
              key={stage.slug}
              className={`flex items-center gap-6 relative ${!readOnly ? 'cursor-pointer' : ''}`}
              onClick={() => !readOnly && !isActive && !mutation.isPending && mutation.mutate(stage.slug)}
            >
              {/* Connector line for vertical */}
              {index < STAGES.length - 1 && (
                <div className={`absolute left-6 top-12 w-0.5 h-8 z-0 ${index < currentIndex ? 'bg-industrial-cyan' : 'bg-white/5'}`} />
              )}

              <div className={`
                relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2
                ${isCompleted ? 'bg-industrial-cyan border-industrial-cyan text-black shadow-[0_0_20px_rgba(0,210,255,0.3)]' : ''}
                ${isActive ? 'bg-[#0a0a0a] border-industrial-cyan text-industrial-cyan shadow-[0_0_30px_rgba(0,210,255,0.4)] scale-110' : ''}
                ${isPending ? 'bg-[#0a0a0a] border-white/10 text-gray-700' : ''}
              `}>
                {isMutating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isCompleted ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  <span className="text-[10px] font-black">{index + 1}</span>
                )}
              </div>

              <div className="flex flex-col">
                <span className={`
                  text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500
                  ${isActive ? 'text-industrial-cyan' : isCompleted ? 'text-white' : 'text-gray-700'}
                `}>
                  {stage.label}
                </span>
                {isActive && (
                  <span className="text-[8px] font-bold text-industrial-cyan/50 uppercase tracking-widest mt-1 animate-pulse">
                    En curso
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <div className="relative flex justify-between items-center max-w-4xl mx-auto">
        {/* Background Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-white/5 z-0" />
        
        {/* Active Track */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 left-0 h-0.5 bg-industrial-cyan shadow-[0_0_15px_rgba(0,210,255,0.5)] z-0 transition-all duration-700 ease-in-out" 
          style={{ width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 100}%` }}
        />

        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;
          const isMutating = mutation.isPending && mutation.variables === stage.slug;

          return (
            <div 
              key={stage.slug}
              className={`relative z-10 flex flex-col items-center group ${!readOnly ? 'cursor-pointer' : ''}`}
              onClick={() => !readOnly && !isActive && !mutation.isPending && mutation.mutate(stage.slug)}
            >
              <button
                disabled={mutation.isPending || readOnly}
                className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2
                  ${isCompleted ? 'bg-industrial-cyan border-industrial-cyan text-black shadow-[0_0_20px_rgba(0,210,255,0.3)]' : ''}
                  ${isActive ? 'bg-[#0a0a0a] border-industrial-cyan text-industrial-cyan shadow-[0_0_30px_rgba(0,210,255,0.4)] scale-110' : ''}
                  ${isPending ? 'bg-[#0a0a0a] border-white/10 text-gray-700 hover:border-industrial-cyan/40 hover:text-industrial-cyan/60' : ''}
                  active:scale-95 disabled:opacity-50
                `}
              >
                {isMutating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : isCompleted ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  <span className="text-[10px] font-black">{index + 1}</span>
                )}
              </button>
              
              <div className="absolute top-16 flex flex-col items-center">
                <span className={`
                  text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-colors duration-500
                  ${isActive ? 'text-industrial-cyan' : isCompleted ? 'text-white' : 'text-gray-700 group-hover:text-gray-400'}
                `}>
                  {stage.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-industrial-cyan rounded-full mt-2 animate-pulse shadow-[0_0_10px_rgba(0,210,255,1)]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {mutation.isError && (
        <p className="text-[10px] font-black uppercase tracking-widest text-industrial-magenta text-center mt-12 animate-bounce">
          Error en sincronización. Reintente.
        </p>
      )}
    </div>
  );
};
