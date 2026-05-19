
import React, { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Truck, 
  Phone, CreditCard, MapPin, Calendar, 
  Activity, Save, Upload, Download, Filter, 
  RefreshCw, MoreVertical, Eye, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Supplier } from '@/types';

interface SuppliersManagerProps {
  suppliers: Supplier[];
  onAdd: (supplier: Supplier) => void;
  onUpdate: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

const SuppliersManager: React.FC<SuppliersManagerProps> = ({ suppliers, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    ci: '',
    address: '',
    status: 'active'
  });

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm) ||
    s.ci.includes(searchTerm)
  );

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    inactive: suppliers.filter(s => s.status === 'inactive').length
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '', phone: '', ci: '', address: '', status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toLocaleDateString();
    
    const finalSupplier: Supplier = { 
      ...formData as Supplier, 
      id: editingSupplier ? editingSupplier.id : `PROV-${Date.now()}`,
      registrationDate: editingSupplier ? editingSupplier.registrationDate : now,
      lastUpdate: now
    };
    
    if (editingSupplier) onUpdate(finalSupplier); else onAdd(finalSupplier);
    setIsModalOpen(false);
  };

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
      const now = new Date().toLocaleDateString();

      data.forEach((row: any) => {
        const newSupplier: Supplier = {
          id: `PROV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: row['PROVEEDOR'] || 'Sin Nombre',
          phone: row['TELÉFONO']?.toString() || 'N/A',
          ci: row['CI']?.toString() || 'N/A',
          address: row['DIRECCIÓN'] || 'N/A',
          status: (row['ESTADO']?.toLowerCase() === 'activo' || row['ESTADO'] === 'active') ? 'active' : 'inactive',
          registrationDate: row['REGISTRO'] || now,
          lastUpdate: now
        };
        onAdd(newSupplier);
      });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert(`${data.length} proveedores importados correctamente.`);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'PROVEEDOR': 'Droguería Inti',
        'TELÉFONO': '22233344',
        'CI': '1234567 LP',
        'DIRECCIÓN': 'Av. Blanco Galindo Km 5',
        'ESTADO': 'Activo',
        'REGISTRO': '15/04/2026'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Proveedores");
    XLSX.writeFile(wb, "Plantilla_Proveedores.xlsx");
  };

  return (
    <div className="p-3 md:p-6 bg-slate-50 min-h-full pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
              <Truck className="text-white w-6 h-6"/>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800">Lista de Proveedores</h1>
              <p className="text-slate-400 text-[10px] font-medium">Gestión completa de proveedores</p>
            </div>
          </div>
          <button 
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 text-xs uppercase tracking-widest active:scale-95"
          >
            <Plus className="w-4 h-4"/> Nuevo
          </button>
        </header>

        {/* Filters Card */}
        <div className="bg-blue-700 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
          </div>
          <div className="p-3 bg-white flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Buscar por nombre, teléfono o CI..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
            </div>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 text-white px-3 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2" title="Importar Excel">
                <Upload className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Importar</span>
              </button>
              <button onClick={downloadTemplate} className="bg-amber-500 text-white px-3 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2" title="Descargar Plantilla">
                <Download className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Plantilla</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Teléfono</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">CI</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-xs truncate uppercase">{supplier.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold">ID: {supplier.id.split('-').pop()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                        <Phone className="w-3 h-3 text-emerald-500" /> {supplier.phone}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">{supplier.ci}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${supplier.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                        {supplier.status === 'active' ? '✓ activo' : '✕ inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEditModal(supplier)} className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(supplier.id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center opacity-20">
                        <Truck className="w-16 h-16 mb-4" />
                        <p className="font-black uppercase tracking-widest">No se encontraron proveedores</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 Todos los derechos reservados</p>
            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>POS</span>
              <span>v1.0.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
              <h2 className="text-2xl font-black">{editingSupplier ? 'Editar Proveedor' : 'Registrar Proveedor'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <InputGroup label="Nombre / Razón Social" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Teléfono" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                  <InputGroup label="CI / NIT" value={formData.ci} onChange={v => setFormData({...formData, ci: v})} />
                </div>
                <InputGroup label="Dirección" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-sm uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/30 text-sm uppercase tracking-widest">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, value, onChange, type = "text" }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium" 
    />
  </div>
);

export default SuppliersManager;
