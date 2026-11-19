/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { PHARMACY_CATEGORIES, PHARMACY_LABORATORIES } from '../data/mockData';
import { 
  Grid, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  AlertTriangle, 
  HelpCircle, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Layers, 
  BookmarkCheck,
  RotateCcw,
  CheckCircle,
  FileText
} from 'lucide-react';

interface ExcelGridProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onExport: () => void;
  onImportTrigger: () => void;
  onAddProductClick?: () => void;
}

const COLUMNS = [
  { label: 'A', field: 'code', title: 'Código Barras' },
  { label: 'B', field: 'name', title: 'Medicamento comerciales' },
  { label: 'C', field: 'activeIngredient', title: 'Principio Activo' },
  { label: 'D', field: 'category', title: 'Categoría' },
  { label: 'E', field: 'stock', title: 'Stock Actual' },
  { label: 'F', field: 'safetyStock', title: 'Stock Mínimo' },
  { label: 'G', field: 'price', title: 'Precio Venta ($)' },
  { label: 'H', field: 'cost', title: 'Costo Compra ($)' },
  { label: 'I', field: 'batch', title: 'Lote' },
  { label: 'J', field: 'expiryDate', title: 'Fecha Vencimiento' },
  { label: 'K', field: 'laboratory', title: 'Laboratorio' },
  { label: 'L', field: 'itbis', title: 'Lleva ITBIS? (Sí/No)' },
];

