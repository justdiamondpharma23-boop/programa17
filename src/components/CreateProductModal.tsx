/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { PHARMACY_CATEGORIES, PHARMACY_LABORATORIES } from '../data/mockData';
import { 
  X, 
  Barcode, 
  Sparkles, 
  Tag, 
  Dna, 
  FolderPlus, 
  Layers, 
  DollarSign, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newProduct: Product) => void;
  products: Product[];
}

export default function CreateProductModal({ isOpen, onClose, onSave, products }: CreateProductModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [category, setCategory] = useState(PHARMACY_CATEGORIES[0] || 'Analgésicos');
  const [stock, setStock] = useState<number>(50);
  const [safetyStock, setSafetyStock] = useState<number>(10);
  const [price, setPrice] = useState<number>(15.00);
  const [cost, setCost] = useState<number>(8.00);
  const [laboratory, setLaboratory] = useState(PHARMACY_LABORATORIES[0] || 'Bayer S.A.');
  const [customLaboratory, setCustomLaboratory] = useState('');
  const [isCustomLab, setIsCustomLab] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [batch, setBatch] = useState('');
  const [location, setLocation] = useState('Estante A-1');
  const [itbis, setItbis] = useState(true);

  // Error messages state
  const [error, setError] = useState<string | null>(null);

  // Set default values when opening modal
  useEffect(() => {
    if (isOpen) {
      // Set future default expiry date (e.g. 2 years from today)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      setExpiryDate(futureDate.toISOString().split('T')[0]);

      // Autogenerate barcode and batch numbers
      autogenerateBarcode();
      autogenerateBatch();
      
      // Reset text fields
      setName('');
      setActiveIngredient('');
      setCategory(PHARMACY_CATEGORIES[0] || 'Analgésicos');
      setStock(50);
      setSafetyStock(10);
      setPrice(15.00);
      setCost(8.00);
      setLaboratory(PHARMACY_LABORATORIES[0] || 'Bayer S.A.');
      setCustomLaboratory('');
      setIsCustomLab(false);
      setLocation('Estante A-1');
      setItbis(true);
      setError(null);
    }
  }, [isOpen]);

  const autogenerateBarcode = () => {
    // Generate real-looking GS1-13 barcode
    const prefix = '750'; // Mexico prefix or standard
    const mid = Math.floor(100000000 + Math.random() * 900000000).toString();
    setCode(`${prefix}${mid}`);
  };

  const autogenerateBatch = () => {
    const letters = 'BGKLPRSTY';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setBatch(`${randomLetter}-${randomNum}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!code.trim()) {
      setError('El código de barras es mandatorio.');
      return;
    }
    if (!name.trim()) {
      setError('El nombre comercial del medicamento es mandatorio.');
      return;
    }
    if (!activeIngredient.trim()) {
      setError('El principio activo es mandatorio.');
      return;
    }
    if (stock < 0) {
      setError('El Stock inicial en hoja no puede ser menor que 0.');
      return;
    }
    if (safetyStock < 0) {
      setError('El Stock mínimo o nivel de alarma no puede ser menor que 0.');
      return;
    }
    if (price < 0) {
      setError('El precio de venta al público no puede ser negativo.');
      return;
    }
    if (cost < 0) {
      setError('El costo de compra no puede ser negativo.');
      return;
    }
    if (cost > price) {
      setError('Atención: El costo de compra es mayor que el precio de venta. Esto generará pérdidas.');
      return;
    }
    if (!expiryDate) {
      setError('La fecha de vencimiento es obligatoria.');
      return;
    }
    if (!batch.trim()) {
      setError('El código del lote (N° Control) es requerido.');
      return;
    }

    // Check for duplicate barcode
    const duplicate = products.find(p => p.code === code.trim());
    if (duplicate) {
      setError(`Código duplicado: Ya existe el producto "${duplicate.name}" con el código de barras ${code}.`);
      return;
    }

    // Prepare final laboratory
    const finalLab = isCustomLab ? customLaboratory.trim() : laboratory;
    if (!finalLab) {
      setError('Por favor, especifique el laboratorio fabricante.');
      return;
    }

    // Create unique product ID
    const nextIdNum = products.length + 1;
    const nextId = `P${String(nextIdNum).padStart(3, '0')}`;

    const newProduct: Product = {
      id: nextId,
      excelRow: nextIdNum,
      code: code.trim(),
      name: name.trim(),
      activeIngredient: activeIngredient.trim(),
      category: category,
      stock: Number(stock),
      safetyStock: Number(safetyStock),
      price: Number(price),
      cost: Number(cost),
      laboratory: finalLab,
      expiryDate: expiryDate,
      batch: batch.trim().toUpperCase(),
      location: location.trim() || 'Estante General',
      itbis: itbis
    };

    onSave(newProduct);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-205 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col font-sans text-slate-800"
      >
        {/* HEADER BAR */}
        <div className="bg-[#107c41] text-white px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <FileSpreadsheet size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Crear Fila de Medicamento Nuevo</h2>
              <p className="text-[11px] text-emerald-100 font-light">Inserte un nuevo registro en la Hoja 1 de Excel</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-emerald-100 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* ERROR DISPLAYER */}
        {error && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-3.5 flex items-center gap-2.5 text-xs text-red-700 font-bold">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* SECTION 1: CODE & NAMES */}
          <div className="space-y-3.5">
            <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
              Información Básica del Registro
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Barcode with autogenerate helper */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Código de Barras *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Barcode size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ej: 7501002722144"
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-9 pr-24 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    onClick={autogenerateBarcode}
                    className="absolute right-2 px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 font-semibold cursor-pointer select-none"
                    title="Generar código de barras aleatorio"
                  >
                    ✨ Autogenerar
                  </button>
                </div>
              </div>

              {/* Commercial Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Nombre Comercial / Medicamento *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Tag size={15} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej: Paracetamol 500mg, Advil..."
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active ingredient */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Principio Activo *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Dna size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={activeIngredient}
                    onChange={(e) => setActiveIngredient(e.target.value)}
                    placeholder="ej: Acetaminofén, Ibuprofeno..."
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Categoría Farmacia *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <FolderPlus size={14} />
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-305 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] cursor-pointer"
                  >
                    {PHARMACY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: STOCK & PRICES */}
          <div className="space-y-3.5">
            <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
              Stock, Finanzas & Costos
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Initial Stock */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-60 block">
                  Stock Inicial
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-55 border border-slate-305 rounded-xl px-3 py-2 text-xs font-semibold text-center"
                />
              </div>

              {/* Safety Stock */}
              <div className="space-y-1">
                <label className="text-[11.5px] font-bold text-slate-60 block" title="Umbral para alerta de bajo stock">
                  Stock Mínimo (Alarma)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={safetyStock}
                  onChange={(e) => setSafetyStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-55 border border-slate-305 rounded-xl px-3 py-2 text-xs font-semibold text-center"
                />
              </div>

              {/* Public Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-60 block">
                  Precio de Venta ($)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-6 pr-3 py-2 text-xs font-mono font-bold text-center text-emerald-700"
                  />
                </div>
              </div>

              {/* Costo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-6 block">
                  Costo de Compra ($)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={cost}
                    onChange={(e) => setCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-6 pr-3 py-2 text-xs font-mono text-center text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: EXPIRY, CONTROL & LOCATION */}
          <div className="space-y-3.5">
            <h3 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1">
              Seguridad Sanitaria, Lotes & Laboratorio
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manufacturers / Laboratories list */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Laboratorio Fabricante
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomLab(!isCustomLab)}
                    className="text-[9px] text-[#10b981] hover:underline font-bold cursor-pointer"
                  >
                    {isCustomLab ? '🔬 Seleccionar Oficial' : '✍️ Escribir Manual'}
                  </button>
                </div>
                {isCustomLab ? (
                  <input
                    type="text"
                    required
                    value={customLaboratory}
                    onChange={(e) => setCustomLaboratory(e.target.value)}
                    placeholder="Escriba el nombre del Laboratorio..."
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                ) : (
                  <select
                    value={laboratory}
                    onChange={(e) => setLaboratory(e.target.value)}
                    className="w-full bg-white border border-slate-305 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] cursor-pointer"
                  >
                    {PHARMACY_LABORATORIES.map(lab => (
                      <option key={lab} value={lab}>{lab}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Expiry date (Date) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Fecha Vencimiento (Control de Caducidad) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <Calendar size={14} />
                  </span>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Batch / Number Control */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Lote o N° de Control Saniario *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Layers size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={batch}
                    onChange={(e) => setBatch(e.target.value.toUpperCase())}
                    placeholder="ej: L-9872"
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-9 pr-24 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    onClick={autogenerateBatch}
                    className="absolute right-2 px-2 py-0.5 text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 font-semibold cursor-pointer select-none"
                  >
                    🎲 Sortear
                  </button>
                </div>
              </div>

              {/* Shelf location */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Ubicación física (Estante/Pasillo)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                    <MapPin size={14} />
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ej: Pasillo 2-B, Vitrina Central..."
                    className="w-full bg-slate-55 border border-slate-305 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#10b981] focus:border-[#10b981]"
                  />
                </div>
              </div>
            </div>

            {/* ITBIS Tax check */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between mt-2">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-bold text-slate-700 block">¿Este medicamento lleva ITBIS (18%)?</span>
                <span className="text-[10px] text-slate-500 leading-normal block">
                  Los medicamentos esenciales suelen estar exentos de impuestos de venta, pero otros productos corporales o accesorios sí aplican.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={itbis}
                  onChange={(e) => setItbis(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
                <span className="ml-2.5 text-xs font-bold font-mono min-w-[30px] text-center">
                  {itbis ? 'SÍ' : 'NO'}
                </span>
              </label>
            </div>
          </div>

        </form>

        {/* BOTTOM SUBMISSION ACTIONS */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer select-none"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-[#107c41] hover:bg-[#0b6434] text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer flex items-center gap-1.5 select-none"
          >
            <CheckCircle size={15} />
            Insertar en Excel
          </button>
        </div>

      </motion.div>
    </div>
  );
}
