
import React, { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, PieChart, TrendingUp, Users, Calendar, ShoppingBag, User, ChevronRight, X, Pill, Clock, CreditCard, Search, ShieldCheck, Printer } from 'lucide-react';
import { SaleRecord } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface ReportsProps {
  sales: SaleRecord[];
  currencySymbol: string;
}

const Reports: React.FC<ReportsProps> = ({ sales, currencySymbol }) => {
  const [filterPatient, setFilterPatient] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  const filteredSales = sales.filter(sale => 
    sale.customerName?.toLowerCase().includes(filterPatient.toLowerCase()) ||
    sale.id.toLowerCase().includes(filterPatient.toLowerCase())
  );

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);

  const exportToExcel = () => {
    const data = filteredSales.map(sale => ({
      'ID Venta': sale.id,
      'Fecha': new Date(sale.timestamp).toLocaleDateString(),
      'Hora': new Date(sale.timestamp).toLocaleTimeString(),
      'Paciente': sale.customerName,
      'Vendedor': sale.userId,
      'Seguro': sale.insuranceName,
      'Items': sale.items.length,
      'Total': sale.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    XLSX.writeFile(workbook, `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateReceiptPDF = (sale: SaleRecord) => {
    // Receipt size: 80mm width, dynamic height
    // jspdf uses points (1mm = 2.83465 points)
    const width = 80;
    const height = 150 + (sale.items.length * 10);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [width, height]
    });

    const margin = 5;
    let y = 10;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FARMASALUD', width / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    doc.text('RUC: 20123456789', width / 2, y, { align: 'center' });
    y += 4;
    doc.text('Av. Salud 123 - Lima', width / 2, y, { align: 'center' });
    y += 6;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, y, width - margin, y);
    y += 6;

    // Sale Info
    doc.setFontSize(7);
    doc.text(`TICKET: ${sale.id}`, margin, y);
    y += 4;
    doc.text(`FECHA: ${new Date(sale.timestamp).toLocaleString()}`, margin, y);
    y += 4;
    doc.text(`VENDEDOR: ${sale.userId}`, margin, y);
    y += 4;
    doc.text(`PACIENTE: ${sale.customerName}`, margin, y);
    y += 6;

    doc.line(margin, y, width - margin, y);
    y += 6;

    // Items Header
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPCION', margin, y);
    doc.text('CANT', width - 25, y, { align: 'right' });
    doc.text('TOTAL', width - margin, y, { align: 'right' });
    y += 4;
    doc.setFont('helvetica', 'normal');

    // Items
    sale.items.forEach(item => {
      const name = item.medication.name.substring(0, 20);
      doc.text(name, margin, y);
      doc.text(item.quantity.toString(), width - 25, y, { align: 'right' });
      doc.text(`${currencySymbol}${item.subtotal.toFixed(2)}`, width - margin, y, { align: 'right' });
      y += 4;
    });

    y += 2;
    doc.line(margin, y, width - margin, y);
    y += 6;

    // Totals
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', margin, y);
    doc.text(`${currencySymbol}${sale.total.toFixed(2)}`, width - margin, y, { align: 'right' });
    y += 8;

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('¡Gracias por su preferencia!', width / 2, y, { align: 'center' });
    y += 4;
    doc.text('Conserve su ticket para cualquier reclamo', width / 2, y, { align: 'center' });

    doc.save(`Ticket_${sale.id}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">Centro de Reportes</h2>
          <p className="text-sm text-slate-500">Análisis de rendimiento, rentabilidad y trazabilidad sanitaria.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Exportar Excel</span>
          </button>
          <button 
            onClick={() => {
              if (filteredSales.length > 0) {
                // For general report, we could generate a different PDF, 
                // but the user asked for a "gasoline style" invoice for printing.
                // Usually that's per sale. If they click this main button,
                // maybe we show a message or generate a summary.
                // Let's make it generate a summary report for now,
                // but the "invoice" style will be in the detail view.
                alert("Para imprimir una factura estilo ticket, por favor seleccione una venta específica de la lista.");
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos Totales</p>
              <h3 className="text-2xl font-black text-slate-800">{currencySymbol}{totalRevenue.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Realizadas</p>
              <h3 className="text-2xl font-black text-slate-800">{filteredSales.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pacientes Únicos</p>
              <h3 className="text-2xl font-black text-slate-800">
                {new Set(filteredSales.map(s => s.customerId).filter(Boolean)).size}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Calendar className="text-emerald-600 w-5 h-5" /> Historial de Ventas
          </h3>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Buscar por paciente o ID..." 
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">ID Venta</th>
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Seguro</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center text-slate-400 italic font-bold">No se encontraron registros de ventas.</td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr 
                    key={sale.id} 
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500">{sale.id}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      <div className="flex flex-col">
                        <span>{new Date(sale.timestamp).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400">{new Date(sale.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-slate-800">{sale.customerName}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                      {sale.userId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter">{sale.insuranceName}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-700">{currencySymbol}{sale.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Detalle de Venta</h2>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">ID: {selectedSale.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(selectedSale.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paciente</p>
                      <p className="text-sm font-bold text-slate-700">{selectedSale.customerName}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seguro / Cobertura</p>
                      <p className="text-sm font-bold text-slate-700">{selectedSale.insuranceName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendedor</p>
                      <p className="text-sm font-bold text-slate-700">ID: {selectedSale.userId}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Productos Vendidos</p>
                <div className="space-y-2">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100">
                          <Pill className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.medication.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {item.quantity} {item.isFractional ? 'unidades' : 'cajas'} • Lote: {item.selectedBatch}
                          </p>
                        </div>
                      </div>
                      <p className="font-black text-slate-900">{currencySymbol}{item.subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold text-slate-400">Resumen de Pago</p>
                  <p className="text-sm text-slate-500">Venta procesada satisfactoriamente</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pagado</p>
                  <p className="text-3xl font-black text-emerald-600">{currencySymbol}{selectedSale.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
              <button 
                onClick={() => generateReceiptPDF(selectedSale)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                <Printer className="w-4 h-4" /> Imprimir Factura
              </button>
              <button 
                onClick={() => setSelectedSale(null)}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
