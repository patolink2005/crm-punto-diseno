import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services/clients';
import { productService } from '../../services/products';
import { supplierService } from '../../services/suppliers';
import { orderService } from '../../services/orders';
import type { OrderStatus, OrderSubmitResponse, OrderItem as GlobalOrderItem } from '../../types';
import { Plus, Trash2, Save, X, Calculator, User, Package, DollarSign } from 'lucide-react';

interface OrderEditorModalProps {
  orderId?: string; // If provided, we are in EDIT mode
  onClose: () => void;
  onOrderCreated?: (response: OrderSubmitResponse) => void;
}

// UI-specific type extending the global OrderItem
type OrderItemWithUI = GlobalOrderItem & {
  _productName?: string;
  _supplierName?: string;
  total?: number;
  // For compatibility with data loading
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

  // Form State
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<OrderStatus>('nuevo_pedido');
  const [currency, setCurrency] = useState<'UYU' | 'USD'>('UYU');
  const [exchangeRateManual, setExchangeRateManual] = useState<number | null>(null);
  const [items, setItems] = useState<OrderItemWithUI[]>([]);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');

  // New Item State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemAttributes, setItemAttributes] = useState<Record<string, string | number>>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemSupplierId, setItemSupplierId] = useState('');

  // Queries
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
      // Source 1: dolarito.uy (data from BCU)
      try {
        const res = await fetch('https://api.dolarito.uy/api/frontend/usd');
        const data = await res.json();
        const sell = data?.bcu?.sell || data?.instituciones?.[0]?.sell;
        if (sell) return Number(sell);
      } catch (e) {
        console.warn('Failed to fetch exchange rate', e);
      }
      // Source 2: BROU fallback
      try {
        const res = await fetch('https://cotizaciones-brou-v2-e449.fly.dev/api/v1/cotizaciones');
        const data = await res.json();
        const sell = data?.rates?.USD?.sell;
        if (sell) return Number(sell);
      } catch (e) {
        console.warn('Failed to fetch exchange rate', e);
      }
      // Source 3: hardcoded fallback
      return 42.5;
    },
    staleTime: 1000 * 60 * 60, // cache 1 hora
  });

  const effectiveExchangeRate = exchangeRateManual || bcuRate || 42.5;

  // Load existing data if editing
  useEffect(() => {
    if (existingOrder && isEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientId(existingOrder.client_id);
      setNotes(existingOrder.notes || '');
      setStatus(existingOrder.status);
      setCurrency(existingOrder.currency);
      setExchangeRateManual(existingOrder.exchange_rate || null);

      const mappedItems: OrderItemWithUI[] = existingOrder.items?.map(it => ({
        ...it,
        _productName: it.products_config?.name,
        _supplierName: it.suppliers?.name,
        // Ensure UI uses calculated properties
        total: it.calculated_price * it.quantity
      })) || [];
      setItems(mappedItems);
      setDepositAmount(existingOrder.deposit_amount || 0);
      setPaymentMethod(existingOrder.payment_method || '');
    }
  }, [existingOrder, isEdit]);

  const selectedProductConfig = products?.find(p => p.id === selectedProductId);

  // Dynamic price calculation logic
  const { calculatedItemPrice, nestingResult } = useMemo<{ calculatedItemPrice: number; nestingResult: NestingResult | null }>(() => {
    if (!selectedProductConfig) return { calculatedItemPrice: 0, nestingResult: null };
    // Internal calculations are ALWAYS in UYU for consistency
    let priceUYU = selectedProductConfig.base_price * itemQuantity;
    let currentNestingResult: NestingResult | null = null;

    selectedProductConfig.price_rules?.forEach(rule => {
      // 1. Base Modifier
      if (rule.type === 'base_modifier' && rule.attribute && itemAttributes[rule.attribute] === rule.value) {
        let increaseUYU = Number(rule.price_increase || 0);
        if (rule.currency === 'USD') increaseUYU *= effectiveExchangeRate;
        priceUYU += increaseUYU * itemQuantity;
      }

      // 2. Area
      if (rule.type === 'area' && rule.width_attr && rule.height_attr) {
        const w = Number(itemAttributes[rule.width_attr] || 0);
        const h = Number(itemAttributes[rule.height_attr] || 0);
        let areaPriceUYU = (((w * h) / 10000) * Number(rule.price_per_m2 || 0));
        if (rule.currency === 'USD') areaPriceUYU *= effectiveExchangeRate;
        priceUYU += areaPriceUYU * itemQuantity;
      }

      // 3. Custom Cost (third-party cost, no quantity multiplier)
      if (rule.type === 'custom_cost' && rule.attribute && itemAttributes[rule.attribute]) {
        let extra = Number(itemAttributes[rule.attribute]);
        if (!isNaN(extra)) {
          if (rule.currency === 'USD') extra *= effectiveExchangeRate;
          priceUYU += extra;
        }
      }

      // 4. Vinyl Nesting (Optimal Roll Selection)
      if (rule.type === 'vinyl_nesting' && rule.width_attr && rule.height_attr && rule.rolls?.length) {
        const w = Number(itemAttributes[rule.width_attr] || 0);
        const h = Number(itemAttributes[rule.height_attr] || 0);

        if (w > 0 && h > 0) {
          let bestCostUYU = Infinity;
          let bestResult: NestingResult | null = null;
          const marginMultiplier = rule.margin_multiplier || 1;

          rule.rolls?.forEach(roll => {
            // Convert roll cost to UYU for a fair comparison
            const rollCostPerMInUYU = (roll.currency === 'USD')
              ? roll.cost_per_m * effectiveExchangeRate
              : roll.cost_per_m;

            const orientations = [
              { cols: Math.floor(roll.width_cm / w), linear: h, layout: 'Vertical' },
              { cols: Math.floor(roll.width_cm / h), linear: w, layout: 'Apaisado' }
            ];

            orientations.forEach(ori => {
              if (ori.cols > 0) {
                const rows = Math.ceil(itemQuantity / ori.cols);
                const linearMeters = (rows * ori.linear) / 100;
                const rollCostUYU = linearMeters * rollCostPerMInUYU;
                const finalPriceUYU = rollCostUYU * marginMultiplier;

                if (finalPriceUYU < bestCostUYU) {
                  bestCostUYU = finalPriceUYU;
                  bestResult = {
                    bobina: roll.width_cm,
                    metros_lineales: linearMeters,
                    orientacion: ori.layout as 'Vertical' | 'Apaisado',
                    piezas_ancho: ori.cols,
                    filas: rows,
                    roll_currency: roll.currency || 'UYU',
                    costo_sugerido_uyu: finalPriceUYU
                  };
                }
              }
            });
          });

          if (bestResult) {
            priceUYU += (bestResult as NestingResult).costo_sugerido_uyu;
            currentNestingResult = bestResult as NestingResult;
          }
        }
      }
    });

    return { calculatedItemPrice: priceUYU, nestingResult: currentNestingResult };
  }, [selectedProductConfig, itemAttributes, itemQuantity, effectiveExchangeRate]);

  const calculatedDisplayPrice = currency === 'USD' ? (calculatedItemPrice / effectiveExchangeRate) : calculatedItemPrice;

  const handleAddItem = () => {
    if (!selectedProductConfig) return;
    const supplier = suppliers?.find(s => s.id === itemSupplierId);

    const finalAttributes = nestingResult
      ? { ...itemAttributes, _Nesting: `Bobina ${nestingResult.bobina}cm | ${nestingResult.metros_lineales.toFixed(2)}ml | ${nestingResult.orientacion}` }
      : itemAttributes;

    setItems([...items, {
      // Properties for DB
      id: '', // Not known yet
      order_id: orderId || '', // Not known yet
      product_config_id: selectedProductConfig.id,
      selected_attributes: finalAttributes,
      quantity: itemQuantity,
      calculated_price: calculatedDisplayPrice / itemQuantity,
      supplier_id: itemSupplierId || undefined,
      created_at: new Date().toISOString(),
      // UI-only properties
      _productName: selectedProductConfig.name,
      _supplierName: supplier?.name
    }]);

    // Reset
    setSelectedProductId('');
    setItemAttributes({});
    setItemQuantity(1);
    setItemSupplierId('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((acc, curr) => acc + ((curr.calculated_price * curr.quantity) || 0), 0);
  const balanceDue = totalAmount - depositAmount;

  const saveMutation = useMutation({
    mutationFn: async (data: OrderPayload): Promise<OrderSubmitResponse> => {
      const orderResult = await (isEdit
        ? orderService.updateWithItems(orderId!, data.order, data.items)
        : orderService.createWithItems(data.order, data.items));
      
      return {
        order: {
          id: orderResult.id,
          client_id: orderResult.client_id
        }
      };
    },
    onSuccess: (data: OrderSubmitResponse) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      if (onOrderCreated && !isEdit && data?.order) {
        // Let Pipeline handle closing (it shows WhatsApp confirm first)
        onOrderCreated(data);
      } else {
        onClose();
      }
    },
    onError: (err: Error) => alert('Error al guardar: ' + err.message)
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return alert('Datos incompletos.');

    const totalUyu = currency === 'USD' ? totalAmount * effectiveExchangeRate : totalAmount;

    const payload: OrderPayload = {
      order: {
        client_id: clientId,
        notes,
        status,
        currency,
        total: totalAmount,
        total_uyu: totalUyu,
        exchange_rate: currency === 'USD' ? effectiveExchangeRate : 1,
        deposit_amount: depositAmount,
        payment_method: paymentMethod,
        balance_due: balanceDue
      },
      items: items.map(it => {
        const itemPayload: Partial<GlobalOrderItem> = {
          product_config_id: it.product_config_id,
          selected_attributes: it.selected_attributes,
          quantity: it.quantity,
          calculated_price: it.calculated_price,
          supplier_id: it.supplier_id || undefined,
        };
        // Only include ID if it's a real existing ID (not empty, not temp)
        if (it.id && !it.id.startsWith('temp_')) {
          itemPayload.id = it.id;
        }
        return itemPayload;
      })
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && loadingOrder) return <div className="modal-overlay"><div className="modal-content">Cargando datos...</div></div>;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '900px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>

        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>{isEdit ? `Editar Pedido #${existingOrder?.order_number}` : 'Nuevo Pedido'}</h3>
            <p className="text-secondary text-xs" style={{ margin: 0 }}>{isEdit ? 'Modifica cualquier campo del pedido y sus ítems.' : 'Completa los datos para registrar un nuevo pedido.'}</p>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

            {/* Sec: General Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="form-label"><User size={14} /> Cliente</label>
                <select className="input-base" value={clientId} onChange={e => setClientId(e.target.value)} required>
                  <option value="">Seleccione cliente...</option>
                  {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="input-base" value={status} onChange={e => setStatus(e.target.value as OrderStatus)}>
                  <option value="nuevo_pedido">Nuevo Pedido</option>
                  <option value="presupuestado">Presupuestado</option>
                  <option value="diseno">Diseño</option>
                  <option value="produccion">Producción</option>
                  <option value="control_calidad">Control Calidad</option>
                  <option value="entregado">Entregado</option>
                  <option value="facturado">Facturado</option>
                </select>
              </div>
            </div>

            {/* Sec: Items list */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={18} /> Detalle de Ítems</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className={`btn btn-sm ${currency === 'UYU' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCurrency('UYU')}>$ UYU</button>
                  <button type="button" className={`btn btn-sm ${currency === 'USD' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCurrency('USD')}>U$S USD</button>
                </div>
              </div>

              {/* Add New Item Sub-form */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label text-xs">Producto</label>
                    <select className="input-base" value={selectedProductId} onChange={e => { setSelectedProductId(e.target.value); setItemAttributes({}); }}>
                      <option value="">Seleccionar...</option>
                      {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Cant.</label>
                    <input type="number" min="1" className="input-base" value={itemQuantity} onChange={e => setItemQuantity(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs">Proveedor</label>
                    <select className="input-base" value={itemSupplierId} onChange={e => setItemSupplierId(e.target.value)}>
                      <option value="">🏠 Propio</option>
                      {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {selectedProductConfig && selectedProductConfig.attributes_schema?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {selectedProductConfig.attributes_schema.map(attr => (
                      <div key={attr.name}>
                        <label className="form-label text-xs">{attr.label || attr.name}</label>
                        {attr.type === 'select' ? (
                          <select className="input-base input-sm" value={itemAttributes[attr.name] || ''} onChange={e => setItemAttributes({ ...itemAttributes, [attr.name]: e.target.value })}>
                            <option value="">...</option>
                            {attr.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type={attr.type === 'number' ? 'number' : 'text'} className="input-base input-sm" value={itemAttributes[attr.name] || ''} onChange={e => setItemAttributes({ ...itemAttributes, [attr.name]: e.target.value })} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {nestingResult && (
                  <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--border-radius)', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Cálculo Óptimo (Nesting):</div>
                    <div className="text-secondary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <span>📏 Bobina: <strong>{nestingResult.bobina}cm</strong></span>
                      <span>✂️ Consumo Lineal: <strong>{nestingResult.metros_lineales.toFixed(2)}m</strong></span>
                      <span>🔄 Orientación: <strong style={{ textTransform: 'capitalize' }}>{nestingResult.orientacion}</strong></span>
                      <span>🧩 Piezas transversal: <strong>{nestingResult.piezas_ancho}</strong></span>
                    </div>
                  </div>
                )}

                {selectedProductConfig && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 600 }}>Costo {itemQuantity > 1 ? 'Total' : 'Ítem'}: {currency === 'USD' ? 'U$S' : '$'}{calculatedDisplayPrice.toLocaleString('es-UY', { minimumFractionDigits: 2 })}</div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAddItem}>
                      <Plus size={14} /> Añadir Ítem
                    </button>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="table-container" style={{ maxHeight: '300px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Detalles</th>
                      <th>Cant.</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }} className="text-secondary">No hay ítems en el pedido</td></tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id || `temp_${idx}`}>
                          <td style={{ fontWeight: 500 }}>{it._productName}</td>
                          <td className="text-xs text-secondary">
                            {Object.entries(it.selected_attributes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                            {it._supplierName && <div style={{ color: 'var(--primary-color)' }}>📦 {it._supplierName}</div>}
                          </td>
                          <td>x{it.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{currency === 'USD' ? 'U$S' : '$'}{(it.calculated_price * it.quantity)?.toLocaleString('es-UY', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <button type="button" className="btn-close text-danger" onClick={() => handleRemoveItem(idx)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sec: Currency & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div>
                <label className="form-label"><DollarSign size={14} /> Cambio USD (Venta)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" step="0.5" className="input-base" value={effectiveExchangeRate} onChange={e => setExchangeRateManual(Number(e.target.value))} />
                  <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setExchangeRateManual(null)} title="Restaurar BROU">
                    <Calculator size={16} />
                  </button>
                </div>
                <small className="text-secondary">Afecta solo pedidos en U$S</small>
              </div>
              <div className="form-group">
                <label className="form-label">Notas / Instrucciones</label>
                <textarea className="input-base" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Entregar envuelto para regalo..." />
              </div>
            </div>

            {/* Sec: Payments (Plan B) */}
            <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} style={{ color: 'var(--success-color)' }} />
                Gestión de Pago (Seña)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label text-xs">Monto de Seña ({currency})</label>
                  <input
                    type="number"
                    min={0}
                    max={totalAmount}
                    className="input-base"
                    value={depositAmount}
                    onChange={e => setDepositAmount(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Método de Pago</label>
                  <select className="input-base" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="">Seleccione...</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Débito/Crédito">Débito/Crédito</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Saldo Pendiente</label>
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontWeight: 700, color: balanceDue > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                    {currency === 'USD' ? 'U$S' : '$'} {balanceDue.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
              <span className="text-secondary text-xs" style={{ fontWeight: 500 }}>TOTAL:</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success-color)', lineHeight: 1 }}>
                  {currency === 'USD' ? 'U$S' : '$'} {totalAmount.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                </div>
                {currency === 'USD' && (
                  <div className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                    ≃ $ {(totalAmount * effectiveExchangeRate).toLocaleString('es-UY')} UYU
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saveMutation.isPending || items.length === 0}>
                <Save size={16} /> {saveMutation.isPending ? 'Guardando...' : (isEdit ? 'Guardar' : 'Crear Pedido')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
