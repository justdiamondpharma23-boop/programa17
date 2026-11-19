/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Sale, SaleItem, Customer } from '../types';
import { 
  ShoppingCart, 
  User, 
  CreditCard, 
  Trash2, 
  Plus, 
  Minus, 
  Receipt,
  CheckCircle,
  FileText,
  BadgeAlert,
  Search,
  Printer,
  FileSpreadsheet,
  Calendar,
  AlertOctagon,
  Maximize2
} from 'lucide-react';

interface SalesModuleProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  onSaleCompleted?: (sale: Sale) => void;
}

export default function SalesModule({ products, setProducts, sales, setSales, customers, onSaleCompleted }: SalesModuleProps) {
  // Shopping Cart items
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('Público General');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('C005'); // C005 is Público General by default
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito'>('Efectivo');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Search filter
  const foundProducts = products.filter(p => {
    if (searchTerm.trim() === '') return false;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.activeIngredient.toLowerCase().includes(term) ||
      p.code.includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  });

  // Check if product is expired
  const isProductExpired = (expiryDateStr: string): boolean => {
    const today = new Date('2026-06-20');
    const expiry = new Date(expiryDateStr);
    return expiry.getTime() <= today.getTime();
  };

  // Add Item to Cart
  const addToCart = (product: Product) => {
    if (isProductExpired(product.expiryDate)) {
      alert(`🚨 BLOQUEO DE SEGURIDAD EXCEL: El medicamento "${product.name}" está VENCIDO (Expira el ${product.expiryDate}). No está permitido vender productos en estado de vencimiento.`);
      return;
    }

    if (product.stock === 0) {
      alert(`⚠️ ERROR STOCK: El producto "${product.name}" no cuenta con unidades disponibles en el inventario.`);
      return;
    }

    const existingItemIndex = cart.findIndex(item => item.productId === product.id);
    if (existingItemIndex > -1) {
      const existingItem = cart[existingItemIndex];
      if (existingItem.quantity >= product.stock) {
        alert(`⚠️ ADVERTENCIA: Has seleccionado la cantidad máxima disponible (${product.stock} unidades) para este medicamento en la hoja de cálculo.`);
        return;
      }
      setCart(prev => prev.map((item, idx) => {
        if (idx === existingItemIndex) {
          const newQty = item.quantity + 1;
          return {
            ...item,
            quantity: newQty,
            total: Math.round(newQty * item.price * 100) / 100
          };
        }
        return item;
      }));
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        quantity: 1,
        total: product.price
      };
      setCart(prev => [...prev, newItem]);
    }
    setSearchTerm('');
  };

  // Decrease quantity in cart
  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > product.stock) {
            alert(`⚠️ STOCK MÁXIMO: Solo existen ${product.stock} unidades de este medicamento.`);
            return item;
          }
          return {
            ...item,
            quantity: newQty,
            total: Math.round(newQty * item.price * 100) / 100
          };
        }
        return item;
      }).filter((item): item is SaleItem => item !== null);
    });
  };

  // Clear single cart item
  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Calculate Subtotal & Totals
  const rawSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountVal = Math.min(rawSubtotal, discountAmount);
  
  // Calculate itemized taxable basis and ITBIS (18%) depending on whether product carries ITBIS
  let rawTaxableBasis = 0;
  let rawTax = 0;

  cart.forEach(item => {
    const productDef = products.find(p => p.id === item.productId);
    const hasItbis = productDef ? productDef.itbis !== false : true; // Default to true if not specified
    if (hasItbis) {
      const basis = item.total / 1.18;
      rawTaxableBasis += basis;
      rawTax += (item.total - basis);
    } else {
      rawTaxableBasis += item.total;
    }
  });

  const discountFactor = rawSubtotal > 0 ? (rawSubtotal - discountVal) / rawSubtotal : 0;
  const taxableSubtotal = Math.round(rawTaxableBasis * discountFactor * 100) / 100;
  const taxVal = Math.round(rawTax * discountFactor * 100) / 100;
  const netTotal = Math.round((rawSubtotal - discountVal) * 100) / 100;

  // Cancel Cart
  const clearCart = () => {
    if (window.confirm('¿Está seguro de limpiar todos los productos de la compra actual?')) {
      setCart([]);
      setDiscountAmount(0);
      setCustomerName('Público General');
    }
  };

  // Complete invoicing sale / reduce stock
  const processCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('🛒 El carrito de ventas está vacío. Busque y agregue medicamentos para registrar.');
      return;
    }

    // Secondary sanity checks for stock constraints
    for (const item of cart) {
      const dbProduct = products.find(p => p.id === item.productId);
      if (!dbProduct || dbProduct.stock < item.quantity) {
        alert(`❌ CANCELADO: El stock actual para "${item.name}" cambió o es insuficiente (${dbProduct?.stock || 0} disponibles).`);
        return;
      }
    }

    // Validate Credit Purchase constraints
    let clientObj: Customer | undefined;
    if (paymentMethod === 'Crédito') {
      clientObj = customers.find(c => c.id === selectedCustomerId);
      if (!clientObj || selectedCustomerId === 'C005') {
        alert('⚠️ RESTRICCIÓN DE CRÉDITO:\n\nDebe seleccionar un cliente registrado con expediente de crédito activo para realizar ventas a crédito. No se permite otorgar crédito a "Público General" de forma anónima.');
        return;
      }

      // Check current customer pending balance
      const getCustomerPendingBalance = (cid: string) => {
        return sales
          .filter(s => s.paymentMethod === 'Crédito' && s.customerId === cid)
          .reduce((sum, s) => {
            const paid = (s.creditPayments || []).reduce((pSum, p) => pSum + p.amount, 0);
            return sum + Math.max(0, s.total - paid);
          }, 0);
      };

      const currentPending = getCustomerPendingBalance(clientObj.id);
      const limit = clientObj.creditLimit;
      if (currentPending + netTotal > limit) {
        alert(`⚠️ ADVERTENCIA DE LÍMITE EXCEDIDO:\n\nEl cliente "${clientObj.name}" supera su límite de crédito autorizado.\n\n• Límite: $${limit.toFixed(2)} MXN\n• Pendiente actual: $${currentPending.toFixed(2)} MXN\n• Esta compra: $${netTotal.toFixed(2)} MXN\n• Total proyectado: $${(currentPending + netTotal).toFixed(2)} MXN\n\nPor favor, salde cuentas previas en el Módulo de Clientes o modifique el método de pago.`);
        return;
      }
    } else {
      // Find customer if they selected one, even for non-credit sales
      clientObj = customers.find(c => c.id === selectedCustomerId);
    }

    // Build the sale payload
    const nextInvoiceId = `FAC-${String(sales.length + 1).padStart(4, '0')}`;
    const newSalePayload: Sale = {
      id: `S${Date.now()}`,
      invoiceNumber: nextInvoiceId,
      date: new Date().toISOString(),
      items: cart,
      subtotal: taxableSubtotal,
      tax: taxVal,
      discount: discountVal,
      total: netTotal,
      customerName: clientObj ? clientObj.name : (customerName || 'Público General'),
      customerPhone: clientObj ? clientObj.phone : undefined,
      customerId: clientObj ? clientObj.id : 'C005',
      paymentMethod: paymentMethod,
      dueDate: paymentMethod === 'Crédito' ? '2026-07-20' : undefined, // simulated due date: 30 days from June 20, 2026
      creditPayments: paymentMethod === 'Crédito' ? [] : undefined
    };

    // Subtract from the real database products stocks!
    setProducts(prev => {
      return prev.map(p => {
        const soldItem = cart.find(item => item.productId === p.id);
        if (soldItem) {
          return {
            ...p,
            stock: Math.max(0, p.stock - soldItem.quantity)
          };
        }
        return p;
      });
    });

    // Add entry to historical sales state
    setSales(prev => [newSalePayload, ...prev]);
    if (onSaleCompleted) {
      onSaleCompleted(newSalePayload);
    }
    setLastCompletedSale(newSalePayload);
    setCart([]);
    setDiscountAmount(0);
    setCustomerName('Público General');
    setSelectedCustomerId('C005');
    setPaymentMethod('Efectivo');
    setShowInvoiceModal(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      
      {/* LEFT SIDE: CASHIER CONTROLS & PRODUCT SEARCH */}
      <div id="sales-left-section" className="lg:col-span-8 flex flex-col gap-5">
        
        {/* ADD PRODUCTS FINDER */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Search size={18} className="text-[#059669]" />
            Buscador Inteligente de Medicamentos
          </h2>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={16} />
            </span>
            <input 
              id="pos-search-input"
              type="text"
              placeholder="🔍 Escriba nombre del antibiótico, principio activo (ej. Paracetamol), categoría o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm w-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition"
            />
            {searchTerm.length > 0 && (
              <button 
                id="pos-clear-search"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 font-semibold"
              >
                Limpiar x
              </button>
            )}
          </div>

          {/* SEARCH DROPDOWN OR NOTIFICATIONS */}
          {searchTerm.length > 0 && (
            <div id="pos-search-results" className="mt-3 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[300px] overflow-y-auto divide-y divide-slate-100 z-10">
              {foundProducts.length === 0 ? (
                <div className="p-4 text-center text-slate-405 text-xs">
                  Ningún medicamento encontrado con ese criterio en el archivo de inventario.
                </div>
              ) : (
                foundProducts.map(prod => {
                  const expired = isProductExpired(prod.expiryDate);
                  const isLow = prod.stock <= prod.safetyStock;

                  return (
                    <div 
                      key={prod.id}
                      onClick={() => addToCart(prod)}
                      className={`p-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition ${expired ? 'bg-red-50 hover:bg-red-100' : ''}`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-700">{prod.name}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono font-medium">{prod.code}</span>
                          {expired ? (
                            <span className="text-[9px] bg-red-650 text-white font-black px-1.5 rounded uppercase">Vencido</span>
                          ) : isLow ? (
                            <span className="text-[9px] bg-amber-550 text-white px-1.5 rounded uppercase">Poco Stock</span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 mt-0.5">
                          <span>Principio: <strong>{prod.activeIngredient}</strong></span>
                          <span>• Lab: <strong>{prod.laboratory}</strong></span>
                          <span>• Categoría: <strong>{prod.category}</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-[#059669]">${prod.price.toFixed(2)} MXN</div>
                        <div className="text-[10px] text-slate-500">Stock: {prod.stock} disp.</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {searchTerm.length === 0 && (
            <div className="mt-4 bg-emerald-50 rounded-lg p-3 text-slate-600 border border-emerald-100 flex items-start gap-2 text-xs leading-relaxed">
              <span className="text-[#059669] shrink-0 font-bold">💡 Tip Excel:</span>
              <span>Comience a escribir el nombre del medicamento o pase el lector de código de barras para agregarlo de inmediato. Si el producto se encuentra vencido, el sistema bloqueará la facturación automáticamente por seguridad.</span>
            </div>
          )}
        </div>

        {/* ACTIVE SHOPPING TICKET / LIST */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#059669]" />
              Medicamentos en Ticket de Venta
            </h2>
            {cart.length > 0 && (
              <button 
                id="pos-cancel-cart"
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                Vaciar Carrito
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="my-auto text-center text-slate-400 py-10 flex flex-col items-center justify-center">
              <ShoppingCart size={40} className="mb-2.5 opacity-20 text-[#10b981]" />
              <p className="font-semibold text-slate-500">El ticket de venta está vacío</p>
              <p className="text-xs mt-1 max-w-xs mx-auto">Seleccione productos usando el buscador de arriba para iniciar la tasación.</p>
            </div>
          ) : (
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[320px] pr-1">
              {cart.map(item => {
                const inventoryProd = products.find(p => p.id === item.productId);
                const maxStock = inventoryProd ? inventoryProd.stock : 0;

                return (
                  <div key={item.productId} className="py-3 flex justify-between items-center group">
                    <div className="grow mr-4">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        {item.name}
                        <span className="text-[10px] text-slate-400 font-normal">(${item.price.toFixed(2)} c/u)</span>
                      </div>
                      <div className="text-[10px] text-indigo-700 font-mono mt-0.5">
                        Stock del Archivo: {maxStock} u.
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Quantities adjuster */}
                      <div className="flex items-center gap-1 bg-slate-100 py-0.5 px-1.5 rounded-lg border border-slate-200">
                        <button 
                          id={`pos-minus-${item.productId}`}
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1 hover:bg-white hover:text-[#059669] rounded-md transition text-slate-500 cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-bold px-2 text-slate-700 font-mono focus:outline-none min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          id={`pos-plus-${item.productId}`}
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1 hover:bg-white hover:text-[#059669] rounded-md transition text-slate-500 cursor-pointer"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Line total */}
                      <div className="text-xs font-bold text-slate-700 font-mono min-w-[70px] text-right">
                        ${item.total.toFixed(2)}
                      </div>

                      {/* Remove item */}
                      <button 
                        id={`pos-remove-${item.productId}`}
                        onClick={() => removeCartItem(item.productId)}
                        className="text-slate-400 hover:text-red-650 p-1 rounded-full hover:bg-red-50 transition cursor-pointer"
                        title="Quitar medicamento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDE: CUSTOMER, PRICING BREAKDOWN, AND EXCEL BILLING CARD */}
      <div id="sales-right-section" className="lg:col-span-4">
        <form id="pos-checkout-form" onSubmit={processCheckout} className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col gap-4">
          
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
            <Receipt size={18} className="text-[#059669]" />
            Tasación & Facturación
          </h2>

          {/* CUSTOMER INFORMATION */}
          <div className="flex flex-col gap-1.5 font-sans">
            <label id="customer-lbl" className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User size={13} className="text-slate-400" />
                Paciente / Cliente Asociado:
              </span>
              <span className="text-[10px] text-slate-400">Expediente Excel</span>
            </label>
            
            <div className="flex flex-col gap-1.5">
              <select
                id="pos-customer-select"
                value={selectedCustomerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCustomerId(val);
                  if (val !== 'custom') {
                    const matched = customers.find(c => c.id === val);
                    if (matched) {
                      setCustomerName(matched.name);
                    }
                  }
                }}
                className="bg-slate-50 text-xs px-3 py-1.5 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.id !== 'C005' ? `(${c.id} - Límite: $${c.creditLimit})` : '(Comprador Libre)'}
                  </option>
                ))}
                <option value="custom">✍️ Escribir otro nombre personalizado...</option>
              </select>

              {selectedCustomerId === 'custom' && (
                <div className="flex gap-1.5">
                  <input 
                    id="pos-customer-input"
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente..."
                    className="flex-1 bg-slate-50 text-xs px-3 py-1.5 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  />
                  <button
                    id="pos-general-customer-btn"
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('C005');
                      setCustomerName('Público General');
                    }}
                    className="text-[10px] bg-slate-100 border border-slate-300 hover:bg-slate-200 px-2 rounded-md font-medium text-slate-600 transition cursor-pointer"
                  >
                    General
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PAYMENT METHODS */}
          <div className="flex flex-col gap-1.5">
            <label id="payment-lbl" className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <CreditCard size={13} className="text-slate-400" />
              Método de Pago:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'] as const).map(option => (
                <button
                  id={`pos-pmeth-${option}`}
                  key={option}
                  type="button"
                  onClick={() => setPaymentMethod(option)}
                  className={`py-1.5 text-xs font-medium rounded border transition text-center cursor-pointer ${
                    paymentMethod === option
                      ? 'bg-emerald-50 border-[#10b981] text-[#059669]'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* DISCOUNTERS */}
          <div className="flex flex-col gap-1.5">
            <label id="discount-lbl" className="text-xs font-semibold text-slate-500">
              Descuento Directo ($ MXN):
            </label>
            <input 
              id="pos-discount-input"
              type="number" 
              min="0"
              step="0.5"
              value={discountAmount || ''}
              onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="Descuento en pesos..."
              className="bg-slate-50 text-xs px-3 py-1.5 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
            />
          </div>

          <hr className="border-t border-slate-100 my-1" />

          {/* ARITHMETIC BILLING CARD */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 mt-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Suma Parcial:</span>
              <span className="font-mono font-medium">${rawSubtotal.toFixed(2)}</span>
            </div>
            
            {discountVal > 0 && (
              <div className="flex justify-between text-xs text-red-600">
                <span>Descuento Aplicado:</span>
                <span className="font-mono font-semibold">-${discountVal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-500">
              <span>Base Grabable (Sin ITBIS):</span>
              <span className="font-mono">${taxableSubtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>ITBIS Acumulado (18% Incl.):</span>
              <span className="font-mono">${taxVal.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
              <span className="font-bold text-slate-700">Total Neto a Cobrar:</span>
              <span className="font-mono font-extrabold text-[#059669] text-base">${netTotal.toFixed(2)} DOP</span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            id="pos-submit-sale"
            type="submit"
            disabled={cart.length === 0}
            className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer border border-[#334155]"
          >
            <Receipt size={17} />
            REGISTRAR TRANSACCIÓN Y REDUCIR STOCK
          </button>

        </form>
      </div>

      {/* DETAILED EXCEL INVOICE MODAL POPUP */}
      {showInvoiceModal && lastCompletedSale && (
        <div id="invoice-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center border-b border-[#1e293b]">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <FileSpreadsheet size={18} />
                TICKET DE VENTA (Registro Automatizado)
              </span>
              <button 
                id="invoice-close-modal"
                onClick={() => setShowInvoiceModal(false)}
                className="text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-xs"
              >
                Cerrar [ESC]
              </button>
            </div>

            {/* Modal Scroll Content (Invoice formatted as typical MS Excel cells layout) */}
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-4">
              
              <div className="text-center py-2">
                <div className="text-[#059669] font-black text-xl flex items-center justify-center gap-1">
                  <CheckCircle size={22} />
                  ¡TRANSACCIÓN EXITOSA!
                </div>
                <p className="text-slate-400 text-xs mt-1">El stock se ha recalculado y debitado en la hoja de inventario.</p>
              </div>

              {/* EXCEL INVOICE LAYOUT */}
              <div className="bg-white border-2 border-slate-300 p-5 rounded font-mono text-[11px] text-slate-800 shadow-sm relative overflow-hidden">
                
                {/* Simulated excel columns borders */}
                <div className="absolute top-0 inset-x-0 h-1 flex text-[7px] text-slate-300 font-sans border-b border-slate-100 select-none">
                  <span className="flex-1 text-center">Col A</span>
                  <span className="flex-1 text-center">Col B</span>
                  <span className="flex-1 text-center">Col C</span>
                  <span className="flex-1 text-center">Col D</span>
                </div>

                {/* Header info */}
                <div className="border-b border-dashed border-slate-300 pb-3">
                  <div className="flex justify-between items-start text-[10px] text-slate-405 font-sans mb-1 mt-1">
                    <span>FARMACIA EXCEL PRO S.A.</span>
                    <span>FOLIO: {lastCompletedSale.invoiceNumber}</span>
                  </div>
                  <div className="text-[12px] font-bold text-center text-[#059669] mb-2 uppercase">Recibo Oficial de Control</div>
                  <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                    <div>
                      <span className="text-slate-400 block">PACIENTE:</span>
                      <strong className="text-slate-700">{lastCompletedSale.customerName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">FECHA HORA:</span>
                      <span className="font-medium">{new Date(lastCompletedSale.date).toLocaleString('es-MX')}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px]">
                    <span className="text-slate-400">PAGO VÍA:</span> <strong className="text-slate-600 uppercase">{lastCompletedSale.paymentMethod}</strong>
                  </div>
                </div>

                {/* Grid Item lines */}
                <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
                  <div className="grid grid-cols-12 gap-1 text-[9.5px] font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1">
                    <span className="col-span-6">DESCRIPCIÓN MEDICAMENTO</span>
                    <span className="col-span-2 text-center">P.U.</span>
                    <span className="col-span-1 text-center">CANT</span>
                    <span className="col-span-3 text-right">TOTAL</span>
                  </div>
                  {lastCompletedSale.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 text-slate-700">
                      <span className="col-span-6 truncate font-medium">{item.name}</span>
                      <span className="col-span-2 text-center">${item.price.toFixed(2)}</span>
                      <span className="col-span-1 text-center font-bold">x{item.quantity}</span>
                      <span className="col-span-3 text-right font-semibold">${item.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Summary calculation totals */}
                <div className="pt-3 space-y-1 text-right text-[10.5px]">
                  <div className="flex justify-between max-w-[200px] ml-auto">
                    <span className="text-slate-400">SUBTOTAL:</span>
                    <span className="text-slate-600">${(lastCompletedSale.subtotal + lastCompletedSale.tax + lastCompletedSale.discount).toFixed(2)}</span>
                  </div>
                  {lastCompletedSale.discount > 0 && (
                    <div className="flex justify-between max-w-[200px] ml-auto text-red-650">
                      <span>DCTO APLICADO:</span>
                      <span>-${lastCompletedSale.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between max-w-[200px] ml-auto">
                    <span className="text-slate-400">ITBIS TOTAL (18%):</span>
                    <span className="text-slate-600">${lastCompletedSale.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between max-w-[200px] ml-auto font-black text-[#059669] text-[11.5px] border-t border-slate-200 pt-1.5">
                    <span>TOTAL FACTURADO:</span>
                    <span>${lastCompletedSale.total.toFixed(2)} DOP</span>
                  </div>
                </div>

                {/* Excel reference cell footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[9px] text-slate-400 font-sans italic flex items-center justify-center gap-1 select-none">
                  <FileSpreadsheet size={11} className="text-emerald-600" />
                  Sincronizado con Excel Fila Ventas #{sales.length + 1}
                </div>

              </div>

            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                id="invoice-print-btn"
                onClick={() => {
                  window.print();
                }}
                className="bg-white border hover:bg-slate-100 border-slate-300 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={14} />
                Imprimir Recibo (Print)
              </button>
              <button
                id="invoice-accept-btn"
                onClick={() => setShowInvoiceModal(false)}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
