/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Sale, Customer, Purchase } from '../types';

// Let's seed the system with realistic pharmacy parameters.
// Current date is assumed to be June 20, 2026.

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'P001',
    excelRow: 1,
    code: '7501002722144',
    name: 'Paracetamol 500mg',
    activeIngredient: 'Paracetamol',
    category: 'Analgésicos',
    stock: 145,
    safetyStock: 30,
    price: 3.50,
    cost: 1.20,
    laboratory: 'Bayer S.A.',
    expiryDate: '2028-04-12',
    batch: 'B-PA872',
    location: 'Estante A-1',
    itbis: false
  },
  {
    id: 'P002',
    excelRow: 2,
    code: '7501002722250',
    name: 'Ibuprofeno 400mg',
    activeIngredient: 'Ibuprofeno',
    category: 'Antiinflamatorios',
    stock: 18, // LOW STOCK (minimum is 25)
    safetyStock: 25,
    price: 5.80,
    cost: 2.10,
    laboratory: 'Genfar',
    expiryDate: '2027-11-20',
    batch: 'G-IB403',
    location: 'Estante A-2',
    itbis: true
  },
  {
    id: 'P003',
    excelRow: 3,
    code: '7501165004125',
    name: 'Amoxicilina 500mg',
    activeIngredient: 'Amoxicilina',
    category: 'Antibióticos',
    stock: 75,
    safetyStock: 15,
    price: 12.00,
    cost: 4.50,
    laboratory: 'Pfizer',
    expiryDate: '2026-07-10', // EXPIRING SOON (approx 20 days left)
    batch: 'P-AM092',
    location: 'Vitrina B-1 (Antibióticos)',
    itbis: false
  },
  {
    id: 'P004',
    excelRow: 4,
    code: '7501234005080',
    name: 'Omeprazol 20mg',
    activeIngredient: 'Omeprazol',
    category: 'Gastrointestinales',
    stock: 210,
    safetyStock: 40,
    price: 4.20,
    cost: 1.00,
    laboratory: 'Sandoz',
    expiryDate: '2027-09-15',
    batch: 'S-OM441',
    location: 'Estante C-1',
    itbis: true
  },
  {
    id: 'P005',
    excelRow: 5,
    code: '7501004112349',
    name: 'Loratadina 10mg',
    activeIngredient: 'Loratadina',
    category: 'Antihistamínicos',
    stock: 90,
    safetyStock: 20,
    price: 6.50,
    cost: 1.80,
    laboratory: 'Roche',
    expiryDate: '2026-05-15', // EXPIRED (Expired on May 15, 2026!)
    batch: 'R-LO122',
    location: 'Estante C-3',
    itbis: true
  },
  {
    id: 'P006',
    excelRow: 6,
    code: '7501124409381',
    name: 'Losartán 50mg',
    activeIngredient: 'Losartán Potásico',
    category: 'Cardiovasculares',
    stock: 12, // CRITICAL STOCK (minimum is 30)
    safetyStock: 30,
    price: 14.50,
    cost: 5.00,
    laboratory: 'Merck',
    expiryDate: '2028-02-28',
    batch: 'M-LS912',
    location: 'Estante D-2',
    itbis: false
  },
  {
    id: 'P007',
    excelRow: 7,
    code: '7501198422312',
    name: 'Aspirina Adultos 500mg',
    activeIngredient: 'Ácido Acetilsalicílico',
    category: 'Analgésicos',
    stock: 120,
    safetyStock: 25,
    price: 4.00,
    cost: 1.30,
    laboratory: 'Bayer S.A.',
    expiryDate: '2027-08-30',
    batch: 'B-AS901',
    location: 'Estante A-1',
    itbis: true
  },
  {
    id: 'P008',
    excelRow: 8,
    code: '7502918440263',
    name: 'Metformina 850mg',
    activeIngredient: 'Metformina',
    category: 'Diabetes',
    stock: 80,
    safetyStock: 20,
    price: 9.90,
    cost: 3.20,
    laboratory: 'Novartis',
    expiryDate: '2026-12-05',
    batch: 'N-ME011',
    location: 'Estante D-4',
    itbis: false
  },
  {
    id: 'P009',
    excelRow: 9,
    code: '7503002931022',
    name: 'Salbutamol Inhalador',
    activeIngredient: 'Salbutamol',
    category: 'Respiratorios',
    stock: 45,
    safetyStock: 15,
    price: 18.50,
    cost: 7.00,
    laboratory: 'GlaxoSmithKline',
    expiryDate: '2027-06-18',
    batch: 'G-SA440',
    location: 'Vitrina C-2',
    itbis: false
  },
  {
    id: 'P010',
    excelRow: 10,
    code: '7501254330193',
    name: 'Atorvastatina 20mg',
    activeIngredient: 'Atorvastatina',
    category: 'Cardiovasculares',
    stock: 65,
    safetyStock: 15,
    price: 22.00,
    cost: 8.50,
    laboratory: 'Pfizer',
    expiryDate: '2028-01-10',
    batch: 'P-AT605',
    location: 'Estante D-2',
    itbis: false
  },
  {
    id: 'P011',
    excelRow: 11,
    code: '7501004118310',
    name: 'Cetirizina 10mg',
    activeIngredient: 'Cetirizina',
    category: 'Antihistamínicos',
    stock: 3, // CRITICAL STOCK (minimum 15)
    safetyStock: 15,
    price: 7.20,
    cost: 2.50,
    laboratory: 'Genfar',
    expiryDate: '2026-08-01', // EXPIRING SOON (~40 days left)
    batch: 'G-CE993',
    location: 'Estante C-3',
    itbis: true
  },
  {
    id: 'P012',
    excelRow: 12,
    code: '7520193855012',
    name: 'Bismutol Suspensión',
    activeIngredient: 'Subsalicilato de Bismuto',
    category: 'Gastrointestinales',
    stock: 35,
    safetyStock: 10,
    price: 11.50,
    cost: 4.00,
    laboratory: 'Procter & Gamble',
    expiryDate: '2027-04-15',
    batch: 'P-BI054',
    location: 'Estante C-1',
    itbis: true
  },
  {
    id: 'P013',
    excelRow: 13,
    code: '7501001211021',
    name: 'Vitamina C 1g Efervescente',
    activeIngredient: 'Ácido Ascórbico',
    category: 'Vitaminas',
    stock: 150,
    safetyStock: 30,
    price: 8.00,
    cost: 3.00,
    laboratory: 'Bayer S.A.',
    expiryDate: '2027-10-31',
    batch: 'B-VC105',
    location: 'Estante E-1',
    itbis: true
  },
  {
    id: 'P014',
    excelRow: 14,
    code: '7501019283741',
    name: 'Fluoxetina 20mg',
    activeIngredient: 'Fluoxetina',
    category: 'Psicotrópicos',
    stock: 40,
    safetyStock: 10,
    price: 24.00,
    cost: 9.00,
    laboratory: 'Eli Lilly',
    expiryDate: '2027-02-14',
    batch: 'E-FL059',
    location: 'Caja Fuerte (Controlados)',
    itbis: false
  },
  {
    id: 'P015',
    excelRow: 15,
    code: '7501502441928',
    name: 'Naproxeno 500mg',
    activeIngredient: 'Naproxeno sódico',
    category: 'Antiinflamatorios',
    stock: 55,
    safetyStock: 15,
    price: 6.90,
    cost: 2.20,
    laboratory: 'Roche',
    expiryDate: '2026-06-05', // EXPIRED (Expired June 5, 2026!)
    batch: 'R-NA332',
    location: 'Estante A-2',
    itbis: true
  }
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'S001',
    invoiceNumber: 'FAC-0001',
    date: '2026-06-18T10:30:00',
    items: [
      { productId: 'P001', name: 'Paracetamol 500mg', price: 3.50, cost: 1.20, quantity: 4, total: 14.00 },
      { productId: 'P004', name: 'Omeprazol 20mg', price: 4.20, cost: 1.00, quantity: 2, total: 8.40 }
    ],
    subtotal: 19.31,
    tax: 3.09, // 16%
    discount: 0.00,
    total: 22.40,
    customerName: 'Juan Pérez',
    customerPhone: '555-0192',
    paymentMethod: 'Efectivo'
  },
  {
    id: 'S002',
    invoiceNumber: 'FAC-0002',
    date: '2026-06-18T15:45:00',
    items: [
      { productId: 'P003', name: 'Amoxicilina 500mg', price: 12.00, cost: 4.50, quantity: 1, total: 12.00 },
      { productId: 'P013', name: 'Vitamina C 1g Efervescente', price: 8.00, cost: 3.00, quantity: 2, total: 16.00 }
    ],
    subtotal: 24.14,
    tax: 3.86,
    discount: 2.00, // discount
    total: 26.00,
    customerName: 'María Rodríguez',
    customerPhone: '555-4421',
    paymentMethod: 'Tarjeta'
  },
  {
    id: 'S003',
    invoiceNumber: 'FAC-0003',
    date: '2026-06-19T09:15:00',
    items: [
      { productId: 'P008', name: 'Metformina 850mg', price: 9.90, cost: 3.20, quantity: 3, total: 29.70 },
      { productId: 'P010', name: 'Atorvastatina 20mg', price: 22.00, cost: 8.50, quantity: 1, total: 22.00 }
    ],
    subtotal: 44.57,
    tax: 7.13,
    discount: 0.00,
    total: 51.70,
    customerName: 'Carlos Gómez',
    customerPhone: '555-9012',
    paymentMethod: 'Transferencia'
  },
  {
    id: 'S004',
    invoiceNumber: 'FAC-0004',
    date: '2026-06-19T14:20:00',
    items: [
      { productId: 'P009', name: 'Salbutamol Inhalador', price: 18.50, cost: 7.00, quantity: 2, total: 37.00 }
    ],
    subtotal: 31.90,
    tax: 5.10,
    discount: 5.00,
    total: 32.00,
    customerName: 'Público General',
    paymentMethod: 'Efectivo'
  },
  {
    id: 'S005',
    invoiceNumber: 'FAC-0005',
    date: '2026-06-20T08:30:00', // Today's sale
    items: [
      { productId: 'P001', name: 'Paracetamol 500mg', price: 3.50, cost: 1.20, quantity: 10, total: 35.00 },
      { productId: 'P007', name: 'Aspirina Adultos 500mg', price: 4.00, cost: 1.30, quantity: 3, total: 12.00 }
    ],
    subtotal: 40.52,
    tax: 6.48,
    discount: 0.00,
    total: 47.00,
    customerName: 'Roberto Martínez',
    customerPhone: '555-7833',
    paymentMethod: 'Tarjeta'
  }
];

