/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  ArrowRight,
  Info,
  HelpCircle
} from 'lucide-react';

interface ExcelImportExportProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function ExcelImportExport({ products, setProducts }: ExcelImportExportProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [importedRowsCount, setImportedRowsCount] = useState<number | null>(null);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'Añadir' | 'Reemplazar'>('Añadir');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV helper
  const handleCSVContent = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error('El archivo cargado se encuentra vacío o no contiene el formato de renglones válido.');
      }

      // Check header row (A: Código, B: Nombre, C: Principio Activo, D: Categoría, E: Stock, F: Stock Mínimo, G: Precio, H: Costo, I: Lote, J: Vencimiento, K: Laboratorio)
      const headers = lines[0].split(/[;,\t]/);
      const rows = lines.slice(1).filter(line => line.trim() !== '');
      
      const logs: string[] = [];
      const newProductsList: Product[] = [];
      let startingIndex = products.length + 1;

      if (importMode === 'Reemplazar') {
        startingIndex = 1;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Split handling quotes
        const rCols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Matches comma separation ignoring inside quotes
        if (rCols.length < 5) {
          logs.push(`Fila ${i + 2} saltada: Formato incompleto, requiere mínimo 5 columnas (Nombre, Principio Activo, Stock, Precio, etc.).`);
          continue;
        }

        // Clean columns
        const cleanVal = (colVal: string | undefined) => {
          if (!colVal) return '';
          return colVal.replace(/^"|"$/g, '').trim();
        };

        const codeVal = cleanVal(rCols[0]) || `750000000${Math.floor(1000 + Math.random() * 9000)}`;
        const nameVal = cleanVal(rCols[1]) || 'Medicamento Desconocido';
        const activeAct = cleanVal(rCols[2]) || 'No Especificado';
        const categoryVal = cleanVal(rCols[3]) || 'Analgésicos';
        const stockVal = parseInt(cleanVal(rCols[4]), 10) || 0;
        const safetyVal = parseInt(cleanVal(rCols[5]), 10) || 10;
        const priceVal = parseFloat(cleanVal(rCols[6])) || 1.00;
        const costVal = parseFloat(cleanVal(rCols[7])) || 0.50;
        const batchVal = cleanVal(rCols[8]) || `L-${Math.floor(1000 + Math.random() * 9000)}`;
        const expiryVal = cleanVal(rCols[9]) || '2028-12-31';
        const labVal = cleanVal(rCols[10]) || 'Genérico';
        const itbisRaw = cleanVal(rCols[11]) || 'No';
        const itbisVal = itbisRaw.toLowerCase() === 'sí' || itbisRaw.toLowerCase() === 'si' || itbisRaw.toLowerCase() === 'true' || itbisRaw.toLowerCase() === 'yes';

        const rowId = `P_IMP_${Date.now()}_${i}`;

        newProductsList.push({
          id: rowId,
          excelRow: startingIndex + i,
          code: codeVal,
          name: nameVal,
          activeIngredient: activeAct,
          category: categoryVal,
          stock: Math.max(0, stockVal),
          safetyStock: Math.max(0, safetyVal),
          price: Math.max(0, priceVal),
          cost: Math.max(0, costVal),
          laboratory: labVal,
          expiryDate: expiryVal,
          batch: batchVal,
          location: 'Importado (Pasillo E)',
          itbis: itbisVal
        });
      }

      if (newProductsList.length === 0) {
        alert('No se pudieron extraer medicamentos del archivo CSV. Revise la estructura sugerida.');
        return;
      }

      if (importMode === 'Reemplazar') {
        setProducts(newProductsList);
        logs.push(`CORRECTO: El inventario activo se sobrescribió completamente con ${newProductsList.length} productos.`);
      } else {
        // Appends to products
        setProducts(prev => {
          const updated = [...prev];
          let maxCurrentRow = prev.length > 0 ? Math.max(...prev.map(p => p.excelRow)) : 0;
          const mapListWithNewRowNumbers = newProductsList.map((p, idx) => ({
            ...p,
            excelRow: maxCurrentRow + idx + 1
          }));
          return [...updated, ...mapListWithNewRowNumbers];
        });
        logs.push(`CORRECTO: Se integraron y enlazaron ${newProductsList.length} medicamentos nuevos al excel existente.`);
      }

      setImportedRowsCount(newProductsList.length);
      setImportLogs(logs);

    } catch (e) {
      alert(`Error decodificando CSV: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      readCSVFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readCSVFile(file);
    }
  };

  const readCSVFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Solo se admiten documentos en formato CSV (.csv) de hoja de cálculo estándar.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        handleCSVContent(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Download Sample Table format guide
  const downloadSampleTemplate = () => {
    const headers = 'Codigo,Medicamento,Principio Activo,Categoria,Stock,Stock Minimo,Precio Venta,Costo Compra,Lote,Fecha Vencimiento,Laboratorio\r\n';
    const sampleLine = '"7501004112349","Ibuprofeno Compuesto 400mg","Ibuprofeno","Antiinflamatorios",100,20,5.50,1.80,"LOT-X889","2027-12-31","Roche"\r\n';
    
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + sampleLine);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'Plantilla_Farmacia_Excel_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full catalog helper
  const exportFullCatalogToCSV = () => {
    const headers = 'Codigo,Medicamento,Principio Activo,Categoria,Stock,Stock Minimo,Precio Venta,Costo Compra,Lote,Fecha Vencimiento,Laboratorio,Lleva ITBIS\r\n';
    
    const lines = products.map(p => {
      return `"${p.code}","${p.name}","${p.activeIngredient}","${p.category}",${p.stock},${p.safetyStock},${p.price.toFixed(2)},${p.cost.toFixed(2)},"${p.batch}","${p.expiryDate}","${p.laboratory}","${p.itbis ? 'Sí' : 'No'}"`;
    }).join('\r\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + lines);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Inventario_Farmacia_Excel_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start font-sans">
      
      {/* EXCEL IMPORT CONTROLS AREA */}
      <div id="import-controls" className="md:col-span-7 bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col gap-4">
        
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
          <Upload size={18} className="text-[#059669]" />
          Importador Masivo de Medicamentos
        </h2>

        {/* MODE SELECTOR */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">Estrategia de Carga en Excel:</span>
            <span className="text-[10px] text-slate-400">¿Desea anexar nuevos productos o reiniciar la hoja?</span>
          </div>
          <div className="flex bg-white rounded-md border p-1 gap-1 text-xs">
            <button
              id="import-mode-append"
              type="button"
              onClick={() => setImportMode('Añadir')}
              className={`py-1 px-3 rounded cursor-pointer font-medium transition ${
                importMode === 'Añadir' 
                  ? 'bg-slate-100 text-[#059669] font-bold shadow-2xs' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Anexar a Lista
            </button>
            <button
              id="import-mode-replace"
              type="button"
              onClick={() => setImportMode('Reemplazar')}
              className={`py-1 px-3 rounded cursor-pointer font-medium transition ${
                importMode === 'Reemplazar' 
                  ? 'bg-red-50 text-red-700 font-bold shadow-2xs' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Sobrescribir
            </button>
          </div>
        </div>

        {/* DROPZONE */}
        <div 
          id="dropzone-pane"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[200px] ${
            isDragOver 
              ? 'border-[#10b981] bg-emerald-50 text-[#059669]' 
              : 'border-slate-300 hover:border-[#10b981] text-slate-500 hover:bg-slate-50/50'
          }`}
        >
          <input 
            id="csv-file-selector"
            ref={fileInputRef}
            type="file" 
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileSpreadsheet className={`mb-3 transition-transform duration-300 ${isDragOver ? 'scale-115 text-[#10b981]' : 'text-[#10b981] opacity-75'}`} size={44} />
          <p className="font-bold text-xs text-slate-700">Arrastre y suelte su archivo CSV aquí</p>
          <p className="text-[11px] text-slate-400 mt-1">O haga un clic para navegar en sus carpetas (Formatos .CSV admitidos)</p>
          <span className="text-[10px] mt-4 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
            Excel CSV UTF-8
          </span>
        </div>

        {/* FEEDBACK POPUP ON SUCCESS IMPORT */}
        {importedRowsCount !== null && (
          <div id="import-report-success" className="bg-emerald-50 border border-emerald-250 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#059669] font-bold text-xs font-sans">
              <CheckCircle size={16} />
              ¡Archivo cargado con éxito! Se procesaron {importedRowsCount} medicamentos.
            </div>
            {importLogs.length > 0 && (
              <div className="text-[10px] font-mono text-slate-500 max-h-[100px] overflow-y-auto bg-white border border-slate-100 rounded p-2">
                {importLogs.map((log, lIdx) => (
                  <div key={lIdx} className="mb-0.5">{log}</div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* DETAILED EXPORT & STRUCTURE HELP MANUAL */}
      <div id="export-help" className="md:col-span-5 flex flex-col gap-5">
        
        {/* EXCEL ACTIONS CARD */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Download size={18} className="text-[#059669]" />
            Descarga de Base de Datos Farmacéutica
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Exporte todo el catálogo de existencias farmacéuticas reconciliadas del inventario a un archivo delimitado por comas de alta fidelidad, listo para cargar en Microsoft Excel o Google Sheets.
          </p>
          
          <button
            id="bulk-export-catalog-btn"
            onClick={exportFullCatalogToCSV}
            className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer border border-[#334155]"
          >
            <FileSpreadsheet size={16} />
            DESCARGAR CATÁLOGO COMPLETO (.CSV EXCEL)
          </button>
        </div>

        {/* SCHEMA TEMPLATE HELP CARD */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Info size={14} className="text-indigo-600" />
            Estructura Recomendada para Excel CSV
          </h3>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Para que su archivo se importe correctamente en las celdas de la farmacia, la primera fila (encabezado) debe contener los siguientes campos o valores separados por comas:
          </p>

          <div className="bg-slate-50 border rounded-lg p-3 font-mono text-[9px] text-slate-700 leading-normal scrollbar-thin select-all">
            Codigo,Medicamento,Principio Activo,Categoria,Stock,Stock Minimo,Precio Venta,Costo Compra,Lote,Fecha Vencimiento,Laboratorio
          </div>
          
          <div className="mt-4 flex justify-between items-center bg-indigo-50 border border-indigo-100 p-2 text-[10.5px] rounded-lg text-indigo-800">
            <span>¿Quiere ver una plantilla de muestra?</span>
            <button
              id="download-sample-template-btn"
              onClick={downloadSampleTemplate}
              className="text-[#059669] underline font-bold cursor-pointer hover:text-emerald-850 text-[10px]"
            >
              Descargar Ejemplo
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
