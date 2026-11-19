/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Sale, Customer, Purchase } from './types';
import { INITIAL_PRODUCTS, INITIAL_SALES, PHARMACY_CATEGORIES, INITIAL_CUSTOMERS, INITIAL_PURCHASES } from './data/mockData';
import ExcelGrid from './components/ExcelGrid';
import CreateProductModal from './components/CreateProductModal';
import SalesModule from './components/SalesModule';
import ReportsModule from './components/ReportsModule';
import ExcelImportExport from './components/ExcelImportExport';
import CustomersModule from './components/CustomersModule';
import PurchasesModule from './components/PurchasesModule';
import GoogleSheetsSync from './components/GoogleSheetsSync';
import { 
  FileSpreadsheet, 
  LayoutDashboard, 
  ShoppingCart, 
  Activity, 
  Upload, 
  HelpCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle,
  FileText,
  Building,
  Heart,
  ChevronRight,
  Database,
  Calendar,
  Lock,
  Download,
  Users,
  Search,
  Truck,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  // Login Role states
  const [userRole, setUserRole] = useState<'admin' | 'caja' | null>(() => {
    return (localStorage.getItem('pharmacy_user_role') as 'admin' | 'caja') || null;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'excel' | 'sales' | 'sales_history' | 'customers' | 'reports' | 'import_export' | 'purchases' | 'sheets_sync'>(() => {
    const cachedRole = localStorage.getItem('pharmacy_user_role');
    return cachedRole === 'caja' ? 'sales' : 'dashboard';
  });
  const [clockTime, setClockTime] = useState<string>('');
  const [showWelcomeManual, setShowWelcomeManual] = useState<boolean>(true);
  
  // Sales History spreadsheets filter state
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Global search bar states
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);

  // Modal for new product state
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);

  const handleAddNewProductSave = (newProduct: Product) => {
    setProducts(prev => {
      const updated = [...prev, newProduct];
      localStorage.setItem('pharmacy_excel_products_v1', JSON.stringify(updated));
      return updated;
    });
    setIsNewProductModalOpen(false);
    setActiveTab('excel');
  };

  // Filter products for global search
  const filteredProducts = products.filter(p => {
    const q = globalSearch.toLowerCase().trim();
    if (!q) return false;
    return (
      p.name.toLowerCase().includes(q) ||
      p.activeIngredient.toLowerCase().includes(q)
    );
  });

  // 1. STATE INITIALIZATION (Load from localStorage if exists, else seed)
  useEffect(() => {
    const cachedProducts = localStorage.getItem('pharmacy_excel_products_v1');
    const cachedSales = localStorage.getItem('pharmacy_excel_sales_v1');
    const cachedCustomers = localStorage.getItem('pharmacy_excel_customers_v1');
    const cachedPurchases = localStorage.getItem('pharmacy_excel_purchases_v1');

    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('pharmacy_excel_products_v1', JSON.stringify(INITIAL_PRODUCTS));
    }

    if (cachedSales) {
      setSales(JSON.parse(cachedSales));
    } else {
      setSales(INITIAL_SALES);
      localStorage.setItem('pharmacy_excel_sales_v1', JSON.stringify(INITIAL_SALES));
    }

    if (cachedCustomers) {
      setCustomers(JSON.parse(cachedCustomers));
    } else {
      setCustomers(INITIAL_CUSTOMERS);
      localStorage.setItem('pharmacy_excel_customers_v1', JSON.stringify(INITIAL_CUSTOMERS));
    }

    if (cachedPurchases) {
      setPurchases(JSON.parse(cachedPurchases));
    } else {
      setPurchases(INITIAL_PURCHASES);
      localStorage.setItem('pharmacy_excel_purchases_v1', JSON.stringify(INITIAL_PURCHASES));
    }
  }, []);

  // 2. STATE PERSISTENCE SYNC
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('pharmacy_excel_products_v1', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    if (sales.length > 0) {
      localStorage.setItem('pharmacy_excel_sales_v1', JSON.stringify(sales));
    }
  }, [sales]);

  useEffect(() => {
    if (customers.length > 0) {
      localStorage.setItem('pharmacy_excel_customers_v1', JSON.stringify(customers));
    }
  }, [customers]);

  useEffect(() => {
    if (purchases.length > 0) {
      localStorage.setItem('pharmacy_excel_purchases_v1', JSON.stringify(purchases));
    }
  }, [purchases]);

  // 3. DIGITAL CLOCK UPDATE
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('es-MX', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 4. RESET SYSTEM DATA TO SEED STATE
  const handleResetCatalog = () => {
    const confirmReset = window.confirm('⚠️ RESTABLECER HOJA EXCEL:\n\n¿Desea borrar las modificaciones locales y restablecer el inventario, ventas, clientes y compras de la farmacia a los valores semilla de Excel?');
    if (confirmReset) {
      setProducts(INITIAL_PRODUCTS);
      setSales(INITIAL_SALES);
      setCustomers(INITIAL_CUSTOMERS);
      setPurchases(INITIAL_PURCHASES);
      localStorage.setItem('pharmacy_excel_products_v1', JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem('pharmacy_excel_sales_v1', JSON.stringify(INITIAL_SALES));
      localStorage.setItem('pharmacy_excel_customers_v1', JSON.stringify(INITIAL_CUSTOMERS));
      localStorage.setItem('pharmacy_excel_purchases_v1', JSON.stringify(INITIAL_PURCHASES));
      alert('Inventario, clientes, ventas y compras semilla cargados con éxito. La base de datos local ha sido reiniciada.');
    }
  };

  // 5. EXPORT METRICS FOR FAST DOWNLOAD
  const handleExportFullCatalog = () => {
    const headers = 'Codigo,Medicamento,Principio Activo,Categoria,Stock,Stock Minimo,Precio Venta,Costo Compra,Lote,Fecha Vencimiento,Laboratorio\r\n';
    const lines = products.map(p => {
      return `"${p.code}","${p.name}","${p.activeIngredient}","${p.category}",${p.stock},${p.safetyStock},${p.price.toFixed(2)},${p.cost.toFixed(2)},"${p.batch}","${p.expiryDate}","${p.laboratory}"`;
    }).join('\r\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + lines);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Farmacia_Excel_Inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Stats computations for Dashboard
  const todayStr = '2026-06-20';
  const todayDate = new Date(todayStr);

  const statsTotalValueVal = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const statsTotalItemsStock = products.reduce((sum, p) => sum + p.stock, 0);
  const statsAverageDrugPrice = products.length > 0 ? (products.reduce((sum, p) => sum + p.price, 0) / products.length) : 0;
  
  const statsExpiredCount = products.filter(p => {
    const exp = new Date(p.expiryDate);
    return exp.getTime() <= todayDate.getTime();
  }).length;

  const statsCriticalLowCount = products.filter(p => p.stock <= p.safetyStock).length;

  const statsTodayRevenue = sales
    .filter(s => s.date.startsWith('2026-06-20'))
    .reduce((sum, s) => sum + s.total, 0);

  const statsTodaySalesCount = sales
    .filter(s => s.date.startsWith('2026-06-20')).length;

  const handleSaleCompleted = async (sale: Sale) => {
    const isAutoSync = localStorage.getItem('pharmacy_excel_google_autosync_sales') === 'true';
    const sheetId = localStorage.getItem('pharmacy_excel_google_spreadsheet_id');
    if (!isAutoSync || !sheetId) return;

    try {
      const { getAccessToken } = await import('./utils/googleAuth');
      const token = await getAccessToken();
      if (!token) return;

      const row = [
        sale.invoiceNumber,
        sale.date,
        sale.customerName,
        String(sale.subtotal),
        String(sale.tax),
        String(sale.discount),
        String(sale.total),
        sale.paymentMethod,
        sale.id
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Historial_Ventas!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'Historial_Ventas!A1',
          majorDimension: 'ROWS',
          values: [row]
        })
      });
    } catch (err) {
      console.error('Error in real-time sales auto-sync:', err);
    }
  };

  if (!userRole) {
    const handleLogin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setLoginError('');
      
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();
      
      if (cleanUser === 'admin' && cleanPass === 'admin') {
        setUserRole('admin');
        localStorage.setItem('pharmacy_user_role', 'admin');
        setActiveTab('dashboard');
      } else if (cleanUser === 'caja' && cleanPass === 'caja') {
        setUserRole('caja');
        localStorage.setItem('pharmacy_user_role', 'caja');
        setActiveTab('sales');
      } else {
        setLoginError('Credenciales incorrectas. Intente con admin / admin o caja / caja.');
      }
    };

    const handleQuickLogin = (role: 'admin' | 'caja') => {
      setUserRole(role);
      localStorage.setItem('pharmacy_user_role', role);
      setActiveTab(role === 'admin' ? 'dashboard' : 'sales');
    };

    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full space-y-8 bg-[#1e293b] p-8 rounded-2xl border border-[#334155] shadow-2xl relative overflow-hidden">
          {/* Decorative medicine cross background icon */}
          <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none">
            <svg className="w-64 h-64 text-[#10b981]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
            </svg>
          </div>

          <div className="text-center relative z-10">
            <div className="mx-auto h-16 w-16 bg-[#10b981]/15 border border-[#10b981]/30 rounded-2xl flex items-center justify-center text-[#10b981] mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
              Farmacia Excel Pro
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Inicie sesión para acceder al sistema de gestión de medicamentos
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4 relative z-10">
            {loginError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold text-center">
                ⚠ {loginError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Usuario (Nombre de cuenta)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: admin o caja"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition text-center font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ej: admin o caja"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] transition text-center font-mono font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 mt-6 border border-transparent text-xs font-black rounded-xl text-slate-950 bg-[#10b981] hover:bg-[#059669] transition cursor-pointer select-none font-sans uppercase tracking-wider"
            >
              Iniciar sesión
            </button>
          </form>

          {/* Quick Access Area */}
          <div className="relative z-10 border-t border-[#334155] pt-6 mt-6 space-y-4">
            <div className="text-center">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest block mb-3">
                Accesos rápidos de evaluación
              </span>
              
              <div className="grid grid-cols-2 gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="bg-[#1e293b] hover:bg-slate-800 border border-[#334155] hover:border-[#10b981]/50 p-3 rounded-xl transition text-left cursor-pointer flex flex-col justify-between"
                >
                  <span className="text-[11px] font-black text-[#10b981] uppercase">Administrador</span>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">usuario: admin</span>
                  <span className="text-[9px] text-slate-400 font-mono">clave: admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('caja')}
                  className="bg-[#1e293b] hover:bg-slate-800 border border-[#334155] hover:border-[#10b981]/50 p-3 rounded-xl transition text-left cursor-pointer flex flex-col justify-between"
                >
                  <span className="text-[11px] font-black text-sky-400 uppercase">Cajero (Caja)</span>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">usuario: caja</span>
                  <span className="text-[9px] text-slate-400 font-mono">clave: caja</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="main-application-frame" className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans">
      
      {/* GLOWING MEDICAL EXCEL HEADER BAR */}
      <header id="app-header-bar" className="bg-[#0f172a] text-white shadow-md border-b border-[#1e293b] py-3.5 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 select-none">
        
        {/* LOGO TITLE BRANDING */}
        <div className="flex items-center gap-3">
          <div id="pharmacy-cross-badge" className="p-2 bg-[#10b981]/15 text-[#10b981] rounded-xl border border-[#10b981]/30">
            <svg className="w-8 h-8 text-[#10b981] fill-current" viewBox="0 0 24 24">
              <path d="M19 10.5h-5.5V5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5.5H5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h5.5V19c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-5.5H19c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z"/>
            </svg>
          </div>
          <div>
            <h1 id="app-brand-title" className="text-lg font-bold tracking-tight flex items-center gap-2">
              FARMACIA EXCEL PRO
              <span className="text-[10px] bg-[#10b981] text-slate-950 px-2.5 py-0.5 rounded font-black uppercase tracking-wider">Sábana Inteligente</span>
            </h1>
            <p className="text-[10.5px] text-[#94a3b8] font-medium">Control de Inventario, Punto de Venta y Reportes de Auditoría de Alta Fidelidad</p>
          </div>
        </div>

        {/* GLOBAL MEDICINE SEARCH BAR */}
        <div className="relative w-full md:max-w-xs lg:max-w-md mx-auto" id="global-search-container">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-[#10b981] w-4 h-4 pointer-events-none" />
            <input
              id="global-header-search-input"
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)} // Delay to allow clicks on dropdown
              placeholder="🔍 Buscar medicamento o principio activo..."
              className="w-full bg-[#1e293b]/85 text-xs text-slate-100 placeholder-slate-400 pl-9 pr-12 py-1.5 border border-[#334155] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:bg-[#1e293b] transition"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Results */}
          <AnimatePresence>
            {isSearchFocused && globalSearch.trim().length > 0 && (
              <motion.div
                id="global-search-results-popover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl max-h-[280px] overflow-y-auto z-50 p-2 text-slate-200"
              >
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 select-none">
                    No se encontraron medicamentos para <span className="text-[#10b981] font-bold">"{globalSearch}"</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-[9px] text-[#94a3b8] font-bold uppercase tracking-wider px-2 py-1 select-none flex justify-between border-b border-slate-800 pb-1 mb-1">
                      <span>Coincidencias ({filteredProducts.length})</span>
                      <span className="text-[#10b981]">Click para ver</span>
                    </div>
                    <div className="space-y-0.5">
                      {filteredProducts.map((p) => {
                        const isLowStock = p.stock <= p.safetyStock;
                        const isExpired = new Date(p.expiryDate).getTime() < new Date('2026-06-20').getTime();
                        
                        return (
                          <div
                            key={p.id}
                            id={`search-item-${p.id}`}
                            onClick={() => {
                              setSelectedProductDetails(p);
                              setGlobalSearch('');
                            }}
                            className="flex items-center justify-between p-1.5 rounded-md hover:bg-[#1e293b]/70 cursor-pointer transition select-none text-left"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                {p.name}
                                <span className="text-[9px] font-normal text-slate-400 font-mono">({p.id})</span>
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                {p.activeIngredient} <span className="text-slate-500">• {p.laboratory}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-[11px] font-bold text-emerald-450">
                                ${p.price.toFixed(2)}
                              </div>
                              <div className="text-[8.5px] flex items-center gap-1 justify-end font-mono">
                                {isExpired ? (
                                  <span className="text-red-400 font-bold bg-red-950/40 px-1 rounded">🚫 Caducado</span>
                                ) : isLowStock ? (
                                  <span className="text-amber-400 font-bold bg-amber-950/40 px-1 rounded">Stock {p.stock}</span>
                                ) : (
                                  <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded">Stock {p.stock}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CLOCK & DATA UTILS RIGHT */}
        <div className="flex items-center flex-wrap gap-4 text-xs font-mono">
          {/* USER SESSION STATUS BADGE */}
          <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-1.5 rounded-lg border border-[#334155]">
            <span className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-[#10b981]' : 'bg-sky-400'} animate-pulse`}></span>
            <span className="text-[10px] font-bold uppercase select-none text-slate-300">
              {userRole === 'admin' ? '🥇 ADMIN' : '💳 CAJA'}
            </span>
            <span className="text-[#475569] font-bold">|</span>
            <button
              id="header-logout-btn"
              onClick={() => {
                setUserRole(null);
                localStorage.removeItem('pharmacy_user_role');
              }}
              className="text-red-400 hover:text-red-300 font-bold uppercase text-[10px] cursor-pointer transition select-none hover:underline"
              title="Cerrar sesión actual"
            >
              Cerrar Sesión
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1e293b] px-3 py-1.5 rounded-lg border border-[#334155]" title="Fecha simulada del servidor">
            <Clock size={14} className="text-[#10b981]" />
            <span>2026-06-20</span>
            <span className="text-[#475569] font-bold">|</span>
            <span className="text-white font-bold">{clockTime}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {userRole === 'admin' && (
              <button 
                id="reset-state-master-btn"
                onClick={handleResetCatalog}
                title="Restablecer base de datos a medicamentos semilla de Excel"
                className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155] px-3 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition text-white"
              >
                Cargar Semilla
              </button>
            )}
            <button
              id="manual-toggle-btn"
              onClick={() => setShowWelcomeManual(prev => !prev)}
              className="bg-[#1e293b] hover:bg-[#334155] border border-[#334155] p-2 rounded-lg text-emerald-100 transition cursor-pointer"
              title="Ayuda técnica"
            >
              <HelpCircle size={15} className="text-[#10b981]" />
            </button>
          </div>
          
        </div>
      </header>

      {/* QUICK INSTRUCTION WELCOME BOX */}
      {showWelcomeManual && (
        <div id="welcome-board-panel" className="bg-emerald-50 border-b border-emerald-100 p-4 px-6 md:px-8 text-xs text-slate-700 leading-normal font-sans animation-slide-down flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-4xl">
            <div className="flex items-center gap-1.5 font-bold text-[#166534] text-xs">
              <CheckCircle size={15} className="text-[#10b981] inline" />
              BIENVENIDO AL SISTEMA DE GESTIÓN FARMACÉUTICO EN EXCEL
            </div>
            <p className="text-slate-600 text-[11.5px]">
              Esta herramienta recrea una hoja de cálculo interactiva de grado industrial para la farmacia. Puede editar celdas haciendo 
              <strong> doble clic</strong> sobre el inventario (ej. modificar stock, costo o fechas de caducidad). Al mismo tiempo, el sistema audita 
              el estado de seguridad sanitaria de los lotes y recalcula las utilidades en los tableros analíticos.
            </p>
          </div>
          <button 
            id="welcome-board-close"
            onClick={() => setShowWelcomeManual(false)}
            className="text-emerald-800 font-bold hover:text-emerald-950 underline shrink-0 text-right cursor-pointer"
          >
            Entendido, cerrar panel x
          </button>
        </div>
      )}

      {/* NAV SHEET TABS (Looks like Excel bottom workbook sheets selectors but top-positioned for usability) */}
      <div id="master-sheet-tabs-selector" className="bg-white border-b border-slate-200 shadow-xs flex items-center overflow-x-auto select-none sticky top-[60px] z-30 font-sans">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 flex items-end">
          
          {userRole === 'admin' && (
            <button 
              id="tab-select-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                  : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <LayoutDashboard size={15} className={activeTab === 'dashboard' ? 'text-[#10b981]' : ''} />
              Cuadro de Mando (Dashboard)
            </button>
          )}

          {userRole === 'admin' && (
            <button 
              id="tab-select-excel"
              onClick={() => setActiveTab('excel')}
              className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'excel' 
                  ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                  : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <FileSpreadsheet size={15} className={activeTab === 'excel' ? 'text-[#10b981]' : ''} />
              [Hoja 1] Medicamentos Excel
            </button>
          )}

          <button 
            id="tab-select-sales"
            onClick={() => setActiveTab('sales')}
            className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'sales' 
                ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
            }`}
          >
            <ShoppingCart size={15} className={activeTab === 'sales' ? 'text-[#10b981]' : ''} />
            Registrar Venta (POS)
          </button>

          <button 
            id="tab-select-sales-history"
            onClick={() => setActiveTab('sales_history')}
            className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'sales_history' 
                ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
            }`}
          >
            <FileText size={15} className={activeTab === 'sales_history' ? 'text-[#10b981]' : ''} />
            [Hoja 2] Historial de Ventas Excel
          </button>

          <button 
            id="tab-select-customers"
            onClick={() => setActiveTab('customers')}
            className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'customers' 
                ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
            }`}
          >
            <Users size={15} className={activeTab === 'customers' ? 'text-[#10b981]' : ''} />
            [Hoja 3] Clientes & Crédito
          </button>

          {userRole === 'admin' && (
            <button 
              id="tab-select-purchases"
              onClick={() => setActiveTab('purchases')}
              className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'purchases' 
                  ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                  : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <Truck size={15} className={activeTab === 'purchases' ? 'text-[#10b981]' : ''} />
              [Hoja 4] Compras Proveedores
            </button>
          )}

          {userRole === 'admin' && (
            <button 
              id="tab-select-reports"
              onClick={() => setActiveTab('reports')}
              className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'reports' 
                  ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                  : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <Activity size={15} className={activeTab === 'reports' ? 'text-[#10b981]' : ''} />
              Reportes Automáticos
            </button>
          )}

          {userRole === 'admin' && (
            <button 
              id="tab-select-import-export"
              onClick={() => setActiveTab('import_export')}
              className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'import_export' 
                  ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                  : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <Upload size={15} className={activeTab === 'import_export' ? 'text-[#10b981]' : ''} />
              Importación/Estructura CSV
            </button>
          )}

          {userRole === 'admin' && (
            <button 
              id="tab-select-sheets-sync"
              onClick={() => setActiveTab('sheets_sync')}
              className={`py-3 px-4.5 text-xs font-bold leading-none flex items-center gap-2 border-b-2 transition cursor-pointer ${
                activeTab === 'sheets_sync' 
                  ? 'border-[#10b981] text-[#0f172a] bg-[#f8fafc] font-black' 
                  : 'border-transparent text-slate-500 hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <FileSpreadsheet size={15} className={activeTab === 'sheets_sync' ? 'text-[#10b981]' : ''} />
              [Hoja 5] Google Sheets Cloud
            </button>
          )}

        </div>
      </div>

      {/* DETAILED VIEWS CONTAINER */}
      <main id="tab-views-root" className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD LANDING */}
          {activeTab === 'dashboard' && (
            <motion.div 
              id="view-dashboard-pane"
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-6"
            >
              
              {/* SUM OVERVIEW HEADER CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* 1. Value of Inventory */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-50 text-[#107c41] rounded-xl border border-emerald-100">
                    <Database size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Valor Monetario Inventario</span>
                    <h3 className="text-lg font-black text-slate-800 font-mono mt-0.5">
                      ${statsTotalValueVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[10px] text-slate-405 mt-0.5">Total de mercancía valorada</p>
                  </div>
                </div>

                {/* 2. Total drug styles */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 flex items-center gap-4">
                  <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Medicamentos Registrados</span>
                    <h3 className="text-lg font-black text-slate-800 font-mono mt-0.5">
                      {products.length} <span className="text-xs text-slate-400 font-normal">renglones</span>
                    </h3>
                    <p className="text-[10px] text-slate-405 mt-0.5">Total de claves farmacéuticas</p>
                  </div>
                </div>

                {/* 3. Items stock metrics */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                    <Clock size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unidades Disponibles</span>
                    <h3 className="text-lg font-black text-slate-800 font-mono mt-0.5">
                      {statsTotalItemsStock.toLocaleString()} <span className="text-xs text-slate-400 font-normal">piezas</span>
                    </h3>
                    <p className="text-[10px] text-slate-405 mt-0.5">Dispersas en pasillos y estantes</p>
                  </div>
                </div>

                {/* 4. Sales registered today */}
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-5 flex items-center gap-4">
                  <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ingresos de Hoy (Simulado)</span>
                    <h3 className="text-lg font-black text-slate-800 font-mono mt-0.5">
                      ${statsTodayRevenue.toFixed(2)}
                    </h3>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{statsTodaySalesCount} ventas liquidadas hoy</p>
                  </div>
                </div>

              </div>

              {/* WELCOME BANNER PANEL */}
              <div className="bg-linear-to-r from-[#107c41] to-emerald-800 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit uppercase select-none">
                    Auditoría Inteligente Automatizada
                  </div>
                  <h2 className="text-xl font-black">Control de Stock Crítico y Vencimientos Activos</h2>
                  <p className="text-xs text-emerald-100 leading-relaxed">
                    Sincronice sus ventas e inventario rápidamente. Si existen medicamentos por debajo de su límite mínimo de seguridad o lotes vencidos, el sistema levantará una alarma roja. Puede usar el Punto de Venta para procesar compras de clientes y vaciar el stock de forma segura.
                  </p>
                </div>
                
                <div className="flex gap-3 justify-end shrink-0 w-full md:w-auto flex-wrap">
                  <button 
                    id="dash-create-product"
                    onClick={() => setIsNewProductModalOpen(true)}
                    className="bg-[#10b981] hover:bg-emerald-500 text-slate-950 font-black text-xs py-2.5 px-5 rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 duration-100"
                    title="Crear un medicamento nuevo con formulario controlado"
                  >
                    <Plus size={14} className="stroke-[3]" /> Creación de Producto Nuevo
                  </button>
                  <button 
                    id="dash-quick-sale"
                    onClick={() => setActiveTab('sales')}
                    className="bg-white hover:bg-slate-100 text-[#107c41] font-bold text-xs py-2.5 px-5 rounded-lg shadow-md transition cursor-pointer"
                  >
                    Registrar Venta (Fórmulas)
                  </button>
                  <button 
                    id="dash-edit-cat"
                    onClick={() => setActiveTab('excel')}
                    className="bg-emerald-990 hover:bg-emerald-950 text-white border border-emerald-600 font-bold text-xs py-2.5 px-5 rounded-lg shadow-md transition cursor-pointer animate-pulse"
                  >
                    Abrir Excel de Inventario
                  </button>
                </div>
              </div>

              {/* DUAL CORES: ALERTS & RECENT SALES HISTORY */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* CURRENT SALES ACTIVITY */}
                <div className="lg:col-span-12 bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Últimas Transacciones Registradas (Lote Ventas)</span>
                      <span className="text-slate-500 font-mono text-[10.5px]">Fila Histórica Excel</span>
                    </h3>

                    <div className="overflow-x-auto">
                      <table id="dash-recent-sales-table" className="w-full text-left text-xs select-none">
                        <thead>
                          <tr className="border-b border-sidebar-250 text-slate-400 font-semibold mb-2">
                            <th className="py-2">Folio</th>
                            <th className="py-2">Paciente / Comprador</th>
                            <th className="py-2 text-center">Productos</th>
                            <th className="py-2 text-right">Monto Neto</th>
                            <th className="py-2 text-center">Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {sales.slice(0, 4).map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50 text-slate-600">
                              <td className="py-2.5 font-bold text-[#107c41]">{sale.invoiceNumber}</td>
                              <td className="py-2.5 font-sans font-semibold text-slate-700">{sale.customerName}</td>
                              <td className="py-2.5 text-center text-slate-500">{sale.items.length} claves</td>
                              <td className="py-2.5 text-right font-bold text-slate-800">${sale.total.toFixed(2)}</td>
                              <td className="py-2.5 text-center">
                                <span className="bg-slate-100 font-sans text-[10px] py-0.5 px-1.5 rounded text-slate-600 font-medium uppercase">
                                  {sale.paymentMethod}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Total acumulado hoy: ${statsTodayRevenue.toFixed(2)}</span>
                    <button
                      id="dash-go-history"
                      onClick={() => setActiveTab('sales_history')}
                      className="text-[#107c41] hover:text-[#0b6434] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      Ver Libro Diario de Ventas <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: INTERACTIVE EXCEL GRID WORKSPACE */}
          {activeTab === 'excel' && (
            <motion.div 
              id="view-excel-pane"
              key="excel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <ExcelGrid 
                products={products}
                setProducts={setProducts}
                onExport={handleExportFullCatalog}
                onImportTrigger={() => setActiveTab('import_export')}
                onAddProductClick={() => setIsNewProductModalOpen(true)}
              />
            </motion.div>
          )}

          {/* TAB 3: SALES MODULE INVOICING */}
          {activeTab === 'sales' && (
            <motion.div 
              id="view-sales-pane"
              key="sales"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <SalesModule 
                products={products}
                setProducts={setProducts}
                sales={sales}
                setSales={setSales}
                customers={customers}
                onSaleCompleted={handleSaleCompleted}
              />
            </motion.div>
          )}

          {/* TAB 4: SECONDARY REPORT SPREADSHEET (Sales History Book) */}
          {activeTab === 'sales_history' && (
            <motion.div 
              id="view-sales-history-pane"
              key="sales_history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-205 overflow-hidden font-sans"
            >
              
              {/* SHEET TABS HEADER TO LOOK LIKE SPREADSHEEET */}
              <div className="bg-[#f3f2f1] border-b border-slate-250 p-3 hover:bg-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-705">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 text-white rounded p-1">
                    <FileSpreadsheet size={15} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">[Hoja 2] Libro Diario de Ventas Recorridas</h2>
                    <p className="text-[10px] text-slate-400">Renglones automatizados de comprobantes F-001 creados por el Punto de Venta.</p>
                  </div>
                </div>

                {/* Filter and reset actions */}
                <div className="flex items-center gap-1.5 self-start">
                  <input 
                    id="invoice-search-input"
                    type="text" 
                    placeholder="🔍 Filtrar por Folio o Paciente..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="bg-white border text-xs px-2.5 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                  {invoiceSearch.length > 0 && (
                    <button 
                      id="invoice-search-clear"
                      onClick={() => setInvoiceSearch('')} 
                      className="text-xs text-red-500 font-bold bg-white border border-red-200 px-2 py-1 rounded"
                    >
                      Limpio
                    </button>
                  )}
                  <button
                    id="sales-history-dl"
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(
                        "Folio,Fecha,Paciente,Subtotal,ITBIS,Descuento,Total Neto,Metodo Pago\r\n" +
                        sales.map(s => `"${s.invoiceNumber}","${s.date.split('T')[0]}","${s.customerName}",${s.subtotal},${s.tax},${s.discount},${s.total},"${s.paymentMethod}"`).join("\r\n")
                      );
                      const link = document.createElement('a');
                      link.setAttribute('href', csvContent);
                      link.setAttribute('download', `Libro_Diario_Ventas_Excel_${new Date().toISOString().split('T')[0]}.csv`);
                      link.click();
                    }}
                    className="bg-[#107c41] hover:bg-[#0b6434] text-white border text-xs py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer font-bold transition shadow-2xs"
                  >
                    <Download size={13} />
                    Exportar Libro
                  </button>
                </div>
              </div>

              {/* GRID INTERFACE MOCKUP OF SALES LOGS */}
              <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
                <table id="sales-excel-row-table" className="w-full border-collapse border-spacing-0 select-none text-[11.5px] font-mono leading-none">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 text-center sticky top-0 z-10 border-b border-slate-200">
                      <th className="w-[45px] font-sans border border-slate-200 py-1 cursor-default text-[10px] text-slate-400 sticky left-0 bg-slate-100 z-10"></th>
                      <th className="w-[100px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">A [Folio/Factura]</th>
                      <th className="w-[140px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">B [Fecha-Hora]</th>
                      <th className="w-[180px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">C [Paciente]</th>
                      <th className="w-[100px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">D [Subtotal ($)]</th>
                      <th className="w-[100px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">E [Descuento ($)]</th>
                      <th className="w-[100px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">F [ITBIS]</th>
                      <th className="w-[110px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">G [Monto Neto]</th>
                      <th className="w-[110px] font-sans border border-slate-250 py-1 cursor-default text-[10px] uppercase font-bold">H [Método Pago]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredSales = sales.filter(s => 
                        s.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        s.customerName.toLowerCase().includes(invoiceSearch.toLowerCase())
                      );

                      if (filteredSales.length === 0) {
                        return (
                          <tr id="empty-filtered-sales-row">
                            <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                              Ningún renglón de facturación coincide en el libro diario.
                            </td>
                          </tr>
                        );
                      }

                      return filteredSales.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-100 h-[28px] border-b border-slate-150">
                          {/* Row Number Column cell */}
                          <td className="bg-slate-50 border border-slate-200 text-center text-[9px] font-sans font-bold text-slate-400 sticky left-0 z-5">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 font-bold text-[#107c41]">
                            {s.invoiceNumber}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 text-slate-505">
                            {new Date(s.date).toLocaleString('es-MX')}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 font-sans font-bold text-slate-700">
                            {s.customerName}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 text-right text-slate-600 font-mono">
                            ${s.subtotal.toFixed(2)}
                          </td>
                          <td className={`border border-slate-200 px-3 py-1 text-right font-mono ${s.discount > 0 ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                            -${s.discount.toFixed(2)}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 text-right text-slate-600 font-mono">
                            ${s.tax.toFixed(2)}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 text-right font-black text-[#107c41] font-mono">
                            ${s.total.toFixed(2)}
                          </td>
                          <td className="border border-slate-200 px-3 py-1 text-center">
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-sans font-extrabold px-2 py-0.5 rounded-full uppercase border border-emerald-100">
                              {s.paymentMethod}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* FOOTER TAB INTEGRATOR */}
              <div className="bg-[#f3f2f1] border-t border-slate-200 p-2 text-xs flex justify-between font-sans text-slate-500">
                <div className="flex bg-slate-200 rounded p-1 gap-1 select-none">
                  <span className="text-slate-500 font-light px-2.5 py-0.5">Hojas de Trabajo:</span>
                  {userRole === 'admin' && (
                    <button 
                      id="workbook-sheet-p"
                      onClick={() => setActiveTab('excel')} 
                      className="hover:bg-white text-slate-600 px-2 py-0.5 rounded transition text-[11px] font-semibold cursor-pointer"
                    >
                      📑 [Hoja 1] Medicamentos
                    </button>
                  )}
                  <button 
                    id="workbook-sheet-s"
                    className="bg-white text-indigo-700 px-2 py-0.5 rounded shadow-3xs text-[11px] font-bold cursor-default"
                  >
                    🧾 [Hoja 2] Ventas (Activo)
                  </button>
                  <button 
                    id="workbook-sheet-c"
                    onClick={() => setActiveTab('customers')} 
                    className="hover:bg-white text-slate-600 px-2 py-0.5 rounded transition text-[11px] font-semibold cursor-pointer"
                  >
                    👤 [Hoja 3] Clientes & Crédito
                  </button>
                </div>
                
                <div className="font-mono text-slate-501 font-semibold flex items-center gap-3">
                  <span>RECUENTO DE VENTAS: {sales.length} renglones</span>
                  <span>MONTO DIARIO: ${sales.reduce((sum, s) => sum + s.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 4.5: CUSTOMERS & CREDIT SPREADSHEET (Customers Book) */}
          {activeTab === 'customers' && (
            <motion.div 
              id="view-customers-pane"
              key="customers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <CustomersModule 
                customers={customers}
                setCustomers={setCustomers}
                sales={sales}
                setSales={setSales}
              />
            </motion.div>
          )}

          {/* TAB 4.75: PURCHASES FROM SUPPLIERS */}
          {activeTab === 'purchases' && (
            <motion.div 
              id="view-purchases-pane"
              key="purchases"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <PurchasesModule 
                products={products}
                setProducts={setProducts}
                purchases={purchases}
                setPurchases={setPurchases}
              />
            </motion.div>
          )}

          {/* TAB 5: AUTOMATED PERFORMANCE REPORTS */}
          {activeTab === 'reports' && (
            <motion.div 
              id="view-reports-pane"
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <ReportsModule 
                products={products}
                setProducts={setProducts}
                sales={sales}
                customers={customers}
              />
            </motion.div>
          )}

          {/* TAB 6: BULK EXCEL CSV EXPORTER IMPORTER */}
          {activeTab === 'import_export' && (
            <motion.div 
              id="view-import-export-pane"
              key="import_export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <ExcelImportExport 
                products={products}
                setProducts={setProducts}
              />
            </motion.div>
          )}

          {/* TAB 7: GOOGLE SHEETS CLOUD SYNCHRONIZATION */}
          {activeTab === 'sheets_sync' && (
            <motion.div 
              id="view-sheets-sync-pane"
              key="sheets_sync"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <GoogleSheetsSync 
                products={products}
                setProducts={setProducts}
                sales={sales}
                setSales={setSales}
                customers={customers}
                setCustomers={setCustomers}
                purchases={purchases}
                setPurchases={setPurchases}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* GLOBAL SEARCH MEDICAMENT DETAILS MODAL */}
      <AnimatePresence>
        {selectedProductDetails && (
          <div 
            id="global-product-detail-modal-overlay" 
            className="fixed inset-0 bg-[#020617]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans"
            onClick={() => setSelectedProductDetails(null)}
          >
            <motion.div
              id="global-product-detail-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full max-w-lg select-none text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#0f172a] text-white p-5 relative">
                <button
                  id="close-prod-details-btn"
                  onClick={() => setSelectedProductDetails(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold transition cursor-pointer"
                >
                  ✕
                </button>
                <div className="text-[9px] bg-[#10b981] text-slate-950 font-black px-2 py-0.5 rounded uppercase tracking-wider inline-block mb-1.5">
                  Ficha de Medicamento Mapeada
                </div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  {selectedProductDetails.name}
                  <span className="text-xs font-mono font-normal text-slate-400">({selectedProductDetails.id})</span>
                </h3>
                <p className="text-xs text-slate-350 mt-1 font-mono">
                  <span className="text-emerald-400 font-bold">Sustancia Activa:</span> {selectedProductDetails.activeIngredient}
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                
                {/* Excel Row Mapper Banner */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Celda de Fila Excel</span>
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mt-0.5 font-mono">
                      <FileSpreadsheet size={13} className="text-[#10b981]" />
                      Fila {selectedProductDetails.excelRow} en Hoja 1
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Código Barras / SKU</span>
                    <span className="text-xs font-mono font-extrabold text-[#10b981] block mt-0.5">
                      {selectedProductDetails.code}
                    </span>
                  </div>
                </div>

                {/* Main product attributes */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                  <h4 className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Estado de Almacén y Abasto</h4>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Existencia Actual:</span>
                    <div className="text-xs font-black flex items-center gap-1.5">
                      {selectedProductDetails.stock <= selectedProductDetails.safetyStock ? (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                          {selectedProductDetails.stock} u. (Bajo reserva de {selectedProductDetails.safetyStock})
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold">
                          {selectedProductDetails.stock} u. (Seguro)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-medium font-sans">Ubicación Física:</span>
                    <span className="font-mono font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded text-[11px]">
                      {selectedProductDetails.location}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-medium">Lote del Fabricante:</span>
                    <span className="font-mono font-bold text-slate-700 text-[11px]">
                      {selectedProductDetails.batch}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-medium">Categoría Sanitaria:</span>
                    <span className="font-bold text-slate-700 text-[11px]">
                      {selectedProductDetails.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-medium">Fecha de Caducidad:</span>
                    <span className="font-mono font-bold text-[11px]">
                      {new Date(selectedProductDetails.expiryDate).getTime() < new Date('2026-06-20').getTime() ? (
                        <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-extrabold">
                          🚫 VENCIDO ({selectedProductDetails.expiryDate})
                        </span>
                      ) : (
                        <span className="text-slate-700">
                          ⏱️ {selectedProductDetails.expiryDate}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Prices block */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-405 font-medium block">Costo Base</span>
                    <span className="text-xs font-mono font-black text-slate-700 block mt-0.5">
                      ${selectedProductDetails.cost.toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-405 font-medium block">Precio Venta</span>
                    <span className="text-xs font-mono font-black text-emerald-600 block mt-0.5">
                      ${selectedProductDetails.price.toFixed(2)} MXN
                    </span>
                  </div>
                </div>

                {/* Control Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedProductDetails.code);
                      alert(`Código de barras "${selectedProductDetails.code}" copiado al portapapeles.`);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-slate-200"
                  >
                    Copiar Código
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('excel');
                      setSelectedProductDetails(null);
                    }}
                    className="flex-1 bg-green-50 hover:bg-green-100 text-[#107c41] px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-green-100"
                  >
                    ✏️ Editar en Hoja 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('sales');
                      setSelectedProductDetails(null);
                    }}
                    className="flex-1 bg-[#10b981] hover:bg-[#0d9668] text-white px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    🛒 Generar Venta
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Product Modal overlay */}
      <CreateProductModal 
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onSave={handleAddNewProductSave}
        products={products}
      />

      {/* COMPACT STYLISH FOOTER DETAILS */}
      <footer id="app-footer-bar-bottom" className="bg-[#f3f2f1] border-t border-slate-200 py-4 px-6 md:px-8 text-center text-[11px] text-slate-400 select-none font-sans flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center justify-center md:justify-start gap-1">
          <FileSpreadsheet size={13} className="text-[#107c41]" />
          <strong>Farmacia Excel Pro</strong>
          <span className="text-slate-300">|</span>
          <span>Versión 11.4.0 (Compatible en Web, MS Excel & LibreOffice)</span>
        </div>
        <div className="flex items-center justify-center gap-1 text-slate-400">
          <span>Licencia de Auditoría Médica Automatizada</span>
          <Heart size={10} className="fill-red-500 stroke-none" />
          <span>justdiamondpharma23@gmail.com</span>
        </div>
      </footer>

    </div>
  );
}
