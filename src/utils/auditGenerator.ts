/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Product, Sale, Customer } from '../types';

// Helper to format currency
const formatMXN = (val: number) => {
  return `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
};

// Interface for statistics compiled for the audit
interface AuditStats {
  todayStr: string;
  totalProducts: number;
  totalStockUnits: number;
  inventoryValuedAtCost: number;
  inventoryValuedAtPrice: number;
  expectedRevenueMargin: number;
  
  revenueTotal: number;
  costTotal: number;
  profitEstimated: number;
  salesCount: number;
  averageTicket: number;
  
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  totalMermasValued: number; // Sum of expired products cost
  
  creditSalesCount: number;
  totalCreditGranted: number;
  totalOutstandingCredit: number;
}

export function compileAuditStats(products: Product[], sales: Sale[], customers: Customer[], todayStr: string): AuditStats {
  const todayDate = new Date(todayStr);
  
  // Inventory valutions
  const totalProducts = products.length;
  let totalStockUnits = 0;
  let inventoryValuedAtCost = 0;
  let inventoryValuedAtPrice = 0;
  let lowStockCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let totalMermasValued = 0;

  products.forEach(p => {
    totalStockUnits += p.stock;
    inventoryValuedAtCost += p.stock * p.cost;
    inventoryValuedAtPrice += p.stock * p.price;
    
    if (p.stock <= p.safetyStock) {
      lowStockCount++;
    }
    
    const exp = new Date(p.expiryDate);
    const timeDiff = exp.getTime() - todayDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) {
      expiredCount++;
      totalMermasValued += p.stock * p.cost; // Loss of expired stock
    } else if (daysDiff > 0 && daysDiff <= 30) {
      expiringSoonCount++;
    }
  });

  // Sales evaluations
  const salesCount = sales.length;
  const revenueTotal = sales.reduce((sum, s) => sum + s.total, 0);
  const costTotal = sales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + (item.quantity * item.cost), 0);
  }, 0);
  const profitEstimated = Math.max(0, revenueTotal - costTotal);
  const averageTicket = salesCount > 0 ? (revenueTotal / salesCount) : 0;

  // Credits evaluations
  let creditSalesCount = 0;
  let totalCreditGranted = 0;
  let totalOutstandingCredit = 0;

  sales.forEach(s => {
    if (s.paymentMethod === 'Crédito') {
      creditSalesCount++;
      totalCreditGranted += s.total;
      
      const paid = (s.creditPayments || []).reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, s.total - paid);
      totalOutstandingCredit += remaining;
    }
  });

  return {
    todayStr,
    totalProducts,
    totalStockUnits,
    inventoryValuedAtCost,
    inventoryValuedAtPrice,
    expectedRevenueMargin: inventoryValuedAtPrice - inventoryValuedAtCost,
    revenueTotal,
    costTotal,
    profitEstimated,
    salesCount,
    averageTicket,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    totalMermasValued,
    creditSalesCount,
    totalCreditGranted,
    totalOutstandingCredit
  };
}

/**
 * GENERATE DETAILED CSV AUDIT REPORT
 */
export function generateAuditCSV(products: Product[], sales: Sale[], customers: Customer[], todayStr: string): string {
  const stats = compileAuditStats(products, sales, customers, todayStr);
  
  let csv = '';
  const spacer = '\r\n';

  // 1. REPORT HEADER
  csv += `"FARMACIA EXCEL - REPORTE DE AUDITORÍA GENERAL Y CONTROL SPREADSHEEET"\r\n`;
  csv += `"Fecha de Reporte:", "${stats.todayStr}"\r\n`;
  csv += `"Fecha y Hora de Auditoría en Servidor:", "${new Date().toISOString()}"\r\n`;
  csv += `""\r\n`;

  // 2. METRICS TABLE
  csv += `"RESUMEN DE METRICAS CLAVE"\r\n`;
  csv += `"Métrica","Valor"\r\n`;
  csv += `"Medicamentos Únicos en Inventario",${stats.totalProducts}\r\n`;
  csv += `"Unidades Físicas en Existencia",${stats.totalStockUnits}\r\n`;
  csv += `"Valuación del Inventario a Costo Neto",${stats.inventoryValuedAtCost.toFixed(2)}\r\n`;
  csv += `"Valuación del Inventario a Precio Público",${stats.inventoryValuedAtPrice.toFixed(2)}\r\n`;
  csv += `"Facturación Total Realizada",${stats.revenueTotal.toFixed(2)}\r\n`;
  csv += `"Costo Total de Ventas (COGS)",${stats.costTotal.toFixed(2)}\r\n`;
  csv += `"Ganancia Estimada Realizada",${stats.profitEstimated.toFixed(2)}\r\n`;
  csv += `"Número de Facturas Emitidas",${stats.salesCount}\r\n`;
  csv += `"Ticket Promedio de Venta",${stats.averageTicket.toFixed(2)}\r\n`;
  csv += `"Alertas de Stock Bajo Mínimo",${stats.lowStockCount}\r\n`;
  csv += `"Lotes Vencidos Detectados",${stats.expiredCount}\r\n`;
  csv += `"Pérdida por Merma de Vencidos (Valor Costo)",${stats.totalMermasValued.toFixed(2)}\r\n`;
  csv += `"Créditos Totales Otorgados",${stats.totalCreditGranted.toFixed(2)}\r\n`;
  csv += `"Saldo de Crédito por Cobrar Pasivo",${stats.totalOutstandingCredit.toFixed(2)}\r\n`;
  csv += spacer;

  // 3. DETAILED INVENTORY SHEETS AUDIT
  csv += `"DETALLE DE AUDITORÍA DE INVENTARIO (LISTADO COMPLETO)"\r\n`;
  csv += `"Fila Excel","Código de Barras","Medicamento","Principio Activo","Categoría","Laboratorio","Lote","Fecha Vencimiento","Stock Actual","Stock Mínimo","Costo Unitario ($)","Precio Público ($)","Ubicación","Estado de Alerta"\r\n`;
  
  products.forEach(p => {
    const exp = new Date(p.expiryDate);
    const days = Math.ceil((exp.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
    let alertStatus = 'OK - Stock Suficiente';
    if (days <= 0) {
      alertStatus = 'VENCIDO - MERMA RETIRADA';
    } else if (days > 0 && days <= 30) {
      alertStatus = `CERCANO A VENCER (${days} días)`;
    } else if (p.stock <= p.safetyStock) {
      alertStatus = 'STOCK CRÍTICO - ABAJO DEL MÍNIMO';
    }

    csv += `${p.excelRow},"${p.code}","${p.name.replace(/"/g, '""')}","${p.activeIngredient.replace(/"/g, '""')}","${p.category}","${p.laboratory}","${p.batch}","${p.expiryDate}",${p.stock},${p.safetyStock},${p.cost.toFixed(2)},${p.price.toFixed(2)},"${p.location}","${alertStatus}"\r\n`;
  });
  csv += spacer;

  // 4. DETAILED TRANSACTION JOURNAL AUDIT
  csv += `"REGISTRO CRONOLÓGICO DE TRANSACCIONES Y FACTURACIÓN (AUDITORÍA FINANCIERA)"\r\n`;
  csv += `"ID Venta","Folio Factura","Fecha","Asociado / Cliente","Metodo de Pago","Subtotal ($)","Descuentos ($)","ITBIS ($)","Total Facturado ($)","Utilidad Bruta ($)","Estado del Crédito"\r\n`;
  
  sales.forEach(s => {
    // Calculate cost of items in this sale
    const saleCost = s.items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    const saleProfit = Math.max(0, s.total - saleCost);
    
    let creditInfo = 'Pagada Completamente';
    if (s.paymentMethod === 'Crédito') {
      const paid = (s.creditPayments || []).reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(0, s.total - paid);
      creditInfo = remaining === 0 ? 'Crédito Saldado' : `Crédito Pendiente (${formatMXN(remaining)})`;
    }

    csv += `"${s.id}","${s.invoiceNumber}","${s.date}","${s.customerName.replace(/"/g, '""')}","${s.paymentMethod}",${s.subtotal.toFixed(2)},${s.discount.toFixed(2)},${s.tax.toFixed(2)},${s.total.toFixed(2)},${saleProfit.toFixed(2)},"${creditInfo}"\r\n`;
  });
  csv += spacer;

  // 5. CREDIT ACCOUNTS AUDIT
  csv += `"AUDITORÍA DE CUENTAS DE CRÉDITO Y CARTERA DE CLIENTES"\r\n`;
  csv += `"ID Cliente","Nombre del Cliente","Teléfono","Email","Límite Autorizado ($)","Monto Utilizado ($)","Línea Disponible ($)","Estado de Cuenta"\r\n`;

  customers.forEach(c => {
    if (c.id === 'C005') return; // Skip general public

    const clientSales = sales.filter(s => s.paymentMethod === 'Crédito' && s.customerId === c.id);
    const totalSpentOnCredit = clientSales.reduce((sum, s) => sum + s.total, 0);
    const totalPaidOnCredit = clientSales.reduce((sum, s) => {
      const payments = s.creditPayments || [];
      return sum + payments.reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);
    const outstanding = Math.max(0, totalSpentOnCredit - totalPaidOnCredit);
    const available = Math.max(0, c.creditLimit - outstanding);
    const status = outstanding > 0 ? `DEUDOR ACTIVO (Debe ${outstanding.toFixed(2)})` : 'SIN SALDOS PENDIENTES';

    csv += `"${c.id}","${c.name.replace(/"/g, '""')}","${c.phone}","${c.email || 'N/A'}",${c.creditLimit.toFixed(2)},${outstanding.toFixed(2)},${available.toFixed(2)},"${status}"\r\n`;
  });

  return csv;
}

