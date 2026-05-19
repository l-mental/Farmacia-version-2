
import React, { useState } from 'react';
import { 
  ShoppingBag, Plus, Search, Filter, RefreshCcw, Calendar, 
  Warehouse, Truck, CheckCircle2, Clock, Ban, FileText, 
  Eye, Lock, Download, ChevronRight, X, Trash2, Pill, User as UserIcon
} from 'lucide-react';
import { Purchase, Supplier, Medication, PurchaseItem, PurchaseStatus } from '@/types';
import { motion, AnimatePresence } from 'motion/react';

interface PurchasesManagerProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  medications: Medication[];
  onRegister: (purchase: Purchase) => void;
  currencySymbol: string;
}

const PurchasesManager: React.FC<PurchasesManagerProps> = ({ 
  purchases, 
  suppliers, 
  medications, 
  onRegister,
  currencySymbol 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // New Purchase Form State
  const [newPurchase, setNewPurchase] = useState<Partial<Purchase>>({
    invoiceNumber: '',
    supplierId: '',
    warehouseName: 'Almacén Principal S1',
    status: 'Completado',
    items: [],
    registrationDate: new Date().toLocaleDateString('es-BO')
  });

  const [newItem, setNewItem] = useState<Partial<PurchaseItem>>({
    medicationId: '',
    quantity: 1,
    costPrice: 0,
    lotNumber: '',
    expiryDate: ''
  });

  const handleAddItem = () => {
    if (!newItem.medicationId || !newItem.quantity || !newItem.costPrice || !newItem.lotNumber || !newItem.expiryDate) {
      alert('Por favor complete todos los campos del producto.');
      return;
    }

    const medication = medications.find(m => m.id === newItem.medicationId);
    if (!medication) return;

    const subtotal = (newItem.quantity || 0) * (newItem.costPrice || 0);
    const item: PurchaseItem = {
      medicationId: medication.id,
      medicationName: medication.name,
      quantity: newItem.quantity || 0,
      costPrice: newItem.costPrice || 0,
      lotNumber: newItem.lotNumber || '',
      expiryDate: newItem.expiryDate || '',
      subtotal
    };

    setNewPurchase(prev => ({
      ...prev,
      items: [...(prev.items || []), item],
      total: (prev.total || 0) + subtotal
    }));

    setNewItem({
      medicationId: '',
      quantity: 1,
      costPrice: 0,
      lotNumber: '',
      expiryDate: ''
    });
  };

  const handleRemoveItem = (index: number) => {
    const itemToRemove = newPurchase.items![index];
    setNewPurchase(prev => ({
      ...prev,
      items: prev.items!.filter((_, i) => i !== index),
      total: (prev.total || 0) - itemToRemove.subtotal
    }));
  };

  const handleSubmitPurchase = () => {
    if (!newPurchase.invoiceNumber || !newPurchase.supplierId || !newPurchase.items?.length) {
      alert('Por favor complete la información básica de la compra y añada al menos un producto.');
      return;
    }

    const supplier = suppliers.find(s => s.id === newPurchase.supplierId);
    
    const completedPurchase: Purchase = {
      id: (purchases.length + 1).toString(),
      timestamp: new Date().toISOString(),
      invoiceNumber: newPurchase.invoiceNumber!,
      supplierId: newPurchase.supplierId!,
      supplierName: supplier?.name || 'Desconocido',
      warehouseName: newPurchase.warehouseName || 'Almacén Principal S1',
      total: newPurchase.total || 0,
      status: newPurchase.status as PurchaseStatus || 'Completado',
      items: newPurchase.items!,
      registrationDate: new Date().toLocaleDateString('es-BO')
    };

    onRegister(completedPurchase);
    setIsAddingNew(false);
    setNewPurchase({
      invoiceNumber: '',
      supplierId: '',
      warehouseName: 'Almacén Principal S1',
      status: 'Completado',
      items: [],
      registrationDate: new Date().toLocaleDateString('es-BO')
    });
  };

  const filteredPurchases = purchases.filter(p => 
    p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: purchases.length,
    completed: purchases.filter(p => p.status === 'Completado').length,
    pending: purchases.filter(p => p.status === 'Pendiente').length,
    canceled: purchases.filter(p => p.status === 'Cancelado').length
  };

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShoppingBag className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Lista de Compras</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión de registros de compras</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddingNew(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-blue-700 px-4 py-2 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
          </div>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input 
              type="text"
              placeholder="Nº de compra..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 col-span-1 md:col-span-3">
             <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20">
                <Filter className="w-3.5 h-3.5" /> Filtrar
             </button>
          </div>
        </div>
      </div>

      {/* Stats and Action Row */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">i</span>
            </div>
            <span className="text-xs font-bold text-slate-600">Total: <span className="font-black text-slate-800">{stats.total} compras</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-600">Completadas: <span className="font-black text-slate-800">{stats.completed}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-300 rounded-full flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-600">Pendientes: <span className="font-black text-slate-800">{stats.pending}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-rose-400 rounded-full flex items-center justify-center">
              <Ban className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-600">Canceladas: <span className="font-black text-slate-800">{stats.canceled}</span></span>
          </div>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-1.5 border border-slate-200 bg-white text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-3 h-3 rotate-180" /> Exportar PDF
          </button>
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-1.5 border border-slate-200 bg-white text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-3 h-3" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">ID</th>
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">Fecha</th>
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">Número</th>
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest">Proveedor</th>
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest text-right">Total</th>
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">Estado</th>
                <th className="px-4 py-2 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-4 py-2 text-[10px] text-center text-slate-600">{purchase.id}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase">
                      {purchase.registrationDate}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[10px] font-bold text-slate-700 text-center">{purchase.invoiceNumber}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                       <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                          <UserIcon className="w-3 h-3 text-blue-500" />
                       </div>
                       <p className="text-[10px] font-black text-slate-800 leading-tight uppercase truncate max-w-[120px]">{purchase.supplierName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-[11px] text-blue-800 font-black">
                      {currencySymbol} {purchase.total.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[8px] font-black inline-flex items-center gap-1 mx-auto shadow-sm">
                       <CheckCircle2 className="w-2.5 h-2.5" /> {purchase.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                       <button 
                         onClick={() => setSelectedPurchase(purchase)}
                         className="p-1 text-slate-300 hover:text-emerald-500 rounded-full transition-all"
                       >
                          <Eye className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Purchase Modal */}
      <AnimatePresence>
        {isAddingNew && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingNew(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Registrar Nueva Compra</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Añadir stock desde proveedores</p>
                  </div>
                </div>
                <button onClick={() => setIsAddingNew(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                    <select 
                      value={newPurchase.supplierId}
                      onChange={e => setNewPurchase({...newPurchase, supplierId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    >
                      <option value="">Seleccionar Proveedor</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Factura / Documento</label>
                    <input 
                      type="text"
                      value={newPurchase.invoiceNumber}
                      onChange={e => setNewPurchase({...newPurchase, invoiceNumber: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                      placeholder="Ej: FAC-12345"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Almacén de Destino</label>
                    <select 
                       value={newPurchase.warehouseName}
                       onChange={e => setNewPurchase({...newPurchase, warehouseName: e.target.value})}
                       className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    >
                       <option>Almacén Principal S1</option>
                       <option>Depósito Secundario</option>
                    </select>
                  </div>
                </div>

                {/* Products Selector */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Añadir Productos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div className="col-span-1 md:col-span-2 space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Medicamento</label>
                       <select 
                        value={newItem.medicationId}
                        onChange={e => setNewItem({...newItem, medicationId: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                       >
                         <option value="">Seleccionar Medicamento</option>
                         {medications.map(m => <option key={m.id} value={m.id}>{m.name} ({m.genericName})</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cantidad (Cajas)</label>
                       <input 
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Costo Unitario (Caja)</label>
                       <input 
                        type="number"
                        min="0"
                        value={newItem.costPrice}
                        onChange={e => setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                       />
                    </div>
                    <button 
                      onClick={handleAddItem}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5 md:hidden" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Añadir</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                     <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº Lote</label>
                       <input 
                        type="text"
                        placeholder="Ej: LOTE-882"
                        value={newItem.lotNumber}
                        onChange={e => setNewItem({...newItem, lotNumber: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha Vencimiento</label>
                       <input 
                        type="date"
                        value={newItem.expiryDate}
                        onChange={e => setNewItem({...newItem, expiryDate: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                       />
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Producto</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cant.</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Costo</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lote/Venc.</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Subtotal</th>
                        <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {newPurchase.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-xs">{item.medicationName}</td>
                          <td className="px-4 py-3 text-xs text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-xs text-right">{currencySymbol} {item.costPrice}</td>
                          <td className="px-4 py-3 text-[10px] text-slate-500">
                             {item.lotNumber} <span className="opacity-50">/</span> {item.expiryDate}
                          </td>
                          <td className="px-4 py-3 text-xs text-right text-blue-600">{currencySymbol} {item.subtotal}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:scale-110 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!newPurchase.items || newPurchase.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs font-bold">No se han añadido productos aún</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                   <span className="text-xs font-black text-blue-800 uppercase tracking-widest">Inversión Total Estimada</span>
                   <span className="text-xl font-black text-blue-600">{currencySymbol} {(newPurchase.total || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 mt-auto">
                <button 
                  onClick={() => setIsAddingNew(false)}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmitPurchase}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Guardar Compra
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details View Modal */}
      <AnimatePresence>
        {selectedPurchase && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedPurchase(null)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
               <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-xl font-black italic uppercase">Detalle de Compra</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Nº {selectedPurchase.invoiceNumber}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedPurchase(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PROVEEDOR</p>
                           <p className="text-sm font-black text-slate-800 uppercase">{selectedPurchase.supplierName}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">FECHA DE REGISTRO</p>
                           <p className="text-sm font-black text-slate-800">{selectedPurchase.timestamp.split('T')[0]}</p>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ALMACÉN</p>
                           <p className="text-sm font-black text-slate-800 uppercase">{selectedPurchase.warehouseName}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ESTADO</p>
                           <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black">
                              {selectedPurchase.status}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">PRODUCTOS RECIBIDOS</p>
                     <div className="space-y-3">
                        {selectedPurchase.items.map((item, i) => (
                           <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Pill className="w-4 h-4 text-blue-600" />
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-slate-800">{item.medicationName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">Cant: {item.quantity} cajas | Lote: {item.lotNumber}</p>
                                 </div>
                              </div>
                              <p className="text-xs font-black text-blue-600">{currencySymbol} {item.subtotal}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">TOTAL DE COMPRE</span>
                     <span className="text-2xl font-black text-blue-600 italic tracking-tighter">
                        {currencySymbol} {selectedPurchase.total.toLocaleString()}
                     </span>
                  </div>
               </div>

               <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button 
                     onClick={() => setSelectedPurchase(null)}
                     className="px-8 py-3 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-800/20 active:scale-95"
                  >
                     Cerrar Detalle
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatBadge = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="flex items-center gap-3 px-4 py-2 border border-slate-200 bg-white rounded-lg shadow-sm">
    {icon}
    <div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">{label}</p>
      <p className="text-[11px] font-black text-slate-700 leading-none">{value}</p>
    </div>
  </div>
);

export default PurchasesManager;

