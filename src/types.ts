/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string; // Internal identifier (e.g., P001, P002)
  excelRow: number; // Simulated Excel Row number mapping
  code: string; // Barcode or unique product code (e.g., 750123456789)
  name: string; // Commercial name
  activeIngredient: string; // Principio activo (e.g., Paracetamol)
  category: string; // Categoría (e.g., Analgésicos, Antibióticos)
  stock: number; // Current stock count (e.g., 120)
  safetyStock: number; // Minimum safe stock (e.g., 20)
  price: number; // Public sale price
  cost: number; // Purchase/manufacturing cost
  laboratory: string; // Laboratories (e.g., Bayer, Pfizer)
  expiryDate: string; // Date of expiration (YYYY-MM-DD)
  batch: string; // Batch code (Lote, e.g., L-9872)
  location: string; // Estante/Vitrina location (e.g., Pasillo 2-B)
  itbis: boolean; // Whether the product carries ITBIS (18%)
}

export interface Customer {
  id: string; // e.g., C001, C002
  excelRow: number; // Simulated Excel row number
  name: string; // Customer name
  phone: string; // Phone number
  email?: string; // Email
  registrationDate: string; // YYYY-MM-DD
  creditLimit: number; // maximum credit amount allowed in MXN
}

export interface CreditPayment {
  id: string; // payment unique ID
  date: string; // YYYY-MM-DD string
  amount: number; // amount paid in MXN
  notes?: string; // Optional payment notes
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  cost: number; // To calculate profits in reports
  quantity: number;
  total: number;
}

export interface Sale {
  id: string; // Internal ID
  invoiceNumber: string; // Excel formatted invoice e.g. F-0001
  date: string; // ISO String or YYYY-MM-DD
  items: SaleItem[];
  subtotal: number;
  tax: number; // 16% as realistic default in LATAM, or customized
  discount: number;
  total: number;
  customerName: string;
  customerPhone?: string;
  customerId?: string; // Link to Customer.id
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';
  dueDate?: string; // For Credit Sales: YYYY-MM-DD
  creditPayments?: CreditPayment[]; // Historical payments made to this specific credit sale
}

export interface CategoryData {
  name: string;
  count: number;
  value: number;
}

export interface SalesHistoryReport {
  date: string; // YYYY-MM-DD
  amount: number;
  profit: number;
  salesCount: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;
  total: number;
}

export interface Purchase {
  id: string; // e.g., CP001
  purchaseNumber: string; // e.g., C-0001
  date: string; // YYYY-MM-DD
  supplierName: string;
  items: PurchaseItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';
  supplierInvoiceNumber?: string; // e.g., FAC-2026-98
  supplierRnc?: string; // e.g., 1-01-01234-5
  ncf?: string; // e.g., B0100000021 (Comprobante Fiscal)
}