/**
 * TRIGGER PDF AUDIT REPORT DOWNLOAD
 */
export function generateAuditPDF(products: Product[], sales: Sale[], customers: Customer[], todayStr: string) {
  const stats = compileAuditStats(products, sales, customers, todayStr);
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  let pageNumber = 1;
  const pageHeight = 297;
  const marginX = 14;
  let currentY = 15;

  // Helper to draw clean borders
  const drawPageBorder = () => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);
    
    // Drawn footers on each page
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`FARMACIA EXCEL POS SPREADSHEET SYSTEM | HOJA DE AUDITORÍA OFICIAL`, marginX, 283);
    doc.text(`Pág. ${pageNumber}`, 188, 283);
  };

  const addHeader = (title: string) => {
    drawPageBorder();
    
    doc.setFillColor(15, 23, 42); // slate-900 (Deep elegant blue)
    doc.rect(10, 10, 190, 22, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('AUDITORÍA DE CONTROL INTERNO Y RETENCIONES SANITARIAS', marginX + 2, 16);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(230, 242, 255);
    doc.text(`CÓDIGO DE DOCUMENTO: AUD-2026-N2  |  FECHA OPERATIVA: ${stats.todayStr}  |  EMISIÓN: ${new Date().toLocaleDateString('es-MX')} 07:37`, marginX + 2, 21);
    
    doc.setFillColor(248, 250, 252); // soft slate background
    doc.rect(10, 32, 190, 10, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 42, 200, 42);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(title, marginX, 38.5);
    
    currentY = 48;
  };

  const checkPageOverflow = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      pageNumber++;
      addHeader('CONTINUACIÓN DE INFORME ADJUNTO');
    }
  };

  // --- PAGE 1: EXECUTIVE SUMMARY & STATS ---
  addHeader('1. RESUMEN EJECUTIVO Y ESTADO DE SALUD COMERCIAL');

  // Welcome Intro Paragraph
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  
  const introText = [
    `El presente dictamen de auditoría recopila, reconcilia y certifica las métricas de inventario farmacéutico e ingresos registradas en las Hojas de Trabajo de Excel. Este reporte contiene los lotes activos, el control de mermas sanitarias por vencimiento y los análisis contables de la cartera de crédito activa asignada a los pacientes de la farmacia.`
  ];
  
  let introY = currentY;
  introText.forEach(line => {
    doc.text(line, marginX, introY, { maxWidth: 182 });
    introY += 5;
  });
  
  currentY = introY + 3;

  // Key Metrics Subsections
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('INDICADORES FINANCIEROS Y MATRICES DE RENDIMIENTO', marginX, currentY);
  currentY += 5;

  // Draw 2x2 grid for key metrics box
  const boxWidth = 87;
  const boxHeight = 16;
  const rowHeight = 22;

  const drawMetricBox = (x: number, y: number, title: string, value: string, sub: string, accentColor: [number, number, number]) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, y, boxWidth, boxHeight, 'FD');
    
    // Accent line on left side
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(x, y, 1.5, boxHeight, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(title.toUpperCase(), x + 4, y + 4);

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(value, x + 4, y + 9);

    doc.setTextColor(148, 163, 184);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(sub, x + 4, y + 13);
  };

  // Row 1 metrics
  drawMetricBox(10, currentY, 'Monto Facturado General', formatMXN(stats.revenueTotal), `Ingresos acumulados de ${stats.salesCount} folios`, [16, 185, 129]);
  drawMetricBox(101, currentY, 'Ganancia Neta Calculada', formatMXN(stats.profitEstimated), `Análisis basado en costos unitarios base`, [99, 102, 241]);
  currentY += rowHeight - 2;

  // Row 2 metrics
  drawMetricBox(10, currentY, 'Valuación Inventario (Costo)', formatMXN(stats.inventoryValuedAtCost), `${stats.totalStockUnits.toLocaleString()} unidades de medicamentos en almacenes`, [234, 179, 8]);
  drawMetricBox(101, currentY, 'Pérdida por Mermas Vencidas', formatMXN(stats.totalMermasValued), `Retirados: ${stats.expiredCount} lotes del catálogo principal`, [239, 68, 68]);
  currentY += rowHeight + 3;

  // Credit details boxes
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTADO DE LA CARTERA DE CRÉDITO GENERAL', marginX, currentY);
  currentY += 5;

  drawMetricBox(10, currentY, 'Ventas a Crédito Autorizadas', formatMXN(stats.totalCreditGranted), `${stats.creditSalesCount} transacciones en expediente diferido`, [79, 70, 229]);
  drawMetricBox(101, currentY, 'Saldo Pendiente por Cobrar', formatMXN(stats.totalOutstandingCredit), `Pasivo exigible en la hoja de clientes`, [220, 38, 38]);
  currentY += rowHeight + 6;

  // SANITARY & STOCK CRITICAL WARNINGS
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ALERTAS DE SEGURIDAD OPERATIVA Y SANITARIA', marginX, currentY);
  currentY += 4.5;

  const warningWidth = 181;
  const warningHeight = 23;
  doc.setFillColor(254, 242, 242); // super light red
  doc.setDrawColor(252, 165, 165);
  doc.rect(10, currentY, warningWidth, warningHeight, 'FD');

  // Amber side indicator
  doc.setFillColor(220, 38, 38);
  doc.rect(10, currentY, 2, warningHeight, 'F');

  doc.setTextColor(185, 28, 28);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INFORME DE CONTROL SANITARIO DE MEDICAMENTOS:', 15, currentY + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const warnText1 = `• Se han registrado ${stats.expiredCount} medicamentos VENCIDOS que representan peligro sanitario. El stock del catálogo se bloqueó para evitar dispensación.`;
  const warnText2 = `• Existen ${stats.expiringSoonCount} lotes próximos a vencer en los siguientes 30 días, requiriendo devaluación o rotación acelerada.`;
  const warnText3 = `• Actualmente, ${stats.lowStockCount} sustancias activas se encuentran bajo su línea de stock de reserva segura de Excel.`;
  
  doc.text(warnText1, 15, currentY + 9);
  doc.text(warnText2, 15, currentY + 13);
  doc.text(warnText3, 15, currentY + 17);

  currentY += warningHeight + 8;

  // --- PAGE 2: CORE DETAILED TABLES ---
  doc.addPage();
  pageNumber++;
  addHeader('2. AUDITORÍA CRÍTICA DE PRODUCTOS RETENIDOS Y ALERTAS');

  // Detailed Products alerts Table Headers
  const colX = [10, 20, 68, 92, 114, 137, 159, 181];
  const colW = [10, 48, 24, 22, 23, 22, 22, 19];
  
  const drawTableHeader = (headers: string[]) => {
    doc.setFillColor(71, 85, 105); // slate-600
    doc.rect(10, currentY, 190, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 1, currentY + 4.5);
    });
    
    currentY += 6;
  };

  drawTableHeader(['ID', 'Medicamento Comercial', 'Lote', 'Existencia', 'Mínimo', 'Costo', 'Vence', 'Estado']);

  // Filter alert medicines to print
  const alertedMedicines = products.filter(p => {
    const exp = new Date(p.expiryDate);
    const days = Math.ceil((exp.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
    return days <= 30 || p.stock <= p.safetyStock;
  });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);

  if (alertedMedicines.length === 0) {
    doc.text('No se encontraron medicamentos en estado de stock crítico o vencimiento inminente.', marginX + 5, currentY + 5);
    currentY += 10;
  } else {
    alertedMedicines.forEach(p => {
      checkPageOverflow(6);
      
      const exp = new Date(p.expiryDate);
      const days = Math.ceil((exp.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
      
      let stateLabel = 'Bajo Stock';
      let rowColor: [number, number, number] = [255, 255, 255]; // white default
      
      if (days <= 0) {
        stateLabel = 'Vencido 🚫';
        rowColor = [254, 242, 242]; // red
      } else if (days > 0 && days <= 30) {
        stateLabel = `Lote Expira ⏱️`;
        rowColor = [255, 251, 235]; // yellow
      } else if (p.stock <= p.safetyStock) {
        stateLabel = 'Crítico ⚡';
        rowColor = [240, 253, 244]; // light green highlight for under stock but unexpired
      }

      // Draw light row background
      doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
      doc.rect(10, currentY, 190, 5, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(10, currentY, 190, 5, 'S');

      doc.setTextColor(30, 41, 59);
      doc.setFont('Helvetica', 'bold');
      doc.text(p.id, colX[0] + 1, currentY + 3.8);
      
      doc.setFont('Helvetica', 'normal');
      doc.text(p.name.length > 25 ? p.name.substring(0, 25) + '...' : p.name, colX[1] + 1, currentY + 3.8);
      doc.text(p.batch, colX[2] + 1, currentY + 3.8);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`${p.stock} u.`, colX[3] + 1, currentY + 3.8);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${p.safetyStock} u.`, colX[4] + 1, currentY + 3.8);
      doc.text(`$${p.cost.toFixed(1)}`, colX[5] + 1, currentY + 3.8);
      doc.text(p.expiryDate, colX[6] + 1, currentY + 3.8);
      
      if (days <= 0) {
        doc.setTextColor(185, 28, 28);
        doc.setFont('Helvetica', 'bold');
      } else if (days > 0 && days <= 30) {
        doc.setTextColor(180, 83, 9);
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont('Helvetica', 'normal');
      }
      doc.text(stateLabel, colX[7] + 1, currentY + 3.8);

      currentY += 5;
    });
  }

  currentY += 6;

  // SECTION 3: AUDITORÍA DE FACTURACIÓN Y TRANSACCIONES
  checkPageOverflow(30);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DIARIO CRONOLÓGICO DE INGRESOS Y FACTURACIÓN', marginX, currentY);
  currentY += 5;

  const colYFin = [10, 24, 46, 85, 110, 130, 148, 168];
  
  const drawTableHeaderFin = () => {
    doc.setFillColor(30, 41, 59); // dark charcoal
    doc.rect(10, currentY, 190, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    
    const headers = ['Folio', 'Fecha', 'Cliente Asociado', 'Método', 'Subtotal', 'Desct.', 'ITBIS', 'Total'];
    headers.forEach((h, i) => {
      doc.text(h, colYFin[i] + 1, currentY + 4.5);
    });
    
    currentY += 6;
  };

  drawTableHeaderFin();

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);

  if (sales.length === 0) {
    doc.text('No hay transacciones registradas hasta la fecha.', marginX + 5, currentY + 5);
    currentY += 10;
  } else {
    sales.forEach(s => {
      checkPageOverflow(6);
      
      doc.setFillColor(255, 255, 255);
      doc.rect(10, currentY, 190, 4.8, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(10, currentY, 190, 4.8, 'S');

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.text(s.invoiceNumber, colYFin[0] + 1, currentY + 3.5);
      doc.setFont('Helvetica', 'normal');
      doc.text(s.date, colYFin[1] + 1, currentY + 3.5);
      
      const clientNameTrunc = s.customerName.length > 25 ? s.customerName.substring(0, 25) + '...' : s.customerName;
      doc.text(clientNameTrunc, colYFin[2] + 1, currentY + 3.5);
      
      if (s.paymentMethod === 'Crédito') {
        doc.setTextColor(185, 28, 28);
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'normal');
      }
      doc.text(s.paymentMethod, colYFin[3] + 1, currentY + 3.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');

      doc.text(`$${s.subtotal.toFixed(1)}`, colYFin[4] + 1, currentY + 3.5);
      doc.text(`$${s.discount.toFixed(1)}`, colYFin[5] + 1, currentY + 3.5);
      doc.text(`$${s.tax.toFixed(1)}`, colYFin[6] + 1, currentY + 3.5);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`$${s.total.toFixed(2)}`, colYFin[7] + 1, currentY + 3.5);

      currentY += 4.8;
    });
  }

  currentY += 8;

  // --- SIGNATURE BLOCK ---
  // Ensure the signature is printed nicely at the bottom
  checkPageOverflow(35);
  currentY += 4;
  
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(20, currentY + 12, 85, currentY + 12);
  doc.line(125, currentY + 12, 190, currentY + 12);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('AUDITOR GENERAL DEL EXPEDIENTE', 25, currentY + 16);
  doc.text('RESPONSABLE SANITARIO DE FARMACIA', 125, currentY + 16);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Firma y Sello de Certificación', 34, currentY + 20);
  doc.text('Cédula Profesional y Control Interno', 133, currentY + 20);

  // Trigger Save File Download Dialogue!
  doc.save(`Dictamen_Auditoria_Farmacia_Excel_2026.pdf`);
}
