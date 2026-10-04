
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, User, 
  FileText, AlertCircle, ShieldCheck, X, ChevronUp, Printer, 
  CreditCard, DollarSign, QrCode, Activity, Receipt, Store, 
  FileSpreadsheet, Clock, AlertTriangle, TrendingUp, Percent, Sparkles, Tag
} from 'lucide-react';
import { Medication, SaleItem, InsurancePlan, PrescriptionData, Customer, SaleRecord, PharmacyInfo, User as UserType } from '@/types';
import { DEFAULT_DISCOUNT_PLANS } from '@/constants';
import { generateBolivianInvoice, generate5x8Invoice, exportSingleInvoiceToExcel } from '../lib/invoiceUtils';

interface PosSystemProps {
  medications: Medication[];
  customers: Customer[];
  onCompleteSale: (
    items: SaleItem[], 
    insurance: InsurancePlan, 
    paymentMethod: any, 
    customer?: Customer, 
    prescription?: PrescriptionData,
    documentType?: 'FACTURA' | 'RECIBO',
    clientNitCi?: string,
    qrVerified?: boolean,
    cashRegisterParam?: 'Caja 1' | 'Caja 2'
  ) => SaleRecord;
  onAddPatient: (patient: Customer) => void;
  currencySymbol: string;
  businessQR: string | null;
  pharmacyInfo?: PharmacyInfo;
  currentUser?: UserType | null;
  activeCashRegister?: 'Caja 1' | 'Caja 2';
  onChangeCashRegister?: (reg: 'Caja 1' | 'Caja 2') => void;
  discountPlans?: InsurancePlan[];
  onAddDiscountPlan?: (plan: Omit<InsurancePlan, 'id'>) => InsurancePlan;
}

