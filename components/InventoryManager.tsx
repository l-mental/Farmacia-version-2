
import React, { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Pill, 
  Package, AlertTriangle, Calendar, Activity, 
  ShieldCheck, Save, Image as ImageIcon, 
  FileText, Hash, DollarSign, ChevronRight,
  Upload, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Medication, Category, Batch } from '@/types';

interface InventoryManagerProps {
  medications: Medication[];
  onAdd: (med: Medication) => void;
  onUpdate: (med: Medication) => void;
  onDelete: (id: string) => void;
  currencySymbol: string;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ medications, onAdd, onUpdate, onDelete, currencySymbol }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      data.forEach((row: any) => {
        const priceBox = parseFloat(row['Precio Caja']) || 0;
        const unitsPerBox = parseInt(row['Unidades por Caja']) || 1;
        const stockBoxes = parseInt(row['Stock Cajas']) || 0;
        const stockUnits = stockBoxes * unitsPerBox;

        const newMed: Medication = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: row['Nombre'] || 'Sin Nombre',
          genericName: row['Nombre Genérico'] || '',
          laboratory: row['Laboratorio'] || '',
          description: row['Descripción'] || '',
          priceBox: priceBox,
          priceUnit: parseFloat((priceBox / unitsPerBox).toFixed(2)),
          unitsPerBox: unitsPerBox,
          category: (row['Categoría'] as Category) || Category.OTHERS,
          imageUrl: row['Imagen URL'] || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
          stockBoxes: stockBoxes,
          stockUnits: stockUnits,
          isControlled: row['Controlado'] === 'SI' || row['Controlado'] === true,
          minStock: parseInt(row['Stock Mínimo']) || 5,
          batches: [
            {
              lotNumber: row['Lote'] || 'L-' + Math.floor(Math.random() * 9000),
              expiryDate: row['Vencimiento'] || '',
              quantity: stockUnits
            }
          ]
        };
        onAdd(newMed);
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert(`${data.length} productos importados correctamente.`);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nombre': 'Paracetamol 500mg',
        'Nombre Genérico': 'Paracetamol',
        'Laboratorio': 'Genfar',
        'Descripción': 'Analgésico y antipirético',
        'Precio Caja': 50.00,
        'Unidades por Caja': 20,
        'Stock Cajas': 10,
        'Categoría': 'ANALGESICOS',
        'Controlado': 'NO',
        'Stock Mínimo': 5,
        'Lote': 'LOT123',
        'Vencimiento': '2025-12-31',
        'Imagen URL': ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Inventario.xlsx");
  };

  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    genericName: '',
    laboratory: '',
    description: '',
    priceBox: 0,
    priceUnit: 0,
    unitsPerBox: 1,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
    stockBoxes: 0,
    stockUnits: 0,
    isControlled: false,
    minStock: 5,
    batches: [{ lotNumber: '', expiryDate: '', quantity: 0 }]
  });

  const filtered = medications.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.genericName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingMed(null);
    setFormData({
      name: '', genericName: '', laboratory: '', description: '',
      priceBox: 0, priceUnit: 0, unitsPerBox: 1,
      category: Category.OTHERS, imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
      stockBoxes: 0, stockUnits: 0, isControlled: false, minStock: 5,
      batches: [{ lotNumber: 'L-' + Math.floor(Math.random() * 9000), expiryDate: '', quantity: 0 }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medication) => {
    setEditingMed(med);
    setFormData(med);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure unit price is calculated if not already
    const priceBox = formData.priceBox || 0;
    const units = formData.unitsPerBox || 1;
    const priceUnit = formData.priceUnit || parseFloat((priceBox / units).toFixed(2));
    
    // Sync first batch quantity with total stock if it's the only batch or being edited
    let finalBatches = [...(formData.batches || [])];
    if (finalBatches.length > 0) {
      const totalUnits = (formData.stockBoxes || 0) * units;
      finalBatches[0] = { ...finalBatches[0], quantity: totalUnits };
    }

    const finalMed: Medication = { 
      ...formData as Medication, 
      priceUnit,
      stockUnits: (formData.stockBoxes || 0) * units,
      batches: finalBatches,
      id: editingMed ? editingMed.id : Date.now().toString() 
    };
    
    if (editingMed) onUpdate(finalMed); else onAdd(finalMed);
    setIsModalOpen(false);
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: 'N/A', color: 'bg-slate-300' };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Vencido', color: 'bg-rose-500' };
    if (diffDays < 90) return { label: 'Próximo', color: 'bg-amber-500' };
    return { label: 'OK', color: 'bg-emerald-500' };
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                <Package className="text-white w-6 h-6 md:w-7 md:h-7"/>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                Inventario
              </h1>
            </div>
            <p className="text-slate-400 text-sm md:text-base font-medium ml-1">
              Gestión inteligente de existencias y trazabilidad de lotes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:min-w-[300px]">
              <input 
                type="text" 
                placeholder="Buscar por nombre o genérico..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm text-sm font-medium"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportExcel} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm shadow-sm active:scale-95"
                title="Importar desde Excel"
              >
                <Upload className="w-4 h-4 text-emerald-600"/> 
                <span className="sm:hidden lg:inline">Importar</span>
              </button>
              
              <button 
                onClick={downloadTemplate}
                className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-600 px-5 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm shadow-sm active:scale-95"
                title="Descargar Plantilla"
              >
                <Download className="w-4 h-4 text-blue-600"/> 
                <span className="sm:hidden lg:inline">Plantilla</span>
              </button>

              <button 
                onClick={openAddModal}
                className="flex-1 sm:flex-none bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 text-sm whitespace-nowrap active:scale-95"
              >
                <Plus className="w-5 h-5 text-emerald-400"/> 
                <span>Nuevo</span>
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-20 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">No se encontraron resultados</h3>
              <p className="text-slate-400 max-w-xs">Intenta ajustar tu búsqueda o agrega un nuevo producto al inventario.</p>
            </div>
          ) : (
            filtered.map(med => (
              <div key={med.id} className="group bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-500 flex flex-col lg:flex-row gap-6 lg:items-center relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                
                <div className="flex items-center gap-5 w-full lg:w-auto lg:min-w-[320px]">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-2xl md:rounded-3xl flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <img src={med.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-widest">{med.category}</span>
                      {med.isControlled && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5"/> Controlado
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{med.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tight truncate">{med.genericName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full flex-1 lg:border-l lg:border-slate-100 lg:pl-8">
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Precio Unitario</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-slate-400">{currencySymbol}</span>
                      <span className="text-xl font-black text-slate-800 tracking-tight">{med.priceUnit}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Existencias</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-base md:text-lg font-black ${med.stockBoxes <= med.minStock ? 'text-rose-600' : 'text-slate-800'}`}>
                        {med.stockBoxes} <span className="text-[10px] opacity-40">CAJAS</span>
                      </span>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-xs font-bold text-slate-400">{med.stockUnits} <span className="text-[8px] opacity-60">UDS</span></span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col justify-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Laboratorio</span>
                    <span className="text-sm font-bold text-slate-600 truncate">{med.laboratory}</span>
                  </div>

                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Vencimiento</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getExpiryStatus(med.batches[0]?.expiryDate).color} shadow-sm`} />
                      <span className="text-sm font-bold text-slate-600">{med.batches[0]?.expiryDate || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 w-full lg:w-auto border-t lg:border-t-0 lg:border-l lg:border-slate-100 pt-5 lg:pt-0 lg:pl-6 justify-end">
                  <button 
                    onClick={() => openEditModal(med)}
                    className="flex-1 lg:flex-none p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100 hover:border-emerald-200 flex items-center justify-center gap-2 font-bold text-xs"
                  >
                    <Edit2 className="w-4 h-4"/>
                    <span className="lg:hidden">Editar</span>
                  </button>
                  <button 
                    onClick={() => onDelete(med.id)}
                    className="flex-1 lg:flex-none p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-slate-100 hover:border-rose-200 flex items-center justify-center gap-2 font-bold text-xs"
                  >
                    <Trash2 className="w-4 h-4"/>
                    <span className="lg:hidden">Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Adaptativo */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-500">
              <div className="p-6 md:p-10 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 rounded-2xl">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black">{editingMed ? 'Editar Producto' : 'Nuevo Medicamento'}</h2>
                    <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Información técnica y existencias</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 no-scrollbar">
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 1. Información General
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Nombre Comercial" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="Ej: Paracetamol 500mg" />
                    <InputGroup label="Nombre Genérico" value={formData.genericName} onChange={v => setFormData({...formData, genericName: v})} placeholder="Ej: Acetaminofén" />
                    <InputGroup label="Laboratorio" value={formData.laboratory} onChange={v => setFormData({...formData, laboratory: v})} placeholder="Ej: Genfar" />
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría Terapéutica</label>
                      <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value as Category})} 
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                      >
                        {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> 2. Imagen y Presentación
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Imagen del Producto</label>
                      <div className="flex gap-6 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <div className="w-24 h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {formData.imageUrl ? (
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="text-slate-200 w-10 h-10" />
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <input 
                            type="text" 
                            placeholder="Pegar URL de imagen..." 
                            value={formData.imageUrl}
                            onChange={v => setFormData({...formData, imageUrl: v.target.value})}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-[10px] font-bold focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFormData({...formData, imageUrl: reader.result as string});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden" 
                              id="image-upload"
                            />
                            <label 
                              htmlFor="image-upload"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                            >
                              <Upload className="w-3.5 h-3.5" /> Subir Local
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-4">
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <input 
                          type="checkbox" 
                          id="isControlled"
                          checked={formData.isControlled}
                          onChange={e => setFormData({...formData, isControlled: e.target.checked})}
                          className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <label htmlFor="isControlled" className="flex flex-col cursor-pointer">
                          <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Medicamento Controlado</span>
                          <span className="text-[10px] text-amber-600 font-medium">Requiere receta médica obligatoria para la venta.</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> 3. Precios y Stock
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100">
                    <InputGroup 
                      label="Precio x Caja" 
                      type="number" 
                      step="0.01"
                      value={formData.priceBox?.toString()} 
                      onChange={v => {
                        const priceBox = parseFloat(v) || 0;
                        const units = formData.unitsPerBox || 1;
                        setFormData({
                          ...formData, 
                          priceBox, 
                          priceUnit: parseFloat((priceBox / units).toFixed(2))
                        });
                      }} 
                    />
                    <InputGroup 
                      label="Uds x Caja" 
                      type="number" 
                      value={formData.unitsPerBox?.toString()} 
                      onChange={v => {
                        const units = parseInt(v) || 1;
                        const priceBox = formData.priceBox || 0;
                        setFormData({
                          ...formData, 
                          unitsPerBox: units, 
                          priceUnit: parseFloat((priceBox / units).toFixed(2))
                        });
                      }} 
                    />
                    <InputGroup 
                      label="Stock (Cajas)" 
                      type="number" 
                      value={formData.stockBoxes?.toString()} 
                      onChange={v => setFormData({...formData, stockBoxes: parseInt(v) || 0})} 
                    />
                    <InputGroup 
                      label="Stock Mínimo" 
                      type="number" 
                      value={formData.minStock?.toString()} 
                      onChange={v => setFormData({...formData, minStock: parseInt(v) || 0})} 
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> 4. Lote y Vencimiento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup label="Número de Lote" value={formData.batches?.[0]?.lotNumber} onChange={v => {
                      const b = [...(formData.batches || [])]; b[0] = {...b[0], lotNumber: v}; setFormData({...formData, batches: b});
                    }} placeholder="Ej: LOT-2024-X" />
                    <InputGroup label="Fecha de Vencimiento" type="date" value={formData.batches?.[0]?.expiryDate} onChange={v => {
                      const b = [...(formData.batches || [])]; b[0] = {...b[0], expiryDate: v}; setFormData({...formData, batches: b});
                    }} />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:flex-1 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-[2rem] text-sm uppercase tracking-widest transition-all">Cancelar</button>
                  <button type="submit" className="w-full md:flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-[2rem] shadow-2xl shadow-emerald-600/30 text-sm uppercase tracking-widest transition-all active:scale-95">
                    {editingMed ? 'Actualizar Producto' : 'Registrar Medicamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const InputGroup = ({ label, value, onChange, type = "text", step, placeholder }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      step={step}
      value={value} 
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm font-bold text-slate-700 transition-all placeholder:text-slate-300" 
    />
  </div>
);

export default InventoryManager;
