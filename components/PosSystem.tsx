
import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, User, FileText, AlertCircle, ShieldCheck, X, ChevronUp } from 'lucide-react';
import { Medication, SaleItem, InsurancePlan, PrescriptionData, Customer } from '../types';
import { INSURANCE_PLANS } from '../constants';

interface PosSystemProps {
  medications: Medication[];
  customers: Customer[];
  onCompleteSale: (items: SaleItem[], insurance: InsurancePlan, customer?: Customer, prescription?: PrescriptionData) => void;
  onAddPatient: (patient: Customer) => void;
  currencySymbol: string;
}

const PosSystem: React.FC<PosSystemProps> = ({ medications, customers, onCompleteSale, onAddPatient, currencySymbol }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsurance, setSelectedInsurance] = useState<InsurancePlan>(INSURANCE_PLANS[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionData>({ doctorLicense: '', patientName: '', date: new Date().toISOString().split('T')[0] });
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [newPatientData, setNewPatientData] = useState({ name: '', dni: '' });

  const filteredMeds = medications.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.laboratory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const discount = useMemo(() => subtotal * (selectedInsurance.coveragePercent / 100), [subtotal, selectedInsurance]);
  const total = subtotal - discount;

  const addToCart = (med: Medication, isFractional: boolean) => {
    setCart(prev => {
      const existing = prev.find(item => item.medication.id === med.id && item.isFractional === isFractional);
      const price = isFractional ? med.priceUnit : med.priceBox;
      
      if (existing) {
        return prev.map(item => 
          (item.medication.id === med.id && item.isFractional === isFractional) 
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * price } 
            : item
        );
      }
      return [...prev, { 
        medication: med, 
        quantity: 1, 
        isFractional, 
        selectedBatch: med.batches[0]?.lotNumber || 'N/A', 
        subtotal: price 
      }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    const needsPrescription = cart.some(item => item.medication.isControlled);
    if (needsPrescription && (!prescription.doctorLicense || !prescription.patientName)) {
      alert("Atención: Venta bloqueada. Se requiere completar los datos de la receta para medicamentos controlados.");
      return;
    }
    onCompleteSale(cart, selectedInsurance, selectedCustomer || undefined, needsPrescription ? prescription : undefined);
    
    // Clear state and close cart
    setCart([]);
    setPrescription({ doctorLicense: '', patientName: '', date: '' });
    setSelectedCustomer(null);
    setIsCartMobileOpen(false);
    
    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-100">
      {/* Area de búsqueda y catálogo */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 md:p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar medicamentos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-sm md:text-lg font-medium"
            />
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 md:w-6 md:h-6" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 pb-24 lg:pb-6">
          {filteredMeds.map(med => (
            <div key={med.id} className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-5 border border-slate-200 shadow-sm hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] font-bold text-slate-500 uppercase">{med.laboratory}</div>
                {med.isControlled && <div className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5"/> Controlado</div>}
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight mb-1">{med.name}</h3>
              <p className="text-xs text-slate-400 font-medium mb-4 italic">{med.genericName}</p>
              
              <div className="space-y-2 md:space-y-3">
                <button 
                  onClick={() => addToCart(med, false)}
                  className="w-full flex justify-between items-center p-2.5 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-xs font-bold text-emerald-700">Caja</span>
                  <span className="font-black text-emerald-800 text-sm md:text-base">{currencySymbol}{med.priceBox}</span>
                </button>
                <button 
                  onClick={() => addToCart(med, true)}
                  className="w-full flex justify-between items-center p-2.5 md:p-3 bg-blue-50 rounded-xl md:rounded-2xl hover:bg-blue-100 transition-colors"
                >
                  <span className="text-xs font-bold text-blue-700">Unidad</span>
                  <span className="font-black text-blue-800 text-sm md:text-base">{currencySymbol}{med.priceUnit}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de Venta / Resumen - Desktop & Tablet Sidebar / Mobile Drawer */}
      <div className={`
        fixed md:relative inset-x-0 bottom-0 md:inset-auto z-[80] md:z-10
        w-full md:w-[320px] lg:w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl transition-transform duration-300 transform
        ${isCartMobileOpen ? 'translate-y-0 h-[85vh]' : 'translate-y-full h-0 md:translate-y-0 md:h-full'}
      `}>
        <div className="p-4 md:p-6 bg-slate-900 text-white shrink-0 flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-black flex items-center gap-2">
            <ShoppingBag className="text-emerald-400 w-5 h-5 md:w-6 md:h-6"/> 
            Resumen
          </h2>
          <button onClick={() => setIsCartMobileOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Configuración de Seguro y Paciente */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4">
          <div className="relative">
            <button 
              onClick={() => setIsCustomerSearchOpen(!isCustomerSearchOpen)}
              className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <User className={`w-5 h-5 ${selectedCustomer ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</p>
                  <p className="text-xs font-bold text-slate-800">{selectedCustomer ? selectedCustomer.name : 'Venta General'}</p>
                </div>
              </div>
              {selectedCustomer && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </button>

            {isCustomerSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[90] overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-100 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Buscar paciente..." 
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button 
                    onClick={() => { setIsNewPatientModalOpen(true); setIsCustomerSearchOpen(false); }}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <button 
                    onClick={() => { setSelectedCustomer(null); setIsCustomerSearchOpen(false); }}
                    className="w-full p-3 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 border-b border-slate-50"
                  >
                    Venta General
                  </button>
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.dni.includes(customerSearchTerm)).map(c => (
                    <button 
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setIsCustomerSearchOpen(false); }}
                      className="w-full p-3 text-left hover:bg-emerald-50 transition-colors border-b border-slate-50"
                    >
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">DNI: {c.dni}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {INSURANCE_PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedInsurance(plan)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${selectedInsurance.id === plan.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-white text-slate-500 border border-slate-200'}`}
              >
                {plan.name}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 italic py-10">
              <ShoppingBag className="w-10 h-10 mb-2"/>
              <p className="text-sm">Carrito vacío</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
                <button onClick={() => removeFromCart(i)} className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full"><Trash2 className="w-3 h-3"/></button>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-800 text-xs md:text-sm truncate pr-4">{item.medication.name}</h4>
                  <span className="font-black text-slate-900 text-xs md:text-sm shrink-0">{currencySymbol}{item.subtotal}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">{item.isFractional ? '1 Unidad' : '1 Caja'}</span>
                  <span className="bg-slate-200 px-1.5 rounded font-mono">LOTE: {item.selectedBatch}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y Finalizar */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 space-y-2 md:space-y-3">
          <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-400">
            <span>Subtotal</span>
            <span>{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px] md:text-xs font-bold text-emerald-600">
            <span>Dto. {selectedInsurance.name}</span>
            <span>- {currencySymbol}{discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end py-1">
            <span className="text-slate-900 font-black text-sm md:text-lg">TOTAL</span>
            <span className="text-2xl md:text-3xl font-black text-emerald-700">{currencySymbol}{total.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleComplete}
            disabled={cart.length === 0}
            className="w-full bg-slate-900 hover:bg-black text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-20 text-sm md:text-base"
          >
            Confirmar Cobro <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-400"/>
          </button>
        </div>
      </div>

      {/* Mobile Cart Trigger */}
      {!isCartMobileOpen && cart.length > 0 && (
        <button 
          onClick={() => setIsCartMobileOpen(true)}
          className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[75] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10"
        >
          <div className="bg-emerald-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
            {cart.length}
          </div>
          <span className="text-sm font-bold">Ver Carrito</span>
          <span className="text-emerald-400 font-black">{currencySymbol}{total.toFixed(0)}</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      {/* Quick New Patient Modal */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
              <h2 className="text-xl font-black">Rápido: Nuevo Paciente</h2>
              <button onClick={() => setIsNewPatientModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const patient: Customer = {
                  id: `C${Date.now()}`,
                  name: newPatientData.name,
                  dni: newPatientData.dni,
                  insuranceId: 'PART',
                  history: []
                };
                onAddPatient(patient);
                setSelectedCustomer(patient);
                setIsNewPatientModalOpen(false);
                setNewPatientData({ name: '', dni: '' });
              }}
              className="p-6 space-y-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                <input 
                  type="text" required
                  value={newPatientData.name}
                  onChange={e => setNewPatientData({...newPatientData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI</label>
                <input 
                  type="text" required
                  value={newPatientData.dni}
                  onChange={e => setNewPatientData({...newPatientData, dni: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-medium"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 text-sm uppercase tracking-widest">
                Registrar y Seleccionar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-sm animate-in slide-in-from-top-10 duration-500">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-4">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-sm">¡Venta Confirmada!</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">El registro se ha guardado correctamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosSystem;
