/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Purchase, PurchaseItem } from '../types';
import { 
  Plus, 
  Search, 
  Download, 
  ShoppingCart, 
  Truck, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  History,
  Building,
  DollarSign,
  Receipt,
  FileText
} from 'lucide-react';

interface PurchasesModuleProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
}

export default function PurchasesModule({
  products,
  setProducts,
  purchases,
  setPurchases
}: PurchasesModuleProps) {
  // Inner tabs: History (Sheet) or Register purchase order
  const [innerTab, setInnerTab] = useState<'sheet' | 'register'>('register');
  
  // Search and filters
  const [purchaseSearch, setPurchaseSearch] = useState('');
  
  // New purchase builder state
  const [supplierName, setSupplierName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito'>('Transferencia');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierRnc, setSupplierRnc] = useState('');
  const [ncf, setNcf] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(10);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState<number>(0);
  const [cartItems, setCartItems] = useState<(PurchaseItem & { origCost: number })[]>([]);
  
  // Quick autofill when product changes
  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setPurchaseUnitCost(prod.cost);
    }
  };

  // Add Item to cart
  const handleAddItemToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Por favor, seleccione un medicamento.');
      return;
    }
    if (purchaseQuantity <= 0) {
      alert('La cantidad debe ser mayor que cero.');
      return;
    }
    if (purchaseUnitCost < 0) {
      alert('El costo no puede ser negativo.');
      return;
    }

    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    // Check if item already exists in current cart
    const existingIndex = cartItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex > 0 || existingIndex === 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += purchaseQuantity;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].cost;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: prod.id,
          name: prod.name,
          quantity: purchaseQuantity,
          cost: purchaseUnitCost,
          total: purchaseQuantity * purchaseUnitCost,
          origCost: prod.cost
        }
      ]);
    }

    // Reset picker fields
    setSelectedProductId('');
    setPurchaseQuantity(10);
    setPurchaseUnitCost(0);
  };

  // Remove Item from cart
  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  // Finalize supplier purchase validation
  const handleSavePurchase = () => {
    if (!supplierName.trim()) {
      alert('Por favor ingrese el nombre del Proveedor o Laboratorio comercial.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Por favor añada al menos un producto al carro de abasto.');
      return;
    }

    // Double confirmation dialog with audit details
    const totalAmount = cartItems.reduce((sum, item) => sum + item.total, 0);
    const confirmMessage = `🧾 ¿Confirmar compra a proveedor / ingreso técnico?\n\n` +
      `Proveedor: ${supplierName}\n` +
      `Factura: ${supplierInvoiceNumber.trim() || 'No especificada'}\n` +
      `RNC Proveedor: ${supplierRnc.trim() || 'No especificado'}\n` +
      `NCF Comprobante: ${ncf.trim() || 'No especificado'}\n` +
      `Artículos diferentes: ${cartItems.length}\n` +
      `Inversión total: $${totalAmount.toFixed(2)} DOP\n\n` +
      `* Se sumará físicamente la cantidad ingresada al Stock de cada medicamento.\n` +
      `* Se registrará este comprobante en la Hoja 4 de Excel.`;
    
    if (window.confirm(confirmMessage)) {
      const nextIdNum = purchases.length + 1;
      const newPurchaseId = `CP${String(nextIdNum).padStart(3, '0')}`;
      const newPurchaseNo = `C-${String(nextIdNum).padStart(4, '0')}`;
      const todayStr = '2026-06-20'; // Current simulation timeline

      const newPurchase: Purchase = {
        id: newPurchaseId,
        purchaseNumber: newPurchaseNo,
        date: todayStr,
        supplierName: supplierName.trim(),
        items: cartItems.map(({ origCost, ...rest }) => rest), // exclude UI extra property
        total: totalAmount,
        paymentMethod: paymentMethod,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        supplierRnc: supplierRnc.trim() || undefined,
        ncf: ncf.trim() || undefined
      };

      // 1. Update general state of products (SUM to inventory stock, and optionally update cost)
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.map(p => {
          const purchaseItem = cartItems.find(item => item.productId === p.id);
          if (purchaseItem) {
            // New stock is old stock plus purchased quantity
            const newStock = p.stock + purchaseItem.quantity;
            
            // To make the system work like a real pharmacy ERP, we update the product cost
            // with the newly registered purchase cost to align future reports!
            return {
              ...p,
              stock: newStock,
              cost: purchaseItem.cost // update unit cost in ERP catalog
            };
          }
          return p;
        });

        // Sync local storage manually as a secondary layer
        localStorage.setItem('pharmacy_excel_products_v1', JSON.stringify(updatedProducts));
        return updatedProducts;
      });

      // 2. Add purchase record to list
      setPurchases(prevPurchases => {
        const updatedPurchases = [newPurchase, ...prevPurchases];
        localStorage.setItem('pharmacy_excel_purchases_v1', JSON.stringify(updatedPurchases));
        return updatedPurchases;
      });

      // Reset cart states
      setCartItems([]);
      setSupplierName('');
      setPaymentMethod('Transferencia');
      setSupplierInvoiceNumber('');
      setSupplierRnc('');
      setNcf('');
      alert(`🎉 Compra ${newPurchaseNo} guardada con éxito.\nEl stock de los medicamentos ha sido incrementado en almacén.`);
      
      // Navigate to logs sheet
      setInnerTab('sheet');
    }
  };

  // CSV Exporter for spreadsheet reports
  const handleExportPurchasesCSV = () => {
    const headers = 'Folio,Fecha,Proveedor,No. Factura Proveedor,RNC Proveedor,NCF,Total Inversion,Metodo Pago,Detalle Articulos\r\n';
    const lines = purchases.map(p => {
      const details = p.items.map(item => `${item.name}(${item.quantity}u)`).join('; ');
      return `"${p.purchaseNumber}","${p.date}","${p.supplierName}","${p.supplierInvoiceNumber || ''}","${p.supplierRnc || ''}","${p.ncf || ''}",${p.total.toFixed(2)},"${p.paymentMethod}","${details}"`;
    }).join('\r\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + lines);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Hoja_Compras_Proveedores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for KPI blocks
  const filteredPurchases = purchases.filter(p => 
    p.purchaseNumber.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(purchaseSearch.toLowerCase())
  );

  const totalInvoicedPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalUnitsAcquired = purchases.reduce((sum, p) => 
    sum + p.items.reduce((acc, item) => acc + item.quantity, 0), 0
  );

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-sans">
      
      {/* EXCEL SHEET SUB-HEADER DESIGN */}
      <div className="bg-[#107c41]/10 border-b border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="bg-[#107c41] text-white rounded-lg p-2 shadow-xs">
            <Truck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#0f172a] uppercase tracking-wide">
              [Hoja 4] Registro de Compras a Proveedores
            </h2>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Administración de ingreso de medicamento por lote con actualización automática de stock de almacén general.
            </p>
          </div>
        </div>

        {/* Action button inside active header tab */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-250 flex items-center gap-1.5">
            <button
              onClick={() => setInnerTab('register')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                innerTab === 'register' 
                  ? 'bg-[#107c41] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              ➕ Registrar Abasto
            </button>
            <button
              onClick={() => setInnerTab('sheet')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                innerTab === 'sheet' 
                  ? 'bg-[#107c41] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              📋 [Libro Diario] Compras
            </button>
          </div>
        </div>
      </div>

      {/* FORMULA BAR SIMULATOR FOR SPREADSHEETS */}
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-mono flex items-center gap-1.5 text-slate-500 select-none">
        <span className="font-extrabold text-[#107c41] px-1 bg-green-100 rounded text-[10px]">fx</span>
        <span className="text-slate-400 font-bold">D1:</span>
        <input 
          type="text" 
          readOnly 
          value={`=SUMA(Renglones_Compras_Excel!Eosto_Total) => Inversión acumulada: $${totalInvoicedPurchases.toFixed(2)} MXN (${totalUnitsAcquired} u. surtidas)`}
          className="bg-transparent border-none focus:outline-none w-full text-slate-600 select-all font-mono pointer-events-none text-[11px]"
        />
      </div>

      {/* QUICK KPI METRICS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-100">
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Invertido en Surtido</span>
            <span className="text-base font-black text-slate-800 font-mono block mt-0.5">${totalInvoicedPurchases.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-green-100 p-2 rounded-lg text-[#107c41]">
            <DollarSign size={16} />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Cajas/Unidades Ingresadas</span>
            <span className="text-base font-black text-slate-800 font-mono block mt-0.5">{totalUnitsAcquired} u.</span>
          </div>
          <div className="bg-green-100 p-2 rounded-lg text-[#107c41]">
            <CheckCircle size={16} />
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Órdenes Realizadas</span>
            <span className="text-base font-black text-slate-800 font-mono block mt-0.5">{purchases.length} folios</span>
          </div>
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
            <History size={16} />
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {innerTab === 'register' ? (
        
        /* TAB RENDER: REGISTER SUPPLIER PURCHASE */
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="compras-register-container">
          
          {/* LEFT PANEL: INPUT FORM AND MEDICINE PICKER */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-white border border-slate-250 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                <Building size={14} className="text-[#107c41]" />
                Datos de Origen del Lote
              </h3>

              {/* Supplier Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Proveedor / Laboratorio de Fabricación</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Truck size={14} />
                  </span>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Escriba Proveedor (ej: Bayer, Pfizer, Genfar, S.A.)"
                    className="w-full bg-slate-50 border border-slate-300 text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-semibold"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Método de Financiamiento/Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-bold text-slate-700"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo Comercial</option>
                  <option value="Tarjeta">Tarjeta de Crédito Corporativa</option>
                  <option value="Crédito">Crédito del Proveedor (Por Liquidar)</option>
                </select>
              </div>

              {/* Facturación de Compra */}
              <div className="pt-3 border-t border-slate-150 space-y-2.5">
                <div className="flex items-center gap-1">
                  <Receipt size={12} className="text-[#107c41]" />
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest block">Comprobante Fiscal de Compra</span>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">No. Factura de Proveedor</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400">
                      <FileText size={12} />
                    </span>
                    <input
                      type="text"
                      value={supplierInvoiceNumber}
                      onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                      placeholder="ej: FAC-2026-9871"
                      className="w-full bg-slate-50 border border-slate-300 text-[11px] pl-7.5 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">RNC Proveedor</label>
                    <input
                      type="text"
                      value={supplierRnc}
                      onChange={(e) => setSupplierRnc(e.target.value)}
                      placeholder="ej: 131234567"
                      className="w-full bg-slate-50 border border-slate-300 text-[11px] px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">NCF Comprobante</label>
                    <input
                      type="text"
                      value={ncf}
                      onChange={(e) => setNcf(e.target.value)}
                      placeholder="ej: B0100000120"
                      className="w-full bg-slate-50 border border-slate-300 text-[11px] px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono font-bold text-emerald-850"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ADD MEDICINE FORM SECTION */}
            <form onSubmit={handleAddItemToCart} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                <Plus size={14} className="text-[#107c41]" />
                Ingresar Renglón a Almacén
              </h3>

              {/* Medicine Select Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Seleccionar Medicamento Catalogado</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-extrabold text-slate-800"
                >
                  <option value="">-- Buscar medicamento y lote --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.activeIngredient}] - Lote {p.batch} (Stock: {p.stock} u)
                    </option>
                  ))}
                </select>
              </div>

              {/* Cost & Quantity Inline Group */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Cantidad (Cajas)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-white border border-slate-300 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono font-bold"
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white border border-slate-300 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#107c41] font-mono font-bold"
                    value={purchaseUnitCost}
                    onChange={(e) => setPurchaseUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <span className="text-[9px] text-[#107c41] font-bold font-sans">
                    Sugerido por Excel
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                📥 Añadir al Detalle del Recibo
              </button>
            </form>

          </div>

          {/* RIGHT PANEL: CART PREVIEW AND CONFIRMATION */}
          <div className="lg:col-span-7 flex flex-col bg-white border border-slate-250 rounded-xl overflow-hidden shadow-xs">
            
            <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-[#10b981]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  Detalle del Recibo de Compra a Proveedor
                </h3>
              </div>
              <span className="text-[10px] bg-[#10b981] text-slate-950 font-black px-2 py-0.5 rounded font-mono">
                {cartItems.length} Renglones
              </span>
            </div>

            <div className="flex-1 overflow-x-auto min-h-[220px]">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400 space-y-2">
                  <Truck size={38} className="text-slate-300 animate-pulse" />
                  <div className="text-xs font-bold text-slate-500 uppercase">Recibo Surtido Vacío</div>
                  <p className="max-w-xs text-[11px] text-slate-400 leading-normal">
                    Seleccione un medicamento a la izquierda, configure las cajas adquiridas junto con su costo y presione "Añadir al Detalle" para poblar este recibo.
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse border-spacing-0 text-[11.5px] text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 uppercase font-black text-center text-[9px]">
                      <th className="py-2.5 pl-3 text-left">Código / Producto</th>
                      <th className="py-2.5">Costo Unit.</th>
                      <th className="py-2.5">Cantidad</th>
                      <th className="py-2.5">Total Renglón</th>
                      <th className="py-2.5 pr-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, idx) => {
                      const costChanged = item.cost !== item.origCost;
                      return (
                        <tr key={`${item.productId}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 text-center font-mono">
                          <td className="py-2 pl-3 text-left font-sans">
                            <span className="font-extrabold text-[#0f172a] block">{item.name}</span>
                            <span className="text-[9px] text-slate-400">ID: {item.productId}</span>
                          </td>
                          <td className="py-2 font-bold select-none">
                            ${item.cost.toFixed(2)}
                            {costChanged && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded block w-max mx-auto mt-0.5" title="Costo anterior: $${item.origCost}">
                                Costo cambia
                              </span>
                            )}
                          </td>
                          <td className="py-2 font-black text-slate-800">{item.quantity} cajas</td>
                          <td className="py-2 font-black text-emerald-750">${item.total.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="p-1 cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition"
                              title="Retirar del recibo"
                            >
                              <Trash2 size={14} className="mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* LOWER CART ACTIONS & PRICING SUM */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-450 font-bold uppercase">Subtotal Compra:</span>
                  <span className="text-[11px] text-slate-450 font-bold block">(Sin impuestos incluidos)</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-850 font-mono">
                    ${cartItems.reduce((sum, item) => sum + item.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-emerald-650 font-bold block">MXN</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-250 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Desea vaciar completamente todos los renglones del recibo actual?')) {
                      setCartItems([]);
                    }
                  }}
                  disabled={cartItems.length === 0}
                  className="flex-1 bg-white hover:bg-red-50 border border-slate-300 text-slate-600 hover:text-red-650 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} />
                  Vaciar Borrador
                </button>

                <button
                  type="button"
                  onClick={handleSavePurchase}
                  disabled={cartItems.length === 0}
                  className="flex-1 bg-[#10b981] hover:bg-[#0b9668] text-white py-2 rounded-lg text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={13} />
                  Ingresar y Sumar Stock
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        
        /* TAB RENDER: EXCEL SPREADSHEEET MOCKUP VIEW */
        <div className="flex flex-col">
          
          <div className="bg-slate-50 border-b border-slate-200 py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="bg-[#107c41] text-xs font-extrabold text-white px-2 py-0.5 rounded uppercase font-sans">
                Hoja 4
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  Libro Diario Auxiliar de Compras de Abasto
                </h3>
                <p className="text-[10px] text-slate-400">
                  Registro detallado de folios proveedores para la auditoría de capital de trabajo invertido.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start">
              <div className="relative">
                <Search className="absolute left-2.5 top-1.5 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Filtrar por Proveedor o Folio..."
                  value={purchaseSearch}
                  onChange={(e) => setPurchaseSearch(e.target.value)}
                  className="bg-white border text-xs pl-8 pr-3 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-[#107c41] font-semibold"
                />
              </div>

              {purchaseSearch.length > 0 && (
                <button 
                  onClick={() => setPurchaseSearch('')} 
                  className="text-xs text-red-500 font-bold bg-white border border-red-200 px-2.5 py-1 rounded hover:bg-red-50"
                >
                  Limpiar
                </button>
              )}

              <button
                onClick={handleExportPurchasesCSV}
                className="bg-[#107c41] hover:bg-[#0b6434] text-white border text-xs py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer font-bold transition shadow-2xs"
              >
                <Download size={13} />
                Exportar CSV_Compras
              </button>
            </div>
          </div>

          {/* TABLE OF PURCHASES IN AN ACCURATE EXCEL LAYOUT WITH RULER HEADERS */}
          <div className="overflow-x-auto overflow-y-auto max-h-[480px]">
            <table className="w-full border-collapse border-spacing-0 select-none text-[11.5px] font-mono leading-none">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-center sticky top-0 z-10 border-b border-slate-200 h-[26px]">
                  <th className="w-[45px] font-sans border border-slate-200 py-1 cursor-default text-[10px] text-slate-400 sticky left-0 bg-slate-100 z-10"></th>
                  <th className="w-[120px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">A [Folio Compra]</th>
                  <th className="w-[110px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">B [Fecha-Hora]</th>
                  <th className="w-[180px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">C [Proveedor]</th>
                  <th className="w-[130px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">G [No. Factura]</th>
                  <th className="w-[120px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">H [RNC Proveedor]</th>
                  <th className="w-[140px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">I [NCF Comprobante]</th>
                  <th className="w-[300px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">D [Medicamentos Ingresados]</th>
                  <th className="w-[120px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">E [Inversión ($)]</th>
                  <th className="w-[125px] font-sans border border-slate-250 py-1 text-[10px] uppercase font-extrabold text-slate-550">F [Financiamiento]</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400 font-sans">
                      No se encontraron folios de compras para <span className="font-bold">"{purchaseSearch}"</span>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 h-[32px] border-b border-slate-150 text-slate-800">
                      {/* Excel Row index bar */}
                      <td className="bg-slate-50 border border-slate-200 text-center text-[9px] font-sans font-bold text-slate-400 sticky left-0 z-5">
                        {idx + 1}
                      </td>
                      
                      {/* Folio */}
                      <td className="border border-slate-200 px-3 font-bold text-center text-slate-500">
                        {p.purchaseNumber}
                      </td>
 
                      {/* Date */}
                      <td className="border border-slate-200 px-3 text-center text-slate-600">
                        {p.date}
                      </td>
 
                      {/* Supplier */}
                      <td className="border border-slate-200 px-3 text-left font-sans font-extrabold text-[#0078d4]">
                        🏢 {p.supplierName}
                      </td>
 
                      {/* Supplier Invoice */}
                      <td className="border border-slate-200 px-3 text-center font-mono font-bold text-slate-700">
                        {p.supplierInvoiceNumber || <span className="text-slate-300 italic text-[10px]">No reg.</span>}
                      </td>
 
                      {/* Supplier RNC */}
                      <td className="border border-slate-200 px-3 text-center font-mono text-slate-600">
                        {p.supplierRnc || <span className="text-slate-300 italic text-[10px]">No reg.</span>}
                      </td>
 
                      {/* NCF */}
                      <td className="border border-slate-200 px-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/10">
                        {p.ncf || <span className="text-slate-300 italic text-[10px]">No reg.</span>}
                      </td>

                      {/* Items lists */}
                      <td className="border border-slate-200 px-3 text-left font-sans text-xs">
                        <div className="flex flex-wrap gap-1.5 my-1">
                          {p.items.map((item, key) => (
                            <span 
                              key={key}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded flex items-center gap-1.5"
                            >
                              💊 <strong>{item.name}</strong> 
                              <span className="text-[#107c41] font-extrabold">({item.quantity} u)</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Cost total */}
                      <td className="border border-slate-200 px-3 text-right font-black text-rose-700 bg-rose-50/15">
                        ${p.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Payment Method */}
                      <td className="border border-slate-200 px-3 text-center font-sans font-bold text-slate-600 bg-slate-50/40">
                        {p.paymentMethod === 'Crédito' ? (
                          <span className="text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10.5px]">
                            ⏳ Cuentas Pagar
                          </span>
                        ) : (
                          <span className="text-emerald-850 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10.5px]">
                            ✔️ {p.paymentMethod}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* SPREADSHEET FOOTER ROW */}
          <div className="bg-[#f3f2f1] border-t border-slate-250 py-2.5 px-4 text-xs font-mono flex items-center justify-between text-slate-500">
            <span className="font-sans font-bold">TOTAL CONTROL DE COMPRAS EXCEL PRO</span>
            <div className="flex items-center gap-4 text-[11.5px] font-bold">
              <span>Renglones listados: <strong className="text-slate-800 font-mono">{filteredPurchases.length}</strong></span>
              <span>Total invertido: <strong className="text-rose-700 font-mono font-black">${totalInvoicedPurchases.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong></span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