const PosSystem: React.FC<PosSystemProps> = ({ 
  medications, 
  customers, 
  onCompleteSale, 
  onAddPatient, 
  currencySymbol, 
  businessQR, 
  pharmacyInfo,
  currentUser,
  activeCashRegister = 'Caja 1',
  onChangeCashRegister,
  discountPlans = DEFAULT_DISCOUNT_PLANS,
  onAddDiscountPlan
}) => {
  const [selectedRegister, setSelectedRegister] = useState<'Caja 1' | 'Caja 2'>(activeCashRegister);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsurance, setSelectedInsurance] = useState<InsurancePlan>(discountPlans[0] || DEFAULT_DISCOUNT_PLANS[0]);
  const [customDiscountType, setCustomDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [customDiscountValue, setCustomDiscountValue] = useState<number | ''>('');
  const [isCustomDiscountModalOpen, setIsCustomDiscountModalOpen] = useState(false);
  const [customDiscountName, setCustomDiscountName] = useState('');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number | ''>(10);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR' | 'CARD'>('CASH');
  const [documentType, setDocumentType] = useState<'FACTURA' | 'RECIBO'>('FACTURA');
  const [clientNitCi, setClientNitCi] = useState<string>('');
  const [qrPaymentConfirmed, setQrPaymentConfirmed] = useState<boolean>(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionData>({ doctorLicense: '', patientName: '', date: new Date().toISOString().split('T')[0] });
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lowStockWarnings, setLowStockWarnings] = useState<{ name: string; remainingBoxes: number; minStock: number }[]>([]);

  const handleRegisterSwitch = (reg: 'Caja 1' | 'Caja 2') => {
    setSelectedRegister(reg);
    if (onChangeCashRegister) {
      onChangeCashRegister(reg);
    }
  };

  const handleSelectCustomer = (cust: Customer | null) => {
    setSelectedCustomer(cust);
    setIsCustomerSearchOpen(false);
    // Auto-apply discount if customer has an assigned insurance or discount plan
    if (cust?.insuranceId) {
      const matched = discountPlans.find(p => p.id === cust.insuranceId);
      if (matched) {
        setSelectedInsurance(matched);
        setCustomDiscountValue('');
      }
    }
  };

  const applyQuickDiscountPercent = (pct: number) => {
    if (pct === 0) {
      setCustomDiscountValue('');
      setSelectedInsurance(discountPlans[0] || DEFAULT_DISCOUNT_PLANS[0]);
    } else {
      setCustomDiscountType('PERCENT');
      setCustomDiscountValue(pct);
    }
  };

  const [newPatientData, setNewPatientData] = useState({ name: '', dni: '' });
  const [visibleLimit, setVisibleLimit] = useState(48);

  useEffect(() => {
    setVisibleLimit(48);
  }, [searchTerm]);

  const filteredMeds = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = term 
      ? medications.filter(m => 
          m.name.toLowerCase().includes(term) || 
          m.genericName.toLowerCase().includes(term) ||
          m.laboratory.toLowerCase().includes(term)
        )
      : medications;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [medications, searchTerm]);

  const displayedMeds = useMemo(() => {
    return filteredMeds.slice(0, visibleLimit);
  }, [filteredMeds, visibleLimit]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

  // Descuento automático o manual
  const discount = useMemo(() => {
    if (customDiscountValue !== '' && typeof customDiscountValue === 'number' && customDiscountValue > 0) {
      if (customDiscountType === 'PERCENT') {
        return parseFloat(((subtotal * Math.min(100, customDiscountValue)) / 100).toFixed(2));
      } else {
        return Math.min(subtotal, customDiscountValue);
      }
    }
    return parseFloat((subtotal * (selectedInsurance.coveragePercent / 100)).toFixed(2));
  }, [subtotal, selectedInsurance, customDiscountValue, customDiscountType]);

  const total = Math.max(0, subtotal - discount);

  // Estimación de Costo Total y Ganancia Neta de la Venta (Apartado de Ganancia)
  const totalCost = useMemo(() => {
    return cart.reduce((sum, item) => {
      const med = item.medication;
      const boxCost = typeof med.costPriceBox === 'number' ? med.costPriceBox : parseFloat(((med.priceBox || 10) * 0.7).toFixed(2));
      const unitCost = typeof med.costPriceUnit === 'number' ? med.costPriceUnit : parseFloat((boxCost / (med.unitsPerBox || 1)).toFixed(2));
      const itemCost = item.isFractional ? unitCost * item.quantity : boxCost * item.quantity;
      return sum + itemCost;
    }, 0);
  }, [cart]);

  const grossProfit = Math.max(0, subtotal - totalCost);
  const netProfitAfterDiscount = total - totalCost;
  const profitMarginPercent = totalCost > 0 ? parseFloat(((netProfitAfterDiscount / totalCost) * 100).toFixed(1)) : 0;

  const addToCart = (med: Medication, isFractional: boolean) => {
    // Find first batch with stock
    const availableBatch = med.batches.find(b => b.quantity > 0) || med.batches[0];
    const selectedBatch = availableBatch?.lotNumber || 'N/A';

    setCart(prev => {
      const existing = prev.find(item => 
        item.medication.id === med.id && 
        item.isFractional === isFractional && 
        item.selectedBatch === selectedBatch
      );
      const price = isFractional ? med.priceUnit : med.priceBox;
      
      const nextQuantity = existing ? existing.quantity + 1 : 1;
      const requiredUnits = isFractional ? nextQuantity : nextQuantity * med.unitsPerBox;

      if (availableBatch && requiredUnits > availableBatch.quantity) {
        setErrorMsg(`Stock insuficiente en el lote ${selectedBatch}. Máximo disponible: ${isFractional ? availableBatch.quantity : Math.floor(availableBatch.quantity / med.unitsPerBox)} ${isFractional ? 'unidades' : 'cajas'}.`);
        return prev;
      }

      setErrorMsg(null);

      if (existing) {
        return prev.map(item => 
          (item.medication.id === med.id && item.isFractional === isFractional && item.selectedBatch === selectedBatch) 
            ? { ...item, quantity: nextQuantity, subtotal: nextQuantity * price } 
            : item
        );
      }
      return [...prev, { 
        medication: med, 
        quantity: 1, 
        isFractional, 
        selectedBatch, 
        subtotal: price 
      }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    setErrorMsg(null);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[index] };
      const price = item.isFractional ? item.medication.priceUnit : item.medication.priceBox;
      
      // Check batch stock
      const batch = item.medication.batches.find(b => b.lotNumber === item.selectedBatch);
      const currentQtyInUnits = item.isFractional ? item.quantity : item.quantity * item.medication.unitsPerBox;
      const deltaInUnits = item.isFractional ? delta : delta * item.medication.unitsPerBox;
      
      if (batch && delta > 0 && (currentQtyInUnits + deltaInUnits) > batch.quantity) {
        setErrorMsg(`Stock insuficiente en el lote ${item.selectedBatch}. Máximo disponible: ${item.isFractional ? batch.quantity : Math.floor(batch.quantity / item.medication.unitsPerBox)} ${item.isFractional ? 'unidades' : 'cajas'}.`);
        return prev;
      }

      setErrorMsg(null);
      item.quantity = Math.max(1, item.quantity + delta);
      item.subtotal = item.quantity * price;
      newCart[index] = item;
      return newCart;
    });
  };

  const updateCartBatch = (index: number, newBatchLot: string) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = { ...newCart[index] };
      
      const targetBatch = item.medication.batches.find(b => b.lotNumber === newBatchLot);
      if (!targetBatch) return prev;

      // Check if another item in cart already has this medication + fractional + new batch
      const existingIndex = prev.findIndex((it, idx) => 
        idx !== index && 
        it.medication.id === item.medication.id && 
        it.isFractional === item.isFractional && 
        it.selectedBatch === newBatchLot
      );

      const totalQtyToAssign = existingIndex !== -1 ? item.quantity + prev[existingIndex].quantity : item.quantity;
      const totalQtyToAssignInUnits = item.isFractional ? totalQtyToAssign : totalQtyToAssign * item.medication.unitsPerBox;

      if (totalQtyToAssignInUnits > targetBatch.quantity) {
        setErrorMsg(`No se puede cambiar al lote ${newBatchLot}. El stock total requerido (${totalQtyToAssign} ${item.isFractional ? 'unidades' : 'cajas'}) supera el stock disponible de ese lote (${item.isFractional ? targetBatch.quantity : Math.floor(targetBatch.quantity / item.medication.unitsPerBox)}).`);
        return prev;
      }

      setErrorMsg(null);

      if (existingIndex !== -1) {
        // Merge them
        const existingItem = { ...newCart[existingIndex] };
        existingItem.quantity += item.quantity;
        existingItem.subtotal = existingItem.quantity * (item.isFractional ? item.medication.priceUnit : item.medication.priceBox);
        newCart[existingIndex] = existingItem;
        return newCart.filter((_, idx) => idx !== index);
      }

      item.selectedBatch = newBatchLot;
      newCart[index] = item;
      return newCart;
    });
  };

  const handleComplete = () => {
    const needsPrescription = cart.some(item => item.medication.isControlled);
    if (needsPrescription && (!prescription.doctorLicense || !prescription.patientName)) {
      setErrorMsg("Atención: Venta bloqueada. Se requiere completar los datos de la receta para medicamentos controlados.");
      return;
    }

    if (paymentMethod === 'QR' && !qrPaymentConfirmed) {
      setErrorMsg("Atención: Para pagos por QR, debe verificar y confirmar la recepción del pago antes de emitir la factura o recibo.");
      return;
    }

    const finalNitCi = clientNitCi.trim() || selectedCustomer?.dni || '0';
    
    // Check if any sold item drops below minimum stock
    const warnings: { name: string; remainingBoxes: number; minStock: number }[] = [];
    cart.forEach(item => {
      const med = item.medication;
      const soldUnits = item.isFractional ? item.quantity : item.quantity * med.unitsPerBox;
      const remainingUnits = Math.max(0, med.stockUnits - soldUnits);
      const remainingBoxes = Math.floor(remainingUnits / med.unitsPerBox);
      if (remainingBoxes <= med.minStock) {
        if (!warnings.some(w => w.name === med.name)) {
          warnings.push({
            name: med.name,
            remainingBoxes,
            minStock: med.minStock
          });
        }
      }
    });
    setLowStockWarnings(warnings);

    const effectiveInsurance: InsurancePlan = (customDiscountValue !== '' && typeof customDiscountValue === 'number' && customDiscountValue > 0)
      ? {
          id: 'custom-' + Date.now(),
          name: customDiscountType === 'PERCENT' ? `Dto. ${customDiscountValue}%` : `Dto. ${currencySymbol}${customDiscountValue}`,
          coveragePercent: subtotal > 0 ? parseFloat(((discount / subtotal) * 100).toFixed(1)) : 0
        }
      : selectedInsurance;

    const sale = onCompleteSale(
      cart, 
      effectiveInsurance, 
      paymentMethod, 
      selectedCustomer || undefined, 
      needsPrescription ? prescription : undefined,
      documentType,
      finalNitCi,
      paymentMethod === 'QR' ? true : undefined,
      selectedRegister
    );
    setLastSale(sale);
    
    // Clear state and close modals
    setErrorMsg(null);
    setCart([]);
    setCustomDiscountValue('');
    setPrescription({ doctorLicense: '', patientName: '', date: '' });
    setSelectedCustomer(null);
    setPaymentMethod('CASH');
    setDocumentType('FACTURA');
    setClientNitCi('');
    setQrPaymentConfirmed(false);
    setIsCheckoutModalOpen(false);
    setIsCartMobileOpen(false);
    
    // Show success message
    setShowSuccess(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-100">
      {/* Area de búsqueda y catálogo */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-3 md:p-5 bg-white border-b border-slate-200 sticky top-0 z-10 space-y-3">
          {/* Top Register & Cashier Selection Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                Punto de Venta:
              </span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleRegisterSwitch('Caja 1')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    selectedRegister === 'Caja 1'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3 h-3" />
                  <span>Caja 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRegisterSwitch('Caja 2')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    selectedRegister === 'Caja 2'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3 h-3" />
                  <span>Caja 2</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cajero:</span>
                <span className="font-bold text-slate-700">{currentUser?.name || 'Cajero'}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar medicamentos por nombre, principio activo o laboratorio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-sm font-medium"
            />
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6">
          {displayedMeds.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-1">Catálogo de Venta Vacío</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                No hay medicamentos registrados o coincidentes. Registra nuevos productos (como Mentisan) en la sección de Inventario para comenzar a facturar.
              </p>
              <a
                href="/inventory"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Ir a Inventario
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 md:gap-6">
              {displayedMeds.map(med => {
                const firstBatch = med.batches[0];
                const expTime = firstBatch?.expiryDate ? new Date(firstBatch.expiryDate).getTime() : null;
                const now = Date.now();
                const isExpired = expTime ? expTime < now : false;
                const isNearExpiry = expTime && !isExpired ? (expTime - now < 90 * 86400000) : false;

                return (
                  <div key={med.id} className="group bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-200 flex flex-col h-fit">
                <div className="mb-3">
                  <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-wider">{med.laboratory || 'GENÉRICO'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase">{med.category}</span>
                      {med.isControlled && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-2.5 h-2.5"/> CTRL
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base font-black text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors line-clamp-2 uppercase">{med.name}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1 truncate">{med.genericName}</p>
                </div>

                {/* Expiration and Batch Alerts Tag */}
                <div className="mb-3">
                  {isExpired ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[9px] font-black">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>LOTE VENCIDO: {firstBatch?.expiryDate}</span>
                    </div>
                  ) : isNearExpiry ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[9px] font-black">
                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>VENCE PRONTO: {firstBatch?.expiryDate}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 px-1">
                      <span>Lote: {firstBatch?.lotNumber || 'N/A'}</span>
                      <span>Venc: {firstBatch?.expiryDate || 'N/A'}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${med.stockBoxes < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, (med.stockBoxes / 50) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{med.stockBoxes} Cajas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                      +{med.profitMarginPercent ?? (med.costPriceBox ? Math.round(((med.priceBox - med.costPriceBox) / med.costPriceBox) * 100) : 38)}% ganancia
                    </span>
                    <span className="text-[9px] font-medium text-slate-400">
                      Costo: {currencySymbol}{(med.costPriceBox || med.priceBox * 0.7).toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => addToCart(med, false)}
                    className="flex flex-col items-center justify-center p-3 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all group/btn active:scale-95"
                  >
                    <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 group-hover/btn:opacity-100">Caja</span>
                    <span className="font-black text-sm">{currencySymbol}{med.priceBox}</span>
                  </button>
                  <button 
                    onClick={() => addToCart(med, true)}
                    className="flex flex-col items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group/btn active:scale-95"
                  >
                    <span className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 group-hover/btn:opacity-100">Unidad</span>
                    <span className="font-black text-sm">{currencySymbol}{med.priceUnit}</span>
                  </button>
                </div>
              </div>
            );
          })}
            </div>
          )}

          {filteredMeds.length > visibleLimit && (
            <div className="py-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleLimit(prev => prev + 48)}
                className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl shadow-sm transition-all active:scale-95"
              >
                Cargar más medicamentos (Mostrando {displayedMeds.length} de {filteredMeds.length})
              </button>
            </div>
          )}
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
                    onClick={() => handleSelectCustomer(null)}
                    className="w-full p-3 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 border-b border-slate-50"
                  >
                    Venta General
                  </button>
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.dni.includes(customerSearchTerm)).map(c => (
                    <button 
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
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

          {/* Descuentos Automáticos y Rápidos para el Cajero */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-600" />
                Descuento de Venta:
              </span>
              {discount > 0 && (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  -{currencySymbol}{discount.toFixed(2)} {customDiscountType === 'PERCENT' && customDiscountValue !== '' ? `(${customDiscountValue}%)` : ''}
                </span>
              )}
            </div>

            {/* Chips de Descuento Rápido (1 Clic) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
              {[0, 5, 10, 15, 20, 25, 30].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyQuickDiscountPercent(pct)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all shrink-0 ${
                    (customDiscountType === 'PERCENT' && customDiscountValue === pct) || (pct === 0 && customDiscountValue === '' && selectedInsurance.coveragePercent === 0)
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pct === 0 ? 'Sin Dto' : `${pct}%`}
                </button>
              ))}
            </div>

            {/* Entrada directa o manual de descuento por el cajero */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step={customDiscountType === 'PERCENT' ? '1' : '0.5'}
                  placeholder={customDiscountType === 'PERCENT' ? 'Ingresar otro %' : `Monto fijo en ${currencySymbol}`}
                  value={customDiscountValue === '' ? '' : customDiscountValue}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                    setCustomDiscountValue(val);
                  }}
                  className="w-full pl-2.5 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  title="El vendedor puede escribir cualquier descuento directamente"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                  {customDiscountType === 'PERCENT' ? '%' : currencySymbol}
                </span>
              </div>

              {/* Selector % o Monto Fijo */}
              <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomDiscountType('PERCENT')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                    customDiscountType === 'PERCENT' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Descuento en porcentaje (%)"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setCustomDiscountType('FIXED')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                    customDiscountType === 'FIXED' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Descuento en dinero (${currencySymbol})`}
                >
                  {currencySymbol}
                </button>
              </div>
            </div>

            {/* Planes de descuento registrados (Jubilado, Seguro, etc.) */}
            {discountPlans.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pt-1 border-t border-slate-200/60">
                <span className="text-[9px] font-bold text-slate-400 shrink-0">Planes:</span>
                {discountPlans.filter(p => p.coveragePercent > 0).map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedInsurance(plan);
                      setCustomDiscountValue('');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap shrink-0 ${
                      selectedInsurance.id === plan.id && customDiscountValue === ''
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {plan.name} ({plan.coveragePercent}%)
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-xs text-rose-900 uppercase tracking-wider">Error de Validación</p>
                <p className="text-xs font-bold leading-relaxed mt-0.5">{errorMsg}</p>
              </div>
              <button 
                onClick={() => setErrorMsg(null)} 
                className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
                aria-label="Cerrar advertencia"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

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
                  
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-sm truncate pr-2 uppercase">{item.medication.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.isFractional ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item.isFractional ? 'Unidad' : 'Caja'}
                        </span>
                        <select 
                          value={item.selectedBatch}
                          onChange={(e) => updateCartBatch(i, e.target.value)}
                          className="text-[9px] text-slate-500 font-bold font-mono bg-slate-50 border-none outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                        >
                          {item.medication.batches.map(b => (
                            <option key={b.lotNumber} value={b.lotNumber}>
                              LOTE: {b.lotNumber} ({item.isFractional ? b.quantity : Math.floor(b.quantity / item.medication.unitsPerBox)} disp.)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-black text-slate-900 text-sm">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">
                        {currencySymbol}{item.isFractional ? item.medication.priceUnit : item.medication.priceBox} c/u
                      </span>
                      {(() => {
                        const itemCost = item.isFractional
                          ? (typeof item.medication.costPriceUnit === 'number' ? item.medication.costPriceUnit : ((item.medication.priceUnit || 1) * 0.7))
                          : (typeof item.medication.costPriceBox === 'number' ? item.medication.costPriceBox : ((item.medication.priceBox || 10) * 0.7));
                        const itemGain = Math.max(0, item.subtotal - (itemCost * item.quantity));
                        return (
                          <span className="text-[9px] text-emerald-600 font-extrabold flex items-center justify-end gap-0.5 mt-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            +{currencySymbol}{itemGain.toFixed(2)} ganancia
                          </span>
                        );
                      })()}
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
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 space-y-3 pb-20 md:pb-6">
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-400">
              <span>Subtotal</span>
              <span>{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[10px] md:text-xs font-bold text-emerald-600">
                <span>Descuento aplicado</span>
                <span>- {currencySymbol}{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end py-1 border-t border-slate-200/80">
              <span className="text-slate-900 font-black text-sm md:text-lg">TOTAL A COBRAR</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-700">{currencySymbol}{total.toFixed(2)}</span>
            </div>
          </div>

          {/* APARTADO DE GANANCIA DE ESTA VENTA */}
          {cart.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-1.5 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Apartado de Ganancia:
                </span>
                <span className="font-black text-emerald-800 text-sm">
                  +{currencySymbol}{netProfitAfterDiscount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold border-t border-emerald-200/70 pt-1.5">
                <span>Costo mercadería: {currencySymbol}{totalCost.toFixed(2)}</span>
                <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                  +{profitMarginPercent}% margen neto
                </span>
              </div>
              {netProfitAfterDiscount <= 0 && totalCost > 0 && (
                <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 pt-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Advertencia: El descuento iguala o supera el costo de compra.
                </p>
              )}
            </div>
          )}

          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full bg-slate-900 hover:bg-black text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-20 text-sm md:text-base shadow-lg shadow-slate-900/10 active:scale-[0.99]"
          >
            Proceder al Pago <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 rotate-90"/>
          </button>
        </div>
      </div>

      {/* Checkout Modal - Dedicated space for payment and info */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-5 md:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 rounded-xl">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black">Finalizar Venta</h2>
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Configuración de cobro y documentos</p>
                </div>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 no-scrollbar">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-in fade-in duration-300">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-extrabold text-xs text-rose-900 uppercase tracking-wider">Error de Validación</p>
                    <p className="text-xs font-bold leading-relaxed mt-1">{errorMsg}</p>
                  </div>
                  <button 
                    onClick={() => setErrorMsg(null)} 
                    className="text-rose-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-100 transition-colors shrink-0"
                    aria-label="Cerrar advertencia"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                {/* Columna Izquierda: Datos de Pago y Receta */}
                <div className="space-y-6">
                  {/* Tipo de Comprobante: Factura vs Recibo */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> 1. Tipo de Comprobante
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDocumentType('FACTURA')}
                        className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          documentType === 'FACTURA'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>Factura Oficial</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocumentType('RECIBO')}
                        className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          documentType === 'RECIBO'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Receipt className="w-4 h-4 text-amber-400" />
                        <span>Solo Recibo (Sin Factura)</span>
                      </button>
                    </div>

                    {/* NIT o CI del Cliente */}
                    <div className="flex flex-col gap-1 mt-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {documentType === 'FACTURA' ? 'NIT o CI para la Factura' : 'CI o Doc. para el Recibo'}
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 8492019 o 0 para Sin NIT"
                        value={clientNitCi}
                        onChange={(e) => setClientNitCi(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 2. Método de Pago
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <PaymentMethodBtn 
                        active={paymentMethod === 'CASH'} 
                        onClick={() => { setPaymentMethod('CASH'); setQrPaymentConfirmed(false); }} 
                        label="Efectivo" 
                        icon={<DollarSign className="w-5 h-5" />}
                      />
                      <PaymentMethodBtn 
                        active={paymentMethod === 'QR'} 
                        onClick={() => { setPaymentMethod('QR'); setQrPaymentConfirmed(false); }} 
                        label="Pago QR" 
                        icon={<QrCode className="w-5 h-5" />}
                      />
                      <PaymentMethodBtn 
                        active={paymentMethod === 'CARD'} 
                        onClick={() => { setPaymentMethod('CARD'); setQrPaymentConfirmed(false); }} 
                        label="Tarjeta" 
                        icon={<CreditCard className="w-5 h-5" />}
                      />
                    </div>
                  </div>

                  {/* Sección de Receta (Solo si es necesario) */}
                  {cart.some(item => item.medication.isControlled) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                      <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> 3. Datos de Receta (Controlados)
                      </h3>
                      <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100 space-y-4">
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

                  {/* QR de Pago con Confirmación Obligatoria */}
                  {paymentMethod === 'QR' && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                      <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 4. Pago por QR (Verificación Requerida)
                      </h3>
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 flex flex-col items-center">
                        <div className="text-center mb-3">
                          <p className="text-xs font-extrabold text-slate-700">Monto exacto a transferir:</p>
                          <p className="text-2xl font-black text-emerald-600">{currencySymbol}{total.toFixed(2)}</p>
                        </div>

                        {businessQR ? (
                          <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 mb-4">
                            <img src={businessQR} alt="QR de Pago" className="w-44 h-44 object-contain" />
                          </div>
                        ) : (
                          <div className="w-44 h-44 bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 mb-4">
                            <AlertCircle className="w-8 h-8 opacity-20" />
                            <p className="text-[9px] font-black uppercase text-center px-4">QR no configurado</p>
                          </div>
                        )}

                        <p className="text-[10px] font-bold text-slate-500 text-center mb-4 max-w-xs">
                          Pide al cliente que escanee el código QR y complete el pago en su app bancaria.
                        </p>

                        {!qrPaymentConfirmed ? (
                          <button
                            type="button"
                            onClick={() => {
                              setQrPaymentConfirmed(true);
                              setErrorMsg(null);
                            }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Confirmar Pago QR Recibido
                          </button>
                        ) : (
                          <div className="w-full p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-center gap-2 text-xs font-black animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
                            <span>Pago QR Verificado (Listo para emitir {documentType === 'FACTURA' ? 'Factura' : 'Recibo'})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Resumen de Totales */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> Resumen de Cobro
                  </h3>
                  <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-slate-900/30">
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center opacity-60">
                        <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                        <span className="font-black">{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Descuento {customDiscountValue !== '' ? `(${customDiscountType === 'PERCENT' ? `${customDiscountValue}%` : `${currencySymbol}${customDiscountValue}`})` : `(${selectedInsurance.name})`}
                          </span>
                          <span className="font-black">- {currencySymbol}{discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="h-px bg-white/10 my-4" />
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-black uppercase tracking-[0.2em]">Total a Pagar</span>
                        <span className="text-3xl md:text-4xl font-black text-emerald-400">{currencySymbol}{total.toFixed(2)}</span>
                      </div>

                      {/* Apartado de Ganancia en Modal de Cobro */}
                      <div className="mt-3 p-3 bg-white/10 rounded-xl border border-white/15 flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          Ganancia Neta de esta Venta:
                        </span>
                        <span className="font-black text-white text-sm">
                          +{currencySymbol}{netProfitAfterDiscount.toFixed(2)} ({profitMarginPercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Cliente / Paciente</p>
                          <p className="text-xs font-bold">{selectedCustomer ? selectedCustomer.name : 'Venta General'}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Documento a Emitir</p>
                          <p className="text-xs font-bold">{documentType === 'FACTURA' ? 'Factura Oficial de Venta' : 'Solo Recibo (Sin Factura)'}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Seguro Aplicado</p>
                          <p className="text-xs font-bold">{selectedInsurance.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleComplete}
                    disabled={paymentMethod === 'QR' && !qrPaymentConfirmed}
                    className={`w-full py-4 rounded-xl font-black text-sm md:text-base uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${
                      paymentMethod === 'QR' && !qrPaymentConfirmed
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {paymentMethod === 'QR' && !qrPaymentConfirmed
                      ? 'Confirme Pago QR para Emitir'
                      : documentType === 'FACTURA'
                      ? 'Confirmar y Emitir Factura'
                      : 'Confirmar y Emitir Recibo'}
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                  <p className="text-[10px] text-slate-400 text-center font-bold italic">
                    Al confirmar, se descontará el stock y se generará {documentType === 'FACTURA' ? 'la factura oficial con el nombre de la farmacia' : 'el recibo de venta'}.
                  </p>
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
                  insuranceId: 'NONE',
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
              <button type="submit" className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 text-sm uppercase tracking-wider">
                Registrar y Seleccionar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Custom Discount Modal */}
      {isCustomDiscountModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">Crear Descuento Personalizado</h2>
                <p className="text-xs text-slate-400">Para aplicar en caja y ventas</p>
              </div>
              <button onClick={() => setIsCustomDiscountModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!customDiscountName.trim()) {
                  alert('Por favor escribe un nombre para el descuento.');
                  return;
                }
                const pct = Number(customDiscountPercent) || 0;
                if (pct < 0 || pct > 100) {
                  alert('El porcentaje debe estar entre 0% y 100%.');
                  return;
                }
                const newPlanData = {
                  name: `${customDiscountName.trim()} (${pct}%)`,
                  coveragePercent: pct
                };
                if (onAddDiscountPlan) {
                  const created = onAddDiscountPlan(newPlanData);
                  setSelectedInsurance(created);
                } else {
                  const created: InsurancePlan = { id: 'DSC_' + Date.now().toString(36), ...newPlanData };
                  setSelectedInsurance(created);
                }
                setIsCustomDiscountModalOpen(false);
                setCustomDiscountName('');
                setCustomDiscountPercent(10);
              }}
              className="p-6 space-y-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Nombre del Descuento
                </label>
                <input 
                  type="text" required
                  placeholder="Ej: Descuento Vecinal, Promo Primavera"
                  value={customDiscountName}
                  onChange={e => setCustomDiscountName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Porcentaje de Descuento (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" required min="0" max="100" step="1"
                    placeholder="10"
                    value={customDiscountPercent}
                    onChange={e => setCustomDiscountPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">%</span>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 text-xs uppercase tracking-wider transition-all"
              >
                Guardar y Aplicar Descuento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-1">¡Venta Exitosa!</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-[11px] font-black uppercase tracking-wider text-slate-700 mb-3">
                {lastSale?.documentType === 'RECIBO' ? (
                  <>
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    <span>Recibo de Venta Emitido</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Factura Oficial Emitida</span>
                  </>
                )}
              </div>
              <p className="text-slate-500 text-xs mb-3">La transacción se ha registrado en <strong>{lastSale?.cashRegister || selectedRegister}</strong> y el stock ha sido descontado correctamente.</p>
              
              {/* Notificación de Stock Mínimo Alcanzado */}
              {lowStockWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-left space-y-1.5 mb-4 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ Alerta: Stock Mínimo Alcanzado</span>
                  </div>
                  <div className="space-y-1">
                    {lowStockWarnings.map((w, idx) => (
                      <p key={idx} className="text-[11px] text-amber-950 font-bold pl-5 leading-tight">
                        • <strong>{w.name}</strong>: quedan solo <span className="underline font-black">{w.remainingBoxes} cajas</span> (Mínimo: {w.minStock} cajas).
                      </p>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-700 italic pl-5 font-semibold">
                    Notificación registrada. Reponga inventario para evitar quiebre de stock.
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                {/* 5x8 Invoice Button */}
                <button 
                  onClick={() => {
                    if (lastSale) generate5x8Invoice(lastSale, currencySymbol, pharmacyInfo);
                  }}
                  className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all text-xs uppercase tracking-wider group"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Formato 5x8 (Media Carta)</span>
                  <span className="px-1.5 py-0.5 bg-emerald-800 text-[9px] rounded text-emerald-100">5x8 pulg</span>
                </button>

                {/* Excel Download Button */}
                <button 
                  onClick={() => {
                    if (lastSale) exportSingleInvoiceToExcel(lastSale, pharmacyInfo, currencySymbol);
                  }}
                  className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black rounded-xl hover:bg-emerald-100 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Descargar Factura en Excel (.xlsx)</span>
                </button>

                {/* 80mm Thermal Ticket Button */}
                <button 
                  onClick={() => {
                    if (lastSale) generateBolivianInvoice(lastSale, currencySymbol, pharmacyInfo);
                  }}
                  className="w-full py-2 bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>Imprimir Ticket Térmico (80mm)</span>
                </button>

                <button 
                  onClick={() => setShowSuccess(false)}
                  className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all text-xs mt-2"
                >
                  Continuar Nueva Venta
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
    className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all ${active ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default PosSystem;
