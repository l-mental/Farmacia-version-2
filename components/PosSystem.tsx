
import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, User, FileText, AlertCircle, ShieldCheck, X, ChevronUp, Printer, CreditCard, DollarSign, QrCode, Activity } from 'lucide-react';
import { Medication, SaleItem, InsurancePlan, PrescriptionData, Customer, SaleRecord } from '@/types';
import { INSURANCE_PLANS } from '@/constants';
import { generateBolivianInvoice } from '../lib/invoiceUtils';

interface PosSystemProps {
  medications: Medication[];
  customers: Customer[];
  onCompleteSale: (items: SaleItem[], insurance: InsurancePlan, paymentMethod: any, customer?: Customer, prescription?: PrescriptionData) => SaleRecord;
  onAddPatient: (patient: Customer) => void;
  currencySymbol: string;
  businessQR: string | null;
}

const PosSystem: React.FC<PosSystemProps> = ({ medications, customers, onCompleteSale, onAddPatient, currencySymbol, businessQR }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsurance, setSelectedInsurance] = useState<InsurancePlan>(INSURANCE_PLANS[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR' | 'CARD'>('CASH');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionData>({ doctorLicense: '', patientName: '', date: new Date().toISOString().split('T')[0] });
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

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

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[index] };
      const price = item.isFractional ? item.medication.priceUnit : item.medication.priceBox;
      item.quantity = Math.max(1, item.quantity + delta);
      item.subtotal = item.quantity * price;
      newCart[index] = item;
      return newCart;
    });
  };

  const handleComplete = () => {
    const needsPrescription = cart.some(item => item.medication.isControlled);
    if (needsPrescription && (!prescription.doctorLicense || !prescription.patientName)) {
      alert("Atención: Venta bloqueada. Se requiere completar los datos de la receta para medicamentos controlados.");
      return;
    }
    const sale = onCompleteSale(cart, selectedInsurance, paymentMethod, selectedCustomer || undefined, needsPrescription ? prescription : undefined);
    setLastSale(sale);
    
    // Clear state and close modals
    setCart([]);
    setPrescription({ doctorLicense: '', patientName: '', date: '' });
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setIsCheckoutModalOpen(false);
    setIsCartMobileOpen(false);
    
    // Show success message
    setShowSuccess(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-100">
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 md:gap-6 pb-24 lg:pb-6">
          {filteredMeds.map(med => (
            <div key={med.id} className="group bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 flex flex-col h-fit">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-wider">{med.laboratory}</span>
                {med.isControlled && (
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3 h-3"/> Controlado
                  </span>
                )}
              </div>
              
              <div className="flex-1 mb-6">
                <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors">{med.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{med.genericName}</p>
                
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${med.stockBoxes < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (med.stockBoxes / 50) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{med.stockBoxes} Stock</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => addToCart(med, false)}
                  className="flex flex-col items-center justify-center p-3 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all group/btn"
                >
                  <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 group-hover/btn:opacity-100">Caja</span>
                  <span className="font-black text-sm">{currencySymbol}{med.priceBox}</span>
                </button>
                <button 
                  onClick={() => addToCart(med, true)}
                  className="flex flex-col items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group/btn"
                >
                  <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 group-hover/btn:opacity-100">Unidad</span>
                  <span className="font-black text-sm">{currencySymbol}{med.priceUnit}</span>
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
        ${isCartMobileOpen ? 'translate-y-0 h-[92vh]' : 'translate-y-full h-0 md:translate-y-0 md:h-full'}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 italic py-10">
              <ShoppingBag className="w-10 h-10 mb-2"/>
              <p className="text-sm">Carrito vacío</p>
            </div>
          ) : (
            <>
              {cart.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm relative group animate-in fade-in slide-in-from-right-4 duration-300">
                  <button 
                    onClick={() => removeFromCart(i)} 
                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                  
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-sm truncate pr-2">{item.medication.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.isFractional ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item.isFractional ? 'Unidad' : 'Caja'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold font-mono">LOTE: {item.selectedBatch}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-black text-slate-900 text-sm">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {currencySymbol}{item.isFractional ? item.medication.priceUnit : item.medication.priceBox} c/u
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateCartQuantity(i, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-black text-slate-800 text-sm w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(i, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(i)}
                      className="text-rose-400 hover:text-rose-600 md:hidden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Totales y Finalizar */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 space-y-4 pb-20 md:pb-6">
          <div className="space-y-2 pt-2">
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
          </div>

          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full bg-slate-900 hover:bg-black text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-20 text-sm md:text-base"
          >
            Proceder al Pago <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 rotate-90"/>
          </button>
        </div>
      </div>

      {/* Checkout Modal - Dedicated space for payment and info */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black">Finalizar Venta</h2>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Configuración de cobro y documentos</p>
                </div>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                {/* Columna Izquierda: Datos de Pago y Receta */}
                <div className="space-y-8">
                  {/* Método de Pago */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 1. Método de Pago
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <PaymentMethodBtn 
                        active={paymentMethod === 'CASH'} 
                        onClick={() => setPaymentMethod('CASH')} 
                        label="Efectivo" 
                        icon={<DollarSign className="w-5 h-5" />}
                      />
                      <PaymentMethodBtn 
                        active={paymentMethod === 'QR'} 
                        onClick={() => setPaymentMethod('QR')} 
                        label="Pago QR" 
                        icon={<QrCode className="w-5 h-5" />}
                      />
                      <PaymentMethodBtn 
                        active={paymentMethod === 'CARD'} 
                        onClick={() => setPaymentMethod('CARD')} 
                        label="Tarjeta" 
                        icon={<CreditCard className="w-5 h-5" />}
                      />
                    </div>
                  </div>

                  {/* Sección de Receta (Solo si es necesario) */}
                  {cart.some(item => item.medication.isControlled) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                      <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> 2. Datos de Receta (Controlados)
                      </h3>
                      <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 space-y-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Médico / Matrícula</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Dr. Juan Pérez - MP 12345"
                            value={prescription.doctorLicense}
                            onChange={(e) => setPrescription({...prescription, doctorLicense: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 text-sm font-medium"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Paciente</label>
                          <input 
                            type="text" 
                            placeholder="Nombre completo según receta"
                            value={prescription.patientName}
                            onChange={(e) => setPrescription({...prescription, patientName: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 text-sm font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR de Pago (Si está seleccionado) */}
                  {paymentMethod === 'QR' && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                      <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 3. Escanear QR
                      </h3>
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                        {businessQR ? (
                          <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 mb-4">
                            <img src={businessQR} alt="QR de Pago" className="w-48 h-48 object-contain" />
                          </div>
                        ) : (
                          <div className="w-48 h-48 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2 mb-4">
                            <AlertCircle className="w-8 h-8 opacity-20" />
                            <p className="text-[9px] font-black uppercase text-center px-4">QR no configurado</p>
                          </div>
                        )}
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muestra este QR al cliente</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Resumen de Totales */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> Resumen de Cobro
                  </h3>
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40">
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center opacity-60">
                        <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                        <span className="font-black">{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400">
                        <span className="text-xs font-bold uppercase tracking-widest">Descuento ({selectedInsurance.name})</span>
                        <span className="font-black">- {currencySymbol}{discount.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-white/10 my-4" />
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Total a Pagar</span>
                        <span className="text-4xl font-black text-emerald-400">{currencySymbol}{total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cliente / Paciente</p>
                          <p className="text-sm font-bold">{selectedCustomer ? selectedCustomer.name : 'Venta General'}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Seguro Aplicado</p>
                          <p className="text-sm font-bold">{selectedInsurance.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleComplete}
                    className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-emerald-600/40 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    Confirmar y Finalizar <CheckCircle2 className="w-7 h-7" />
                  </button>
                  <p className="text-[10px] text-slate-400 text-center font-bold italic">Al confirmar, se descontará el stock y se generará la factura.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">¡Venta Exitosa!</h3>
              <p className="text-slate-500 text-sm mb-8">La transacción se ha registrado correctamente en el sistema.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (lastSale) generateBolivianInvoice(lastSale, currencySymbol);
                  }}
                  className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir Factura (Bolivia)
                </button>
                <button 
                  onClick={() => setShowSuccess(false)}
                  className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentMethodBtn = ({ active, onClick, label, icon }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 transition-all ${active ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-600/30 scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default PosSystem;
