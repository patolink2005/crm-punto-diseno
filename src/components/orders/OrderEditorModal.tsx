import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services/clients';
import { productService } from '../../services/products';
import { supplierService } from '../../services/suppliers';
import { orderService } from '../../services/orders';
import type { OrderStatus, OrderSubmitResponse, OrderItem as GlobalOrderItem } from '../../types';
import { Trash2, X, Calculator, User, Package, FileText, Coins, ArrowRight, ShoppingCart, Upload, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../services/whatsapp';
import { supabase } from '../../lib/supabase';
import { orderPayloadSchema } from '../../lib/schemas';

interface OrderEditorModalProps {
  orderId?: string;
  onClose: () => void;
  onOrderCreated?: (response: OrderSubmitResponse) => void;
}

type OrderItemWithUI = GlobalOrderItem & {
  _productName?: string;
  _supplierName?: string;
  total?: number;
  products_config?: { name: string };
  suppliers?: { name: string };
};

interface NestingResult {
  bobina: number;
  metros_lineales: number;
  orientacion: 'Vertical' | 'Apaisado';
  piezas_ancho: number;
  filas: number;
  roll_currency: 'UYU' | 'USD';
  costo_sugerido_uyu: number;
}

interface OrderPayload {
  order: {
    client_id: string;
    notes: string;
    status: OrderStatus;
    currency: 'UYU' | 'USD';
    total: number;
    total_uyu: number;
    exchange_rate: number;
    deposit_amount: number;
    payment_method: string;
    balance_due: number;
  };
  items: Partial<GlobalOrderItem>[];
}

export function OrderEditorModal({ orderId, onClose, onOrderCreated }: OrderEditorModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!orderId;

  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<OrderStatus>('nuevo_pedido');
  const [currency, setCurrency] = useState<'UYU' | 'USD'>('UYU');
  const [exchangeRateManual, setExchangeRateManual] = useState<number | null>(null);
  const [items, setItems] = useState<OrderItemWithUI[]>([]);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [designUrl, setDesignUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemAttributes, setItemAttributes] = useState<Record<string, string | number>>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemSupplierId, setItemSupplierId] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState<number>(0);

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: clientService.getAll });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: productService.getAll });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.getAll });

  const { data: existingOrder, isLoading: loadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: isEdit
  });

  const { data: bcuRate } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async () => {
      try {
        const res = await fetch('https://api.dolarito.uy/api/frontend/usd');
        const data = await res.json();
        const sell = data?.bcu?.sell || data?.instituciones?.[0]?.sell;
        if (sell) return Number(sell);
      } catch (e) { console.warn(e); }
      return 42.5;
    },
    staleTime: 1000 * 60 * 60,
  });

  const effectiveExchangeRate = exchangeRateManual || bcuRate || 42.5;

  useEffect(() => {
    if (existingOrder && isEdit) {
      setClientId(existingOrder.client_id);
      setNotes(existingOrder.notes || '');
      setStatus(existingOrder.status);
      setCurrency(existingOrder.currency);
      setExchangeRateManual(existingOrder.exchange_rate || null);
      setItems(existingOrder.items?.map(it => ({
        ...it,
        _productName: it.products_config?.name,
        _supplierName: it.suppliers?.name,
        total: it.calculated_price * it.quantity
      })) || []);
      setDepositAmount(existingOrder.deposit_amount || 0);
      setPaymentMethod(existingOrder.payment_method || '');
      setDesignUrl(existingOrder.design_url || '');
    }
  }, [existingOrder, isEdit]);

  const selectedProductConfig = products?.find(p => p.id === selectedProductId);

  const { calculatedItemPrice, isManual, nestingResult } = useMemo(() => {
    if (!selectedProductConfig) return { calculatedItemPrice: 0, isManual: false, nestingResult: null };
    let priceUYU = selectedProductConfig.base_price * itemQuantity;
    let currentNestingResult: NestingResult | null = null;

    selectedProductConfig.price_rules?.forEach(rule => {
      if (rule.type === 'base_modifier' && rule.attribute && itemAttributes[rule.attribute] === rule.value) {
        let inc = Number(rule.price_increase || 0);
        if (rule.currency === 'USD') inc *= effectiveExchangeRate;
        priceUYU += inc * itemQuantity;
      }
      if (rule.type === 'area' && rule.width_attr && rule.height_attr) {
        const w = Number(itemAttributes[rule.width_attr] || 0);
        const h = Number(itemAttributes[rule.height_attr] || 0);
        let areaP = (((w * h) / 10000) * Number(rule.price_per_m2 || 0));
        if (rule.currency === 'USD') areaP *= effectiveExchangeRate;
        priceUYU += areaP * itemQuantity;
      }
      if (rule.type === 'custom_cost' && rule.attribute && itemAttributes[rule.attribute]) {
        let extra = Number(itemAttributes[rule.attribute]);
        if (!isNaN(extra)) {
          if (rule.currency === 'USD') extra *= effectiveExchangeRate;
          priceUYU += extra;
        }
      }
      if (rule.type === 'vinyl_nesting' && rule.width_attr && rule.height_attr && rule.rolls?.length) {
        const w = Number(itemAttributes[rule.width_attr] || 0);
        const h = Number(itemAttributes[rule.height_attr] || 0);
        if (w > 0 && h > 0) {
          let bestCost = Infinity;
          let bestRes: NestingResult | null = null;
          rule.rolls.forEach(roll => {
            const rollCostUyu = (roll.currency === 'USD') ? roll.cost_per_m * effectiveExchangeRate : roll.cost_per_m;
            const orientations = [{ cols: Math.floor(roll.width_cm / w), linear: h, layout: 'Vertical' }, { cols: Math.floor(roll.width_cm / h), linear: w, layout: 'Apaisado' }];
            orientations.forEach(ori => {
              if (ori.cols > 0) {
                const rows = Math.ceil(itemQuantity / ori.cols);
                const finalP = ((rows * ori.linear) / 100) * rollCostUyu * (rule.margin_multiplier || 1);
                if (finalP < bestCost) {
                  bestCost = finalP;
                  bestRes = { bobina: roll.width_cm, metros_lineales: (rows * ori.linear) / 100, orientacion: ori.layout as 'Vertical' | 'Apaisado', piezas_ancho: ori.cols, filas: rows, roll_currency: roll.currency || 'UYU', costo_sugerido_uyu: finalP };
                }
              }
            });
          });
          if (bestRes) {
            priceUYU += (bestRes as NestingResult).costo_sugerido_uyu;
            currentNestingResult = bestRes;
          }
        }
      }
    });

    return { calculatedItemPrice: priceUYU, isManual: !!selectedProductConfig?.price_rules?.some(r => r.type === 'custom_cost'), nestingResult: currentNestingResult };
  }, [selectedProductConfig, itemAttributes, itemQuantity, effectiveExchangeRate]);

  const calculatedDisplayPrice = isManual ? (manualItemPrice * itemQuantity) : (currency === 'USD' ? (calculatedItemPrice / effectiveExchangeRate) : calculatedItemPrice);

  const handleAddItem = () => {
    if (!selectedProductConfig) return;
    const finalPrice = isManual ? manualItemPrice : (calculatedDisplayPrice / itemQuantity);
    const supplier = suppliers?.find(s => s.id === itemSupplierId);
    const finalAttributes = nestingResult ? { ...itemAttributes, _Nesting: `B${(nestingResult as NestingResult).bobina} | ${(nestingResult as NestingResult).metros_lineales.toFixed(2)}m` } : itemAttributes;
    setItems([...items, { id: '', order_id: orderId || '', product_config_id: selectedProductConfig.id, selected_attributes: finalAttributes, quantity: itemQuantity, calculated_price: finalPrice, supplier_id: itemSupplierId || undefined, created_at: new Date().toISOString(), _productName: selectedProductConfig.name, _supplierName: supplier?.name }]);
    setSelectedProductId(''); setItemAttributes({}); setItemQuantity(1); setItemSupplierId(''); setManualItemPrice(0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `designs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client_documents')
        .getPublicUrl(filePath);

      setDesignUrl(publicUrl);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo: ' + msg);
    } finally {
      setIsUploading(false);
    }
  };

  const totalAmount = items.reduce((acc, curr) => acc + (curr.calculated_price * curr.quantity), 0);
  const balanceDue = totalAmount - depositAmount;

  const saveMutation = useMutation({
    mutationFn: async (data: OrderPayload) => {
      const res = await (isEdit ? orderService.updateWithItems(orderId!, data.order, data.items) : orderService.createWithItems(data.order, data.items));
      return { order: { id: res.id, client_id: res.client_id } } as OrderSubmitResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (onOrderCreated) onOrderCreated(data); else onClose();
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      order: { 
        client_id: clientId, 
        notes, 
        status, 
        currency, 
        total: totalAmount, 
        total_uyu: currency === 'USD' ? totalAmount * effectiveExchangeRate : totalAmount, 
        exchange_rate: currency === 'USD' ? effectiveExchangeRate : 1, 
        deposit_amount: depositAmount, 
        payment_method: paymentMethod, 
        balance_due: balanceDue, 
        design_url: designUrl 
      },
      items: items.map(it => ({ 
        product_config_id: it.product_config_id, 
        selected_attributes: it.selected_attributes, 
        quantity: it.quantity, 
        calculated_price: it.calculated_price, 
        supplier_id: it.supplier_id || undefined 
      }))
    };

    const validation = orderPayloadSchema.safeParse(payload);
    
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(err => err.message).join('\n');
      alert('Error de validación:\n' + errorMsg);
      return;
    }

    saveMutation.mutate({
      order: payload.order,
      items: items.map(it => ({ 
        ...it,
        id: (it.id && !it.id.startsWith('temp_')) ? it.id : undefined 
      }))
    });
  };

  if (loadingOrder && isEdit) return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-industrial-cyan border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] relative">
        {/* Decorative Background Accent */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-industrial-cyan/50 to-transparent" />
        
        {/* Header */}
        <div className="px-12 py-10 border-b border-white/5 bg-white/[0.01] flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-industrial-cyan/5 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-industrial-cyan/10 rounded-2xl flex items-center justify-center text-industrial-cyan">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter text-white uppercase">
                {isEdit ? 'Reconfiguración de Pedido' : 'Registro de Nueva Operación'}
              </h3>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                {isEdit ? `Editando registro #${existingOrder?.id.slice(0,8)}` : 'Iniciando nuevo proceso de producción'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
            
            {/* Top Config: Client, Status, Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                  <User size={12} className="text-industrial-cyan" /> Cliente Responsable
                </label>
                <select 
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all uppercase appearance-none cursor-pointer"
                  value={clientId} 
                  onChange={e => setClientId(e.target.value)} 
                  required
                >
                  <option value="" className="bg-[#0a0a0a]">SELECCIONAR CLIENTE...</option>
                  {clients?.map(c => <option key={c.id} value={c.id} className="bg-[#0a0a0a]">{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                  <Package size={12} className="text-industrial-magenta" /> Estado del Proceso
                </label>
                <select 
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all uppercase appearance-none cursor-pointer"
                  value={status} 
                  onChange={e => setStatus(e.target.value as OrderStatus)}
                >
                  <option value="nuevo_pedido" className="bg-[#0a0a0a]">NUEVO PEDIDO</option>
                  <option value="presupuestado" className="bg-[#0a0a0a]">PRESUPUESTADO</option>
                  <option value="diseno" className="bg-[#0a0a0a]">DISEÑO</option>
                  <option value="produccion" className="bg-[#0a0a0a]">PRODUCCIÓN</option>
                  <option value="control_calidad" className="bg-[#0a0a0a]">CONTROL CALIDAD</option>
                  <option value="para_retirar" className="bg-[#0a0a0a]">PARA RETIRAR</option>
                  <option value="entregado" className="bg-[#0a0a0a]">ENTREGADO</option>
                  <option value="facturado" className="bg-[#0a0a0a]">FACTURADO</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                  <Coins size={12} className="text-yellow-500" /> Divisa Operativa
                </label>
                <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setCurrency('UYU')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currency === 'UYU' ? 'bg-industrial-cyan text-black' : 'text-gray-500 hover:text-white'}`}
                  >
                    UYU
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currency === 'USD' ? 'bg-industrial-cyan text-black' : 'text-gray-500 hover:text-white'}`}
                  >
                    USD
                  </button>
                </div>
              </div>
            </div>

            {/* Item Configuration Area */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-10 space-y-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-1 h-8 bg-industrial-cyan/50 rounded-full" />
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white">Configuración de Artículos</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Selección de Producto</p>
                  <select 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all uppercase appearance-none"
                    value={selectedProductId} 
                    onChange={e => setSelectedProductId(e.target.value)}
                  >
                    <option value="" className="bg-[#0a0a0a]">BUSCAR PRODUCTO...</option>
                    {products?.map(p => <option key={p.id} value={p.id} className="bg-[#0a0a0a]">{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Cantidad</p>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all"
                    value={itemQuantity} 
                    onChange={e => setItemQuantity(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Proveedor / Logística</p>
                  <select 
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all uppercase appearance-none"
                    value={itemSupplierId} 
                    onChange={e => setItemSupplierId(e.target.value)}
                  >
                    <option value="" className="bg-[#0a0a0a]">PRODUCCIÓN INTERNA</option>
                    {suppliers?.map(s => <option key={s.id} value={s.id} className="bg-[#0a0a0a]">{s.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedProductConfig && (
                <div className="p-8 bg-black/40 border border-white/5 rounded-[1.5rem] space-y-8 animate-in slide-in-from-top-4 duration-500">
                  {selectedProductConfig.attributes_schema?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {selectedProductConfig.attributes_schema.map(attr => (
                        <div key={attr.name} className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">{attr.label || attr.name}</p>
                          {attr.type === 'select' ? (
                            <select 
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all appearance-none"
                              value={itemAttributes[attr.name] || ''} 
                              onChange={e => setItemAttributes({ ...itemAttributes, [attr.name]: e.target.value })}
                            >
                              <option value="" className="bg-[#0a0a0a]">---</option>
                              {attr.options?.map((opt: string) => <option key={opt} value={opt} className="bg-[#0a0a0a]">{opt}</option>)}
                            </select>
                          ) : (
                            <input 
                              type={attr.type === 'number' ? 'number' : 'text'} 
                              className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-[11px] font-bold text-white focus:border-industrial-cyan/30 focus:outline-none transition-all"
                              value={itemAttributes[attr.name] || ''} 
                              onChange={e => setItemAttributes({ ...itemAttributes, [attr.name]: e.target.value })} 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {nestingResult && (
                    <div className="flex items-center gap-4 p-5 bg-industrial-cyan/5 border border-industrial-cyan/10 rounded-2xl">
                      <div className="w-10 h-10 bg-industrial-cyan/10 rounded-xl flex items-center justify-center text-industrial-cyan">
                        <Calculator size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-industrial-cyan">Cálculo Logístico Optimizado</p>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">
                          Bobina {(nestingResult as NestingResult).bobina}cm — {(nestingResult as NestingResult).metros_lineales.toFixed(2)}m lineales — Layout {(nestingResult as NestingResult).orientacion}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Precio Sugerido</p>
                        <p className="text-xl font-black text-white">{formatCurrency(calculatedDisplayPrice, currency)}</p>
                      </div>
                      <ArrowRight className="text-gray-800" size={20} />
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Precio Unitario</p>
                        <p className="text-xl font-black text-industrial-cyan">{formatCurrency(calculatedDisplayPrice / itemQuantity, currency)}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="px-10 py-4 bg-industrial-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-industrial-cyan/80 transition-all shadow-lg shadow-industrial-cyan/20 active:scale-95"
                      onClick={handleAddItem}
                    >
                      Añadir al Pedido
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Current Items List */}
            {items.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Listado de Artículos en el Carrito</h5>
                  <span className="text-[10px] font-bold text-industrial-cyan">{items.length} ítems registrados</span>
                </div>
                <div className="overflow-hidden border border-white/5 rounded-3xl bg-white/[0.01]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5">
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Producto</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Detalles</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Cant.</th>
                        <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Subtotal</th>
                        <th className="px-8 py-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((it, idx) => (
                        <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <span className="text-xs font-bold text-white group-hover:text-industrial-cyan transition-colors uppercase">{it._productName}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                              {Object.entries(it.selected_attributes || {}).map(([k,v]) => `${k}: ${v}`).join(' — ')}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center text-xs font-mono font-bold text-gray-400">
                            x{it.quantity}
                          </td>
                          <td className="px-8 py-5 text-right font-mono text-xs font-bold text-white">
                            {formatCurrency(it.calculated_price * it.quantity, currency)}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <button 
                              type="button" 
                              onClick={() => setItems(items.filter((_,i) => i !== idx))} 
                              className="p-2 text-gray-700 hover:text-industrial-magenta transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bottom Form: Notes, Totals, Payments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                  <FileText size={12} className="text-industrial-magenta" /> Notas y Especificaciones
                </label>
                <textarea 
                  className="w-full bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 text-sm text-gray-300 focus:border-industrial-cyan/30 focus:outline-none transition-all custom-scrollbar h-48 placeholder:text-gray-800"
                  rows={4} 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="INSTRUCCIONES CRÍTICAS PARA EL TALLER O COMENTARIOS PARA EL CLIENTE..."
                />
              </div>

              {/* Design Upload Section */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                  <Upload size={12} className="text-industrial-cyan" /> Archivo de Diseño / Arte
                </label>
                
                <div className="relative group">
                  <input 
                    type="file" 
                    id="design-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  
                  {designUrl ? (
                    <div className="flex items-center justify-between p-8 bg-industrial-cyan/10 border border-industrial-cyan/30 rounded-[2rem] animate-in zoom-in-95 duration-300 shadow-[0_0_40px_rgba(0,210,255,0.1)]">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-industrial-cyan/20 rounded-2xl flex items-center justify-center text-industrial-cyan">
                          <CheckCircle2 size={28} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-industrial-cyan mb-1">Archivo de Diseño Vinculado</p>
                          <div className="flex items-center gap-3">
                            <a href={designUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-white hover:text-industrial-cyan underline underline-offset-4 transition-all">
                              Ver Documento Actual
                            </a>
                            <div className="w-1 h-1 rounded-full bg-gray-700" />
                            <label htmlFor="design-upload" className="text-xs font-bold text-gray-500 hover:text-white cursor-pointer transition-colors">
                              Cambiar Archivo
                            </label>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setDesignUrl('')}
                        className="p-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="design-upload"
                      className={`flex flex-col items-center justify-center gap-6 p-16 border-2 border-dashed border-white/10 rounded-[2.5rem] hover:border-industrial-cyan/40 hover:bg-industrial-cyan/[0.03] transition-all cursor-pointer group ${isUploading ? 'opacity-50 pointer-events-none' : ''} shadow-inner shadow-black`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-industrial-cyan border-t-transparent rounded-full animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-industrial-cyan animate-pulse">Subiendo a Servidor...</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-gray-700 group-hover:text-industrial-cyan group-hover:scale-110 transition-all duration-500 border border-white/5 group-hover:border-industrial-cyan/30">
                            <Upload size={36} />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-600 group-hover:text-white transition-colors">
                              Click para cargar diseño
                            </p>
                            <p className="text-[9px] font-bold text-gray-800 uppercase tracking-widest mt-3">
                              PDF, PNG, JPG, AI, CDR (MAX 50MB)
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Resumen Financiero</span>
                  <div className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-mono text-gray-500">TC: {effectiveExchangeRate}</div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-xs font-bold text-gray-400">TOTAL BRUTO</span>
                    <span className="text-lg font-black text-white">{formatCurrency(totalAmount, currency)}</span>
                  </div>

                  <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                    <div className="flex-1 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Monto de Seña</p>
                      <input 
                        type="number" 
                        className="w-full bg-transparent border-none text-sm font-black text-industrial-cyan focus:outline-none"
                        value={depositAmount} 
                        onChange={e => setDepositAmount(Number(e.target.value))} 
                      />
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Método</p>
                      <select 
                        className="w-full bg-transparent border-none text-[10px] font-black text-white focus:outline-none uppercase"
                        value={paymentMethod} 
                        onChange={e => setPaymentMethod(e.target.value)}
                      >
                        <option value="" className="bg-[#0a0a0a]">PENDIENTE</option>
                        <option value="EFECTIVO" className="bg-[#0a0a0a]">EFECTIVO</option>
                        <option value="TRANSFERENCIA" className="bg-[#0a0a0a]">TRANSF.</option>
                        <option value="MERCADO PAGO" className="bg-[#0a0a0a]">M.PAGO</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">Saldo Pendiente de Cobro</p>
                    <p className={`text-2xl font-black ${balanceDue > 0 ? 'text-industrial-cyan' : 'text-gray-500'}`}>
                      {formatCurrency(balanceDue, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Form */}
          <div className="px-10 py-8 border-t border-white/5 bg-white/[0.02] flex justify-end items-center gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
            >
              Descartar Cambios
            </button>
            <button 
              type="submit" 
              disabled={saveMutation.isPending || items.length === 0}
              className="px-16 py-4 bg-industrial-cyan text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-industrial-cyan/80 transition-all shadow-lg shadow-industrial-cyan/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              {saveMutation.isPending ? 'Sincronizando...' : (isEdit ? 'Actualizar Registro' : 'Confirmar y Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
