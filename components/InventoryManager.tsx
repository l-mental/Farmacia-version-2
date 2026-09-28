import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Pill, 
  Package, AlertTriangle, Calendar, Activity, 
  ShieldCheck, Save, Image as ImageIcon, 
  FileText, Hash, DollarSign, ChevronRight, ChevronLeft,
  ChevronsLeft, ChevronsRight,
  Upload, Download, Lock, AlertOctagon, Clock,
  ArrowDownRight, ArrowUpRight, Zap, Check,
  Sparkles, RefreshCw, Layers, CheckCircle2,
  ChevronDown, ChevronUp, Tag, FileSpreadsheet,
  ArrowUpDown, Printer, TrendingUp, Percent
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Medication, Category, Batch, User, canUserEditInventory, PharmacyInfo } from '@/types';
import { printCriticalInventoryReport } from '@/lib/printAlertsReport';
import { 
  COMMON_MEDICATIONS_PRESETS, 
  generateAutoLot, 
  getDatePlusYears, 
  getDatePlusMonths,
  getCategoryDefaultImage,
  MedicationPreset
} from '@/services/commonMeds';

interface InventoryManagerProps {
  medications: Medication[];
  onAdd: (med: Medication) => void;
  onBatchAdd?: (meds: Medication[]) => void;
  onReplaceAll?: (meds: Medication[]) => void;
  onClearInventory?: () => void;
  onUpdate: (med: Medication) => void;
  onDelete: (id: string) => void;
  currencySymbol: string;
  currentUser?: User;
  currentUserRole?: 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST' | 'CUSTOM';
  pharmacyInfo?: PharmacyInfo;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ 
  medications, 
  onAdd, 
  onBatchAdd,
  onReplaceAll,
  onClearInventory,
  onUpdate, 
  onDelete, 
  currencySymbol, 
  currentUser,
  currentUserRole = 'ADMIN',
  pharmacyInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXPIRED' | 'SHORT' | 'LONG' | 'MIN_STOCK' | 'MAX_STOCK'>('ALL');
  
  // Pagination State for high performance (supporting up to 2000+ products)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showClearModal, setShowClearModal] = useState(false);
  const [importModeModal, setImportModeModal] = useState<{ isOpen: boolean; pendingMeds: Medication[] }>({
    isOpen: false,
    pendingMeds: []
  });

  // Sort Order State - Default ALWAYS Alphabetical Order (A-Z) as requested
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'STOCK_ASC' | 'STOCK_DESC' | 'EXPIRY_ASC'>('A-Z');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'QUICK' | 'DETAILED'>('QUICK');
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  
  // Quick restock modal state
  const [restockMed, setRestockMed] = useState<Medication | null>(null);
  const [restockBoxes, setRestockBoxes] = useState<number>(5);
  const [restockLot, setRestockLot] = useState<string>('');
  const [restockExpiry, setRestockExpiry] = useState<string>('');

  // Quick Inline Top Bar state
  const [showQuickBar, setShowQuickBar] = useState(true);
  const [quickName, setQuickName] = useState('');
  const [quickCostPriceBox, setQuickCostPriceBox] = useState<number | ''>(25);
  const [quickProfitPercent, setQuickProfitPercent] = useState<number | ''>(40);
  const [quickPriceBox, setQuickPriceBox] = useState<number | ''>(35);
  const [quickBoxes, setQuickBoxes] = useState<number | ''>(10);
  const [quickUnitsPerBox, setQuickUnitsPerBox] = useState<number>(20);
  const [quickLot, setQuickLot] = useState<string>(() => generateAutoLot());
  const [quickExpiry, setQuickExpiry] = useState<string>(() => getDatePlusYears(2));
  const [quickSuggestionsOpen, setQuickSuggestionsOpen] = useState(false);

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManageInventory = currentUser 
    ? canUserEditInventory(currentUser) 
    : (currentUserRole === 'ADMIN' || currentUserRole === 'PHARMACIST');

