/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Sale, CreditPayment } from '../types';
import { 
  UserPlus, 
  Search, 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  CreditCard,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  X,
  History,
  TrendingDown,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface CustomersModuleProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
}

export default function CustomersModule({
  customers,
  setCustomers,
  sales,
  setSales
}: CustomersModuleProps) {
  // Navigation tabs within Customers Module
  const [innerTab, setInnerTab] = useState<'sheet' | 'credits'>('sheet');
  
  // Search state
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Selector for currently highlighted customer (for detailed profile & purchase history)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // New customer creation form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustLimit, setNewCustLimit] = useState(3000);

  // Credit Payment registration state
  const [payingSaleId, setPayingSaleId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState<string>('');
  const [payDate, setPayDate] = useState<string>('2026-06-20');

  // Excel formula bar simulated active cell path
  const [activeCell, setActiveCell] = useState<{ rowId: string, col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // 1. CALCULATE INDIVIDUAL SALES BALANCE INFORMATION
  // Helper to get total paid for a credit sale
  const getSalePaidAmount = (sale: Sale) => {
    return (sale.creditPayments || []).reduce((sum, p) => sum + p.amount, 0);
  };

  // Helper to get remaining balance for a credit sale
  const getSalePendingBalance = (sale: Sale) => {
    return Math.max(0, sale.total - getSalePaidAmount(sale));
  };

  // Helper to calculate total pending balance for a customer
  const getCustomerPendingBalance = (customerId: string) => {
    return sales
      .filter(s => s.paymentMethod === 'Crédito' && s.customerId === customerId)
      .reduce((sum, s) => sum + getSalePendingBalance(s), 0);
  };

  // Synchronize editValue when active cell changes
  useEffect(() => {
    if (activeCell) {
      const { rowId, col } = activeCell;
      const targetCustomer = customers.find(c => c.id === rowId);
      if (targetCustomer) {
        if (col === 'B') setEditValue(targetCustomer.name);
        else if (col === 'C') setEditValue(targetCustomer.phone);
        else if (col === 'D') setEditValue(targetCustomer.email || '');
        else if (col === 'F') setEditValue(targetCustomer.creditLimit.toString());
      }
    } else {
      setEditValue('');
    }
  }, [activeCell, customers]);

  // Handle saving the value from the formula bar or Enter key
  const handleSaveCellEdit = () => {
    if (!activeCell) return;
    const { rowId, col } = activeCell;
    
    setCustomers(prev => prev.map(c => {
      if (c.id === rowId) {
        if (col === 'B') return { ...c, name: editValue };
        if (col === 'C') return { ...c, phone: editValue };
        if (col === 'D') return { ...c, email: editValue };
        if (col === 'F') return { ...c, creditLimit: Math.max(0, parseFloat(editValue) || 0) };
      }
      return c;
    }));
  };

  // Rapid addition of key press logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveCellEdit();
      setActiveCell(null);
    }
  };

  // Register New Customer Action handler
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Por favor ingrese el nombre del cliente');
      return;
    }

    const newId = `C${String(customers.length + 1).padStart(3, '0')}`;
    const newCustomer: Customer = {
      id: newId,
      excelRow: customers.length + 1,
      name: newCustName,
      phone: newCustPhone || '000-0000',
      email: newCustEmail || undefined,
      registrationDate: '2026-06-20', // Current simulated server date
      creditLimit: newCustLimit
    };

    setCustomers(prev => [...prev, newCustomer]);
    
    // Clear inputs and close
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustLimit(3000);
    setShowAddModal(false);
    setSelectedCustomerId(newId); // select the newly created customer
  };

  // Delete Customer Handler
  const handleDeleteCustomer = (customerId: string, name: string) => {
    const hasDues = getCustomerPendingBalance(customerId) > 0;
    if (hasDues) {
      alert(`⚠️ ERROR DE AUDITORÍA EXCEL:\n\nEl cliente "${name}" tiene un saldo pendiente de pago. No se puede eliminar de la sábana de créditos activos sin antes liquidar sus deudas.`);
      return;
    }

    const confirmDel = window.confirm(`🗑️ ELIMINAR REGISTRO:\n\n¿Desea borrar al cliente "${name}" del libro de clientes?`);
    if (confirmDel) {
      setCustomers(prev => prev.filter(c => c.id !== customerId).map((c, idx) => ({ ...c, excelRow: idx + 1 })));
      if (selectedCustomerId === customerId) {
        setSelectedCustomerId(null);
      }
    }
  };

  // Register Credit Payment Handler
  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSaleId) return;

    const sale = sales.find(s => s.id === payingSaleId);
    if (!sale) return;

    if (payAmount <= 0) {
      alert('Por favor ingrese un monto de pago válido mayor a cero');
      return;
    }

    const maxAllowed = getSalePendingBalance(sale);
    if (payAmount > maxAllowed + 0.01) {
      alert(`⚠️ SOBRE-PAGO NO VÁLIDO:\n\nEl monto ingresado ($${payAmount.toFixed(2)}) supera el saldo pendiente de esta factura ($${maxAllowed.toFixed(2)}).`);
      return;
    }

    const newPayment: CreditPayment = {
      id: `PAY-${Date.now()}`,
      date: payDate,
      amount: payAmount,
      notes: payNotes || undefined
    };

    setSales(prev => prev.map(s => {
      if (s.id === payingSaleId) {
        const payments = s.creditPayments || [];
        return {
          ...s,
          creditPayments: [...payments, newPayment]
        };
      }
      return s;
    }));

    // Reset state & close invoice payment modal
    setPayingSaleId(null);
    setPayAmount(0);
    setPayNotes('');
    alert('💳 Pago registrado con éxito. El saldo pendiente de la factura ha sido reducido y conciliado.');
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => 
    c.id.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  // Selected customer statistics & details
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerSales = selectedCustomerId 
    ? sales.filter(s => s.customerId === selectedCustomerId || (s.customerName === selectedCustomer?.name && selectedCustomer?.id !== 'C005'))
    : [];

  const customerTotalSalesVal = customerSales.reduce((sum, s) => sum + s.total, 0);
  const customerCreditSales = customerSales.filter(s => s.paymentMethod === 'Crédito');
  const customerPendingBalance = selectedCustomerId ? getCustomerPendingBalance(selectedCustomerId) : 0;
  const customerUsedCreditPercent = selectedCustomer && selectedCustomer.creditLimit > 0 
    ? (customerPendingBalance / selectedCustomer.creditLimit) * 100 
    : 0;

  // Active credit sales globally for the credits tab
  const allCreditSales = sales.filter(s => s.paymentMethod === 'Crédito');

  // Trigger modal for payment
  const openPayModal = (sale: Sale) => {
    setPayingSaleId(sale.id);
    setPayAmount(getSalePendingBalance(sale));
    setPayDate('2026-06-20');
  };

  const exportCustomersCSV = () => {
    const headers = 'ID,Nombre,Telefono,Email,Fecha Registro,Limite de Credito,Saldo Pendiente\r\n';
    const lines = customers.map(c => {
      const balance = getCustomerPendingBalance(c.id);
      return `"${c.id}","${c.name}","${c.phone}","${c.email || ''}","${c.registrationDate}",${c.creditLimit.toFixed(2)},${balance.toFixed(2)}`;
    }).join('\r\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + lines);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Farmacia_Excel_Clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* TOP SUMMARY STATS FOR CUSTOMERS */}
      <div id="customers-stats-banner" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-slate-100 text-slate-800">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Clientes Registrados</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{customers.length}</div>
            <div className="text-[9px] text-slate-400 mt-0.5">En el libro de contactos</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
            <CreditCard size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ventas a Crédito</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{allCreditSales.length}</div>
            <div className="text-[9px] text-emerald-600 font-medium mt-0.5">Pendientes de liquidar/vigentes</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-50 text-amber-600">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Cartera Total Pendiente</div>
            <div className="text-xl font-bold text-amber-700 mt-1">
              ${customers.reduce((sum, c) => sum + getCustomerPendingBalance(c.id), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-amber-600 font-semibold mt-0.5">Suma agregada de saldos</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-4 font-sans">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Crédito Máximo Expuesto</div>
            <div className="text-xl font-bold text-indigo-800 mt-1">
              ${customers.reduce((sum, c) => sum + c.creditLimit, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-indigo-500 font-semibold mt-0.5">Suma de límites autorizados</div>
          </div>
        </div>

      </div>

      {/* WORKBOOK SELECTOR BAR (Looks like Microsoft Excel tab menus) */}
      <div id="customers-sub-sheets" className="bg-[#f3f2f1] border border-slate-200 rounded-lg p-1.5 flex items-center justify-between select-none font-sans">
        <div className="flex items-center gap-1.5">
          <button 
            id="subtab-cust-sheet"
            onClick={() => setInnerTab('sheet')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              innerTab === 'sheet' 
                ? 'bg-white text-[#0f172a] shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet size={14} className={innerTab === 'sheet' ? 'text-[#10b981]' : ''} />
            [Sábana 1] Listado de Clientes Excel
          </button>
          
          <button 
            id="subtab-credits-sheet"
            onClick={() => setInnerTab('credits')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              innerTab === 'credits' 
                ? 'bg-white text-[#0f172a] shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={14} className={innerTab === 'credits' ? 'text-[#10b981]' : ''} />
            [Sábana 2] Cuentas a Crédito & Pagos
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            id="btn-add-cust-modal"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <UserPlus size={13} />
            Registrar Nuevo Cliente
          </button>
          <button 
            id="btn-export-cust"
            onClick={exportCustomersCSV}
            className="flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-[11px] py-1.5 px-3 rounded-lg border border-slate-300 transition cursor-pointer"
          >
            <Download size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      {innerTab === 'sheet' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
          
          {/* COLUMN 1: INTERACTIVE SPREADSHEET OF CUSTOMERS */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* SEARCH AND GRID EXCEL BOX */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
              
              {/* FILTER BAR */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="text-[11.5px] font-bold text-slate-700 uppercase tracking-wide">
                  Edición de Contactos y Límites de Crédito
                </div>
                <div className="relative max-w-xs w-full">
                  <Search size={14} className="text-slate-400 absolute left-2.5 top-2" />
                  <input 
                    type="text" 
                    placeholder="Búsqueda rápida de clientes..." 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                  {customerSearch && (
                    <button onClick={() => setCustomerSearch('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* SIMULATED EXCEL FORMULA BAR */}
              <div id="customer-formula-bar" className="bg-[#f3f2f1] border-b border-slate-200 p-1.5 px-3 flex items-center gap-2 text-xs font-sans">
                <div className="bg-white border border-slate-300 px-2.5 py-0.5 font-bold rounded font-mono text-center text-slate-600 min-w-[50px]">
                  {activeCell ? `${activeCell.col}${customers.findIndex(c => c.id === activeCell.rowId) + 2}` : ''}
                </div>
                <div className="text-slate-400 italic font-serif select-none">fx</div>
                <div className="h-4 w-[1px] bg-slate-300"></div>
                <input 
                  type="text"
                  disabled={!activeCell}
                  placeholder={activeCell ? "Modifique el valor y presione Enter para guardar" : "Haga clic en una celda para editar (Nombre, Teléfono, Límite)"}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-0.5 text-slate-800 text-[11.5px] font-mono focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                />
                {activeCell && (
                  <button 
                    onClick={() => { handleSaveCellEdit(); setActiveCell(null); }}
                    className="bg-[#10b981] text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded shadow-3xs cursor-pointer hover:bg-emerald-500"
                  >
                    Guardar
                  </button>
                )}
              </div>

              {/* SPREADSHEET CONTINOUS BODY */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-mono select-none">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10.5px]">
                      {/* Grid index column header */}
                      <th className="bg-slate-105 border border-slate-250 w-[40px] py-1 text-center font-sans"></th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase">A [Cliente ID]</th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase">B [Nombre Completo]</th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase">C [Teléfono]</th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase">D [Email]</th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase">E [Fecha Registro]</th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase text-right">F [Límite Crédito]</th>
                      <th className="border border-slate-250 px-3 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase text-right">G [Deuda Pendiente]</th>
                      <th className="border border-slate-250 px-2 py-1 bg-slate-105 font-bold font-sans text-[10.5px] text-slate-500 uppercase text-center w-[60px]">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 bg-slate-50 text-center font-sans text-slate-400">
                          No se encontraron clientes registrados con los filtros activos.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c, index) => {
                        const balance = getCustomerPendingBalance(c.id);
                        const isSelected = selectedCustomerId === c.id;
                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => setSelectedCustomerId(c.id)}
                            className={`border-b border-slate-200 cursor-pointer transition-all ${
                              isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="bg-slate-50 border border-slate-200 text-center text-[10px] text-slate-400 font-sans font-semibold">
                              {c.excelRow}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 font-bold text-slate-500">
                              {c.id}
                            </td>
                            {/* editable columns */}
                            <td 
                              onClick={(e) => { e.stopPropagation(); setActiveCell({ rowId: c.id, col: 'B' }); setSelectedCustomerId(c.id); }}
                              className={`border border-slate-200 px-3 py-1.5 font-sans font-bold text-slate-800 ${
                                activeCell?.rowId === c.id && activeCell?.col === 'B' ? 'ring-1 ring-[#10b981] bg-white' : ''
                              }`}
                            >
                              {c.name}
                            </td>
                            <td 
                              onClick={(e) => { e.stopPropagation(); setActiveCell({ rowId: c.id, col: 'C' }); setSelectedCustomerId(c.id); }}
                              className={`border border-slate-200 px-3 py-1.5 ${
                                activeCell?.rowId === c.id && activeCell?.col === 'C' ? 'ring-1 ring-[#10b981] bg-white' : ''
                              }`}
                            >
                              {c.phone}
                            </td>
                            <td 
                              onClick={(e) => { e.stopPropagation(); setActiveCell({ rowId: c.id, col: 'D' }); setSelectedCustomerId(c.id); }}
                              className={`border border-slate-200 px-3 py-1.5 text-slate-600 ${
                                activeCell?.rowId === c.id && activeCell?.col === 'D' ? 'ring-1 ring-[#10b981] bg-white' : ''
                              }`}
                            >
                              {c.email || <span className="text-slate-350 italic">Sin email</span>}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-slate-500">
                              {c.registrationDate}
                            </td>
                            <td 
                              onClick={(e) => { e.stopPropagation(); setActiveCell({ rowId: c.id, col: 'F' }); setSelectedCustomerId(c.id); }}
                              className={`border border-slate-200 px-3 py-1.5 text-right font-bold text-slate-700 ${
                                activeCell?.rowId === c.id && activeCell?.col === 'F' ? 'ring-1 ring-[#10b981] bg-white' : ''
                              }`}
                            >
                              ${c.creditLimit.toFixed(2)}
                            </td>
                            <td className={`border border-slate-200 px-3 py-1.5 text-right font-black ${
                              balance > 0 ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              ${balance.toFixed(2)}
                            </td>
                            <td className="border border-slate-200 py-1.5 text-center">
                              {/* Preventive protection for general public default client */}
                              {c.id !== 'C005' ? (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c.id, c.name); }}
                                  title="Borrar registro"
                                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded cursor-pointer transition"
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded font-sans uppercase">Fijo</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER TAB INTEGRATOR */}
              <div className="bg-slate-50 border-t border-slate-200 p-2.5 text-[11px] font-sans text-slate-500 flex justify-between">
                <div>Ayuda: Haga un clic sobre las celdas de las columnas B, C o F para editarlas desde la barra excel.</div>
                <div className="font-bold text-slate-600">EXPUESTO TOTAL: ${customers.reduce((sum, c) => sum + getCustomerPendingBalance(c.id), 0).toFixed(2)} MXN</div>
              </div>

            </div>

          </div>

          {/* COLUMN 2: CUSTOMER SELECTED DETAIL PANEL & PURCHASE HISTORY */}
          <div className="lg:col-span-4">
            {selectedCustomer ? (
              <div id="customer-profile-card" className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                {/* Header card banner */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Users size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs leading-none uppercase text-slate-300">Expediente de Cliente</h3>
                      <p className="text-sm font-black text-white mt-1">{selectedCustomer.name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-400 text-slate-950 px-2 py-0.5 rounded font-black font-mono">
                    {selectedCustomer.id}
                  </span>
                </div>

                {/* Body credits parameters */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">TELÉFONO:</span>
                    <span className="font-bold text-slate-800">{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">EMAIL:</span>
                    <span className="font-bold text-slate-800 font-mono truncate max-w-[180px]">{selectedCustomer.email || 'No registrado'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">ALTA EN SISTEMA:</span>
                    <span className="font-bold text-slate-800">{selectedCustomer.registrationDate}</span>
                  </div>

                  {/* Credit Standing Gauges */}
                  <div className="border-t border-slate-200 pt-3.5 space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-500">CONSUMO DE CRÉDITO:</span>
                      <span className={customerPendingBalance > selectedCustomer.creditLimit ? 'text-red-600 font-black' : 'text-slate-800'}>
                        ${customerPendingBalance.toFixed(2)} / ${selectedCustomer.creditLimit.toFixed(2)} MXN
                      </span>
                    </div>
                    {/* Linear color Progress exposure bar */}
                    {selectedCustomer.creditLimit > 0 && (
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${
                            customerUsedCreditPercent >= 85 ? 'bg-red-500' : 
                            customerUsedCreditPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, customerUsedCreditPercent)}%` }}
                        />
                      </div>
                    )}
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>Disponible: ${(selectedCustomer.creditLimit - customerPendingBalance).toFixed(2)}</span>
                      <span>{customerUsedCreditPercent.toFixed(0)}% Utilizado</span>
                    </div>
                  </div>
                </div>

                {/* Purchase history of customer */}
                <div className="p-4 flex-1 flex flex-col min-h-[220px]">
                  <h4 className="font-bold text-[11.5px] uppercase tracking-wide text-slate-800 inline-flex items-center gap-1.5 mb-3">
                    <History size={13} className="text-slate-500" />
                    Historial de Compras (Libro Diario)
                  </h4>

                  {customerSales.length === 0 ? (
                    <div className="my-auto text-center py-8 text-slate-400 text-xs">
                      <ClipboardList className="mx-auto mb-1.5 opacity-30 text-slate-400" size={24} />
                      Este cliente no tiene compras registradas en los sistemas de conciliación.
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[250px] pr-1">
                      {customerSales.map(s => {
                        const sumCredits = getSalePaidAmount(s);
                        const creditPending = getSalePendingBalance(s);
                        return (
                          <div key={s.id} className="p-2.5 rounded-lg border border-slate-150 hover:bg-slate-50 transition text-[11px] font-sans">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-[#059669]">{s.invoiceNumber}</span>
                              <span className="text-[9.5px] text-slate-400">{new Date(s.date).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="mt-1 text-slate-600 line-clamp-1">
                              {s.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                            </div>

                            <div className="mt-1.5 flex justify-between items-center text-[10.5px]">
                              <div>
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                                  {s.paymentMethod}
                                </span>
                              </div>
                              <div className="font-mono font-bold text-slate-800">
                                Total: ${s.total.toFixed(2)}
                              </div>
                            </div>

                            {/* Credit specifics */}
                            {s.paymentMethod === 'Crédito' && (
                              <div className="mt-2 bg-slate-55 rounded p-1.5 border border-slate-100 flex flex-col gap-1 text-[9.5px] font-mono">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">PAGADO:</span>
                                  <span className="text-emerald-700 font-bold">${sumCredits.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">PENDIENTE:</span>
                                  <span className={`${creditPending > 0 ? 'text-amber-600 font-black' : 'text-slate-500 font-bold'}`}>
                                    ${creditPending.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[8.5px] text-slate-400">
                                  <span>VENCE:</span>
                                  <span>{s.dueDate || 'Sin definir'}</span>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-center font-bold font-sans text-xs">
                  Resumen Neto Compras: ${customerTotalSalesVal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </div>

              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 flex flex-col justify-center items-center h-[350px]">
                <Users size={32} className="opacity-20 mb-2.5 text-slate-600" />
                <p className="font-bold text-xs text-slate-700">Seleccione un Cliente</p>
                <p className="text-[11px] px-4 mt-1 leading-relaxed text-slate-400">
                  Haga un clic en cualquier fila de la sábana de la izquierda para desplegar su estado de deudas, límite de crédito y registro detallado de compras.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        
        /* WORKBOOK SABANA 2: REGISTER ACTIVE CREDIT LINES */
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col font-sans">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none">Cuentas por Cobrar & Bitácora de Pagos</h2>
              <p className="text-[10px] text-slate-400 mt-1">Sábana simulada de control de facturas de clientes a crédito con estatus de semáforo de vencimiento.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-[10.5px]">
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2.5 h-2.5 bg-red-150 border border-red-400 rounded-full inline-block"></span> Vencidos
              </span>
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2.5 h-2.5 bg-amber-100 border border-amber-400 rounded-full inline-block"></span> Pendientes Vigentes
              </span>
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2.5 h-2.5 bg-green-50 border border-green-405 rounded-full inline-block"></span> Liquidados
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px] uppercase">
                  <th className="bg-slate-105 border border-slate-250 w-[45px] py-2 text-center font-sans font-bold">Reng</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans">Factura No</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans">Cliente Paciente</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans">Fecha Cargo</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans">Vencimiento Excel</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans text-right">Cargo Total ($)</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans text-right">Abonado ($)</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans text-right">Monto Insoluto</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans text-center">Estatus Alarma</th>
                  <th className="border border-slate-250 px-3 py-2 bg-slate-105 font-bold font-sans text-center w-[120px]">Auditoría Pago</th>
                </tr>
              </thead>
              <tbody>
                {allCreditSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 bg-slate-50 text-center text-slate-400 font-sans">
                      <CreditCard className="mx-auto opacity-20 mb-2.5" size={40} />
                      <p className="font-bold text-xs text-slate-700">No hay transacciones registradas a Crédito</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                        Utilice el módulo "Registrar Venta (POS)" y seleccione el método de pago 'Crédito' para registrar una nueva cuenta para cobrar.
                      </p>
                    </td>
                  </tr>
                ) : (
                  allCreditSales.map((s, index) => {
                    const totalPaid = getSalePaidAmount(s);
                    const pending = getSalePendingBalance(s);
                    
                    // Determine status alarm
                    // Server current date June 20, 2026
                    const todayTime = new Date('2026-06-20').getTime();
                    const dueTime = s.dueDate ? new Date(s.dueDate).getTime() : todayTime;
                    
                    let statusClass = "bg-green-50 text-green-800 border-green-200";
                    let statusText = "Liquidado";
                    
                    if (pending > 0.01) {
                      if (dueTime < todayTime) {
                        statusClass = "bg-red-50 text-red-700 border-red-200 animate-pulse";
                        statusText = "⛔ Vencido";
                      } else {
                        statusClass = "bg-amber-50 text-amber-800 border-amber-250";
                        statusText = "⏳ Vigente";
                      }
                    }

                    return (
                      <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50/50 h-[32px]">
                        <td className="bg-slate-50 border border-slate-200 text-center font-bold text-slate-400 text-[10px] font-sans">
                          {index + 1}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 font-bold text-[#059669]">
                          {s.invoiceNumber}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 font-bold text-slate-800 font-sans">
                          {s.customerName}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-slate-500">
                          {new Date(s.date).toLocaleDateString()}
                        </td>
                        <td className="border border-slate-205 px-3 py-1.5 font-bold text-slate-705">
                          {s.dueDate || 'Sin definir'}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-slate-700">
                          ${s.total.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-medium text-emerald-800">
                          ${totalPaid.toFixed(2)}
                        </td>
                        <td className={`border border-slate-200 px-3 py-1.5 text-right font-black ${
                          pending > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          ${pending.toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-sans font-extrabold uppercase border ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1.5 text-center">
                          {pending > 0.01 ? (
                            <button 
                              onClick={() => openPayModal(s)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-[#059669] hover:text-emerald-950 font-bold text-[10px] px-2 py-1 rounded border border-emerald-250 cursor-pointer transition align-middle"
                            >
                              💳 Registrar Pago
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans">Sin deudas</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#f3f2f1] border-t border-slate-200 p-3 text-xs font-sans text-slate-500 flex justify-between select-none">
            <div className="flex gap-4">
              <span>CRÉDITOS ACTIVOS: {allCreditSales.filter(s => getSalePendingBalance(s) > 0).length} facturas</span>
              <span>•</span>
              <span>CARTERA TOTAL: ${allCreditSales.reduce((sum, s) => sum + s.total, 0).toFixed(2)} MXN</span>
            </div>
            <div className="font-bold text-[#059669]">
              PAGOS TOTALES ABONADOS: ${allCreditSales.reduce((sum, s) => sum + getSalePaidAmount(s), 0).toFixed(2)} MXN
            </div>
          </div>

        </div>

      )}


      {/* MODAL: ADD CUSTOMER FORM */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            
            <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center border-b border-slate-200">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <UserPlus size={18} className="text-[#10b981]" />
                REGISTRAR NUEVO CLIENTE (Excel DB)
              </span>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 text-xs font-sans">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Nombre Completo / Razón Social *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Consorcio Médico S.A. de C.V. o Juan López"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Teléfono *</label>
                  <input 
                    type="text"
                    placeholder="Ej. 555-0199"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Email (Opcional)</label>
                  <input 
                    type="email"
                    placeholder="Ej. contacto@email.com"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Límite de Crédito Autorizado (MXN)</label>
                <input 
                  type="number"
                  min="0"
                  step="100"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                />
                <p className="text-[9.5px] text-slate-400 mt-1">Establezca $0 para compras solo de pago inmediato (Sin crédito habilitado).</p>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition"
                >
                  Agregar Fila Excel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* MODAL: REGISTER PAYMENT FOR CREDIT LINES */}
      {payingSaleId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn font-sans text-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            
            {(() => {
              const sale = sales.find(s => s.id === payingSaleId);
              if (!sale) return null;
              const pendingBl = getSalePendingBalance(sale);
              return (
                <>
                  <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center border-b border-slate-200">
                    <span className="font-bold flex items-center gap-1.5 text-sm">
                      <CreditCard size={18} className="text-[#10b981]" />
                      REGISTRAR ABONO / LIQUIDACIÓN ({sale.invoiceNumber})
                    </span>
                    <button 
                      onClick={() => setPayingSaleId(null)}
                      className="text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span>CLIENTE / DETALLE:</span>
                        <span className="font-bold text-slate-800">{sale.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DEUDA CARGO ORIGINAL:</span>
                        <span className="font-semibold text-slate-800">${sale.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                        <span className="text-slate-700">SALDO PENDIENTE ACTUAL:</span>
                        <span className="text-amber-600">${pendingBl.toFixed(2)} MXN</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Fecha de Pago</label>
                        <input 
                          type="date"
                          required
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Monto Abono (MXN) *</label>
                        <input 
                          type="number"
                          required
                          min="0.01"
                          max={pendingBl + 0.01}
                          step="0.01"
                          value={payAmount || ''}
                          onChange={(e) => setPayAmount(Math.min(pendingBl, Math.max(0, parseFloat(e.target.value) || 0)))}
                          className="w-full bg-slate-50 px-3 py-2 border border-slate-350 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981] font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block hover:underline cursor-pointer" onClick={() => setPayAmount(pendingBl)}>
                          Total insoluto: ${pendingBl.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500 block uppercase tracking-wider text-[10px]">Notas de Abono o Referencia (Opcional)</label>
                      <input 
                        type="text"
                        placeholder="Ej. Pago parcial con transferencia o Tarjeta fol: 8219"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full bg-slate-50 px-3 py-2 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPayingSaleId(null)}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg cursor-pointer transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition flex items-center gap-1"
                      >
                        <CreditCard size={13} />
                        Registrar Conciliación
                      </button>
                    </div>

                  </form>
                </>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
}
