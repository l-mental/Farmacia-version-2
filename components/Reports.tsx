import React, { useState } from 'react';
import { 
  BarChart3, Download, FileSpreadsheet, PieChart, TrendingUp, 
  Users, Calendar, ShoppingBag, User, ChevronRight, X, Pill, 
  Clock, CreditCard, Search, ShieldCheck, Printer, Lock, 
  Lightbulb, Store, DollarSign, QrCode, Filter, Receipt, CheckCircle2 
} from 'lucide-react';
import { SaleRecord, PharmacyInfo, User as UserType } from '@/types';
import { DEFAULT_PHARMACY_INFO } from '@/constants';
import { generateBolivianInvoice, generate5x8Invoice, exportSingleInvoiceToExcel, exportInvoicesDetailedToExcel } from '@/lib/invoiceUtils';

interface ReportsProps {
  sales: SaleRecord[];
  currencySymbol: string;
  currentUserRole?: string;
  pharmacyInfo?: PharmacyInfo;
  staff?: UserType[];
}

const Reports: React.FC<ReportsProps> = ({ 
  sales, 
  currencySymbol, 
  currentUserRole = 'ADMIN',
  pharmacyInfo = DEFAULT_PHARMACY_INFO,
  staff = []
}) => {
  const [filterPatient, setFilterPatient] = useState('');
  const [selectedRegister, setSelectedRegister] = useState<'ALL' | 'Caja 1' | 'Caja 2'>('ALL');
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  if (currentUserRole !== 'ADMIN') {
    return (
      <div className="p-6 md:p-10 max-w-4xl mx-auto text-center space-y-8 py-16 animate-in fade-in duration-500">
        <div className="inline-flex bg-amber-500/10 text-amber-500 p-6 rounded-full border border-amber-500/10 shadow-lg shadow-amber-500/5 animate-bounce-subtle">
          <Lock className="w-14 h-14" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Acceso Restringido: <span className="text-emerald-600">Reportes Financieros</span></h2>
          <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-sm">
            Tu usuario actual posee privilegios de <strong className="text-slate-700">Empleado / Cajero</strong>. La consulta de balances consolidados, facturación por cajas y exportación general a Excel está reservada para la gerencia.
          </p>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-2xl p-8 max-w-md mx-auto text-left space-y-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protección de Datos & Seguridad:</p>
          <ul className="space-y-3 text-xs text-slate-600 font-bold">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
              <span>Arqueo y Cierre comparativo de Caja 1 vs Caja 2</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
              <span>Exportación completa de facturas y libros de ventas a Excel (.xlsx)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
              <span>Auditoría de cajeros, usuarios y métodos de cobro</span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400 italic flex items-center justify-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Sugerencia: Puedes usar el selector interactivo de la barra superior para cambiar temporalmente a "Admin" y evaluar este módulo.</span>
        </p>
      </div>
    );
  }

  // Multi-criteria filtering: Register, Cashier, Payment, Search
  const filteredSales = sales.filter(sale => {
    // Filter by Register
    const saleRegister = sale.cashRegister || 'Caja 1';
    if (selectedRegister !== 'ALL' && saleRegister !== selectedRegister) {
      return false;
    }

    // Filter by Cashier
    if (selectedCashier !== 'ALL') {
      const matchUser = sale.userId === selectedCashier || sale.cashierName?.toLowerCase() === selectedCashier.toLowerCase();
      if (!matchUser) return false;
    }

    // Filter by Payment
    if (selectedPayment !== 'ALL' && sale.paymentMethod !== selectedPayment) {
      return false;
    }

    // Search query
    const query = filterPatient.toLowerCase().trim();
    if (!query) return true;

    return (
      sale.customerName?.toLowerCase().includes(query) ||
      sale.clientNit?.toLowerCase().includes(query) ||
      sale.id.toLowerCase().includes(query) ||
      (sale.cashierName && sale.cashierName.toLowerCase().includes(query))
    );
  });

  // Calculate totals
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);

  // Caja 1 Metrics
  const caja1Sales = sales.filter(s => (s.cashRegister || 'Caja 1') === 'Caja 1');
  const caja1Total = caja1Sales.reduce((sum, s) => sum + s.total, 0);
  const caja1Cash = caja1Sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const caja1QR = caja1Sales.filter(s => s.paymentMethod === 'QR').reduce((sum, s) => sum + s.total, 0);
  const caja1Card = caja1Sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.total, 0);
  const caja1Cashiers = Array.from(new Set(caja1Sales.map(s => s.cashierName || s.userId).filter(Boolean)));

  // Caja 2 Metrics
  const caja2Sales = sales.filter(s => s.cashRegister === 'Caja 2');
  const caja2Total = caja2Sales.reduce((sum, s) => sum + s.total, 0);
  const caja2Cash = caja2Sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const caja2QR = caja2Sales.filter(s => s.paymentMethod === 'QR').reduce((sum, s) => sum + s.total, 0);
  const caja2Card = caja2Sales.filter(s => s.paymentMethod === 'CARD').reduce((sum, s) => sum + s.total, 0);
  const caja2Cashiers = Array.from(new Set(caja2Sales.map(s => s.cashierName || s.userId).filter(Boolean)));

  // Unique Cashiers for filter
  const allCashiers = Array.from(new Set(sales.map(s => s.cashierName || s.userId).filter(Boolean)));

  const handleExportAllToExcel = () => {
    const filterTag = selectedRegister === 'ALL' ? 'General_Caja1_y_Caja2' : selectedRegister.replace(/\s+/g, '_');
    exportInvoicesDetailedToExcel(filteredSales, pharmacyInfo, filterTag);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500 pb-24 md:pb-12">
      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Centro de Facturas y Reportes</h1>
              <p className="text-xs text-slate-500">Gestión de facturación por Caja 1 y Caja 2, usuarios, ventas y exportación en Excel.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Main Excel Export Button requested by user */}
          <button 
            onClick={handleExportAllToExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/25 active:scale-95 group"
            title="Exportar todas las facturas y detalles a archivo Excel .xlsx"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
            <span>Exportar Facturas en Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Caja 1 and Caja 2 Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Caja 1 Card */}
        <div className={`p-5 md:p-6 rounded-2xl border-2 transition-all relative overflow-hidden bg-white ${selectedRegister === 'Caja 1' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-500/10' : 'border-slate-200/90 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Punto de Cobro #1</span>
                <h3 className="text-lg font-black text-slate-900">Caja 1</h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedRegister(selectedRegister === 'Caja 1' ? 'ALL' : 'Caja 1')}
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${selectedRegister === 'Caja 1' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {selectedRegister === 'Caja 1' ? 'Filtrando Caja 1' : 'Filtrar Caja 1'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Total Facturado</span>
              <span className="text-xl md:text-2xl font-black text-slate-900">{currencySymbol}{caja1Total.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Ventas Realizadas</span>
              <span className="text-xl md:text-2xl font-black text-emerald-700">{caja1Sales.length} trans.</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Efectivo:</span>
              <span className="font-bold text-slate-800">{currencySymbol}{caja1Cash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold flex items-center gap-1"><QrCode className="w-3.5 h-3.5 text-blue-600" /> Pago QR:</span>
              <span className="font-bold text-slate-800">{currencySymbol}{caja1QR.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-purple-600" /> Tarjeta:</span>
              <span className="font-bold text-slate-800">{currencySymbol}{caja1Card.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1">
              <span className="font-bold uppercase tracking-wider">Cajeros / Usuarios:</span>
              <span className="font-bold text-slate-700 truncate max-w-[180px]">{caja1Cashiers.join(', ') || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Caja 2 Card */}
        <div className={`p-5 md:p-6 rounded-2xl border-2 transition-all relative overflow-hidden bg-white ${selectedRegister === 'Caja 2' ? 'border-emerald-500 shadow-md ring-4 ring-emerald-500/10' : 'border-slate-200/90 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Punto de Cobro #2</span>
                <h3 className="text-lg font-black text-slate-900">Caja 2</h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedRegister(selectedRegister === 'Caja 2' ? 'ALL' : 'Caja 2')}
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${selectedRegister === 'Caja 2' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {selectedRegister === 'Caja 2' ? 'Filtrando Caja 2' : 'Filtrar Caja 2'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Total Facturado</span>
              <span className="text-xl md:text-2xl font-black text-slate-900">{currencySymbol}{caja2Total.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Ventas Realizadas</span>
              <span className="text-xl md:text-2xl font-black text-blue-700">{caja2Sales.length} trans.</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Efectivo:</span>
              <span className="font-bold text-slate-800">{currencySymbol}{caja2Cash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold flex items-center gap-1"><QrCode className="w-3.5 h-3.5 text-blue-600" /> Pago QR:</span>
              <span className="font-bold text-slate-800">{currencySymbol}{caja2QR.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-semibold flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-purple-600" /> Tarjeta:</span>
              <span className="font-bold text-slate-800">{currencySymbol}{caja2Card.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1">
              <span className="font-bold uppercase tracking-wider">Cajeros / Usuarios:</span>
              <span className="font-bold text-slate-700 truncate max-w-[180px]">{caja2Cashiers.join(', ') || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and History Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Interactive Filters Bar */}
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/70 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-base">
                <Calendar className="text-emerald-600 w-5 h-5" /> 
                Historial de Facturas y Ventas Realizadas
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Mostrando {filteredSales.length} comprobantes emitidos por {selectedRegister === 'ALL' ? 'Caja 1 y Caja 2' : selectedRegister}
              </p>
            </div>

            {/* Register Toggle Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setSelectedRegister('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedRegister === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Todas las Cajas ({sales.length})
              </button>
              <button
                onClick={() => setSelectedRegister('Caja 1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedRegister === 'Caja 1' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Caja 1 ({caja1Sales.length})
              </button>
              <button
                onClick={() => setSelectedRegister('Caja 2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedRegister === 'Caja 2' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Caja 2 ({caja2Sales.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por cliente, NIT/CI o N°..." 
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            </div>

            {/* Cashier / User Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedCashier}
                onChange={e => setSelectedCashier(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Usuarios / Cajeros</option>
                {allCashiers.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200 rounded-xl">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedPayment}
                onChange={e => setSelectedPayment(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">Todos los Métodos de Pago</option>
                <option value="CASH">Solo Efectivo</option>
                <option value="QR">Solo Pago QR</option>
                <option value="CARD">Solo Tarjeta</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-5 py-3.5">N° Factura</th>
                <th className="px-5 py-3.5">Fecha y Hora</th>
                <th className="px-5 py-3.5">Caja</th>
                <th className="px-5 py-3.5">Cajero / Usuario</th>
                <th className="px-5 py-3.5">Cliente / Paciente</th>
                <th className="px-5 py-3.5">NIT / CI</th>
                <th className="px-5 py-3.5">Comprobante</th>
                <th className="px-5 py-3.5">Pago</th>
                <th className="px-5 py-3.5 text-right">Total Factura</th>
                <th className="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-8 py-16 text-center text-slate-400 italic font-bold">
                    No se encontraron registros de ventas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const caja = sale.cashRegister || 'Caja 1';
                  const isCaja1 = caja === 'Caja 1';

                  return (
                    <tr 
                      key={sale.id} 
                      onClick={() => setSelectedSale(sale)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group text-xs font-medium text-slate-700"
                    >
                      <td className="px-5 py-3.5 font-mono text-[11px] font-bold text-slate-900">
                        {sale.id.replace(/\D/g, '').substring(0, 7) || sale.id}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-bold">{new Date(sale.timestamp).toLocaleDateString('es-BO')}</span>
                          <span className="text-[10px] text-slate-400">{new Date(sale.timestamp).toLocaleTimeString('es-BO')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${isCaja1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {caja}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {sale.cashierName || sale.userId}
                      </td>
                      <td className="px-5 py-3.5 font-black text-slate-800">
                        {sale.customerName}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {sale.clientNit || '0'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${sale.documentType === 'RECIBO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                          {sale.documentType === 'RECIBO' ? 'Recibo' : 'Factura'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          sale.paymentMethod === 'QR' ? 'bg-emerald-100 text-emerald-800' : 
                          sale.paymentMethod === 'CARD' ? 'bg-purple-100 text-purple-800' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-sm">
                        {currencySymbol}{sale.total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generate5x8Invoice(sale, currencySymbol, pharmacyInfo);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Imprimir Factura 5x8"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportSingleInvoiceToExcel(sale, pharmacyInfo, currencySymbol);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Descargar Factura en Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal with 5x8 Printing and Excel Download */}
      {selectedSale && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 md:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 rounded-xl">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black">Detalle de Comprobante de Venta</h2>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    {selectedSale.documentType === 'RECIBO' ? 'Recibo' : 'Factura'} • {selectedSale.cashRegister || 'Caja 1'} • ID: {selectedSale.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 md:p-7 overflow-y-auto flex-1 no-scrollbar space-y-6">
              {/* Top metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Caja Asignada</p>
                  <p className="font-black text-emerald-700">{selectedSale.cashRegister || 'Caja 1'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cajero / Usuario</p>
                  <p className="font-bold text-slate-800">{selectedSale.cashierName || selectedSale.userId}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                  <p className="font-bold text-slate-800">{new Date(selectedSale.timestamp).toLocaleString('es-BO')}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente / Paciente</p>
                  <p className="font-bold text-slate-800">{selectedSale.customerName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NIT / CI Cliente</p>
                  <p className="font-mono font-bold text-slate-800">{selectedSale.clientNit || '0'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</p>
                  <p className="font-bold text-slate-800">{selectedSale.paymentMethod}</p>
                </div>
              </div>

              {/* Items Sold */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medicamentos Facturados</p>
                <div className="space-y-2">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                          <Pill className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase">{item.medication.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {item.quantity} {item.isFractional ? 'unidades' : 'cajas'} • Lote: <span className="text-emerald-700">{item.selectedBatch}</span>
                          </p>
                        </div>
                      </div>
                      <p className="font-black text-slate-900 text-sm">{currencySymbol}{item.subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-slate-400">Total Liquidado</p>
                  <p className="text-[11px] text-slate-500 font-medium">Comprobante emitido satisfactoriamente</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                  <p className="text-2xl font-black text-emerald-600">{currencySymbol}{selectedSale.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            {/* Modal Action Footer with Requested Print & Export Features */}
            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2.5 shrink-0">
              {/* 5x8 Printing Button */}
              <button 
                onClick={() => generate5x8Invoice(selectedSale, currencySymbol, pharmacyInfo)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Factura 5x8 (Media Carta)</span>
              </button>

              {/* Single Excel Invoice Button */}
              <button 
                onClick={() => exportSingleInvoiceToExcel(selectedSale, pharmacyInfo, currencySymbol)}
                className="py-3 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </button>

              {/* 80mm Ticket Print */}
              <button 
                onClick={() => generateBolivianInvoice(selectedSale, currencySymbol, pharmacyInfo)}
                className="py-3 px-3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                title="Imprimir formato ticket térmico 80mm"
              >
                <Receipt className="w-4 h-4" />
                <span>80mm</span>
              </button>

              <button 
                onClick={() => setSelectedSale(null)}
                className="py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