  // Excel import supporting bulk uploads of up to 2000+ items
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageInventory) {
      alert('Acceso restringido: Los cajeros no pueden manipular ni importar inventarios.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showToast('El archivo Excel no contiene filas de medicamentos.');
          return;
        }

        const newMeds: Medication[] = data.map((row: any, idx: number) => {
          const priceBox = parseFloat(row['Precio Caja']) || 0;
          const unitsPerBox = parseInt(row['Unidades por Caja']) || 1;
          const stockBoxes = parseInt(row['Stock Cajas']) || 0;
          const stockUnits = stockBoxes * unitsPerBox;

          return {
            id: (Date.now() + idx).toString() + Math.random().toString(36).substr(2, 6),
            name: row['Nombre'] || 'Sin Nombre',
            genericName: row['Nombre Genérico'] || '',
            laboratory: row['Laboratorio'] || '',
            description: row['Descripción'] || '',
            priceBox: priceBox,
            priceUnit: parseFloat((priceBox / unitsPerBox).toFixed(2)),
            unitsPerBox: unitsPerBox,
            category: (row['Categoría'] as Category) || Category.OTHERS,
            imageUrl: row['Imagen URL'] || getCategoryDefaultImage((row['Categoría'] as Category) || Category.OTHERS),
            stockBoxes: stockBoxes,
            stockUnits: stockUnits,
            isControlled: row['Controlado'] === 'SI' || row['Controlado'] === true,
            minStock: parseInt(row['Stock Mínimo']) || 5,
            maxStock: parseInt(row['Stock Máximo']) || 50,
            batches: [
              {
                lotNumber: row['Lote'] || generateAutoLot(),
                expiryDate: row['Vencimiento'] || getDatePlusYears(2),
                quantity: stockUnits
              }
            ]
          };
        });

        if (onBatchAdd) {
          onBatchAdd(newMeds);
        } else {
          newMeds.forEach(m => onAdd(m));
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast(`¡Éxito! ${newMeds.length} productos procesados e integrados al catálogo.`);
      } catch (err) {
        console.error(err);
        showToast('Error al procesar el archivo Excel. Verifique el formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Nombre': 'Paracetamol 500mg',
        'Nombre Genérico': 'Acetaminofén',
        'Laboratorio': 'Genfar',
        'Descripción': 'Analgésico y antipirético',
        'Precio Caja': 25.00,
        'Unidades por Caja': 20,
        'Stock Cajas': 10,
        'Categoría': 'Analgésicos',
        'Controlado': 'NO',
        'Stock Mínimo': 5,
        'Stock Máximo': 50,
        'Lote': 'LOT-26-A101',
        'Vencimiento': getDatePlusYears(2),
        'Imagen URL': ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Inventario.xlsx");
  };

  // Form State for Modal
  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    genericName: '',
    laboratory: '',
    description: '',
    costPriceBox: 20,
    costPriceUnit: 1.0,
    profitMarginPercent: 50,
    priceBox: 30,
    priceUnit: 1.5,
    unitsPerBox: 20,
    category: Category.OTHERS,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
    stockBoxes: 10,
    stockUnits: 200,
    isControlled: false,
    minStock: 5,
    maxStock: 50,
    batches: [{ lotNumber: generateAutoLot(), expiryDate: getDatePlusYears(2), quantity: 200 }]
  });

  // Check if current typed name matches an existing inventory medication
  const matchedExistingMedInModal = useMemo(() => {
    if (!formData.name || !formData.name.trim() || editingMed) return null;
    const clean = formData.name.trim().toLowerCase();
    return medications.find(m => m.name.toLowerCase() === clean);
  }, [formData.name, medications, editingMed]);

  const matchedExistingMedInQuickBar = useMemo(() => {
    if (!quickName || !quickName.trim()) return null;
    const clean = quickName.trim().toLowerCase();
    return medications.find(m => m.name.toLowerCase() === clean);
  }, [quickName, medications]);

  // Autocomplete / Filtered common presets
  const filteredPresetsForModal = useMemo(() => {
    if (!formData.name || !formData.name.trim()) return COMMON_MEDICATIONS_PRESETS.slice(0, 8);
    const q = formData.name.toLowerCase();
    return COMMON_MEDICATIONS_PRESETS.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.genericName.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [formData.name]);

  const filteredPresetsForQuickBar = useMemo(() => {
    if (!quickName || !quickName.trim()) return COMMON_MEDICATIONS_PRESETS.slice(0, 6);
    const q = quickName.toLowerCase();
    return COMMON_MEDICATIONS_PRESETS.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.genericName.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [quickName]);

  const applyPresetToModal = (preset: MedicationPreset) => {
    const priceBox = preset.priceBox;
    const units = preset.unitsPerBox;
    const currentBoxes = formData.stockBoxes || 10;
    const costBox = preset.costPriceBox || parseFloat((preset.priceBox * 0.7).toFixed(2));
    const profit = preset.profitMarginPercent || (costBox > 0 ? parseFloat((((preset.priceBox - costBox) / costBox) * 100).toFixed(1)) : 40);
    const costUnit = parseFloat((costBox / units).toFixed(2));

    setFormData(prev => ({
      ...prev,
      name: preset.name,
      genericName: preset.genericName,
      category: preset.category,
      laboratory: preset.laboratory,
      unitsPerBox: units,
      costPriceBox: costBox,
      costPriceUnit: costUnit,
      profitMarginPercent: profit,
      priceBox: priceBox,
      priceUnit: parseFloat((priceBox / units).toFixed(2)),
      description: preset.description,
      imageUrl: preset.imageUrl,
      isControlled: preset.isControlled,
      stockBoxes: currentBoxes,
      stockUnits: currentBoxes * units,
      batches: [
        {
          lotNumber: prev.batches?.[0]?.lotNumber || generateAutoLot(),
          expiryDate: prev.batches?.[0]?.expiryDate || getDatePlusYears(2),
          quantity: currentBoxes * units
        }
      ]
    }));
  };

  const applyPresetToQuickBar = (preset: MedicationPreset) => {
    const costBox = preset.costPriceBox || parseFloat((preset.priceBox * 0.7).toFixed(2));
    const profit = preset.profitMarginPercent || (costBox > 0 ? parseFloat((((preset.priceBox - costBox) / costBox) * 100).toFixed(1)) : 40);
    setQuickName(preset.name);
    setQuickCostPriceBox(costBox);
    setQuickProfitPercent(profit);
    setQuickPriceBox(preset.priceBox);
    setQuickUnitsPerBox(preset.unitsPerBox);
    setQuickSuggestionsOpen(false);
  };

  // Expiration calculations
  const getExpiryCategory = (expiryDate?: string): 'EXPIRED' | 'SHORT' | 'LONG' | 'NONE' => {
    if (!expiryDate) return 'NONE';
    const expiry = new Date(expiryDate).getTime();
    if (isNaN(expiry)) return 'NONE';
    const diff = expiry - new Date().getTime();
    if (diff < 0) return 'EXPIRED';
    if (diff < 90 * 24 * 60 * 60 * 1000) return 'SHORT';
    return 'LONG';
  };

  const getDaysUntilExpiry = (expiryDate?: string): number | null => {
    if (!expiryDate) return null;
    const time = new Date(expiryDate).getTime();
    if (isNaN(time)) return null;
    return Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (expiryDate: string) => {
    const cat = getExpiryCategory(expiryDate);
    const days = getDaysUntilExpiry(expiryDate);
    if (cat === 'EXPIRED') {
      return { 
        label: 'Vencido', 
        color: 'bg-rose-500', 
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        detail: days !== null ? `Vencido hace ${Math.abs(days)}d` : 'Vencido'
      };
    }
    if (cat === 'SHORT') {
      return { 
        label: 'Venc. Corto (<90d)', 
        color: 'bg-amber-500', 
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        detail: days !== null ? `Vence en ${days}d` : 'Próximo'
      };
    }
    if (cat === 'LONG') {
      return { 
        label: 'Vigente', 
        color: 'bg-emerald-500', 
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        detail: days !== null ? `Vence en ${days}d` : 'Vigente'
      };
    }
    return { label: 'S/F', color: 'bg-slate-300', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200', detail: 'Sin fecha' };
  };

  // Alert Counts
  const expiredCount = medications.filter(m => getExpiryCategory(m.batches[0]?.expiryDate) === 'EXPIRED').length;
  const shortCount = medications.filter(m => getExpiryCategory(m.batches[0]?.expiryDate) === 'SHORT').length;
  const minStockCount = medications.filter(m => m.stockBoxes <= m.minStock).length;
  const maxStockCount = medications.filter(m => m.maxStock && m.stockBoxes >= m.maxStock).length;

  const filtered = medications.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.laboratory && m.laboratory.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const expCat = getExpiryCategory(m.batches[0]?.expiryDate);
    if (filterType === 'EXPIRED') return expCat === 'EXPIRED';
    if (filterType === 'SHORT') return expCat === 'SHORT';
    if (filterType === 'LONG') return expCat === 'LONG';
    if (filterType === 'MIN_STOCK') return m.stockBoxes <= m.minStock;
    if (filterType === 'MAX_STOCK') return m.maxStock && m.stockBoxes >= m.maxStock;

    return true;
  });

  const sortedAndFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === 'A-Z') {
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      }
      if (sortOrder === 'Z-A') {
        return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
      }
      if (sortOrder === 'STOCK_ASC') {
        return a.stockBoxes - b.stockBoxes;
      }
      if (sortOrder === 'STOCK_DESC') {
        return b.stockBoxes - a.stockBoxes;
      }
      if (sortOrder === 'EXPIRY_ASC') {
        const dateA = a.batches[0]?.expiryDate ? new Date(a.batches[0].expiryDate).getTime() : Infinity;
        const dateB = b.batches[0]?.expiryDate ? new Date(b.batches[0].expiryDate).getTime() : Infinity;
        return dateA - dateB;
      }
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });
  }, [filtered, sortOrder]);

  // Automatically reset to page 1 on filter or search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFiltered.length / pageSize));
  const paginatedMeds = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFiltered.slice(start, start + pageSize);
  }, [sortedAndFiltered, currentPage, pageSize]);

  const openAddModal = () => {
    if (!canManageInventory) {
      alert('Acceso restringido: Los cajeros no tienen permisos para crear medicamentos en el inventario.');
      return;
    }
    setEditingMed(null);
    setModalMode('QUICK'); // Always open in Quick Mode for fastest, simplest entry!
    setFormData({
      name: '',
      genericName: '',
      laboratory: 'Laboratorio Genérico',
      description: 'Medicamento registrado para venta en mostrador.',
      costPriceBox: 20,
      costPriceUnit: 1.0,
      profitMarginPercent: 50,
      priceBox: 30,
      priceUnit: 1.5,
      unitsPerBox: 20,
      category: Category.OTHERS,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
      stockBoxes: 10,
      stockUnits: 200,
      isControlled: false,
      minStock: 5,
      maxStock: 50,
      batches: [{ lotNumber: generateAutoLot(), expiryDate: getDatePlusYears(2), quantity: 200 }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medication) => {
    if (!canManageInventory) {
      alert('Acceso restringido: Los cajeros no tienen permisos para editar medicamentos en el inventario.');
      return;
    }
    setEditingMed(med);
    setModalMode('DETAILED'); // When editing, detailed mode allows full adjustments
    const costBox = med.costPriceBox ?? parseFloat(((med.priceBox || 30) * 0.7).toFixed(2));
    const units = med.unitsPerBox || 20;
    const costUnit = med.costPriceUnit ?? parseFloat((costBox / units).toFixed(2));
    const profit = med.profitMarginPercent ?? (costBox > 0 ? parseFloat(((((med.priceBox || 30) - costBox) / costBox) * 100).toFixed(1)) : 40);

    setFormData({
      ...med,
      costPriceBox: costBox,
      costPriceUnit: costUnit,
      profitMarginPercent: profit,
      maxStock: med.maxStock || 50,
      batches: med.batches && med.batches.length > 0 ? med.batches : [{ lotNumber: generateAutoLot(), expiryDate: getDatePlusYears(2), quantity: med.stockUnits }]
    });
    setIsModalOpen(true);
  };

  // Open Quick Restock Modal for an existing medication
  const openRestockModal = (med: Medication) => {
    if (!canManageInventory) {
      alert('Acceso restringido: Los cajeros no pueden manipular el inventario.');
      return;
    }
    setRestockMed(med);
    setRestockBoxes(5);
    setRestockLot(generateAutoLot());
    setRestockExpiry(getDatePlusYears(2));
  };

  const handleConfirmRestock = () => {
    if (!restockMed) return;
    if (restockBoxes <= 0) {
      alert('Por favor ingrese una cantidad mayor a 0 cajas.');
      return;
    }
    if (!restockLot.trim()) {
      alert('El número de lote es obligatorio.');
      return;
    }
    if (!restockExpiry) {
      alert('La fecha de vencimiento es obligatoria.');
      return;
    }

    const unitsAdded = restockBoxes * restockMed.unitsPerBox;
    const newBatch: Batch = {
      lotNumber: restockLot.trim(),
      expiryDate: restockExpiry,
      quantity: unitsAdded
    };

    const updatedMed: Medication = {
      ...restockMed,
      stockBoxes: restockMed.stockBoxes + restockBoxes,
      stockUnits: restockMed.stockUnits + unitsAdded,
      batches: [newBatch, ...restockMed.batches]
    };

    onUpdate(updatedMed);
    showToast(`✅ Se sumaron ${restockBoxes} cajas a "${restockMed.name}" con lote ${restockLot}.`);
    setRestockMed(null);
  };

  // Submit in Modal (Save or Save & Add Another)
  const handleSaveModal = (addAnother = false) => {
    if (!canManageInventory) {
      alert('Acceso bloqueado: Los cajeros no pueden manipular el inventario.');
      return;
    }

    if (!formData.name?.trim()) {
      alert('Por favor ingrese el nombre del medicamento.');
      return;
    }

    // Validation: Lote and Vencimiento
    const firstLot = formData.batches?.[0]?.lotNumber?.trim();
    const firstExpiry = formData.batches?.[0]?.expiryDate?.trim();

    if (!firstLot) {
      alert('Error: El Número de Lote es obligatorio para registrar o actualizar el medicamento.');
      return;
    }

    if (!firstExpiry) {
      alert('Error: La Fecha de Vencimiento del lote es obligatoria.');
      return;
    }

    const priceBox = Number(formData.priceBox) || 0;
    const units = Number(formData.unitsPerBox) || 1;
    const priceUnit = Number(formData.priceUnit) || parseFloat((priceBox / units).toFixed(2));
    const stockBoxes = Number(formData.stockBoxes) || 0;
    const totalUnits = stockBoxes * units;

    let finalBatches = [...(formData.batches || [])];
    if (finalBatches.length > 0) {
      finalBatches[0] = { 
        ...finalBatches[0], 
        lotNumber: firstLot,
        expiryDate: firstExpiry,
        quantity: totalUnits 
      };
    } else {
      finalBatches = [{ lotNumber: firstLot, expiryDate: firstExpiry, quantity: totalUnits }];
    }

    // Check if adding and it already exists
    if (!editingMed && matchedExistingMedInModal) {
      const confirmAdd = confirm(
        `"${matchedExistingMedInModal.name}" ya existe en el inventario con ${matchedExistingMedInModal.stockBoxes} cajas.\n\n¿Deseas sumar estas ${stockBoxes} cajas al producto existente en lugar de duplicarlo?`
      );
      if (confirmAdd) {
        const updatedMed: Medication = {
          ...matchedExistingMedInModal,
          stockBoxes: matchedExistingMedInModal.stockBoxes + stockBoxes,
          stockUnits: matchedExistingMedInModal.stockUnits + totalUnits,
          batches: [
            { lotNumber: firstLot, expiryDate: firstExpiry, quantity: totalUnits },
            ...matchedExistingMedInModal.batches
          ]
        };
        onUpdate(updatedMed);
        showToast(`✅ Se sumaron ${stockBoxes} cajas al producto existente "${matchedExistingMedInModal.name}".`);
        if (addAnother) {
          resetModalForNext();
        } else {
          setIsModalOpen(false);
        }
        return;
      }
    }

    const costPriceBox = typeof formData.costPriceBox === 'number' ? formData.costPriceBox : parseFloat((priceBox * 0.7).toFixed(2));
    const costPriceUnit = typeof formData.costPriceUnit === 'number' ? formData.costPriceUnit : parseFloat((costPriceBox / units).toFixed(2));
    const profitMarginPercent = typeof formData.profitMarginPercent === 'number' 
      ? formData.profitMarginPercent 
      : (costPriceBox > 0 ? parseFloat((((priceBox - costPriceBox) / costPriceBox) * 100).toFixed(1)) : 40);

    const finalMed: Medication = { 
      id: editingMed ? editingMed.id : Date.now().toString() + Math.random().toString(36).substring(2, 6),
      name: formData.name.trim(),
      genericName: formData.genericName?.trim() || formData.name.trim(),
      laboratory: formData.laboratory?.trim() || 'Laboratorio Farmacéutico',
      description: formData.description?.trim() || 'Medicamento registrado.',
      costPriceBox,
      costPriceUnit,
      profitMarginPercent,
      priceBox,
      priceUnit,
      unitsPerBox: units,
      category: formData.category || Category.OTHERS,
      imageUrl: formData.imageUrl || getCategoryDefaultImage(formData.category || Category.OTHERS),
      stockBoxes,
      stockUnits: totalUnits,
      isControlled: Boolean(formData.isControlled),
      minStock: formData.minStock ?? 5,
      maxStock: formData.maxStock ?? 50,
      batches: finalBatches
    };

    if (editingMed) {
      onUpdate(finalMed);
      showToast(`✅ Medicamento "${finalMed.name}" actualizado correctamente.`);
    } else {
      onAdd(finalMed);
      showToast(`✅ Medicamento "${finalMed.name}" registrado en inventario.`);
    }

    if (addAnother) {
      resetModalForNext();
    } else {
      setIsModalOpen(false);
    }
  };

  const resetModalForNext = () => {
    setFormData({
      name: '',
      genericName: '',
      laboratory: 'Laboratorio Genérico',
      description: 'Medicamento registrado.',
      costPriceBox: 20,
      costPriceUnit: 1.0,
      profitMarginPercent: 50,
      priceBox: 30,
      priceUnit: 1.5,
      unitsPerBox: 20,
      category: Category.OTHERS,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
      stockBoxes: 10,
      stockUnits: 200,
      isControlled: false,
      minStock: 5,
      maxStock: 50,
      batches: [{ lotNumber: generateAutoLot(), expiryDate: getDatePlusYears(2), quantity: 200 }]
    });
  };

  // Submit from Inline Quick Bar
  const handleQuickBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory) {
      alert('Acceso restringido: Los cajeros no pueden manipular el inventario.');
      return;
    }

    if (!quickName.trim()) {
      alert('Por favor escribe el nombre del medicamento en la barra rápida.');
      return;
    }

    const priceBox = Number(quickPriceBox) || 0;
    const boxes = Number(quickBoxes) || 0;
    const unitsPerBox = quickUnitsPerBox || 20;
    const units = boxes * unitsPerBox;
    const priceUnit = parseFloat((priceBox / unitsPerBox).toFixed(2));
    const lot = quickLot.trim() || generateAutoLot();
    const expiry = quickExpiry || getDatePlusYears(2);

    // If matches existing medication, restock it directly
    if (matchedExistingMedInQuickBar) {
      const updatedMed: Medication = {
        ...matchedExistingMedInQuickBar,
        stockBoxes: matchedExistingMedInQuickBar.stockBoxes + boxes,
        stockUnits: matchedExistingMedInQuickBar.stockUnits + units,
        batches: [
          { lotNumber: lot, expiryDate: expiry, quantity: units },
          ...matchedExistingMedInQuickBar.batches
        ]
      };
      onUpdate(updatedMed);
      showToast(`⚡ Stock sumado a "${matchedExistingMedInQuickBar.name}": +${boxes} cajas (${units} uds).`);
    } else {
      // Find preset if any
      const preset = COMMON_MEDICATIONS_PRESETS.find(p => p.name.toLowerCase() === quickName.trim().toLowerCase());
      
      const newMed: Medication = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        name: quickName.trim(),
        genericName: preset?.genericName || quickName.trim(),
        laboratory: preset?.laboratory || 'Laboratorio Farmacéutico',
        description: preset?.description || 'Ingreso rápido de almacén.',
        priceBox,
        priceUnit,
        unitsPerBox,
        category: preset?.category || Category.OTHERS,
        imageUrl: preset?.imageUrl || getCategoryDefaultImage(preset?.category || Category.OTHERS),
        stockBoxes: boxes,
        stockUnits: units,
        isControlled: preset?.isControlled || false,
        minStock: 5,
        maxStock: 50,
        batches: [
          {
            lotNumber: lot,
            expiryDate: expiry,
            quantity: units
          }
        ]
      };
      onAdd(newMed);
      showToast(`⚡ ¡Medicamento "${newMed.name}" ingresado al inventario con éxito!`);
    }

    // Reset quick bar inputs for next item
    setQuickName('');
    setQuickPriceBox(35);
    setQuickBoxes(10);
    setQuickLot(generateAutoLot());
    setQuickExpiry(getDatePlusYears(2));
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 bg-slate-50 min-h-full pb-28 md:pb-12 relative">
      {/* Toast message notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[150] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 animate-in slide-in-from-top-4 duration-300">
          <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold">{toastMessage}</p>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-2.5 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
                <Package className="text-white w-5 h-5 md:w-6 md:h-6"/>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                    Control de Stock e Inventario
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Capacidad: 2,000+ Prod.
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] md:text-xs font-medium">
                  Catálogo de medicamentos, control de lotes y fechas de vencimiento.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {canManageInventory && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button 
                  onClick={() => setShowQuickBar(!showQuickBar)}
                  className={`p-2.5 md:px-3.5 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs shadow-sm border active:scale-95 ${
                    showQuickBar 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Mostrar/Ocultar Barra de Carga Rápida"
                >
                  <Zap className={`w-3.5 h-3.5 ${showQuickBar ? 'text-emerald-600 fill-emerald-600' : 'text-amber-500'}`} />
                  <span className="hidden sm:inline">Carga Express</span>
                </button>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-slate-200 text-slate-600 p-2.5 md:px-3.5 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-xs shadow-sm active:scale-95"
                  title="Importar hasta 2,000 medicamentos desde Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600"/> 
                  <span className="hidden md:inline">Importar Excel</span>
                </button>
                
                <button 
                  onClick={downloadTemplate}
                  className="bg-white border border-slate-200 text-slate-600 p-2.5 md:px-3.5 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-xs shadow-sm active:scale-95"
                  title="Descargar Plantilla Excel"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600"/> 
                  <span className="hidden md:inline">Plantilla</span>
                </button>

                <button 
                  onClick={() => printCriticalInventoryReport(medications, pharmacyInfo)}
                  className="bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 p-2.5 md:px-3.5 md:py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm active:scale-95"
                  title="Imprimir lista oficial de productos vencidos y con bajo stock"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Imprimir Críticos</span>
                </button>

                {onClearInventory && medications.length > 0 && (
                  <button 
                    onClick={() => setShowClearModal(true)}
                    className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 p-2.5 md:px-3 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm active:scale-95"
                    title="Vaciar datos demo para empezar con catálogo limpio"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="hidden lg:inline text-rose-700">Vaciar Demo</span>
                  </button>
                )}

                <button 
                  onClick={openAddModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 md:px-5 md:py-2.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/20 text-xs whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4" /> 
                  <span>+ Agregar Medicamento</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* BARRA DE ENTRADA RÁPIDA (CARGA EXPRESS ULTRA SENCILLA) */}
        {canManageInventory && showQuickBar && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl p-3.5 md:p-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-emerald-600 text-white rounded-lg">
                  <Zap className="w-3.5 h-3.5 fill-white" />
                </span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Carga Rápida de Medicamentos (En 1 Clic)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full hidden sm:inline">
                  Ideal para ingresar stock en segundos
                </span>
              </div>
              <button 
                onClick={() => setShowQuickBar(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Ocultar barra rápida"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickBarSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2">
                {/* 1. Medication Name / Search Autocomplete */}
                <div className="relative md:col-span-4">
                  <input
                    type="text"
                    placeholder="Nombre o seleccionar medicamento..."
                    value={quickName}
                    onChange={(e) => {
                      setQuickName(e.target.value);
                      setQuickSuggestionsOpen(true);
                    }}
                    onFocus={() => setQuickSuggestionsOpen(true)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                  {quickName && (
                    <button
                      type="button"
                      onClick={() => setQuickName('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Autocomplete Dropdown */}
                  {quickSuggestionsOpen && filteredPresetsForQuickBar.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 max-h-48 overflow-y-auto no-scrollbar">
                      <div className="px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                        Sugerencias Frecuentes
                      </div>
                      {filteredPresetsForQuickBar.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyPresetToQuickBar(preset)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 rounded-lg flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{preset.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-medium">{preset.genericName}</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                            {currencySymbol} {preset.priceBox}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Cost price per box */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                      Costo:
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Costo"
                      value={quickCostPriceBox}
                      onChange={(e) => {
                        const cost = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setQuickCostPriceBox(cost);
                        if (typeof cost === 'number' && typeof quickProfitPercent === 'number') {
                          setQuickPriceBox(parseFloat((cost * (1 + quickProfitPercent / 100)).toFixed(2)));
                        }
                      }}
                      className="w-full pl-11 pr-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      title="Precio de compra o costo al proveedor por caja"
                    />
                  </div>
                </div>

                {/* 3. Desired Profit Percentage (%) */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600">
                      Ganar:
                    </span>
                    <input
                      type="number"
                      step="1"
                      placeholder="Ganancia"
                      value={quickProfitPercent}
                      onChange={(e) => {
                        const pct = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setQuickProfitPercent(pct);
                        if (typeof pct === 'number' && typeof quickCostPriceBox === 'number') {
                          setQuickPriceBox(parseFloat((quickCostPriceBox * (1 + pct / 100)).toFixed(2)));
                        }
                      }}
                      className="w-full pl-12 pr-5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      title="Porcentaje de ganancia deseado (%)"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">%</span>
                  </div>
                </div>

                {/* 4. Sale price per box (editable directly) */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                      Venta:
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="P. Venta"
                      value={quickPriceBox}
                      onChange={(e) => {
                        const p = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setQuickPriceBox(p);
                        if (typeof p === 'number' && typeof quickCostPriceBox === 'number' && quickCostPriceBox > 0) {
                          setQuickProfitPercent(parseFloat((((p - quickCostPriceBox) / quickCostPriceBox) * 100).toFixed(1)));
                        }
                      }}
                      className="w-full pl-11 pr-2 py-2 bg-emerald-50/70 border border-emerald-400 rounded-xl text-xs font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      title="Precio de venta por caja (se calcula con el margen o puedes cambiarlo directamente)"
                    />
                  </div>
                </div>

                {/* 5. Number of boxes */}
                <div className="md:col-span-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Cajas"
                      value={quickBoxes}
                      onChange={(e) => setQuickBoxes(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-center"
                      title="Cantidad de cajas que ingresan"
                    />
                  </div>
                </div>

                {/* 4. Lot number */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="N° Lote"
                      value={quickLot}
                      onChange={(e) => setQuickLot(e.target.value)}
                      className="w-full pl-3 pr-7 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      title="Número de Lote"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickLot(generateAutoLot())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                      title="Generar otro código de lote aleatorio"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 5. Submit Button */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-full py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{matchedExistingMedInQuickBar ? 'Sumar Stock' : 'Ingresar'}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Quick Row: Shortcut tags & Expiry buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                {/* Popular pills shortcuts */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Comunes:</span>
                  {['Paracetamol 500mg', 'Ibuprofeno 600mg', 'Amoxicilina 500mg', 'Omeprazol 20mg', 'Azitromicina 500mg', 'Vitamina C'].map((medName) => (
                    <button
                      key={medName}
                      type="button"
                      onClick={() => {
                        const found = COMMON_MEDICATIONS_PRESETS.find(p => p.name === medName);
                        if (found) applyPresetToQuickBar(found);
                      }}
                      className="px-2 py-0.5 bg-white border border-emerald-200/80 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors"
                    >
                      {medName}
                    </button>
                  ))}
                </div>

                {/* Quick Expiry Shortcuts */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] font-bold text-slate-500">Vence:</span>
                  <button
                    type="button"
                    onClick={() => setQuickExpiry(getDatePlusYears(1))}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      quickExpiry === getDatePlusYears(1) ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    +1 Año
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickExpiry(getDatePlusYears(2))}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      quickExpiry === getDatePlusYears(2) ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    +2 Años
                  </button>
                  <input
                    type="date"
                    value={quickExpiry}
                    onChange={(e) => setQuickExpiry(e.target.value)}
                    className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700 outline-none"
                    title="Fecha exacta de vencimiento"
                  />
                </div>
              </div>

              {matchedExistingMedInQuickBar && (
                <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between">
                  <span>💡 "{matchedExistingMedInQuickBar.name}" ya existe (Stock actual: {matchedExistingMedInQuickBar.stockBoxes} cajas). Al ingresar, se sumará el stock sin duplicar.</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Buscar por nombre comercial, genérico o laboratorio..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs font-medium"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Alert Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded font-black">{medications.length}</span>
            </button>

            <button
              onClick={() => setFilterType('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Vencidos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${filterType === 'EXPIRED' ? 'bg-white text-rose-600' : 'bg-rose-200 text-rose-800'}`}>
                {expiredCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType('SHORT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'SHORT'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Venc. Corto</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${filterType === 'SHORT' ? 'bg-white text-amber-800' : 'bg-amber-200 text-amber-900'}`}>
                {shortCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType('MIN_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'MIN_STOCK'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-orange-50 border border-orange-200 text-orange-800 hover:bg-orange-100'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Bajo Stock</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${filterType === 'MIN_STOCK' ? 'bg-white text-orange-800' : 'bg-orange-200 text-orange-900'}`}>
                {minStockCount}
              </span>
            </button>

            <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1 text-xs shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <label htmlFor="inventory-sort-select" className="text-[10px] font-black text-emerald-900 uppercase">Orden:</label>
              <select
                id="inventory-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent text-emerald-950 font-bold text-xs outline-none cursor-pointer pr-1"
                title="Criterio de ordenación (Siempre Alfabético A-Z por defecto)"
              >
                <option value="A-Z">🔤 Alfabético (A - Z) [Predeterminado]</option>
                <option value="Z-A">🔤 Alfabético (Z - A)</option>
                <option value="STOCK_ASC">📦 Menor Stock Primero</option>
                <option value="STOCK_DESC">📦 Mayor Stock Primero</option>
                <option value="EXPIRY_ASC">🚨 Vencimiento Más Próximo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Read-only notification for cashiers */}
        {!canManageInventory && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs text-amber-900">
              <span className="font-bold">Modo de Consulta para Cajero:</span> Puedes buscar y ver precios, lotes y fechas de vencimiento para la atención al cliente. La edición, creación y borrado de stock están protegidos por el Administrador.
            </div>
          </div>
        )}

        {/* Top Pagination and Info Bar */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">
                Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} de <span className="font-black text-slate-900">{filtered.length}</span> medicamentos
              </span>
              <span className="text-[10px] text-emerald-700 font-black px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100 hidden md:inline">
                Soporta 2,000+ productos
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Primera Página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Página Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 font-bold text-slate-800 text-xs">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Página Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Última Página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Medication Cards List */}
        <div className="grid grid-cols-1 gap-2.5">
          {filtered.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No se encontraron medicamentos</h3>
              <p className="text-xs text-slate-400">Intenta con otro término o agrega un nuevo producto al catálogo.</p>
              {canManageInventory && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Medicamento</span>
                </button>
              )}
            </div>
          ) : (
            paginatedMeds.map(med => {
              const expiryInfo = getExpiryStatus(med.batches[0]?.expiryDate || '');
              const isUnderMin = med.stockBoxes <= med.minStock;
              const isOverMax = med.maxStock ? med.stockBoxes >= med.maxStock : false;

              return (
                <div 
                  key={med.id} 
                  className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 group"
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {med.name}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {med.category}
                        </span>
                        {med.isControlled && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-rose-500" /> Controlado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 truncate">
                        {med.genericName} • <span className="text-slate-600 font-semibold">{med.laboratory || 'N/A'}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Lote: {med.batches[0]?.lotNumber || 'S/L'}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${expiryInfo.badgeClass}`}>
                          {expiryInfo.detail} ({med.batches[0]?.expiryDate || 'S/F'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Prices & Stock */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 bg-slate-50 md:bg-transparent p-2.5 md:p-0 rounded-xl border border-slate-100 md:border-0 text-left md:text-right shrink-0">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Precio Caja</span>
                      <span className="text-sm font-black text-slate-900">
                        {currencySymbol} {med.priceBox.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 block">
                        Uds: {currencySymbol} {med.priceUnit.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Stock Actual</span>
                      <div className="flex items-center md:justify-end gap-1.5">
                        <span className={`text-sm font-black ${isUnderMin ? 'text-rose-600' : 'text-slate-800'}`}>
                          {med.stockBoxes} Cajas
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 block">
                        ({med.stockUnits} unidades)
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Empaque</span>
                      <span className="text-xs font-bold text-slate-600">
                        {med.unitsPerBox} uds / caja
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {canManageInventory && (
                    <div className="flex items-center gap-1.5 border-t md:border-t-0 md:border-l md:border-slate-100 pt-2 md:pt-0 md:pl-3 justify-end shrink-0">
                      {/* Quick Restock button: super convenient! */}
                      <button
                        onClick={() => openRestockModal(med)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                        title="Entrada rápida de stock para este producto"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Reabastecer</span>
                      </button>

                      <button 
                        onClick={() => openEditModal(med)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
                        title="Editar Medicamento y Lotes"
                      >
                        <Edit2 className="w-3.5 h-3.5"/>
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm(`¿Está seguro de eliminar el producto ${med.name}?`)) {
                            onDelete(med.id);
                            showToast(`Producto ${med.name} eliminado.`);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200"
                        title="Eliminar Medicamento"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Pagination Bar */}
        {filtered.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-sm mt-3">
            <span className="font-bold text-slate-700">
              Página {currentPage} de {totalPages} ({filtered.length} medicamentos totales)
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Primera Página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-bold text-slate-800 text-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Página Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Última Página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Confirmar Vaciar Datos Demo */}
        {showClearModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">¿Vaciar medicamentos de prueba?</h3>
                  <p className="text-xs text-slate-500 font-medium">Esta acción limpiará los datos demo del inventario.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                Se vaciará el catálogo actual para que puedas cargar tus medicamentos reales de tu farmacia, ya sea manualmente con <strong>+ Agregar Medicamento</strong> o importando tu archivo Excel con hasta <strong>2,000 productos</strong>.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearInventory?.();
                    setShowClearModal(false);
                    showToast('Inventario vaciado con éxito. Listo para tus productos reales.');
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-colors shadow-md shadow-rose-600/20 active:scale-95"
                >
                  Sí, Vaciar Inventario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE ENTRADA RÁPIDA / AGREGAR MEDICAMENTO ULTRA SENCILLO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300">
              {/* Modal Header with mode switcher */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-xl">
                    <Pill className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black">
                      {editingMed ? 'Editar Medicamento' : 'Poner Medicamento en Inventario'}
                    </h2>
                    <p className="text-emerald-400 text-[10px] font-bold">
                      {modalMode === 'QUICK' ? 'Modo Rápido Express: Registro en pocos segundos' : 'Modo Técnico Detallado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!editingMed && (
                    <div className="flex bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setModalMode('QUICK')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                          modalMode === 'QUICK' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        ⚡ Rápido
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalMode('DETAILED')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                          modalMode === 'DETAILED' ? 'bg-slate-700 text-white shadow' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Detallado
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
                {/* MODO RÁPIDO: ULTRA SENCILLO Y ÁGIL */}
                {modalMode === 'QUICK' && (
                  <div className="space-y-4">
                    {/* Quick presets pills */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Medicamentos Populares (Clic para auto-llenar)
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600">Auto-completa datos</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COMMON_MEDICATIONS_PRESETS.slice(0, 10).map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applyPresetToModal(preset)}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm transition-all"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 1: Drug Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>1. Nombre del Medicamento *</span>
                        {formData.name && (
                          <span className="text-[10px] font-bold text-emerald-600 lowercase">
                            genérico: {formData.genericName || formData.name}
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            name: e.target.value,
                            genericName: formData.genericName || e.target.value 
                          })}
                          placeholder="Ej: Paracetamol 500mg, Amoxicilina 500mg..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-sm"
                        />
                      </div>

                      {matchedExistingMedInModal && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
                          <span>💡 Ya existe en inventario ({matchedExistingMedInModal.stockBoxes} cajas). Se sumará a este producto.</span>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Costo de Compra, Margen de Ganancia y Precio de Venta */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          Costo de Compra, Margen de Ganancia y Precio de Venta *
                        </span>
                        <span className="text-[10px] text-emerald-700 font-black bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Cálculo Automático
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Costo de Compra al Proveedor */}
                        <div>
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                            Costo Compra x Caja ({currencySymbol}) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0.00"
                              required
                              value={formData.costPriceBox ?? ''}
                              onChange={(e) => {
                                const cost = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const units = formData.unitsPerBox || 20;
                                const profit = formData.profitMarginPercent ?? 40;
                                const newPriceBox = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                                setFormData({
                                  ...formData,
                                  costPriceBox: cost,
                                  costPriceUnit: parseFloat((cost / units).toFixed(2)),
                                  priceBox: newPriceBox,
                                  priceUnit: parseFloat((newPriceBox / units).toFixed(2))
                                });
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                              title="Precio que pagas al proveedor o laboratorio"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                              caja
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">
                            Costo ud: {currencySymbol}{((formData.costPriceBox || 0) / (formData.unitsPerBox || 20)).toFixed(2)}
                          </p>
                        </div>

                        {/* 2. Porcentaje de Ganancia Deseada (%) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                              % Ganancia Deseada *
                            </label>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              placeholder="40"
                              required
                              value={formData.profitMarginPercent ?? ''}
                              onChange={(e) => {
                                const profit = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const cost = formData.costPriceBox || 0;
                                const units = formData.unitsPerBox || 20;
                                const newPriceBox = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                                setFormData({
                                  ...formData,
                                  profitMarginPercent: profit,
                                  priceBox: newPriceBox,
                                  priceUnit: parseFloat((newPriceBox / units).toFixed(2))
                                });
                              }}
                              className="w-full pl-3 pr-7 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                              title="Porcentaje de ganancia que deseas ganar sobre el costo"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600">%</span>
                          </div>
                          
                          {/* Botones rápidos de margen */}
                          <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-hide">
                            {[20, 30, 40, 50, 70, 100].map(pct => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  const cost = formData.costPriceBox || 0;
                                  const units = formData.unitsPerBox || 20;
                                  const newPriceBox = parseFloat((cost * (1 + pct / 100)).toFixed(2));
                                  setFormData({
                                    ...formData,
                                    profitMarginPercent: pct,
                                    priceBox: newPriceBox,
                                    priceUnit: parseFloat((newPriceBox / units).toFixed(2))
                                  });
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${
                                  formData.profitMarginPercent === pct
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
                                }`}
                              >
                                +{pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Precio de Venta al Público (Editable directamente!) */}
                        <div>
                          <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                            Precio Venta x Caja ({currencySymbol}) *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              required
                              value={formData.priceBox || ''}
                              onChange={(e) => {
                                const priceBox = parseFloat(e.target.value) || 0;
                                const units = formData.unitsPerBox || 20;
                                const cost = formData.costPriceBox || 0;
                                const newProfit = cost > 0 ? parseFloat((((priceBox - cost) / cost) * 100).toFixed(1)) : 0;
                                setFormData({
                                  ...formData,
                                  priceBox,
                                  profitMarginPercent: newProfit,
                                  priceUnit: parseFloat((priceBox / units).toFixed(2))
                                });
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                              title="Puedes cambiar el precio de venta directamente y se recalcula el porcentaje de ganancia"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                              caja
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 font-bold mt-1">
                            Venta ud: {currencySymbol}{formData.priceUnit || 0}
                          </p>
                        </div>
                      </div>

                      {/* Resumen en vivo de ganancia neta en dinero */}
                      <div className="bg-emerald-100/70 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-950 font-black">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-700" />
                          <span>Ganancia Neta en Dinero:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-white px-2 py-0.5 rounded-lg border border-emerald-300 text-emerald-800 shadow-sm">
                            +{currencySymbol}{Math.max(0, (formData.priceBox || 0) - (formData.costPriceBox || 0)).toFixed(2)} / caja
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded-lg border border-emerald-300 text-emerald-800 shadow-sm">
                            +{currencySymbol}{Math.max(0, (formData.priceUnit || 0) - ((formData.costPriceBox || 0) / (formData.unitsPerBox || 20))).toFixed(2)} / ud
                          </span>
                        </div>
                      </div>

                      {/* Cantidades y Embalaje */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                            Cajas que Ingresan *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={formData.stockBoxes || ''}
                            onChange={(e) => {
                              const boxes = parseInt(e.target.value) || 0;
                              const units = formData.unitsPerBox || 20;
                              setFormData({
                                ...formData,
                                stockBoxes: boxes,
                                stockUnits: boxes * units
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                            Unidades por Caja
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.unitsPerBox || 20}
                            onChange={(e) => {
                              const units = parseInt(e.target.value) || 1;
                              const priceBox = formData.priceBox || 0;
                              const boxes = formData.stockBoxes || 0;
                              const cost = formData.costPriceBox || 0;
                              setFormData({
                                ...formData,
                                unitsPerBox: units,
                                stockUnits: boxes * units,
                                costPriceUnit: parseFloat((cost / units).toFixed(2)),
                                priceUnit: parseFloat((priceBox / units).toFixed(2))
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between text-xs text-slate-500 font-bold">
                          <span>Total a ingresar: {(formData.stockBoxes || 0) * (formData.unitsPerBox || 20)} unidades</span>
                          <span className="text-slate-600">Inversión compra: {currencySymbol}{((formData.stockBoxes || 0) * (formData.costPriceBox || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Lote y Vencimiento Express (Requisitos Obligatorios Simplificados al Máximo) */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-600" />
                          Lote y Fecha de Vencimiento *
                        </span>
                        <span className="text-[10px] text-purple-700 font-bold">Generado automáticamente</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Lote input with auto-generate button */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Número de Lote:
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={formData.batches?.[0]?.lotNumber || ''}
                              onChange={(e) => {
                                const b = [...(formData.batches || [{ lotNumber: '', expiryDate: '', quantity: 0 }])];
                                b[0] = { ...b[0], lotNumber: e.target.value };
                                setFormData({ ...formData, batches: b });
                              }}
                              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newLot = generateAutoLot();
                                const b = [...(formData.batches || [{ lotNumber: '', expiryDate: '', quantity: 0 }])];
                                b[0] = { ...b[0], lotNumber: newLot };
                                setFormData({ ...formData, batches: b });
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600"
                              title="Generar otro lote"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expiry with quick shortcuts */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Fecha de Vencimiento:
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.batches?.[0]?.expiryDate || ''}
                            onChange={(e) => {
                              const b = [...(formData.batches || [{ lotNumber: '', expiryDate: '', quantity: 0 }])];
                              b[0] = { ...b[0], expiryDate: e.target.value };
                              setFormData({ ...formData, batches: b });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* 1-click Expiry shortcuts */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold">Atajos rápidos:</span>
                        {[
                          { label: '+1 Año', date: getDatePlusYears(1) },
                          { label: '+2 Años', date: getDatePlusYears(2) },
                          { label: '+3 Años', date: getDatePlusYears(3) },
                          { label: '+6 Meses', date: getDatePlusMonths(6) }
                        ].map(shortcut => (
                          <button
                            key={shortcut.label}
                            type="button"
                            onClick={() => {
                              const b = [...(formData.batches || [{ lotNumber: '', expiryDate: '', quantity: 0 }])];
                              b[0] = { ...b[0], expiryDate: shortcut.date };
                              setFormData({ ...formData, batches: b });
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                              formData.batches?.[0]?.expiryDate === shortcut.date
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {shortcut.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setModalMode('DETAILED')}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        ¿Deseas personalizar laboratorio, foto o receta obligatoria? Cambiar a Modo Detallado →
                      </button>
                    </div>
                  </div>
                )}

                {/* MODO DETALLADO: PARA CUANDO REQUIEREN CONFIGURAR TODO */}
                {modalMode === 'DETAILED' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InputGroup 
                        label="Nombre Comercial *" 
                        value={formData.name} 
                        onChange={v => setFormData({...formData, name: v})} 
                        placeholder="Ej: Paracetamol 500mg" 
                      />
                      <InputGroup 
                        label="Nombre Genérico / Principio Activo" 
                        value={formData.genericName} 
                        onChange={v => setFormData({...formData, genericName: v})} 
                        placeholder="Ej: Acetaminofén" 
                      />
                      <InputGroup 
                        label="Laboratorio Fabricante" 
                        value={formData.laboratory} 
                        onChange={v => setFormData({...formData, laboratory: v})} 
                        placeholder="Ej: Bagó, Inti, Genfar" 
                      />
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">
                          Categoría Terapéutica
                        </label>
                        <select 
                          value={formData.category} 
                          onChange={e => setFormData({...formData, category: e.target.value as Category})} 
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                        >
                          {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <InputGroup 
                        label={`Costo x Caja (${currencySymbol})`} 
                        type="number" 
                        step="0.1" 
                        value={formData.costPriceBox?.toString() || ''} 
                        onChange={v => {
                          const cost = parseFloat(v) || 0;
                          const profit = formData.profitMarginPercent ?? 40;
                          const pb = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                          const u = formData.unitsPerBox || 1;
                          setFormData({ 
                            ...formData, 
                            costPriceBox: cost, 
                            costPriceUnit: parseFloat((cost / u).toFixed(2)),
                            priceBox: pb, 
                            priceUnit: parseFloat((pb / u).toFixed(2)) 
                          });
                        }} 
                      />
                      <InputGroup 
                        label="% Ganancia" 
                        type="number" 
                        step="1" 
                        value={formData.profitMarginPercent?.toString() || ''} 
                        onChange={v => {
                          const profit = parseFloat(v) || 0;
                          const cost = formData.costPriceBox || 0;
                          const pb = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                          const u = formData.unitsPerBox || 1;
                          setFormData({ 
                            ...formData, 
                            profitMarginPercent: profit, 
                            priceBox: pb, 
                            priceUnit: parseFloat((pb / u).toFixed(2)) 
                          });
                        }} 
                      />
                      <InputGroup 
                        label={`P. Venta x Caja (${currencySymbol})`} 
                        type="number" 
                        step="0.01" 
                        value={formData.priceBox?.toString() || ''} 
                        onChange={v => {
                          const pb = parseFloat(v) || 0;
                          const u = formData.unitsPerBox || 1;
                          const cost = formData.costPriceBox || 0;
                          const profit = cost > 0 ? parseFloat((((pb - cost) / cost) * 100).toFixed(1)) : 0;
                          setFormData({ 
                            ...formData, 
                            priceBox: pb, 
                            profitMarginPercent: profit,
                            priceUnit: parseFloat((pb / u).toFixed(2)) 
                          });
                        }} 
                      />
                      <InputGroup 
                        label="Uds x Caja" 
                        type="number" 
                        value={formData.unitsPerBox?.toString()} 
                        onChange={v => {
                          const u = parseInt(v) || 1;
                          const pb = formData.priceBox || 0;
                          const cost = formData.costPriceBox || 0;
                          setFormData({ 
                            ...formData, 
                            unitsPerBox: u, 
                            costPriceUnit: parseFloat((cost / u).toFixed(2)),
                            priceUnit: parseFloat((pb / u).toFixed(2)) 
                          });
                        }} 
                      />
                      <InputGroup 
                        label="Stock (Cajas)" 
                        type="number" 
                        value={formData.stockBoxes?.toString()} 
                        onChange={v => {
                          const b = parseInt(v) || 0;
                          const u = formData.unitsPerBox || 1;
                          setFormData({ ...formData, stockBoxes: b, stockUnits: b * u });
                        }} 
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <input 
                        type="checkbox" 
                        id="isControlledModal"
                        checked={formData.isControlled}
                        onChange={e => setFormData({...formData, isControlled: e.target.checked})}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="isControlledModal" className="text-xs font-bold text-amber-900 cursor-pointer">
                        Medicamento Controlado / Psicotrópico (Requiere receta médica para la venta)
                      </label>
                    </div>

                    {/* Lotes in Detailed Mode */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Lote y Vencimiento
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <InputGroup 
                          label="N° Lote *" 
                          value={formData.batches?.[0]?.lotNumber} 
                          onChange={v => {
                            const b = [...(formData.batches || [{ lotNumber: '', expiryDate: '', quantity: 0 }])];
                            b[0] = { ...b[0], lotNumber: v };
                            setFormData({ ...formData, batches: b });
                          }} 
                        />
                        <InputGroup 
                          label="Fecha de Vencimiento *" 
                          type="date"
                          value={formData.batches?.[0]?.expiryDate} 
                          onChange={v => {
                            const b = [...(formData.batches || [{ lotNumber: '', expiryDate: '', quantity: 0 }])];
                            b[0] = { ...b[0], expiryDate: v };
                            setFormData({ ...formData, batches: b });
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>

                {!editingMed && (
                  <button
                    type="button"
                    onClick={() => handleSaveModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Guardar y Agregar Siguiente (+)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {editingMed ? 'Actualizar Producto' : 'Guardar Medicamento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE REABASTECIMIENTO RÁPIDO PARA PRODUCTO EXISTENTE */}
        {restockMed && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Entrada Rápida de Stock</h3>
                    <p className="text-[10px] text-emerald-100 font-bold truncate max-w-[240px]">
                      {restockMed.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => setRestockMed(null)} className="text-white/80 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                  <span className="text-slate-500 font-bold">Stock Actual:</span>
                  <span className="font-black text-slate-800">{restockMed.stockBoxes} cajas ({restockMed.stockUnits} uds)</span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Cajas Nuevas a Ingresar:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restockBoxes}
                    onChange={(e) => setRestockBoxes(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    Equivale a +{restockBoxes * restockMed.unitsPerBox} unidades.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Número de Lote:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={restockLot}
                      onChange={(e) => setRestockLot(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setRestockLot(generateAutoLot())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                      title="Generar lote"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    Fecha de Vencimiento:
                  </label>
                  <input
                    type="date"
                    value={restockExpiry}
                    onChange={(e) => setRestockExpiry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setRestockExpiry(getDatePlusYears(1))}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                    >
                      +1 Año
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockExpiry(getDatePlusYears(2))}
                      className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-bold"
                    >
                      +2 Años
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockMed(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestock}
                    className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    Confirmar Entrada
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface InputGroupProps {
  label: string;
  value: string | undefined;
  onChange: (val: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, type = "text", step, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      step={step}
      value={value || ''} 
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-bold text-slate-700 transition-all placeholder:text-slate-300" 
    />
  </div>
);

export default InventoryManager;
