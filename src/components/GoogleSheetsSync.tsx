/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Product, Sale, Customer, Purchase } from '../types';
import { googleSignIn, logout, initAuth } from '../utils/googleAuth';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Plus, 
  Link2, 
  Terminal, 
  CheckCircle, 
  XOctagon,
  LogOut,
  ChevronRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
}

export default function GoogleSheetsSync({
  products,
  setProducts,
  sales,
  setSales,
  customers,
  setCustomers,
  purchases,
  setPurchases
}: GoogleSheetsSyncProps) {
  // Auth state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Spreadsheet state
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('pharmacy_excel_google_spreadsheet_id') || '';
  });
  const [spreadsheetName, setSpreadsheetName] = useState<string>('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Real-time synchronization option
  const [autoSyncSales, setAutoSyncSales] = useState<boolean>(() => {
    return localStorage.getItem('pharmacy_excel_google_autosync_sales') === 'true';
  });

  // Logs for terminal
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '📖 Servicio de sincronización en la nube iniciado.',
    '💡 Inicie sesión con Google para habilitar el motor de Hojas de Cálculo.'
  ]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('es-MX', { hour12: false });
    setConsoleLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setIsAuthLoading(false);
        addLog(`🟢 Sesión de Google activa para: ${user.email}`);
        if (spreadsheetId) {
          fetchSpreadsheetMetadata(token, spreadsheetId);
        }
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync autoSyncSales preference
  useEffect(() => {
    localStorage.setItem('pharmacy_excel_google_autosync_sales', String(autoSyncSales));
  }, [autoSyncSales]);

  // Sync Spreadsheet ID preference
  useEffect(() => {
    if (spreadsheetId) {
      localStorage.setItem('pharmacy_excel_google_spreadsheet_id', spreadsheetId);
      setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    } else {
      localStorage.removeItem('pharmacy_excel_google_spreadsheet_id');
      setSpreadsheetUrl('');
      setSpreadsheetName('');
    }
  }, [spreadsheetId]);

  // Handle Login
  const handleGoogleLogin = async () => {
    try {
      setIsAuthLoading(true);
      addLog('🚀 Abriendo ventana de inicio de sesión de Google...');
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        addLog(`✅ Sesión autorizada. Bienvenido, ${result.user.displayName || result.user.email}`);
        if (spreadsheetId) {
          fetchSpreadsheetMetadata(result.accessToken, spreadsheetId);
        }
      }
    } catch (error: any) {
      addLog(`❌ Fallo en autenticación Google: ${error.message || error}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Logout
  const handleGoogleLogout = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setAccessToken(null);
      addLog('🔴 Sesión de Google finalizada. Acceso temporal revocado.');
    } catch (error: any) {
      addLog(`❌ Error en logout: ${error.message}`);
    }
  };

  // Fetch Spreadsheet title and check if tabs exist
  const fetchSpreadsheetMetadata = async (token: string, sheetId: string) => {
    if (!sheetId) return;
    setIsConnecting(true);
    addLog(`🔍 Conectando con Google Spreadsheet ID: ...${sheetId.slice(-10)}`);
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Error HTTP ${res.status}`);
      }
      const data = await res.json();
      setSpreadsheetName(data.properties.title);
      addLog(`🤝 Conexión establecida con éxito: "${data.properties.title}"`);
    } catch (err: any) {
      addLog(`❌ No se pudo sincronizar el documento: ${err.message}`);
      setSpreadsheetName('');
    } finally {
      setIsConnecting(false);
    }
  };

  // Create a brand new Spreadsheet in user's Drive with 4 sheets tabs initialized
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      alert('Debe iniciar sesión con Google para crear documentos en su cuenta.');
      return;
    }
    const confirmed = window.confirm(
      '🌟 CREAR HOJA EXCEL GOOGLE SHEETS:\n\n¿Desea crear un nuevo archivo de hoja de cálculo en su cuenta de Google Drive llamado "Remix: Farmacia Excel Pro - Realtime Database"?'
    );
    if (!confirmed) return;

    setIsConnecting(true);
    addLog('📂 Creando nueva hoja de cálculo en Google Sheets...');
    try {
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'Remix: Farmacia Excel Pro - Realtime Database'
          },
          sheets: [
            { properties: { title: 'Medicamentos' } },
            { properties: { title: 'Historial_Ventas' } },
            { properties: { title: 'Clientes' } },
            { properties: { title: 'Compras' } }
          ]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error?.message || 'Error de servicio Google API');
      }

      const data = await response.json();
      const newSheetId = data.spreadsheetId;
      setSpreadsheetId(newSheetId);
      setSpreadsheetName(data.properties.title);
      addLog(`✨ Creado y vinculado: "${data.properties.title}"`);
      addLog(`📝 Guardado ID de conexión de hoja de cálculo.`);

      // Prompt automatic first data push
      const doPush = window.confirm('🎉 ¡Hoja de cálculo enlazada con éxito!\n\n¿Desea exportar el inventario, ventas, clientes y compras actuales de forma inmediata para llenar el nuevo documento?');
      if (doPush) {
        await pushDataToGoogleSheets(accessToken, newSheetId);
      }
    } catch (err: any) {
      addLog(`❌ Error creando hoja de cálculo: ${err.message}`);
      alert(`Error de API: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Overwrite existing tabs or write new tables to Sheets
  const pushDataToGoogleSheets = async (token: string, sheetId: string) => {
    if (!token || !sheetId) return;
    addLog('📤 Iniciando carga de base de datos a Google Sheets...');

    try {
      // 1. Prepare Medicamentos
      const productValues = [
        ['Código', 'Medicamento', 'Principio Activo', 'Categoría', 'Stock', 'Stock Mínimo', 'Precio Venta', 'Costo Compra', 'Laboratorio', 'Fecha Vencimiento', 'Lote', 'Ubicación', 'Lleva ITBIS', 'Fila Excel']
      ];
      products.forEach(p => {
        productValues.push([
          p.code,
          p.name,
          p.activeIngredient,
          p.category,
          String(p.stock),
          String(p.safetyStock),
          String(p.price),
          String(p.cost),
          p.laboratory,
          p.expiryDate,
          p.batch,
          p.location,
          p.itbis ? 'Sí' : 'No',
          String(p.excelRow)
        ]);
      });

      // 2. Prepare Sales
      const salesValues = [
        ['Folio', 'Fecha', 'Paciente / Cliente', 'Subtotal', 'ITBIS', 'Descuento', 'Total Neto', 'Método Pago', 'Identificador Interno']
      ];
      sales.forEach(s => {
        salesValues.push([
          s.invoiceNumber,
          s.date,
          s.customerName,
          String(s.subtotal),
          String(s.tax),
          String(s.discount),
          String(s.total),
          s.paymentMethod,
          s.id
        ]);
      });

      // 3. Prepare Customers
      const customerValues = [
        ['ID Cliente', 'Fila Excel', 'Nombre Completo', 'Teléfono', 'Correo Electrónico', 'Fecha Registro', 'Límite Crédito']
      ];
      customers.forEach(c => {
        customerValues.push([
          c.id,
          String(c.excelRow),
          c.name,
          c.phone,
          c.email || '',
          c.registrationDate,
          String(c.creditLimit)
        ]);
      });

      // 4. Prepare Purchases
      const purchaseValues = [
        ['Folio Sistema', 'ID Documento Proveedor', 'Fecha', 'Proveedor', 'Total Compra', 'Método Pago', 'NCF', 'RNC Proveedor']
      ];
      purchases.forEach(p => {
        purchaseValues.push([
          p.purchaseNumber,
          p.supplierInvoiceNumber || '',
          p.date,
          p.supplierName,
          String(p.total),
          p.paymentMethod,
          p.ncf || '',
          p.supplierRnc || ''
        ]);
      });

      const batches = [
        { name: 'Medicamentos', values: productValues },
        { name: 'Historial_Ventas', values: salesValues },
        { name: 'Clientes', values: customerValues },
        { name: 'Compras', values: purchaseValues }
      ];

      for (const batch of batches) {
        addLog(`🧹 Limpiando celdas viejas en la pestaña "${batch.name}"...`);
        // Clear cells first
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${batch.name}!A1:Z5000:clear`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });

        addLog(`✍️ Escribiendo ${batch.values.length} filas en la pestaña "${batch.name}"...`);
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${batch.name}!A1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: `${batch.name}!A1`,
            majorDimension: 'ROWS',
            values: batch.values
          })
        });

        if (!res.ok) {
          throw new Error(`Fallo en actualización de pestaña ${batch.name}`);
        }
      }

      addLog('✨ EXPORTACIÓN COMPLETA: Todo el libro contable y stock está sincronizado.');
      alert('✅ ÉXITO:\n\nTodo el sistema de base de datos (Medicamentos, Historial de Ventas, Clientes y Compras) fue exportado a Google Sheets.');
    } catch (err: any) {
      addLog(`❌ Error en exportación masiva: ${err.message}`);
      alert(`Fallo al exportar: ${err.message}`);
    }
  };

  // Pull / Import database products from the connected Google Sheet
  const handleImportFromGoogleSheets = async () => {
    if (!accessToken || !spreadsheetId) {
      alert('Debe tener una cuenta de Google y una hoja de cálculo vinculada activa para importar.');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ IMPORTAR INVENTARIO DESDE GOOGLE SHEETS:\n\n¿Está seguro de querer descargar la pestaña "Medicamentos" de Hojas de cálculo de Google y REEMPLAZAR todo su catálogo local?'
    );
    if (!confirmed) return;

    addLog('📥 Descargando pestaña "Medicamentos" de Google Sheets...');
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Medicamentos!A1:N5000`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        throw new Error('No se pudo encontrar la pestaña "Medicamentos" en Google Sheets. Verifique que la pestaña exista.');
      }

      const data = await res.json();
      const rows = data.values as string[][];

      if (!rows || rows.length < 2) {
        throw new Error('La pestaña "Medicamentos" de Google Sheets está vacía o solo contiene los encabezados.');
      }

      const headers = rows[0];
      const parsedProducts: Product[] = [];

      // Find indices by title for extreme durability
      const getIndex = (name: string, fallback: number) => {
        const idx = headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
        return idx !== -1 ? idx : fallback;
      };

      const codeIdx = getIndex('Código', 0);
      const nameIdx = getIndex('Medicamento', 1);
      const activeIdx = getIndex('Principio Activo', 2);
      const catIdx = getIndex('Categoría', 3);
      const stockIdx = getIndex('Stock', 4);
      const safetyIdx = getIndex('Stock Mínimo', 5);
      const priceIdx = getIndex('Precio Venta', 6);
      const costIdx = getIndex('Costo Compra', 7);
      const labIdx = getIndex('Laboratorio', 8);
      const expiryIdx = getIndex('Fecha Vencimiento', 9);
      const batchIdx = getIndex('Lote', 10);
      const locIdx = getIndex('Ubicación', 11);
      const itbisIdx = getIndex('Lleva ITBIS', 12);
      const rowIdxIdx = getIndex('Fila Excel', 13);

      addLog(`🔍 Mapeando columnas del documento con el esquema interno...`);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || !row[nameIdx]) continue;

        const pRow = parseInt(row[rowIdxIdx], 10) || (i + 1);
        const pStock = parseInt(row[stockIdx], 10) || 0;
        const pSafety = parseInt(row[safetyIdx], 10) || 5;
        const pPrice = parseFloat(row[priceIdx]) || 1.0;
        const pCost = parseFloat(row[costIdx]) || 0.50;
        const carriesItbis = row[itbisIdx]?.toLowerCase() === 'sí' || row[itbisIdx]?.toLowerCase() === 'si' || row[itbisIdx]?.toLowerCase() === 'true';

        parsedProducts.push({
          id: `P_GS_${Date.now()}_${i}`,
          excelRow: pRow,
          code: row[codeIdx] || `75000${Date.now().toString().slice(-7)}`,
          name: row[nameIdx],
          activeIngredient: row[activeIdx] || 'No Especificado',
          category: row[catIdx] || 'Analgésicos',
          stock: Math.max(0, pStock),
          safetyStock: Math.max(0, pSafety),
          price: Math.max(0, pPrice),
          cost: Math.max(0, pCost),
          laboratory: row[labIdx] || 'Genérico',
          expiryDate: row[expiryIdx] || '2028-12-31',
          batch: row[batchIdx] || 'LOTE-UNKN',
          location: row[locIdx] || 'Pasillo Central',
          itbis: carriesItbis
        });
      }

      if (parsedProducts.length === 0) {
        throw new Error('No se pudo convertir ninguna fila a medicamentos válidos.');
      }

      setProducts(parsedProducts);
      addLog(`🎉 IMPORTACIÓN REALIZADA: Se integraron ${parsedProducts.length} medicamentos del archivo externo.`);
      alert(`✅ ÉXITO:\n\nSe importaron ${parsedProducts.length} medicamentos activos de su Google Sheet con éxito, reemplazando la base de datos local.`);
    } catch (err: any) {
      addLog(`❌ Error de importación: ${err.message}`);
      alert(`Fallo al importar: ${err.message}`);
    }
  };

  const handleManualTriggerMetadata = () => {
    if (accessToken && spreadsheetId) {
      fetchSpreadsheetMetadata(accessToken, spreadsheetId);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      
      {/* COLUMN LEFT: ACCOUNT INTEGRATION CARD & SPREADSHEET COORDINATES */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* GOOGLE ACCOUNT CONNECTION */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
            <div className="p-1.5 bg-[#4285F4]/10 rounded text-[#4285F4]">
              <Sparkles size={16} />
            </div>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Conexión Cloud Google
            </h2>
          </div>

          {isAuthLoading ? (
            <div className="py-6 text-center text-xs text-slate-400 font-mono animate-pulse">
              Verificando credenciales de Google...
            </div>
          ) : !googleUser ? (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Autorice la aplicación para conectarse con sus hojas de cálculo para habilitar salvaguardas y copias de seguridad en tiempo real.
              </p>

              {/* GSI BUTTON PATTERN */}
              <button 
                id="gsi-google-login-btn"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-325 rounded-md py-2 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50/50 shadow-2xs group cursor-pointer transition"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Iniciar Sesión con Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Google account detail badge */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border" />
                ) : (
                  <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {googleUser.displayName?.charAt(0) || googleUser.email?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-800 truncate leading-none">
                    {googleUser.displayName || 'Usuario Google'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-1">
                    {googleUser.email}
                  </div>
                </div>
                <button
                  id="google-disconnect-btn"
                  onClick={handleGoogleLogout}
                  className="p-2 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition"
                  title="Finalizar sesión"
                >
                  <LogOut size={15} />
                </button>
              </div>

              {/* Dynamic spreadsheet binder status */}
              {spreadsheetName ? (
                <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-lg flex items-start gap-2 text-[#15803d]">
                  <CheckCircle size={16} className="shrink-0 mt-0.5 text-[#10b981]" />
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider block">Documento Vinculado</span>
                    <span className="text-xs font-bold font-sans mt-0.5 block truncate max-w-[220px]">
                      {spreadsheetName}
                    </span>
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#15803d] font-bold underline inline-flex items-center gap-0.5 mt-1 hover:text-emerald-900"
                    >
                      <Link2 size={12} /> Abrir en pestaña nueva
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-150 p-3 rounded-lg flex items-start gap-2 text-amber-800">
                  <XOctagon size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider block">Sin Hoja Vinculada</span>
                    <span className="text-xs font-medium block mt-0.5">
                      No se ha detectado ninguna estructura válida. Use los botones de la derecha para crear o conectar una de inmediato.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONNECTION MANAGE COORDINATES */}
        {googleUser && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Sincronizar Manual de Excel ID
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal mb-3">
              Si ya cuenta con una hoja de cálculo Google, puede conectar ingresando el ID del documento (presente en la barra URL de su navegador):
            </p>

            <div className="flex gap-2">
              <input
                id="spreadsheet-manual-id-input"
                type="text"
                placeholder="Introduzca Spreadsheet ID..."
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value.trim())}
                className="flex-1 bg-slate-50 text-[11px] px-3 py-1.5 border border-slate-300 rounded font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              />
              <button
                id="manual-id-connect-btn"
                onClick={handleManualTriggerMetadata}
                disabled={isConnecting || !spreadsheetId}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded transition disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? '...' : 'Vincular'}
              </button>
            </div>
            {spreadsheetId && (
              <span className="text-[9px] text-slate-400 block mt-1.5 font-mono overflow-ellipsis truncate">
                ID activo: {spreadsheetId}
              </span>
            )}
          </div>
        )}

        {/* SYSTEM CONFIGURATION */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-2 mb-3">
            Opciones de Sincronización
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Sincronizar Ventas de Caja:</span>
              <span className="text-[10px] text-slate-400 max-w-[200px] block leading-tight mt-0.5">
                Al registrar transacciones en el POS, éstas se añadirán inmediatamente a Google Sheets de forma paralela.
              </span>
            </div>
            <button
              id="toggle-autosync-btn"
              onClick={() => setAutoSyncSales(prev => !prev)}
              className="text-[#10b981] hover:text-emerald-700 transition"
              title={autoSyncSales ? "Desactivar" : "Activar"}
            >
              {autoSyncSales ? (
                <ToggleRight size={38} className="text-[#10b981]" />
              ) : (
                <ToggleLeft size={38} className="text-slate-300" />
              )}
            </button>
          </div>
        </div>

      </div>

      {/* COLUMN RIGHT: INTERACTIVE CONTROL PANEL & REAL LIVE PROCESS LOGGER */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        
        {/* SHEETS ACTIONS CONSOLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between border-b pb-3 mb-5">
            <h2 className="text-sm font-bold text-slate-850 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet size={19} className="text-[#10b981]" />
              Panel de Control Google Sheets
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">API v4 Direct Stream</span>
          </div>

          {!googleUser ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <FileSpreadsheet size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-550">Debe firmarse con Google Account</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                El panel de control interactivo estará habilitado para realizar cruces de información y auditorías inmediatamente después de loguearse.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ACTION A: CREATE & OVERWRITE */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition bg-slate-50/40">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                    <Plus size={16} className="text-[#10b981]" />
                    Crear Hoja Inteligente
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Usa las APIs integradas para generar de forma automatizada un nuevo archivo Google Sheets en su Drive configurado con pestañas separadas y formateadas para medicamentos, ventas, clientes y compras.
                  </p>
                </div>
                <button
                  id="create-new-spreadsheet-btn"
                  onClick={handleCreateNewSpreadsheet}
                  disabled={isConnecting}
                  className="w-full mt-4 bg-[#10b981] hover:bg-[#0b9055] text-slate-950 font-black tracking-wide py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
                >
                  <Sparkles size={13} />
                  CREAR REPOSITORIO GOOGLE SHEET
                </button>
              </div>

              {/* ACTION B: PUSH ACTIVE DB */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition bg-slate-50/40">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                    <UploadCloud size={16} className="text-[#059669]" />
                    Exportar Base de Datos Local [Push]
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Escribe el total actual de claves de Medicamentos, Ventas, Clientes y Compras en la hoja de cálculo de Google. Esto sobrescribirá el histórico del archivo vinculado por completo.
                  </p>
                </div>
                <button
                  id="push-gspreadsheets-btn"
                  onClick={() => {
                    if (!spreadsheetId) {
                      alert('Primero establezca un Spreadsheet ID o cree un repositorio.');
                      return;
                    }
                    const confirmed = window.confirm('⚠️ ADVERTENCIA EXCEL CLOUD:\n\nEsto sobrescribirá todo el contenido de las pestañas "Medicamentos", "Clientes", "Historial_Ventas" y "Compras" de su Google Sheet con la versión actual de la aplicación.\n\n¿Desea continuar?');
                    if (confirmed) pushDataToGoogleSheets(accessToken!, spreadsheetId);
                  }}
                  disabled={!spreadsheetId}
                  className="w-full mt-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition disabled:opacity-50"
                >
                  <UploadCloud size={13} />
                  SOBRESCRIBIR EN GOOGLE SHEETS
                </button>
              </div>

              {/* ACTION C: PULL DATA */}
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition bg-slate-50/40 md:col-span-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-850 uppercase tracking-wide">
                    <DownloadCloud size={16} className="text-cyan-700" />
                    Sincronizar Importación [Pull]
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Descarga en tiempo real la información contenida en la pestaña <strong className="text-slate-800 font-semibold">"Medicamentos"</strong> del Google Sheet activo para importarla como catálogo maestro en la farmacia, permitiendo realizar ediciones cooperativas directas en Google Drive y aplicarlas en la UI local.
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    id="pull-gspreadsheets-btn"
                    onClick={handleImportFromGoogleSheets}
                    disabled={!spreadsheetId}
                    className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition disabled:opacity-50"
                  >
                    <DownloadCloud size={13} />
                    IMPORTAR PRODUCTOS DESDE GOOGLE SHEETS
                  </button>
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border text-center hover:bg-slate-50 border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-lg text-xs inline-flex items-center justify-center gap-1 transition"
                    >
                      Editar en Google Drive <ChevronRight size={13} />
                    </a>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* PROCESS AND CALLS LOGGER VIEW */}
        <div className="bg-[#0f172a] text-[#38bdf8] border border-[#334155] rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-[#1e293b] py-2.5 px-4 border-b border-[#334155] flex items-center justify-between text-[11px] font-bold tracking-widest text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <Terminal size={14} className="text-[#38bdf8]" />
              CONSOLA DE EVENTOS GOOGLE WORKSPACE
            </span>
            <button
              id="clear-logs-btn"
              onClick={() => setConsoleLogs([])}
              className="text-[#64748b] hover:text-[#38bdf8] transition uppercase text-[10px]"
            >
              Borrar logs
            </button>
          </div>

          <div 
            id="workspace-log-viewport"
            className="p-4 font-mono text-[10px] space-y-1.5 max-h-[180px] overflow-y-auto"
          >
            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic text-center py-2">Sin eventos recientes registrados.</div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
