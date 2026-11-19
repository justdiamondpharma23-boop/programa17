/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Sale, SaleItem, Customer } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Sparkles,
  ShoppingBag,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  Percent,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Activity,
  AlertOctagon,
  CornerDownRight,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { generateAuditPDF, generateAuditCSV } from '../utils/auditGenerator';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

interface ReportsModuleProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales: Sale[];
  customers: Customer[];
}

export default function ReportsModule({ products, setProducts, sales, customers }: ReportsModuleProps) {
  const [forecastMultiplier, setForecastMultiplier] = useState<number>(3); // Multiplier for restock quantity calculation
  const [hoveredSalesPoint, setHoveredSalesPoint] = useState<number | null>(null);
  const [chartView, setChartView] = useState<'bar' | 'area'>('bar');

  const todayStr = '2026-06-20';
  const todayDate = new Date(todayStr);

  const downloadFullAuditCSV = () => {
    try {
      const csvData = generateAuditCSV(products, sales, customers, todayStr);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;\uFEFF' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Dictamen_Auditoria_Excel_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error al generar el reporte de auditoría en formato CSV.');
    }
  };

  const triggerAuditPDF = () => {
    try {
      generateAuditPDF(products, sales, customers, todayStr);
    } catch (err) {
      console.error(err);
      alert('Error al generar el reporte de auditoría en formato PDF.');
    }
  };

  // 1. COMPUTED KEY METRICS
  const totalSalesCount = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  // Computes costs from products to check profits: Profit = Revenue - (SaleItems * purchasingCost)
  const totalCostOfGoodsSold = sales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      return itemSum + (item.quantity * item.cost);
    }, 0);
  }, 0);
  const totalEstimatedProfits = Math.max(0, totalRevenue - totalCostOfGoodsSold);

  const totalPhysicalStock = products.reduce((sum, p) => sum + p.stock, 0);
  
  // Expirations calculation
  const expiredProducts = products.filter(p => {
    const exp = new Date(p.expiryDate);
    return exp.getTime() <= todayDate.getTime();
  });

  const expiringSoonProducts = products.filter(p => {
    const exp = new Date(p.expiryDate);
    const diff = exp.getTime() - todayDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  });

  // Critical Low Stock
  const lowStockProducts = products.filter(p => p.stock <= p.safetyStock);

  // 2. DAILY SALES HISTORIC AGGREGATION FOR CHART
  // Aggregate sales by date (last 7 days representing a standard report range)
  const last7DaysOfSales = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - (6 - idx));
    const dStr = d.toISOString().split('T')[0];
    
    // Sum sales for that day
    const daySales = sales.filter(s => s.date.startsWith(dStr));
    const revenueSum = daySales.reduce((sum, s) => sum + s.total, 0);
    const count = daySales.length;

    // Format print label like "18-Jun"
    const labelDate = new Date(d);
    labelDate.setMinutes(labelDate.getMinutes() + labelDate.getTimezoneOffset());
    const dayLabel = labelDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    return {
      dateStr: dStr,
      label: dayLabel,
      revenue: revenueSum,
      salesCount: count
    };
  });

  const maxChartValue = Math.max(...last7DaysOfSales.map(d => d.revenue), 100);

  // 3. TOP-SELLING DRUGS STATS
  // Aggregate quantities purchased for each product
  const productSalesMap: { [prodId: string]: { name: string; qty: number; category: string; totalRevenue: number } } = {};
  
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (productSalesMap[item.productId]) {
        productSalesMap[item.productId].qty += item.quantity;
        productSalesMap[item.productId].totalRevenue += item.total;
      } else {
        productSalesMap[item.productId] = {
          name: item.name,
          qty: item.quantity,
          category: products.find(p => p.id === item.productId)?.category || 'Otros',
          totalRevenue: item.total
        };
      }
    });
  });

  const topSellingProductsList = Object.entries(productSalesMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const maxSoldVolume = Math.max(...topSellingProductsList.map(item => item.qty), 1);

  // 4. CATEGORY STOCK DISTRIBUTION
  const categoryCountMap: { [cat: string]: number } = {};
  products.forEach(p => {
    categoryCountMap[p.category] = (categoryCountMap[p.category] || 0) + p.stock;
  });
  
  const categoryDistribution = Object.entries(categoryCountMap)
    .map(([name, stock]) => ({ name, stock }))
    .sort((a, b) => b.stock - a.stock);

  const maxCategoryStock = Math.max(...categoryDistribution.map(c => c.stock), 1);

  // 5. DEMO PURGE EXPIRED LOT (Sets stock to 0)
  const handlePurgeExpired = (id: string, name: string) => {
    if (window.confirm(`⚠️ ESTÁ POR DAR DE BAJA ESTE LOTE:\n\n¿Desea restablecer el stock de "${name}" a 0 en la hoja de cálculo por vencimiento? Esto registrará la merma correspondiente.`)) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: 0 } : p));
      alert(`✅ Lote dado de baja con éxito en Excel. El inventario activo de "${name}" ahora es de 0 unidades.`);
    }
  };

  // 6. ORDER PURCHASE FORECAST SUGGESTIONS DOWNLOAD
  const downloadPurchaseForecastCSV = () => {
    const headers = 'Id,Medicamento,Lote,Sotck Actual,Stock Minimo,Sugerido a Comprar,Costo Unitario ($),Valuacion Pedido ($)\r\n';
    
    const lines = lowStockProducts.map(p => {
      const suggestedQty = Math.max(0, (p.safetyStock * forecastMultiplier) - p.stock);
      const estCost = suggestedQty * p.cost;
      return `"${p.id}","${p.name}","${p.batch}",${p.stock},${p.safetyStock},${suggestedQty},${p.cost.toFixed(2)},${estCost.toFixed(2)}`;
    }).join('\r\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(headers + lines);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Orden_Compra_Sugerida_Farmacia_Excel.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* 1. AUTO-METRICS ROW CARD */}
      <div id="metrics-deck" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* REVENUE TICKET CARD */}
        <div className="bg-white rounded-xl shadow-md border hover:border-[#10b981] border-slate-200 p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facturación Total</span>
            <div className="p-1 px-1.5 rounded-full bg-emerald-50 text-[#059669]">
              <DollarSign size={13} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 font-mono">
            ${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-405 mt-1">Suma acumulada de {totalSalesCount} facturas</p>
        </div>

        {/* PROFITS ESTIMATES CARD */}
        <div className="bg-white rounded-xl shadow-md border hover:border-indigo-500 border-slate-200 p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margen de Ganancia</span>
            <div className="p-1 px-1.5 rounded bg-indigo-50 text-indigo-700">
              <TrendingUp size={13} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 font-mono flex items-center gap-1.5">
            ${totalEstimatedProfits.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded-sm">
              +{totalRevenue > 0 ? ((totalEstimatedProfits / totalRevenue) * 100).toFixed(0) : '0'}%
            </span>
          </div>
          <p className="text-[10px] text-slate-405 mt-1">Calculado en base a costos netos</p>
        </div>

        {/* PHYSICAL DRUG STOCK PILLS */}
        <div className="bg-white rounded-xl shadow-md border hover:border-amber-500 border-slate-200 p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidades en Stock</span>
            <div className="p-1 px-1.5 rounded bg-amber-550 text-white leading-none">
              <Package size={13} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 font-mono">
            {totalPhysicalStock.toLocaleString()} <span className="text-xs text-slate-400 font-normal">u.</span>
          </div>
          {lowStockProducts.length > 0 ? (
            <p className="text-[10px] text-red-600 bg-red-50 p-1 rounded mt-1 font-semibold flex items-center gap-1">
              ⚠️ {lowStockProducts.length} medicamentos bajo mínimo
            </p>
          ) : (
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">✅ Todos sobre stock mínimo</p>
          )}
        </div>

        {/* EXPIRED BLOCK ALARMS */}
        <div className="bg-white rounded-xl shadow-md border hover:border-red-500 border-slate-200 p-4 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Riesgo Vencimiento</span>
            <div className="p-1 px-1.5 rounded bg-red-100 text-red-600">
              <ShieldAlert size={14} />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800 font-mono flex items-center gap-2">
            {expiredProducts.length} <span className="text-xs text-red-650 font-bold bg-red-100 px-1 py-0.2 rounded">Vencidos</span>
          </div>
          {expiringSoonProducts.length > 0 ? (
            <p className="text-[10px] text-amber-600 bg-amber-50 p-1 rounded mt-1 font-semibold">
              ⏳ {expiringSoonProducts.length} lotes expiran en 30 días
            </p>
          ) : (
            <p className="text-[10px] text-slate-405 mt-1">Cero vencimientos críticos próximos</p>
          )}
        </div>

      </div>

      {/* 2. MAIN CHARTS AREA */}
      <div id="charts-bento-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHRONOLOGICAL SALES CHART (Interactive Custom SVG Area Chart) */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Activity size={18} className="text-[#059669]" />
                Historial de Ventas (Últimos 7 Días)
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Facturación diaria en pesos mexicanos registrada automáticamente en la hoja.</p>
            </div>
            
            {/* Chart View Toggle Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200" id="chart-view-toggle">
              <button
                type="button"
                onClick={() => setChartView('bar')}
                className={`px-3 py-1 text-[10px] rounded-md font-bold transition-all cursor-pointer ${
                  chartView === 'bar'
                    ? 'bg-[#107c41] text-white shadow-xs'
                    : 'text-slate-650 hover:bg-slate-200/60'
                }`}
                id="toggle-recharts-bar-btn"
              >
                📊 Barras (Recharts)
              </button>
              <button
                type="button"
                onClick={() => setChartView('area')}
                className={`px-3 py-1 text-[10px] rounded-md font-bold transition-all cursor-pointer ${
                  chartView === 'area'
                    ? 'bg-[#107c41] text-white shadow-xs'
                    : 'text-slate-650 hover:bg-slate-200/60'
                }`}
                id="toggle-svg-area-btn"
              >
                📈 Tendencia (SVG)
              </button>
            </div>
          </div>

          {chartView === 'bar' ? (
            /* RECHARTS COMPARATIVE BAR CHART CONTAINER */
            <div className="w-full h-[225px] mt-2 select-none" id="recharts-bar-canvas">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={last7DaysOfSales}
                  margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace', fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    width={45}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0f172a] text-white p-2.5 rounded-lg border border-slate-700 shadow-xl text-xs font-sans">
                            <p className="font-extrabold text-[#10b981]">{data.dateStr}</p>
                            <p className="font-bold text-slate-200 mt-1">
                              Ingresos: <span className="font-mono text-emerald-400">${data.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Transacciones: {data.salesCount} folios
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                    cursor={{ fill: '#f8fafc', opacity: 0.5 }} 
                  />
                  <Bar 
                    dataKey="revenue" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    {last7DaysOfSales.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.revenue > 0 ? '#10b981' : '#cbd5e1'} 
                        className="transition-all duration-350 hover:opacity-85"
                      />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* SVG AREA CHART CONTAINER */
            <div className="relative w-full h-[220px] mt-2">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  {/* Gradient for area chart */}
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" />
                <line x1="0" y1="80" x2="100" y2="80" stroke="#f1f5f9" strokeWidth="0.5" />
                
                {/* Plot dots & area path generation */}
                {(() => {
                  const points = last7DaysOfSales.map((data, idx) => {
                    const x = (idx / 6) * 100;
                    // Map values from 0-max to 10-90 on the SVG coordinate grid (0 is top, 100 is bottom in SVG)
                    const heightPercentage = maxChartValue > 0 ? (data.revenue / maxChartValue) * 75 : 0;
                    const y = 85 - heightPercentage;
                    return { x, y, data, idx };
                  });

                  // Generate path string
                  const areaPath = points.length > 0 
                    ? `M ${points[0].x} 85 L ` + points.map(p => `${p.x} ${p.y}`).join(' L ') + ` L ${points[points.length - 1].x} 85 Z`
                    : '';
                  const linePath = points.length > 0
                    ? points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    : '';

                  return (
                    <>
                      {/* Filled Area */}
                      {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
                      {/* Solid Line */}
                      {linePath && <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Interactive dots with Hover capabilities */}
                      {points.map((p, index) => (
                        <g key={index}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r={hoveredSalesPoint === p.idx ? "3.5" : "2"} 
                            fill="#ffffff" 
                            stroke="#107c41" 
                            strokeWidth={hoveredSalesPoint === p.idx ? "3" : "1.5"}
                            onMouseEnter={() => setHoveredSalesPoint(p.idx)}
                            onMouseLeave={() => setHoveredSalesPoint(null)}
                            className="cursor-pointer transition-all duration-150"
                          />
                          {/* Tiny date code labels below */}
                          <text 
                            x={p.x} 
                            y="95" 
                            textAnchor="middle" 
                            fill="#94a3b8" 
                            fontSize="3.5" 
                            fontFamily="sans-serif"
                            className="font-medium select-none"
                          >
                            {p.data.label}
                          </text>
                          {/* Revenue values printed directly over the point */}
                          {p.data.revenue > 0 && (
                            <text 
                              x={p.x} 
                              y={p.y - 4} 
                              textAnchor="middle" 
                              fill="#1e293b" 
                              fontSize="3.2" 
                              fontFamily="monospace"
                              className="font-bold select-none"
                            >
                              ${p.data.revenue.toFixed(0)}
                            </text>
                          )}
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}

          <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-md text-xs text-slate-500 text-center select-none font-mono font-medium">
            💡 FÓRMULA AUTOMÁTICA EXCEL: <code>=SUMAR.SI(Ventas_Hoja!$C$2:$C$100, Fecha_Col, Ventas_Hoja!$H$2:$H$100)</code>
          </div>
        </div>

        {/* TOP SELLING PRODUCTS BAR PANEL */}
        <div id="top-selling-panel" className="lg:col-span-4 bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <Sparkles size={18} className="text-amber-500 animate-pulse" />
            Top 5 Medicamentos Vendidos
          </h2>

          {topSellingProductsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Sube registros de ventas para formular tu ranking de productos.
            </div>
          ) : (
            <div className="space-y-4">
              {topSellingProductsList.map((item, idx) => {
                const percentage = Math.max(8, (item.qty / maxSoldVolume) * 100);

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={item.name}>
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-mono font-bold text-slate-600 text-[11px] bg-slate-100 py-0.5 px-2 rounded-sm-full">
                        {item.qty} vendidas
                      </span>
                    </div>
                    {/* Visual Bar Indicator */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-[#107c41]' : 
                          idx === 1 ? 'bg-emerald-650' : 
                          idx === 2 ? 'bg-emerald-550' : 
                          idx === 3 ? 'bg-[#3b82f6]' : 'bg-slate-400'
                        }`}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>Categoría: <strong>{item.category}</strong></span>
                      <span>Fac. Total: <strong>${item.totalRevenue.toFixed(2)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 2.5 REPORT GENERATOR CARD (DETAILED PDF & CSV AUDIT) */}
      <div id="audit-executive-panel" className="bg-[#0f172a] text-white rounded-xl shadow-lg p-5 border border-slate-800 select-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-indigo-500/30 inline-block">
              Módulo de Gobernanza y Compliance
            </span>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileText size={20} className="text-[#10b981]" />
              Dictámenes de Auditoría Interna & Control Fiscalizador
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Consolide instantáneamente el estado general de su sucursal de farmacia. Evalúe de forma cruzada el inventario de medicamentos activos, las alertas sanitarias de lotes expirados (Cofepris) y la cartera de créditos autorizada en la Hoja 3 de Clientes para su correspondiente conciliación contable en base a la hoja de cálculo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              id="audit-download-csv-btn"
              onClick={downloadFullAuditCSV}
              className="bg-[#107c41] hover:bg-[#0e6b37] text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md border border-emerald-500/20 active:scale-95"
            >
              <FileSpreadsheet size={15} />
              Exportar Libro Auditor (.csv)
            </button>
            <button
              id="audit-download-pdf-btn"
              onClick={triggerAuditPDF}
              className="bg-[#3b82f6] hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-[#3b82f6]/20 active:scale-95"
            >
              <Download size={15} />
              Generar Dictamen PDF Sellado
            </button>
          </div>
        </div>

        {/* Live miniature summary indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 border-t border-slate-800 pt-4">
          <div className="bg-slate-900 bg-opacity-40 border border-slate-800 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hojas Conciliadas</div>
            <div className="text-sm font-black text-[#10b981] mt-0.5">3 Hojas de Trabajo</div>
          </div>
          <div className="bg-slate-900 bg-opacity-40 border border-slate-800 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Medicamentos Verificados</div>
            <div className="text-sm font-black text-white mt-0.5">{products.length} Lotes en Catálogo</div>
          </div>
          <div className="bg-slate-900 bg-opacity-40 border border-slate-800 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lotes Saludables</div>
            <div className="text-sm font-black text-emerald-400 mt-0.5">
              {products.filter(p => p.stock > p.safetyStock && new Date(p.expiryDate).getTime() > new Date(todayStr).getTime()).length} en Semáforo OK
            </div>
          </div>
          <div className="bg-slate-900 bg-opacity-40 border border-slate-800 rounded-lg p-2.5 text-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clientes de Crédito</div>
            <div className="text-sm font-black text-indigo-350 mt-0.5">
              {customers.filter(c => c.id !== 'C005').length} Expedientes
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROW ALERT CARDS & PURCHASE RECOMMENDATION SYSTEM */}
      <div id="alerts-grid-panel" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* RED ALARM FOR EXPIRED LOTS AND DISCARDS */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col justify-stretch">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 text-red-650">
              <AlertOctagon size={18} className="text-red-500 inline shrink-0" />
              Inventario de Pérdidas por Caducidad
            </h2>
            <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-bold">
              {expiredProducts.length + expiringSoonProducts.length} lotes críticos
            </span>
          </div>

          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            {expiredProducts.length === 0 && expiringSoonProducts.length === 0 ? (
              <div className="text-center py-10 font-sans text-slate-400 text-xs">
                <CheckCircle size={30} className="mx-auto text-emerald-500 mb-2 opacity-60" />
                No existen lotes vencidos o por vencer en los próximos 30 días.
              </div>
            ) : (
              <table id="expired-alarm-report-table" className="w-full text-[11px] font-mono text-left select-none">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="py-2">Medicamento</th>
                    <th className="py-2 text-center">Fila Excel</th>
                    <th className="py-2">Expira</th>
                    <th className="py-2 text-right">Lote / Stock</th>
                    <th className="py-2 text-center w-[75px]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Expired Products */}
                  {expiredProducts.map(p => (
                    <tr key={p.id} className="bg-red-50/50 hover:bg-red-100/50">
                      <td className="py-2 font-bold text-slate-800">{p.name}</td>
                      <td className="py-2 text-center text-slate-500">#{p.excelRow + 1}</td>
                      <td className="py-2 font-medium text-red-650 flex items-center gap-0.5 mt-0.5">
                        <AlertTriangle size={10} className="shrink-0" /> Vencido
                      </td>
                      <td className="py-2 text-right font-medium text-slate-700">
                        <span className="text-[9px] text-slate-400 block">{p.batch}</span>
                        {p.stock} u.
                      </td>
                      <td className="py-2 text-center">
                        {p.stock > 0 ? (
                          <button
                            id={`rep-purge-${p.id}`}
                            onClick={() => handlePurgeExpired(p.id, p.name)}
                            className="bg-red-600 hover:bg-red-800 text-white font-bold text-[9px] py-1 px-1.5 rounded transition cursor-pointer"
                            title="Descartar stock y registrar merma en excel"
                          >
                            Dar de baja
                          </button>
                        ) : (
                          <span className="text-[9px] text-red-700 bg-red-150 px-1 rounded">Depurado 0 u.</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Expiring soon */}
                  {expiringSoonProducts.map(p => (
                    <tr key={p.id} className="bg-amber-50/40 hover:bg-amber-50">
                      <td className="py-2 font-semibold text-slate-700">{p.name}</td>
                      <td className="py-2 text-center text-slate-400">#{p.excelRow + 1}</td>
                      <td className="py-2 text-amber-700 font-medium">⏳ {p.expiryDate}</td>
                      <td className="py-2 text-right">
                        <span className="text-[9px] text-slate-400 block">{p.batch}</span>
                        {p.stock} u.
                      </td>
                      <td className="py-2 text-center text-[10px] text-amber-600 font-bold italic">
                        Exp. Pronto
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PURCHASE FORECAST RE-ORDER CALCULATOR */}
        <div id="reorder-panel" className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileSpreadsheet size={18} className="text-[#059669]" />
                  Previsión de Compras (Stock Máx Excel)
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">Sugerido automático en base a existencias de stock crítico.</p>
              </div>
              
              {/* Formula adjuster multiplier wrapper */}
              <div className="flex items-center gap-1.5 bg-slate-50 border p-1 rounded-md">
                <span className="text-[10px] text-slate-404 font-semibold shrink-0">Coef: *=</span>
                <select 
                  id="reorder-coef-select"
                  value={forecastMultiplier}
                  onChange={(e) => setForecastMultiplier(Number(e.target.value))}
                  className="bg-white border text-[10px] p-0.5 rounded cursor-pointer text-slate-700"
                  title="Alinee el multiplicador para calcular la compra sugerida en base al stock mínimo"
                >
                  <option value={2}>2x Min</option>
                  <option value={3}>3x Min</option>
                  <option value={4}>4x Min</option>
                  <option value={5}>5x Min</option>
                </select>
              </div>
            </div>

            {/* Reorder items table list */}
            <div className="overflow-y-auto max-h-[170px] pr-1 mb-4 select-none">
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  ✨ No hay productos por debajo del stock de seguridad. Inventario equilibrado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 space-y-1">
                  {lowStockProducts.map(p => {
                    // Sugerido = (safetyStock * forecastMultiplier) - stock
                    const suggestedQty = Math.max(0, (p.safetyStock * forecastMultiplier) - p.stock);
                    const estCost = suggestedQty * p.cost;

                    return (
                      <div key={p.id} className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition p-1">
                        <div>
                          <div className="font-bold text-slate-700 flex items-center gap-1">
                            {p.name}
                            <span className="text-[9px] bg-red-150 text-red-700 px-1 py-0.2 rounded font-mono">Stock: {p.stock}/{p.safetyStock} min</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex gap-2">
                            <span>Laboratorio: <strong>{p.laboratory}</strong></span>
                            <span>• Costo Unitario: <strong>${p.cost.toFixed(2)}</strong></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-indigo-700 text-[11px] font-mono">
                            Pedir de emergencia: <strong className="text-emerald-700 text-sm font-black">+{suggestedQty} u.</strong>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">Cost: ${estCost.toLocaleString()} MXN</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Trigger buy order list printout or text CSV */}
          {lowStockProducts.length > 0 && (
            <div className="border-t border-slate-100 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs leading-none">
              <div className="text-slate-500">
                Líneas de Compra Requeridas: <strong className="font-mono text-indigo-600">{lowStockProducts.length} medicamentos</strong>
              </div>
              <button
                id="rep-download-reorder"
                onClick={downloadPurchaseForecastCSV}
                className="bg-[#0f172a] hover:bg-slate-800 text-white py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-1.5 transition text-xs cursor-pointer shadow-xs"
              >
                <Download size={13} />
                Exportar Cotización Compra (.csv)
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