export const PHARMACY_CATEGORIES = [
  'Analgésicos',
  'Antiinflamatorios',
  'Antibióticos',
  'Gastrointestinales',
  'Antihistamínicos',
  'Cardiovasculares',
  'Diabetes',
  'Respiratorios',
  'Vitaminas',
  'Psicotrópicos'
];

export const PHARMACY_LABORATORIES = [
  'Bayer S.A.',
  'Pfizer',
  'GlaxoSmithKline',
  'Novartis',
  'Roche',
  'Merck',
  'Genfar',
  'Sandoz',
  'Procter & Gamble',
  'Eli Lilly',
  'Gideon Richter',
  'Sino Biopharma'
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'C001',
    excelRow: 1,
    name: 'Juan Pérez',
    phone: '555-0192',
    email: 'juan.perez@email.com',
    registrationDate: '2026-01-15',
    creditLimit: 3000.00
  },
  {
    id: 'C002',
    excelRow: 2,
    name: 'María Rodríguez',
    phone: '555-4421',
    email: 'maria.rod@email.com',
    registrationDate: '2026-02-10',
    creditLimit: 5000.00
  },
  {
    id: 'C003',
    excelRow: 3,
    name: 'Carlos Gómez',
    phone: '555-9012',
    email: 'carlos.gomez@email.com',
    registrationDate: '2026-03-05',
    creditLimit: 4000.00
  },
  {
    id: 'C004',
    excelRow: 4,
    name: 'Roberto Martínez',
    phone: '555-7833',
    email: 'roberto.martinez@email.com',
    registrationDate: '2026-04-20',
    creditLimit: 6000.00
  },
  {
    id: 'C005',
    excelRow: 5,
    name: 'Público General',
    phone: '000-0000',
    email: 'publico.general@email.com',
    registrationDate: '2026-01-01',
    creditLimit: 0.00
  }
];

export const INITIAL_PURCHASES: Purchase[] = [
  {
    id: 'CP001',
    purchaseNumber: 'C-0001',
    date: '2026-06-15',
    supplierName: 'Bayer S.A.',
    items: [
      {
        productId: 'P001',
        name: 'Paracetamol 500mg',
        quantity: 50,
        cost: 1.20,
        total: 60.00
      },
      {
        productId: 'P002',
        name: 'Ibuprofeno 400mg',
        quantity: 30,
        cost: 2.10,
        total: 63.00
      }
    ],
    total: 123.00,
    paymentMethod: 'Transferencia'
  },
  {
    id: 'CP002',
    purchaseNumber: 'C-0002',
    date: '2026-06-18',
    supplierName: 'Genfar',
    items: [
      {
        productId: 'P002',
        name: 'Ibuprofeno 400mg',
        quantity: 40,
        cost: 2.10,
        total: 84.00
      }
    ],
    total: 84.00,
    paymentMethod: 'Transferencia'
  }
];