export default function ExcelGrid({ products, setProducts, onExport, onImportTrigger, onAddProductClick }: ExcelGridProps) {
  const [selectedCell, setSelectedCell] = useState<{ productId: string; colField: keyof Product } | null>({
    productId: products[0]?.id || '',
    colField: 'name',
  });
  const [editingCell, setEditingCell] = useState<{ productId: string; colField: keyof Product } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [stockAlertFilter, setStockAlertFilter] = useState('Todos'); // 'Todos', 'Bajo Stock', 'Vencidos', 'Expira Pronto'
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Quick formulas computed on current visible products
  const [activeTab, setActiveTab] = useState<'Inicio' | 'Herramientas' | 'Fórmulas' | 'Diseño'>('Inicio');

  // Input ref for focus in-cell edit
  const cellInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  const getColLetter = (field: keyof Product): string => {
    const found = COLUMNS.find(c => c.field === field);
    return found ? found.label : 'A';
  };

  const getRowNumber = (prodIndex: number): number => {
    return prodIndex + 1;
  };

  const currentCellAddress = () => {
    if (!selectedCell) return 'Escriba o Seleccione una Celda';
    const cellIdx = filteredProducts.findIndex(p => p.id === selectedCell.productId);
    if (cellIdx === -1) return `${getColLetter(selectedCell.colField)}?`;
    return `${getColLetter(selectedCell.colField)}${getRowNumber(cellIdx + 1)}`;
  };

  // Filter application
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.includes(searchQuery) ||
      product.laboratory.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'Todas' || product.category === categoryFilter;

    // Dates for checks
    const today = new Date('2026-06-20');
    const expiry = new Date(product.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let matchesAlert = true;
    if (stockAlertFilter === 'Bajo Stock') {
      matchesAlert = product.stock <= product.safetyStock;
    } else if (stockAlertFilter === 'Vencidos') {
      matchesAlert = diffDays <= 0;
    } else if (stockAlertFilter === 'Expira Pronto') {
      matchesAlert = diffDays > 0 && diffDays <= 30;
    }

    return matchesSearch && matchesCategory && matchesAlert;
  });

  // Track the value of the currently selected cell
  useEffect(() => {
    if (selectedCell) {
      const prod = products.find(p => p.id === selectedCell.productId);
      if (prod) {
        setEditValue(String(prod[selectedCell.colField]));
      }
    }
  }, [selectedCell, products]);

  // Handle cell single click
  const handleCellClick = (productId: string, colField: keyof Product) => {
    setSelectedCell({ productId, colField });
    setValidationError(null);
  };

  // Handle cell double click: Enter editing mode
  const handleCellDoubleClick = (productId: string, colField: keyof Product) => {
    setSelectedCell({ productId, colField });
    setEditingCell({ productId, colField });
    const prod = products.find(p => p.id === productId);
    setEditValue(prod ? String(prod[colField]) : '');
    setValidationError(null);
    setTimeout(() => {
      cellInputRef.current?.focus();
      cellInputRef.current?.select();
    }, 50);
  };

  const validateAndSaveValue = (productId: string, colField: keyof Product, value: string) => {
    let finalValue: any = value;
    
    // Safety conversions and validations
    if (colField === 'stock' || colField === 'safetyStock') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed < 0) {
        setValidationError(`Fórmula Errónea: "${value}" no es un entero válido para ${String(colField)}.`);
        return false;
      }
      finalValue = parsed;
    } else if (colField === 'price' || colField === 'cost') {
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0) {
        setValidationError(`Fórmula Errónea: "${value}" no es un valor numérico para ${String(colField)}.`);
        return false;
      }
      finalValue = Math.round(parsed * 100) / 100;
    } else if (colField === 'itbis') {
      finalValue = value === 'true' || value === 'sí' || value === 'si' || value === 'Sí' || value === 'Yes' || value.toLowerCase().includes('sí') || value.toLowerCase().includes('si');
    }

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          [colField]: finalValue
        };
      }
      return p;
    }));
    
    setEditingCell(null);
    setValidationError(null);
    return true;
  };

  // Save on Blur or Enter key
  const handleInputKeyDown = (e: React.KeyboardEvent, productId: string, colField: keyof Product) => {
    if (e.key === 'Enter') {
      validateAndSaveValue(productId, colField, editValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      // Reset edit value
      const original = products.find(p => p.id === productId);
      if (original) setEditValue(String(original[colField]));
    }
  };

  // Save edit value changes from Formula bar
  const handleFormulaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCell) {
      validateAndSaveValue(selectedCell.productId, selectedCell.colField, editValue);
    }
  };

  // Ribbon functions
  const addMedicineRow = () => {
    const nextId = `P${String(products.length + 1).padStart(3, '0')}`;
    const newProduct: Product = {
      id: nextId,
      excelRow: products.length + 1,
      code: `750000000${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Nuevo Medicamento',
      activeIngredient: 'Principio Activo x',
      category: PHARMACY_CATEGORIES[0] || 'Analgésicos',
      stock: 50,
      safetyStock: 10,
      price: 10.00,
      cost: 5.00,
      laboratory: PHARMACY_LABORATORIES[0] || 'Genfar',
      expiryDate: '2028-12-31',
      batch: `L-${Math.floor(1000 + Math.random() * 9000)}`,
      location: 'Estante A-1',
      itbis: true
    };

    setProducts(prev => [...prev, newProduct]);
    // Set selected newly added row
    setSelectedCell({ productId: nextId, colField: 'name' });
  };

  const deleteSelectedMedicine = () => {
    if (!selectedCell) return;
    const confirmDelete = window.confirm('¿Está seguro de eliminar esta fila completa (Medicamento) de la hoja de cálculo?');
    if (!confirmDelete) return;

    const remainingProducts = products.filter(p => p.id !== selectedCell.productId);
    // Re-index excelRow numbers
    const updatedProducts = remainingProducts.map((p, idx) => ({
      ...p,
      excelRow: idx + 1
    }));
    
    setProducts(updatedProducts);
    setSelectedCell(updatedProducts.length > 0 ? { productId: updatedProducts[0].id, colField: 'name' } : null);
  };

  const handleAutoSuma = () => {
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    alert(`[EXCEL AUTOMÁTICO] FÓRMULA RUNNING:\n\n=SUMAPRODUCTO(E2:E${products.length + 1}, G2:G${products.length + 1})\n\nResultado: $${totalInventoryValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN\nValor total calculado en base a todos los productos activos.`);
  };

  // Status Bar Metrics calculations
  const totalStockSum = products.reduce((sum, p) => sum + p.stock, 0);
  const averagePriceVal = products.length > 0 ? (products.reduce((sum, p) => sum + p.price, 0) / products.length) : 0;
  const inventoryvaluationVal = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  
  // Alerts count
  const today = new Date('2026-06-20');
  const alertCount = products.filter(p => {
    const expiry = new Date(p.expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return p.stock <= p.safetyStock || diffDays <= 30;
  }).length;

  return (
    <div id="wrapper-excel-view" className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-sans">
      
      {/* EXCEL RIBBON BAR */}
      <div id="excel-ribbon" className="bg-[#f3f2f1] border-b border-slate-200 p-2 text-slate-700">
        <div className="flex items-center gap-1 text-xs font-semibold mb-2">
          <div className="flex bg-[#10b981] text-slate-950 py-1 px-3 text-center align-middle rounded font-sans font-black flex-row items-center gap-1.5 mr-2">
            <FileSpreadsheet id="ribbon-excel-logo-icon" size={14} />
            Excel Farmacia
          </div>
          <button 
            id="tab-inicio-btn"
            onClick={() => setActiveTab('Inicio')}
            className={`py-1 px-3 rounded hover:bg-slate-200 cursor-pointer ${activeTab === 'Inicio' ? 'bg-white text-[#059669] shadow-xs' : 'text-slate-600'}`}
          >
            Inicio
          </button>
          <button 
            id="tab-formulas-btn"
            onClick={() => setActiveTab('Fórmulas')}
            className={`py-1 px-3 rounded hover:bg-slate-200 cursor-pointer ${activeTab === 'Fórmulas' ? 'bg-white text-[#059669] shadow-xs' : 'text-slate-600'}`}
          >
            Fórmulas & Funciones
          </button>
          <button 
            id="tab-herramientas-btn"
            onClick={() => setActiveTab('Herramientas')}
            className={`py-1 px-3 rounded hover:bg-slate-200 cursor-pointer ${activeTab === 'Herramientas' ? 'bg-white text-[#059669] shadow-xs' : 'text-slate-600'}`}
          >
            Herramientas Datos
          </button>
          <button 
            id="tab-diseno-btn"
            onClick={() => setActiveTab('Diseño')}
            className={`py-1 px-3 rounded hover:bg-slate-200 cursor-pointer ${activeTab === 'Diseño' ? 'bg-white text-[#059669] shadow-xs' : 'text-slate-600'}`}
          >
            Diseño Vista
          </button>
        </div>

        {/* RIBBON TOOLBAR BUTTONS */}
        <div id="ribbon-actions" className="flex flex-wrap items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-2xs">
          
          {activeTab === 'Inicio' && (
            <>
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2">
                <button 
                  id="ribbon-add-modal"
                  onClick={onAddProductClick}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-emerald-50 hover:text-emerald-700 rounded-md cursor-pointer transition text-[11px] font-bold text-slate-800"
                  title="Abrir formulario guiado de creación con validaciones de datos"
                >
                  <Plus size={16} className="text-[#10b981] mb-1" />
                  Crear Producto
                </button>
                <button 
                  id="ribbon-add-row"
                  onClick={addMedicineRow}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-100 rounded-md cursor-pointer transition text-[11px] font-medium text-slate-500"
                  title="Insertar fila rápida directamente en la hoja"
                >
                  <Plus size={14} className="text-slate-400 mb-1" />
                  Fila Vacía
                </button>
                <button 
                  id="ribbon-del-row"
                  onClick={deleteSelectedMedicine}
                  disabled={!selectedCell}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-red-50 hover:text-red-700 rounded-md cursor-pointer transition text-[11px] font-medium disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Trash2 size={16} className="text-red-600 mb-1" />
                  Eliminar Fila
                </button>
              </div>

              <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <button 
                  id="ribbon-export-sys"
                  onClick={onExport}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-emerald-50 hover:text-emerald-700 rounded-md cursor-pointer transition text-[11px] font-medium"
                >
                  <Download size={16} className="text-[#10b981] mb-1" />
                  Descargar Excel
                </button>
                <button 
                  id="ribbon-import-sys"
                  onClick={onImportTrigger}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-indigo-50 hover:text-indigo-700 rounded-md cursor-pointer transition text-[11px] font-medium"
                >
                  <Upload size={16} className="text-indigo-600 mb-1" />
                  Importar CSV
                </button>
              </div>

              {/* Conditional Format Demo */}
              <div className="flex flex-col text-[10px] justify-center px-1">
                <span className="font-bold text-slate-500 uppercase tracking-widest text-[8px] mb-1">Formato Condicional</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Stock Crítico
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Expira Pronto/Vencido
                  </span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'Fórmulas' && (
            <>
              <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
                <button 
                  id="formula-autosuma"
                  onClick={handleAutoSuma}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-emerald-50 hover:text-emerald-700 rounded-md cursor-pointer transition text-[11px] font-medium"
                >
                  <span className="text-[#10b981] font-extrabold text-lg leading-none mb-1">∑</span>
                  AutoSuma Valor
                </button>
                <button 
                  id="formula-recuento"
                  onClick={() => alert(`=RECUENTO(B2:B${products.length + 1})\n\nTotal de medicamentos registrados: ${products.length} filas.`)}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-100 rounded-md cursor-pointer transition text-[11px] font-medium"
                >
                  <Layers size={16} className="text-blue-600 mb-1" />
                  Fórmula Contar
                </button>
                <button 
                  id="formula-promedio"
                  onClick={() => alert(`=PROMEDIO(G2:G${products.length + 1})\n\nPrecio promedio actual del catálogo: $${averagePriceVal.toFixed(2)} MXN.`)}
                  className="flex flex-col items-center justify-center p-1.5 hover:bg-slate-100 rounded-md cursor-pointer transition text-[11px] font-medium"
                >
                  <span className="text-amber-600 font-bold text-sm leading-none mb-1.5">x̄</span>
                  Promedio Precios
                </button>
              </div>
              <div className="text-[11px] text-slate-500 max-w-sm pl-2 leading-relaxed">
                <span className="font-semibold block text-[#059669]">Ayuda de Fórmulas Excel:</span>
                Puede editar el stock, precio, costo o fechas de vencimiento. Los reportes y subtotales se actualizan al instante de forma automática.
              </div>
            </>
          )}

          {activeTab === 'Herramientas' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase">Limpiar filtros:</span>
              <button 
                id="tool-reset"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('Todas');
                  setStockAlertFilter('Todos');
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs cursor-pointer transition"
              >
                <RotateCcw size={14} className="text-slate-500" />
                Restablecer Todo
              </button>
              <button 
                id="tool-stock-alerts-crit"
                onClick={() => setStockAlertFilter('Bajo Stock')}
                className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-800 px-2.5 py-1 rounded-md text-xs cursor-pointer transition"
              >
                <TrendingDown size={14} />
                Mostrar Solo Bajo Stock
              </button>
              <button 
                id="tool-expalerts"
                onClick={() => setStockAlertFilter('Vencidos')}
                className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded-md text-xs cursor-pointer transition"
              >
                <AlertTriangle size={14} />
                Mostrar Solo Vencidos
              </button>
            </div>
          )}

          {activeTab === 'Diseño' && (
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="font-semibold">Opciones de visualización:</span>
              <label id="gridlines-lbl" className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#10b981]" />
                Líneas de división de cuadrícula
              </label>
              <label id="headers-lbl" className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#10b981]" />
                Títulos de columnas (A, B, C...)
              </label>
              <label id="bar-lbl" className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#10b981]" />
                Barra de fórmulas fx activa
              </label>
            </div>
          )}

        </div>
      </div>

      {/* FORMULA BAR & FILTER COMPONENT */}
      <div id="recipe-search-toolbar" className="bg-slate-50 border-b border-slate-200 p-2 text-slate-700 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        
        {/* FILTERS AREA */}
        <div className="flex flex-wrap items-center gap-2 grow">
          {/* SEARCH BAR */}
          <div className="relative min-w-[200px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400">
              <Search size={14} />
            </span>
            <input 
              id="excel-search-input"
              type="text" 
              placeholder="Buscar por nombre, principio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-md text-xs w-full focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
            />
          </div>

          {/* CATEGORY SELECTOR */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-slate-400" />
            <select
              id="category-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-md text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] cursor-pointer"
            >
              <option value="Todas">Todas las Categorías</option>
              {PHARMACY_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* QUICK ALERTS SELECTOR */}
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-slate-400" />
            <select
              id="stock-alerts-select"
              value={stockAlertFilter}
              onChange={(e) => setStockAlertFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-md text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] cursor-pointer"
            >
              <option value="Todos">Alarma: Sin Filtro</option>
              <option value="Bajo Stock">📉 Bajo Stock Mínimo</option>
              <option value="Vencidos">⚠️ Lotes Vencidos</option>
              <option value="Expira Pronto">⏳ Expira en 30 días</option>
            </select>
          </div>
        </div>

        {/* REVERT / SEED DEMO ACTIONS */}
        <div className="flex items-center justify-end">
          {filteredProducts.length !== products.length && (
            <span className="text-[11px] text-slate-500 mr-2 bg-slate-100 py-1 px-2 rounded font-medium">
              Viendo {filteredProducts.length} de {products.length} filas
            </span>
          )}
        </div>
      </div>

      {/* FORMULA BAR (Bidirectional excel connection) */}
      <form id="excel-formula-bar-form" onSubmit={handleFormulaSubmit} className="flex items-center bg-white border-b border-slate-200 px-3 py-1.5 gap-2 text-slate-700">
        <div id="active-cell-address" className="text-xs font-mono font-bold bg-slate-50 rounded border border-slate-300 px-2 py-1 text-center min-w-[55px] text-slate-600 bg-linear-to-b">
          {currentCellAddress()}
        </div>
        <div className="text-slate-400 font-serif italic text-sm font-bold select-none px-1">
          fx
        </div>
        <div className="flex-1 flex items-center relative">
          <input 
            id="formula-bar-input"
            ref={formulaInputRef}
            type="text" 
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={!selectedCell}
            placeholder={selectedCell ? "Escriba un valor o modifique la celda seleccionada..." : "Haga un clic en cualquier celda para activar la barra de fórmulas"}
            className="w-full text-xs font-mono bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded px-2.5 py-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
          />
          {selectedCell && (
            <button 
              id="formula-save-btn"
              type="submit" 
              title="Confirmar cambios (Enter)"
              className="absolute right-2 text-xs text-emerald-600 hover:text-emerald-800 font-bold px-1 py-0.5 cursor-pointer"
            >
              ✓
            </button>
          )}
        </div>
      </form>

      {validationError && (
        <div id="formula-error-msg" className="bg-red-550 text-white text-xs px-4 py-2 font-mono flex items-center gap-2">
          <AlertTriangle size={14} />
          {validationError}
        </div>
      )}

      {/* ACTIVE SHEET LAYOUT */}
      <div id="excel-main-grid-area" className="overflow-x-auto overflow-y-auto max-h-[500px]">
        <table id="excel-database-table" className="w-full border-collapse border-spacing-0 table-fixed select-none text-[12px] font-mono leading-none">
          <thead>
            {/* COLUMN LETTER ROW */}
            <tr className="bg-slate-100 text-slate-600 text-center select-none shadow-2xs">
              <th className="w-[45px] font-sans font-bold border border-slate-200 py-1 cursor-default text-[10px] text-slate-400 sticky left-0 bg-slate-100 z-10"></th>
              {COLUMNS.map(col => (
                <th 
                  key={col.label} 
                  className={`w-[125px] ${col.field === 'name' ? 'w-[185px]' : ''} ${col.field === 'activeIngredient' ? 'w-[160px]' : ''} font-sans font-bold border border-slate-200 py-1 cursor-default text-[11px] select-none text-slate-600 sticky top-0 bg-slate-100`}
                  title={col.title}
                >
                  <div className="text-[11px] font-black">{col.label}</div>
                  <div className="text-[9px] font-light text-slate-400 select-all font-sans">{col.title}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr id="empty-filtered-products-row">
                <td colSpan={COLUMNS.length + 1} className="py-12 bg-slate-50 text-center font-sans text-slate-400">
                  <FileSpreadsheet className="mx-auto mb-2 opacity-30 text-[#10b981]" size={36} />
                  <p className="font-semibold text-slate-500">Ningún medicamento coincide con los filtros aplicados</p>
                  <p className="text-xs text-slate-400 mt-1">Intente limpiar el cuadro de búsqueda o cambiar las alertas de filtrado</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, pIdx) => {
                const todayDate = new Date('2026-06-20');
                const expDateObj = new Date(p.expiryDate);
                const daysDiff = Math.ceil((expDateObj.getTime() - todayDate.getTime()) / (1000 * 3600 * 24));
                const isCriticalStock = p.stock <= p.safetyStock;
                const isExpired = daysDiff <= 0;
                const isExpiringSoon = daysDiff > 0 && daysDiff <= 30;

                return (
                  <tr key={p.id} className="hover:bg-slate-200 group h-[30px]">
                    {/* ROW NUMBER PANEL */}
                    <td id={`excel-row-num-${getRowNumber(pIdx + 1)}`} className="bg-slate-50 border border-slate-200 text-center text-[10px] font-sans font-semibold text-slate-400 cursor-pointer sticky left-0 z-5 select-none hover:bg-slate-200">
                      {getRowNumber(pIdx + 1)}
                    </td>

                    {/* FIELDS COLUMNS CELLS */}
                    {COLUMNS.map(col => {
                      const field = col.field as keyof Product;
                      const isSelected = selectedCell?.productId === p.id && selectedCell?.colField === field;
                      const isEditing = editingCell?.productId === p.id && editingCell?.colField === field;
                      
                      // Format cell rendering based on value
                      let cellContent: React.ReactNode = String(p[field]);
                      let extraStyle = '';

                      if (field === 'price' || field === 'cost') {
                        cellContent = `$${Number(p[field]).toFixed(2)}`;
                      }

                      if (field === 'itbis') {
                        cellContent = p.itbis ? '🟢 Sí (18%)' : '⚪ No (Exento)';
                        extraStyle = p.itbis ? 'text-emerald-700 font-bold bg-emerald-50/20' : 'text-slate-400 font-medium bg-slate-50/10';
                      }

                      // Apply Excel-like Conditional formatting styles
                      if (field === 'stock') {
                        if (p.stock === 0) {
                          extraStyle = 'bg-red-100 text-red-800 font-bold';
                        } else if (isCriticalStock) {
                          extraStyle = 'bg-red-50 text-red-600 font-semibold';
                        }
                      } else if (field === 'expiryDate') {
                        if (isExpired) {
                          extraStyle = 'bg-red-100 text-red-800 line-through font-bold animate-pulse';
                          cellContent = `${p.expiryDate} (VENCIDO)`;
                        } else if (isExpiringSoon) {
                          extraStyle = 'bg-yellow-50 text-amber-700 font-semibold';
                          cellContent = `${p.expiryDate} (!)`;
                        }
                      }

                      return (
                        <td 
                          id={`cell-${p.id}-${field}`}
                          key={field}
                          onClick={() => handleCellClick(p.id, field)}
                          onDoubleClick={() => handleCellDoubleClick(p.id, field)}
                          className={`border border-slate-200 px-2 py-1 select-none text-[11px] truncate align-middle cursor-cell h-full transition-all relative ${
                            isSelected ? 'ring-2 ring-emerald-500 ring-offset-xs z-2' : ''
                          } ${extraStyle}`}
                          title={`Doble clic para editar Celda de ${col.title}`}
                        >
                          {isEditing ? (
                            field === 'itbis' ? (
                              <select
                                id={`cell-inline-select-${p.id}-${field}`}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => validateAndSaveValue(p.id, field, editValue)}
                                className="absolute inset-0 w-full h-full bg-white text-slate-800 border bg-emerald-50 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                              >
                                <option value="true">Sí (18%)</option>
                                <option value="false">No (Exento)</option>
                              </select>
                            ) : (
                              <input 
                                id={`cell-inline-input-${p.id}-${field}`}
                                ref={cellInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => validateAndSaveValue(p.id, field, editValue)}
                                onKeyDown={(e) => handleInputKeyDown(e, p.id, field)}
                                className="absolute inset-0 w-full h-full bg-white text-slate-800 border-none px-2 py-0 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            )
                          ) : (
                            <span className="align-middle select-none">{cellContent}</span>
                          )}
                          
                          {/* Alert Corner indicator mimicking MS Excel comments */}
                          {field === 'stock' && isCriticalStock && !isEditing && (
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[5px] border-t-red-600 border-l-[5px] border-l-transparent"></div>
                          )}
                          {field === 'expiryDate' && (isExpired || isExpiringSoon) && !isEditing && (
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[5px] border-t-amber-500 border-l-[5px] border-l-transparent"></div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* EXCEL SHEET BOTTOM NAVIGATION & FORMULAS SUMMARY BAR */}
      <div id="excel-bottom-panel" className="bg-[#f3f2f1] border-t border-slate-200 p-2 flex flex-col md:flex-row gap-3 items-stretch md:items-center text-xs text-slate-600 select-none font-sans justify-between">
        
        {/* SHEETS TABS */}
        <div className="flex items-center gap-1.5 bg-slate-200 rounded p-1 self-start">
          <button 
            id="sheet-medicamentos-tab"
            className="flex items-center gap-1.5 bg-white text-[#059669] px-3.5 py-1 rounded shadow-2xs font-bold cursor-pointer border border-slate-200"
            title="Sábana principal de Medicamentos"
          >
            <BookmarkCheck size={13} className="text-[#059669]" />
            📑 Medicamentos
          </button>
          
          <span className="text-slate-400 px-1 font-extralight">|</span>

          <span 
            className="text-slate-500 text-[11px] font-light italic px-2"
            title="Las ventas registradas calculan el stock automáticamente."
          >
            Sincronización Excel v1.4 activa (local)
          </span>
        </div>

        {/* METABAR CALCULATIONS OF SELECTED COLUMN (Like status bar in excel for Sum, Avg, count) */}
        <div id="excel-statusbar-metrics" className="flex flex-wrap items-center gap-4 bg-slate-100 rounded-lg py-1 px-3 border border-slate-200 justify-end font-mono text-[11.5px] text-slate-500">
          <div className="flex items-center gap-1" title="Suma total de Stock en farmacia">
            <span className="font-semibold text-slate-400">∑ TOTAL STOCK:</span>
            <span className="text-emerald-700 font-bold">{totalStockSum.toLocaleString()} u.</span>
          </div>

          <div className="flex items-center gap-1" title="Precio promedio de venta de medicamentos">
            <span className="font-semibold text-slate-400">PROMEDIO PRECIO:</span>
            <span className="text-emerald-700 font-bold">${averagePriceVal.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1" title="Valor total de venta del inventario disponible">
            <span className="font-semibold text-slate-400">VALUACIÓN HOJA:</span>
            <span className="text-[#059669] font-extrabold">${inventoryvaluationVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center gap-1" title="Recuentos de filas registradas">
            <span className="font-semibold text-slate-400">FILAS:</span>
            <span className="text-indigo-700 font-bold">{products.length}</span>
          </div>

          {alertCount > 0 && (
            <div className="flex items-center gap-1 animate-pulse" title="Alertas de stock o vencimientos que necesitan atención">
              <span className="flex items-center gap-1 bg-red-100 text-red-700 font-bold text-[10px] py-0.5 px-1.5 rounded border border-red-200">
                ⚠️ ALARMAS: {alertCount}
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
