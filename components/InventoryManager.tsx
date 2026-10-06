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
  const [restockByUnit, setRestockByUnit] = useState<boolean>(false);
  const [restockLot, setRestockLot] = useState<string>('');
  const [restockExpiry, setRestockExpiry] = useState<string>('');

  // Quick Inline Top Bar state
  const [showQuickBar, setShowQuickBar] = useState(true);
  const [quickIsUnitOnly, setQuickIsUnitOnly] = useState<boolean>(false);
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

  // Excel import supporting 1 or 2 sheets (Por_Caja and Solo_Unidades) and differential 'Tipo' column
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

        const importedMeds: Medication[] = [];
        let rowCounter = 0;

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return;
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
          if (!Array.isArray(rows) || rows.length === 0) return;

          const lowerSheet = sheetName.toLowerCase();
          const sheetIndicatesUnitOnly =
            lowerSheet.includes('unidad') ||
            lowerSheet.includes('suelto') ||
            lowerSheet.includes('jarabe') ||
            lowerSheet.includes('sin_caja') ||
            lowerSheet.includes('sin caja');
          const sheetIndicatesBox =
            lowerSheet.includes('caja');

          rows.forEach((row: any) => {
            const rawName = String(
              row['Nombre'] ||
              row['NOMBRE'] ||
              row['Medicamento'] ||
              row['MEDICAMENTO'] ||
              row['Producto'] ||
              row['PRODUCTO'] ||
              ''
            ).trim();

            // Ignorar filas en blanco
            if (!rawName) return;

            rowCounter++;

            // Detectar diferencial por columna ('Tipo' / 'Presentación' / 'Modo') o por hoja o por columnas
            const rawTipo = String(
              row['Tipo'] ||
              row['TIPO'] ||
              row['Presentación'] ||
              row['PRESENTACIÓN'] ||
              row['Presentacion'] ||
              row['Modo'] ||
              row['MODO'] ||
              ''
            ).trim().toUpperCase();

            let isUnitOnly = false;
            if (
              rawTipo.includes('UNIDAD') ||
              rawTipo.includes('SUELTO') ||
              rawTipo.includes('JARABE') ||
              rawTipo.includes('FRASCO') ||
              rawTipo.includes('SIN CAJA')
            ) {
              isUnitOnly = true;
            } else if (rawTipo.includes('CAJA')) {
              isUnitOnly = false;
            } else if (sheetIndicatesUnitOnly && !sheetIndicatesBox) {
              isUnitOnly = true;
            } else if (sheetIndicatesBox) {
              isUnitOnly = false;
            } else {
              // Hoja única sin columna 'Tipo' explícita: deducir por las columnas presentes o unidades por caja
              const hasPrecioCaja = row['Precio Caja'] !== undefined && row['Precio Caja'] !== '';
              const hasStockCajas = row['Stock Cajas'] !== undefined && row['Stock Cajas'] !== '';
              const rawUnitsPerBox = parseInt(row['Unidades por Caja'] ?? row['Unidades x Caja'] ?? '');
              const hasUnitColumns =
                (row['Precio Unidad'] !== undefined && row['Precio Unidad'] !== '') ||
                (row['Costo Unidad'] !== undefined && row['Costo Unidad'] !== '') ||
                (row['Stock Unidades'] !== undefined && row['Stock Unidades'] !== '') ||
                (row['Cantidad Unidades'] !== undefined && row['Cantidad Unidades'] !== '');

              if (rawUnitsPerBox === 1 || (!hasPrecioCaja && !hasStockCajas && hasUnitColumns)) {
                isUnitOnly = true;
              } else if (isLikelyUnitOnlyName(rawName) && (!rawUnitsPerBox || rawUnitsPerBox === 1)) {
                isUnitOnly = true;
              }
            }

            const catValue = (row['Categoría'] || row['Categoria'] || row['CATEGORÍA'] || Category.OTHERS) as Category;
            const lotNumber = String(row['Lote'] || row['LOTE'] || '').trim() || generateAutoLot();
            const expiryDate = String(row['Vencimiento'] || row['VENCIMIENTO'] || '').trim() || getDatePlusYears(2);
            const controlledRaw = String(row['Controlado'] || row['CONTROLADO'] || '').trim().toUpperCase();
            const isControlled = controlledRaw === 'SI' || controlledRaw === 'SÍ' || controlledRaw === 'TRUE' || row['Controlado'] === true;

            if (isUnitOnly) {
              const stockUnits = Math.max(
                0,
                parseInt(
                  row['Stock Unidades'] ??
                  row['Cantidad Unidades'] ??
                  row['Unidades'] ??
                  row['Stock'] ??
                  row['Stock Cajas'] ??
                  '0'
                ) || 0
              );
              const priceUnit = Math.max(
                0,
                parseFloat(
                  row['Precio Unidad'] ??
                  row['Precio Venta Unidad'] ??
                  row['Precio'] ??
                  row['Precio Caja'] ??
                  '0'
                ) || 0
              );
              const costPriceUnit = Math.max(
                0,
                parseFloat(
                  row['Costo Unidad'] ??
                  row['Costo Compra Unidad'] ??
                  row['Costo'] ??
                  row['Costo Caja'] ??
                  '0'
                ) || 0
              );
              const profitMarginPercent =
                costPriceUnit > 0
                  ? parseFloat((((priceUnit - costPriceUnit) / costPriceUnit) * 100).toFixed(1))
                  : 0;

              importedMeds.push({
                id: `${Date.now()}_${rowCounter}_${Math.random().toString(36).substring(2, 6)}`,
                name: rawName,
                genericName: String(row['Nombre Genérico'] || row['Genérico'] || rawName).trim(),
                laboratory: String(row['Laboratorio'] || row['LABORATORIO'] || '').trim(),
                description: String(row['Descripción'] || row['Descripcion'] || '').trim(),
                isUnitOnly: true,
                costPriceBox: costPriceUnit,
                costPriceUnit: costPriceUnit,
                profitMarginPercent,
                priceBox: priceUnit,
                priceUnit: priceUnit,
                unitsPerBox: 1,
                category: catValue,
                imageUrl: String(row['Imagen URL'] || '').trim() || getCategoryDefaultImage(catValue),
                stockBoxes: stockUnits,
                stockUnits: stockUnits,
                isControlled,
                minStock: parseInt(row['Stock Mínimo'] ?? row['Stock Minimo'] ?? '5') || 5,
                maxStock: parseInt(row['Stock Máximo'] ?? row['Stock Maximo'] ?? '50') || 50,
                batches: [
                  {
                    lotNumber,
                    expiryDate,
                    quantity: stockUnits
                  }
                ]
              });
            } else {
              const unitsPerBox = Math.max(
                1,
                parseInt(row['Unidades por Caja'] ?? row['Unidades x Caja'] ?? '20') || 20
              );
              const hasStockBoxes = row['Stock Cajas'] !== undefined && row['Stock Cajas'] !== '';
              const hasStockUnits = row['Stock Unidades'] !== undefined && row['Stock Unidades'] !== '';

              let stockBoxes = parseInt(row['Stock Cajas'] ?? row['Cajas'] ?? '0') || 0;
              let stockUnits = parseInt(row['Stock Unidades'] ?? '0') || 0;

              if (hasStockBoxes && !hasStockUnits) {
                stockUnits = stockBoxes * unitsPerBox;
              } else if (!hasStockBoxes && hasStockUnits) {
                stockBoxes = Math.floor(stockUnits / unitsPerBox);
              } else if (!hasStockBoxes && !hasStockUnits) {
                stockBoxes = parseInt(row['Stock'] ?? '0') || 0;
                stockUnits = stockBoxes * unitsPerBox;
              }

              const priceBox = Math.max(
                0,
                parseFloat(row['Precio Caja'] ?? row['Precio'] ?? '0') || 0
              );
              const priceUnit =
                row['Precio Unidad'] !== undefined && row['Precio Unidad'] !== ''
                  ? parseFloat(row['Precio Unidad']) || parseFloat((priceBox / unitsPerBox).toFixed(2))
                  : parseFloat((priceBox / unitsPerBox).toFixed(2));

              const costPriceBox = Math.max(
                0,
                parseFloat(row['Costo Caja'] ?? row['Costo'] ?? '0') || 0
              );
              const costPriceUnit =
                row['Costo Unidad'] !== undefined && row['Costo Unidad'] !== ''
                  ? parseFloat(row['Costo Unidad']) || parseFloat((costPriceBox / unitsPerBox).toFixed(2))
                  : parseFloat((costPriceBox / unitsPerBox).toFixed(2));

              const profitMarginPercent =
                costPriceBox > 0
                  ? parseFloat((((priceBox - costPriceBox) / costPriceBox) * 100).toFixed(1))
                  : 0;

              importedMeds.push({
                id: `${Date.now()}_${rowCounter}_${Math.random().toString(36).substring(2, 6)}`,
                name: rawName,
                genericName: String(row['Nombre Genérico'] || row['Genérico'] || rawName).trim(),
                laboratory: String(row['Laboratorio'] || row['LABORATORIO'] || '').trim(),
                description: String(row['Descripción'] || row['Descripcion'] || '').trim(),
                isUnitOnly: false,
                costPriceBox,
                costPriceUnit,
                profitMarginPercent,
                priceBox,
                priceUnit,
                unitsPerBox,
                category: catValue,
                imageUrl: String(row['Imagen URL'] || '').trim() || getCategoryDefaultImage(catValue),
                stockBoxes,
                stockUnits,
                isControlled,
                minStock: parseInt(row['Stock Mínimo'] ?? row['Stock Minimo'] ?? '5') || 5,
                maxStock: parseInt(row['Stock Máximo'] ?? row['Stock Maximo'] ?? '50') || 50,
                batches: [
                  {
                    lotNumber,
                    expiryDate,
                    quantity: stockUnits
                  }
                ]
              });
            }
          });
        });

        if (importedMeds.length === 0) {
          showToast('El archivo Excel no contiene filas válidas con Nombre de medicamento.');
          return;
        }

        const boxCount = importedMeds.filter(m => !m.isUnitOnly).length;
        const unitCount = importedMeds.filter(m => m.isUnitOnly).length;

        // Si ya existen medicamentos con el mismo nombre, actualizar sus datos y agregar los nuevos
        if (onReplaceAll && medications.length > 0) {
          const mergedMap = new Map<string, Medication>();
          medications.forEach(existing => {
            mergedMap.set(existing.name.trim().toLowerCase(), existing);
          });
          importedMeds.forEach(inc => {
            const key = inc.name.trim().toLowerCase();
            const existing = mergedMap.get(key);
            if (existing) {
              mergedMap.set(key, { ...inc, id: existing.id });
            } else {
              mergedMap.set(key, inc);
            }
          });
          onReplaceAll(Array.from(mergedMap.values()));
        } else if (onBatchAdd) {
          onBatchAdd(importedMeds);
        } else {
          importedMeds.forEach(m => onAdd(m));
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        showToast(
          `¡Importación exitosa! ${importedMeds.length} productos cargados (${boxCount} por caja, ${unitCount} por unidad).`
        );
      } catch (err) {
        console.error(err);
        showToast('Error al procesar el archivo Excel. Verifique el formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Descargar Plantilla / Inventario completo separado en 2 hojas: "Por_Caja" y "Solo_Unidades"
  const downloadTemplate = () => {
    const boxMeds = medications.filter(m => !m.isUnitOnly && m.unitsPerBox > 1);
    const unitMeds = medications.filter(m => m.isUnitOnly || m.unitsPerBox === 1);

    // Hoja 1: Medicamentos Por Caja
    const boxSheetRows =
      boxMeds.length > 0
        ? boxMeds.map(m => ({
            'Tipo': 'CAJA',
            'Nombre': m.name,
            'Nombre Genérico': m.genericName || '',
            'Laboratorio': m.laboratory || '',
            'Categoría': m.category || Category.OTHERS,
            'Costo Caja': m.costPriceBox ?? 0,
            'Precio Caja': m.priceBox,
            'Precio Unidad': m.priceUnit,
            'Unidades por Caja': m.unitsPerBox,
            'Stock Cajas': m.stockBoxes,
            'Stock Unidades': m.stockUnits,
            'Stock Mínimo': m.minStock,
            'Stock Máximo': m.maxStock || 50,
            'Lote': m.batches[0]?.lotNumber || '',
            'Vencimiento': m.batches[0]?.expiryDate || '',
            'Controlado': m.isControlled ? 'SI' : 'NO',
            'Descripción': m.description || '',
            'Imagen URL': m.imageUrl || ''
          }))
        : [
            {
              'Tipo': 'CAJA',
              'Nombre': '',
              'Nombre Genérico': '',
              'Laboratorio': '',
              'Categoría': 'Otros',
              'Costo Caja': 0,
              'Precio Caja': 0,
              'Precio Unidad': 0,
              'Unidades por Caja': 20,
              'Stock Cajas': 0,
              'Stock Unidades': 0,
              'Stock Mínimo': 5,
              'Stock Máximo': 50,
              'Lote': generateAutoLot(),
              'Vencimiento': getDatePlusYears(2),
              'Controlado': 'NO',
              'Descripción': '',
              'Imagen URL': ''
            }
          ];

    // Hoja 2: Medicamentos Solo por Unidad (Jarabes, Frascos, Sueltos sin Caja)
    const unitSheetRows =
      unitMeds.length > 0
        ? unitMeds.map(m => ({
            'Tipo': 'UNIDAD',
            'Nombre': m.name,
            'Nombre Genérico': m.genericName || '',
            'Laboratorio': m.laboratory || '',
            'Categoría': m.category || Category.OTHERS,
            'Costo Unidad': m.costPriceUnit ?? m.costPriceBox ?? 0,
            'Precio Unidad': m.priceUnit || m.priceBox,
            'Stock Unidades': m.stockUnits,
            'Stock Mínimo': m.minStock,
            'Stock Máximo': m.maxStock || 50,
            'Lote': m.batches[0]?.lotNumber || '',
            'Vencimiento': m.batches[0]?.expiryDate || '',
            'Controlado': m.isControlled ? 'SI' : 'NO',
            'Descripción': m.description || '',
            'Imagen URL': m.imageUrl || ''
          }))
        : [
            {
              'Tipo': 'UNIDAD',
              'Nombre': '',
              'Nombre Genérico': '',
              'Laboratorio': '',
              'Categoría': 'Otros',
              'Costo Unidad': 0,
              'Precio Unidad': 0,
              'Stock Unidades': 0,
              'Stock Mínimo': 5,
              'Stock Máximo': 50,
              'Lote': generateAutoLot(),
              'Vencimiento': getDatePlusYears(2),
              'Controlado': 'NO',
              'Descripción': '',
              'Imagen URL': ''
            }
          ];

    const wsBoxes = XLSX.utils.json_to_sheet(boxSheetRows);
    const wsUnits = XLSX.utils.json_to_sheet(unitSheetRows);

    wsBoxes['!cols'] = [
      { wch: 10 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 18 }, { wch: 12 },
      { wch: 15 }, { wch: 13 }, { wch: 13 }, { wch: 15 }, { wch: 14 },
      { wch: 12 }, { wch: 25 }, { wch: 25 }
    ];

    wsUnits['!cols'] = [
      { wch: 10 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 15 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 13 },
      { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 25 }, { wch: 25 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsBoxes, 'Por_Caja');
    XLSX.utils.book_append_sheet(wb, wsUnits, 'Solo_Unidades');
    XLSX.writeFile(wb, 'Plantilla_Inventario_Farmacia.xlsx');
    showToast(
      `Plantilla descargada con 2 hojas: "Por_Caja" (${boxMeds.length} prod.) y "Solo_Unidades" (${unitMeds.length} prod.).`
    );
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
    const isUnitOnly = Boolean(preset.isUnitOnly || preset.unitsPerBox === 1);
    const priceBox = preset.priceBox;
    const units = isUnitOnly ? 1 : preset.unitsPerBox;
    const currentBoxes = formData.stockBoxes || 10;
    const costBox = preset.costPriceBox || parseFloat((preset.priceBox * 0.7).toFixed(2));
    const profit = preset.profitMarginPercent || (costBox > 0 ? parseFloat((((preset.priceBox - costBox) / costBox) * 100).toFixed(1)) : 40);
    const costUnit = isUnitOnly ? costBox : parseFloat((costBox / units).toFixed(2));

    setFormData(prev => ({
      ...prev,
      name: preset.name,
      genericName: preset.genericName,
      category: preset.category,
      laboratory: preset.laboratory,
      isUnitOnly,
      unitsPerBox: units,
      costPriceBox: costBox,
      costPriceUnit: costUnit,
      profitMarginPercent: profit,
      priceBox: priceBox,
      priceUnit: isUnitOnly ? priceBox : parseFloat((priceBox / units).toFixed(2)),
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
    const isUnitOnly = Boolean(preset.isUnitOnly || preset.unitsPerBox === 1);
    const costBox = preset.costPriceBox || parseFloat((preset.priceBox * 0.7).toFixed(2));
    const profit = preset.profitMarginPercent || (costBox > 0 ? parseFloat((((preset.priceBox - costBox) / costBox) * 100).toFixed(1)) : 40);
    setQuickIsUnitOnly(isUnitOnly);
    setQuickName(preset.name);
    setQuickCostPriceBox(costBox);
    setQuickProfitPercent(profit);
    setQuickPriceBox(preset.priceBox);
    setQuickUnitsPerBox(isUnitOnly ? 1 : preset.unitsPerBox);
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

  const isLikelyUnitOnlyName = (nameText: string): boolean => {
    const lower = nameText.toLowerCase();
    return ['jarabe', 'frasco', 'suspensión', 'suspension', 'gotas', 'inhalador', 'spray', 'crema', 'gel', 'pomada', 'loción', 'locion', 'shampoo', 'tarro', 'lata', 'tubo'].some(kw => lower.includes(kw));
  };

  const openAddModal = (unitOnlyMode = false) => {
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
      isUnitOnly: unitOnlyMode,
      costPriceBox: unitOnlyMode ? 18 : 20,
      costPriceUnit: unitOnlyMode ? 18 : 1.0,
      profitMarginPercent: unitOnlyMode ? 38.9 : 50,
      priceBox: unitOnlyMode ? 25 : 30,
      priceUnit: unitOnlyMode ? 25 : 1.5,
      unitsPerBox: unitOnlyMode ? 1 : 20,
      category: Category.OTHERS,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
      stockBoxes: unitOnlyMode ? 8 : 10,
      stockUnits: unitOnlyMode ? 8 : 200,
      isControlled: false,
      minStock: 5,
      maxStock: 50,
      batches: [{ lotNumber: generateAutoLot(), expiryDate: getDatePlusYears(2), quantity: unitOnlyMode ? 8 : 200 }]
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
    const isUnitOnly = Boolean(med.isUnitOnly || med.unitsPerBox === 1);
    const costBox = med.costPriceBox ?? parseFloat(((med.priceBox || 30) * 0.7).toFixed(2));
    const units = isUnitOnly ? 1 : (med.unitsPerBox || 20);
    const costUnit = med.costPriceUnit ?? (isUnitOnly ? costBox : parseFloat((costBox / units).toFixed(2)));
    const profit = med.profitMarginPercent ?? (costBox > 0 ? parseFloat(((((med.priceBox || 30) - costBox) / costBox) * 100).toFixed(1)) : 40);

    setFormData({
      ...med,
      isUnitOnly,
      unitsPerBox: units,
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
    const unitOnly = Boolean(med.isUnitOnly || med.unitsPerBox === 1);
    setRestockMed(med);
    setRestockByUnit(unitOnly);
    setRestockBoxes(unitOnly ? 20 : 5);
    setRestockLot(generateAutoLot());
    setRestockExpiry(getDatePlusYears(2));
  };

  const handleConfirmRestock = () => {
    if (!restockMed) return;
    if (restockBoxes <= 0) {
      alert(`Por favor ingrese una cantidad mayor a 0 ${restockByUnit ? 'unidades' : 'cajas'}.`);
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

    const isMedUnitOnly = Boolean(restockMed.isUnitOnly || restockMed.unitsPerBox === 1);
    const unitsAdded = restockByUnit ? restockBoxes : restockBoxes * restockMed.unitsPerBox;
    const newTotalUnits = restockMed.stockUnits + unitsAdded;
    const newStockBoxes = isMedUnitOnly ? newTotalUnits : Math.floor(newTotalUnits / (restockMed.unitsPerBox || 1));

    const newBatch: Batch = {
      lotNumber: restockLot.trim(),
      expiryDate: restockExpiry,
      quantity: unitsAdded
    };

    const updatedMed: Medication = {
      ...restockMed,
      stockBoxes: newStockBoxes,
      stockUnits: newTotalUnits,
      batches: [newBatch, ...restockMed.batches]
    };

    onUpdate(updatedMed);
    showToast(`✅ Se sumaron ${restockBoxes} ${restockByUnit ? 'unidades' : 'cajas'} a "${restockMed.name}" con lote ${restockLot}.`);
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

    const isUnitOnly = Boolean(formData.isUnitOnly);
    const units = isUnitOnly ? 1 : (Number(formData.unitsPerBox) || 1);
    const priceBox = isUnitOnly
      ? (Number(formData.priceUnit) || Number(formData.priceBox) || 0)
      : (Number(formData.priceBox) || 0);
    const priceUnit = isUnitOnly
      ? priceBox
      : (Number(formData.priceUnit) || parseFloat((priceBox / units).toFixed(2)));
    const stockBoxes = isUnitOnly
      ? (Number(formData.stockUnits) || Number(formData.stockBoxes) || 0)
      : (Number(formData.stockBoxes) || 0);
    const totalUnits = isUnitOnly
      ? stockBoxes
      : (Number(formData.stockUnits) || stockBoxes * units);

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
      const existingLabel = matchedExistingMedInModal.isUnitOnly ? `${matchedExistingMedInModal.stockUnits} unidades` : `${matchedExistingMedInModal.stockBoxes} cajas`;
      const addingLabel = isUnitOnly ? `${totalUnits} unidades` : `${stockBoxes} cajas`;
      const confirmAdd = confirm(
        `"${matchedExistingMedInModal.name}" ya existe en el inventario con ${existingLabel}.\n\n¿Deseas sumar estas ${addingLabel} al producto existente en lugar de duplicarlo?`
      );
      if (confirmAdd) {
        const newTotalUnits = matchedExistingMedInModal.stockUnits + totalUnits;
        const newBoxes = matchedExistingMedInModal.isUnitOnly
          ? newTotalUnits
          : Math.floor(newTotalUnits / (matchedExistingMedInModal.unitsPerBox || 1));
        const updatedMed: Medication = {
          ...matchedExistingMedInModal,
          stockBoxes: newBoxes,
          stockUnits: newTotalUnits,
          batches: [
            { lotNumber: firstLot, expiryDate: firstExpiry, quantity: totalUnits },
            ...matchedExistingMedInModal.batches
          ]
        };
        onUpdate(updatedMed);
        showToast(`✅ Se sumaron ${addingLabel} al producto existente "${matchedExistingMedInModal.name}".`);
        if (addAnother) {
          resetModalForNext();
        } else {
          setIsModalOpen(false);
        }
        return;
      }
    }

    const costPriceBox = typeof formData.costPriceBox === 'number' ? formData.costPriceBox : parseFloat((priceBox * 0.7).toFixed(2));
    const costPriceUnit = isUnitOnly
      ? costPriceBox
      : (typeof formData.costPriceUnit === 'number' ? formData.costPriceUnit : parseFloat((costPriceBox / units).toFixed(2)));
    const profitMarginPercent = typeof formData.profitMarginPercent === 'number' 
      ? formData.profitMarginPercent 
      : (costPriceBox > 0 ? parseFloat((((priceBox - costPriceBox) / costPriceBox) * 100).toFixed(1)) : 40);

    const finalMed: Medication = { 
      id: editingMed ? editingMed.id : Date.now().toString() + Math.random().toString(36).substring(2, 6),
      name: formData.name.trim(),
      genericName: formData.genericName?.trim() || formData.name.trim(),
      laboratory: formData.laboratory?.trim() || 'Laboratorio Farmacéutico',
      description: formData.description?.trim() || 'Medicamento registrado.',
      isUnitOnly,
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
    const keepUnitOnly = Boolean(formData.isUnitOnly);
    setFormData({
      name: '',
      genericName: '',
      laboratory: 'Laboratorio Genérico',
      description: 'Medicamento registrado.',
      isUnitOnly: keepUnitOnly,
      costPriceBox: 20,
      costPriceUnit: keepUnitOnly ? 20 : 1.0,
      profitMarginPercent: 50,
      priceBox: 30,
      priceUnit: keepUnitOnly ? 30 : 1.5,
      unitsPerBox: keepUnitOnly ? 1 : 20,
      category: Category.OTHERS,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400',
      stockBoxes: keepUnitOnly ? 20 : 10,
      stockUnits: keepUnitOnly ? 20 : 200,
      isControlled: false,
      minStock: 5,
      maxStock: 50,
      batches: [{ lotNumber: generateAutoLot(), expiryDate: getDatePlusYears(2), quantity: keepUnitOnly ? 20 : 200 }]
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

    const isUnitOnly = Boolean(quickIsUnitOnly);
    const priceBox = Number(quickPriceBox) || 0;
    const costPriceBox = Number(quickCostPriceBox) || parseFloat((priceBox * 0.7).toFixed(2));
    const profitMarginPercent = Number(quickProfitPercent) || (costPriceBox > 0 ? parseFloat((((priceBox - costPriceBox) / costPriceBox) * 100).toFixed(1)) : 40);
    const qtyEntered = Number(quickBoxes) || 0;
    const unitsPerBox = isUnitOnly ? 1 : (quickUnitsPerBox || 20);
    const units = isUnitOnly ? qtyEntered : qtyEntered * unitsPerBox;
    const boxes = isUnitOnly ? qtyEntered : qtyEntered;
    const priceUnit = isUnitOnly ? priceBox : parseFloat((priceBox / unitsPerBox).toFixed(2));
    const costPriceUnit = isUnitOnly ? costPriceBox : parseFloat((costPriceBox / unitsPerBox).toFixed(2));
    const lot = quickLot.trim() || generateAutoLot();
    const expiry = quickExpiry || getDatePlusYears(2);

    // If matches existing medication, restock it directly
    if (matchedExistingMedInQuickBar) {
      const newTotalUnits = matchedExistingMedInQuickBar.stockUnits + units;
      const newStockBoxes = matchedExistingMedInQuickBar.isUnitOnly
        ? newTotalUnits
        : Math.floor(newTotalUnits / (matchedExistingMedInQuickBar.unitsPerBox || 1));
      const updatedMed: Medication = {
        ...matchedExistingMedInQuickBar,
        stockBoxes: newStockBoxes,
        stockUnits: newTotalUnits,
        batches: [
          { lotNumber: lot, expiryDate: expiry, quantity: units },
          ...matchedExistingMedInQuickBar.batches
        ]
      };
      onUpdate(updatedMed);
      showToast(
        isUnitOnly
          ? `⚡ Stock sumado a "${matchedExistingMedInQuickBar.name}": +${units} unidades.`
          : `⚡ Stock sumado a "${matchedExistingMedInQuickBar.name}": +${boxes} cajas (${units} uds).`
      );
    } else {
      // Find preset if any
      const preset = COMMON_MEDICATIONS_PRESETS.find(p => p.name.toLowerCase() === quickName.trim().toLowerCase());
      
      const newMed: Medication = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        name: quickName.trim(),
        genericName: preset?.genericName || quickName.trim(),
        laboratory: preset?.laboratory || 'Laboratorio Farmacéutico',
        description: preset?.description || 'Ingreso rápido de almacén.',
        isUnitOnly,
        costPriceBox,
        costPriceUnit,
        profitMarginPercent,
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
      showToast(`⚡ ¡Medicamento "${newMed.name}" ingresado (${isUnitOnly ? `${units} unidades` : `${boxes} cajas`}) con éxito!`);
    }

    // Reset quick bar inputs for next item
    setQuickName('');
    setQuickPriceBox(35);
    setQuickBoxes(isUnitOnly ? 20 : 10);
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
                  onClick={() => openAddModal(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 md:px-4 md:py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 text-xs whitespace-nowrap active:scale-95"
                >
                  <Package className="w-4 h-4" /> 
                  <span>+ Por Caja</span>
                </button>

                <button 
                  onClick={() => openAddModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 md:px-4 md:py-2.5 rounded-xl font-black flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-600/20 text-xs whitespace-nowrap active:scale-95"
                  title="Registrar productos comprados por unidad suelta (Ej: 8 jarabes, frascos, cremas sin caja)"
                >
                  <Pill className="w-4 h-4" /> 
                  <span>+ Por Unidad (Ej: Jarabes)</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* BARRA DE ENTRADA RÁPIDA (CARGA EXPRESS ULTRA SENCILLA) */}
        {canManageInventory && showQuickBar && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl p-3.5 md:p-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-emerald-600 text-white rounded-lg">
                  <Zap className="w-3.5 h-3.5 fill-white" />
                </span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Carga Rápida de Medicamentos (En 1 Clic)
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Selector Por Caja vs Solo Unidades */}
                <div className="flex items-center bg-white border border-emerald-200 rounded-xl p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickIsUnitOnly(false);
                      if (quickUnitsPerBox === 1) setQuickUnitsPerBox(20);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                      !quickIsUnitOnly
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-3 h-3" />
                    <span>Por Caja (Uds x Caja)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickIsUnitOnly(true);
                      setQuickUnitsPerBox(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                      quickIsUnitOnly
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Pill className="w-3 h-3" />
                    <span>Solo Unidades (Ej: Jarabe)</span>
                  </button>
                </div>

                <button 
                  onClick={() => setShowQuickBar(false)} 
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Ocultar barra rápida"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickBarSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2">
                {/* 1. Medication Name / Search Autocomplete */}
                <div className="relative md:col-span-3">
                  <input
                    type="text"
                    placeholder={quickIsUnitOnly ? "Ej: Ambroxol Jarabe (Compré por unidad)..." : "Nombre o seleccionar medicamento..."}
                    value={quickName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickName(val);
                      setQuickSuggestionsOpen(true);
                      if (isLikelyUnitOnlyName(val) && !quickIsUnitOnly) {
                        setQuickIsUnitOnly(true);
                        setQuickUnitsPerBox(1);
                        if (quickBoxes === 10) setQuickBoxes(8);
                      }
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
                            {currencySymbol} {preset.priceBox} {preset.isUnitOnly ? '/ ud' : '/ caja'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Cost price (per box or per unit) */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">
                      {quickIsUnitOnly ? 'Costo Ud:' : 'Costo:'}
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
                      className="w-full pl-14 pr-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      title={quickIsUnitOnly ? "Precio de costo por unidad" : "Precio de compra o costo al proveedor por caja"}
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

                {/* 4. Sale price (per box or per unit) */}
                <div className="md:col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500">
                      {quickIsUnitOnly ? 'Precio Ud:' : 'Venta:'}
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
                      className="w-full pl-14 pr-2 py-2 bg-emerald-50/70 border border-emerald-400 rounded-xl text-xs font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      title={quickIsUnitOnly ? "Precio de venta por unidad en específico" : "Precio de venta por caja"}
                    />
                  </div>
                </div>

                {/* 5. Number of boxes OR units */}
                <div className="md:col-span-1">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder={quickIsUnitOnly ? "Unidades" : "Cajas"}
                      value={quickBoxes}
                      onChange={(e) => setQuickBoxes(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className={`w-full px-2 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 shadow-sm text-center ${
                        quickIsUnitOnly ? 'border-blue-400 focus:ring-blue-500' : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                      title={quickIsUnitOnly ? "Cantidad de unidades individuales que ingresan (ej: 20 unidades)" : "Cantidad de cajas que ingresan"}
                    />
                    <span className="block text-[8px] font-black uppercase text-center text-slate-400 mt-0.5">
                      {quickIsUnitOnly ? 'Unidades' : 'Cajas'}
                    </span>
                  </div>
                </div>

                {/* 6. Submit Button */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-[34px] py-2 px-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{matchedExistingMedInQuickBar ? 'Sumar Stock' : 'Ingresar'}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Quick Row: Shortcut tags, Uds/Caja or Lot & Expiry buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                {/* Popular pills shortcuts */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Comunes:</span>
                  {['Ambroxol Jarabe 120ml', 'Ibuprofeno Jarabe Pediátrico 100ml', 'Paracetamol 500mg', 'Ibuprofeno 600mg', 'Amoxicilina 500mg', 'Omeprazol 20mg'].map((medName) => (
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

                {/* Quick Lot & Expiry Shortcuts */}
                <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                  {!quickIsUnitOnly && (
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                      <span className="text-[10px] font-bold text-slate-500">Uds/Caja:</span>
                      <input
                        type="number"
                        min="1"
                        value={quickUnitsPerBox}
                        onChange={(e) => setQuickUnitsPerBox(parseInt(e.target.value) || 1)}
                        className="w-10 text-[10px] font-black text-emerald-700 outline-none text-center"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                    <span className="text-[10px] font-bold text-slate-500">Lote:</span>
                    <input
                      type="text"
                      value={quickLot}
                      onChange={(e) => setQuickLot(e.target.value)}
                      className="w-20 text-[10px] font-mono font-bold text-slate-700 outline-none"
                    />
                  </div>
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
                  <span>💡 "{matchedExistingMedInQuickBar.name}" ya existe (Stock actual: {matchedExistingMedInQuickBar.isUnitOnly ? `${matchedExistingMedInQuickBar.stockUnits} unidades` : `${matchedExistingMedInQuickBar.stockBoxes} cajas`}). Al ingresar, se sumará el stock sin duplicar.</span>
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
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                        {med.isUnitOnly || med.unitsPerBox === 1 ? 'Precio Unidad' : 'Precio Caja'}
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {currencySymbol} {(med.isUnitOnly || med.unitsPerBox === 1 ? med.priceUnit : med.priceBox).toFixed(2)}
                      </span>
                      {med.isUnitOnly || med.unitsPerBox === 1 ? (
                        <span className="text-[9px] font-bold text-blue-600 block">
                          Precio por unidad
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400 block">
                          Uds: {currencySymbol} {med.priceUnit.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Stock Actual</span>
                      <div className="flex items-center md:justify-end gap-1.5">
                        <span className={`text-sm font-black ${isUnderMin ? 'text-rose-600' : 'text-slate-800'}`}>
                          {med.isUnitOnly || med.unitsPerBox === 1 ? `${med.stockUnits} Unidades` : `${med.stockBoxes} Cajas`}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 block">
                        {med.isUnitOnly || med.unitsPerBox === 1 ? '(Unidades individuales)' : `(${med.stockUnits} unidades)`}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Empaque</span>
                      {med.isUnitOnly || med.unitsPerBox === 1 ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 inline-block w-fit md:ml-auto">
                          Solo Unidades
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-600">
                          {med.unitsPerBox} uds / caja
                        </span>
                      )}
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
                {/* SELECTOR PRINCIPAL SIEMPRE VISIBLE ARRIBA EN AMBOS MODOS (CAJA vs UNIDAD SUELTA / JARABE) */}
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-md space-y-2.5 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      ¿Cómo compraste este producto? (Elige una opción) *
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                      {formData.isUnitOnly ? 'Modo: Solo por Unidad (Sin Caja)' : 'Modo: Por Caja con Unidades'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const units = formData.unitsPerBox && formData.unitsPerBox > 1 ? formData.unitsPerBox : 20;
                        const boxes = formData.stockBoxes || 10;
                        const pb = formData.priceBox || 30;
                        const cb = formData.costPriceBox || 20;
                        setFormData({
                          ...formData,
                          isUnitOnly: false,
                          unitsPerBox: units,
                          stockBoxes: boxes,
                          stockUnits: boxes * units,
                          priceUnit: parseFloat((pb / units).toFixed(2)),
                          costPriceUnit: parseFloat((cb / units).toFixed(2))
                        });
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        !formData.isUnitOnly
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${!formData.isUnitOnly ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black">📦 Compré por CAJA</div>
                        <div className="text-[10px] opacity-85 font-medium">Viene en cajas con varias unidades adentro</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const currentUnits = formData.isUnitOnly ? (formData.stockUnits || 8) : 8;
                        const unitPrice = formData.priceBox || formData.priceUnit || 25;
                        const unitCost = formData.costPriceBox || formData.costPriceUnit || 18;
                        setFormData({
                          ...formData,
                          isUnitOnly: true,
                          unitsPerBox: 1,
                          stockBoxes: currentUnits,
                          stockUnits: currentUnits,
                          priceBox: unitPrice,
                          priceUnit: unitPrice,
                          costPriceBox: unitCost,
                          costPriceUnit: unitCost
                        });
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                        formData.isUnitOnly
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${formData.isUnitOnly ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black">🧪 Compré por UNIDAD (Sin Caja)</div>
                        <div className="text-[10px] opacity-85 font-medium">Ej: Compré 8 jarabes, frascos o unidades sueltas</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* MODO RÁPIDO: ULTRA SENCILLO Y ÁGIL */}
                {modalMode === 'QUICK' && (
                  <div className="space-y-4">
                    {/* Step 1: Drug Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>1. Nombre del Producto / Medicamento *</span>
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
                          onChange={(e) => {
                            const val = e.target.value;
                            const autoUnit = isLikelyUnitOnlyName(val);
                            setFormData({ 
                              ...formData, 
                              name: val,
                              genericName: formData.genericName || val,
                              ...(autoUnit && !formData.isUnitOnly ? {
                                isUnitOnly: true,
                                unitsPerBox: 1,
                                stockBoxes: 8,
                                stockUnits: 8,
                                priceUnit: formData.priceBox || 25,
                                costPriceUnit: formData.costPriceBox || 18
                              } : {})
                            });
                          }}
                          placeholder={formData.isUnitOnly ? "Ej: Ambroxol Jarabe 120ml, Ibuprofeno Suspensión..." : "Ej: Paracetamol 500mg, Amoxicilina 500mg..."}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white shadow-sm"
                        />
                      </div>

                      {matchedExistingMedInModal && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center justify-between">
                          <span>💡 Ya existe en inventario ({matchedExistingMedInModal.isUnitOnly ? `${matchedExistingMedInModal.stockUnits} unidades` : `${matchedExistingMedInModal.stockBoxes} cajas`}). Se sumará a este producto.</span>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Cantidad Comprada, Costo y Precio de Venta */}
                    <div className={`p-4 rounded-2xl border space-y-3.5 shadow-sm ${formData.isUnitOnly ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          {formData.isUnitOnly
                            ? '2. Cantidad de Unidades Compradas (Sin Caja) y Precio por Unidad *'
                            : '2. Cantidad de Cajas, Unidades por Caja y Precios *'}
                        </span>
                      </div>

                      {/* SI COMPRÓ POR UNIDAD (EJ: 8 JARABES): Poner primero la cantidad de unidades y luego costo/precio unitario */}
                      {formData.isUnitOnly ? (
                        <div className="space-y-3">
                          <div className="bg-white p-3 rounded-xl border-2 border-blue-400 shadow-sm">
                            <label className="text-xs font-black text-blue-800 uppercase tracking-wider block mb-1">
                              ¿Cuántas Unidades Compraste? (Ej: 8 jarabes / unidades) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                required
                                value={formData.stockUnits ?? formData.stockBoxes ?? ''}
                                onChange={(e) => {
                                  const unitsQty = parseInt(e.target.value) || 0;
                                  setFormData({
                                    ...formData,
                                    unitsPerBox: 1,
                                    stockBoxes: unitsQty,
                                    stockUnits: unitsQty
                                  });
                                }}
                                className="w-full px-3 py-2.5 bg-blue-50/30 border border-blue-300 rounded-xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: 8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-blue-700">
                                unidades (sin caja)
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                                Costo Compra x 1 Unidad ({currencySymbol}) *
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
                                    const profit = formData.profitMarginPercent ?? 40;
                                    const newPrice = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                                    setFormData({
                                      ...formData,
                                      costPriceBox: cost,
                                      costPriceUnit: cost,
                                      priceBox: newPrice,
                                      priceUnit: newPrice
                                    });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                  c/u
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-1">
                                % Ganancia Deseada
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="40"
                                  value={formData.profitMarginPercent ?? ''}
                                  onChange={(e) => {
                                    const profit = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    const cost = formData.costPriceBox || 0;
                                    const newPrice = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                                    setFormData({
                                      ...formData,
                                      profitMarginPercent: profit,
                                      priceBox: newPrice,
                                      priceUnit: newPrice
                                    });
                                  }}
                                  className="w-full pl-3 pr-7 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600">%</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black text-blue-800 uppercase tracking-wider block mb-1">
                                Precio Venta x 1 Unidad ({currencySymbol}) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  required
                                  value={formData.priceBox || ''}
                                  onChange={(e) => {
                                    const pu = parseFloat(e.target.value) || 0;
                                    const cost = formData.costPriceBox || 0;
                                    const newProfit = cost > 0 ? parseFloat((((pu - cost) / cost) * 100).toFixed(1)) : 0;
                                    setFormData({
                                      ...formData,
                                      priceBox: pu,
                                      priceUnit: pu,
                                      profitMarginPercent: newProfit
                                    });
                                  }}
                                  className="w-full px-3 py-2 bg-white border-2 border-blue-400 rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600">
                                  c/u
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950 font-bold bg-blue-100/80 px-3.5 py-2.5 rounded-xl border border-blue-300">
                            <span>✅ Ingresarán: <strong>{formData.stockUnits || 0} unidades sueltas</strong> (A {currencySymbol}{(formData.priceUnit || formData.priceBox || 0).toFixed(2)} cada unidad)</span>
                            <span>Total compra ({formData.stockUnits || 0} uds): <strong>{currencySymbol}{((formData.stockUnits || 0) * (formData.costPriceBox || 0)).toFixed(2)}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Costo de Compra al Proveedor por Caja */}
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
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600">%</span>
                              </div>
                            </div>

                            {/* 3. Precio de Venta por Caja */}
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
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                  caja
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
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

                            <div>
                              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block mb-1">
                                Precio x Unidad Suelta ({currencySymbol})
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={formData.priceUnit ?? ''}
                                onChange={(e) => {
                                  const pu = parseFloat(e.target.value) || 0;
                                  setFormData({
                                    ...formData,
                                    priceUnit: pu
                                  });
                                }}
                                className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div className="sm:col-span-3 flex items-center justify-between text-xs text-slate-500 font-bold">
                              <span>Total a ingresar: {(formData.stockBoxes || 0) * (formData.unitsPerBox || 20)} unidades ({formData.stockBoxes || 0} cajas)</span>
                              <span className="text-slate-600">Inversión compra: {currencySymbol}{((formData.stockBoxes || 0) * (formData.costPriceBox || 0)).toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
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

                    {formData.isUnitOnly ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-blue-50/40 p-3 rounded-xl border border-blue-200">
                        <InputGroup 
                          label="Unidades Compradas (Ej: 8)" 
                          type="number" 
                          value={(formData.stockUnits ?? formData.stockBoxes)?.toString()} 
                          onChange={v => {
                            const uQty = parseInt(v) || 0;
                            setFormData({ ...formData, unitsPerBox: 1, stockBoxes: uQty, stockUnits: uQty });
                          }} 
                        />
                        <InputGroup 
                          label={`Costo x 1 Unidad (${currencySymbol})`} 
                          type="number" 
                          step="0.1" 
                          value={formData.costPriceBox?.toString() || ''} 
                          onChange={v => {
                            const cost = parseFloat(v) || 0;
                            const profit = formData.profitMarginPercent ?? 40;
                            const pu = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                            setFormData({ 
                              ...formData, 
                              costPriceBox: cost, 
                              costPriceUnit: cost,
                              priceBox: pu, 
                              priceUnit: pu 
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
                            const pu = parseFloat((cost * (1 + profit / 100)).toFixed(2));
                            setFormData({ 
                              ...formData, 
                              profitMarginPercent: profit, 
                              priceBox: pu, 
                              priceUnit: pu 
                            });
                          }} 
                        />
                        <InputGroup 
                          label={`Precio Venta x 1 Ud (${currencySymbol})`} 
                          type="number" 
                          step="0.01" 
                          value={formData.priceBox?.toString() || ''} 
                          onChange={v => {
                            const pu = parseFloat(v) || 0;
                            const cost = formData.costPriceBox || 0;
                            const profit = cost > 0 ? parseFloat((((pu - cost) / cost) * 100).toFixed(1)) : 0;
                            setFormData({ 
                              ...formData, 
                              priceBox: pu, 
                              priceUnit: pu,
                              profitMarginPercent: profit
                            });
                          }} 
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
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
                            const boxes = formData.stockBoxes || 0;
                            setFormData({ 
                              ...formData, 
                              unitsPerBox: u, 
                              stockUnits: boxes * u,
                              costPriceUnit: parseFloat((cost / u).toFixed(2)),
                              priceUnit: parseFloat((pb / u).toFixed(2)) 
                            });
                          }} 
                        />
                        <InputGroup 
                          label={`P. Venta x Ud (${currencySymbol})`} 
                          type="number" 
                          step="0.01"
                          value={formData.priceUnit?.toString() || ''} 
                          onChange={v => {
                            const pu = parseFloat(v) || 0;
                            setFormData({ ...formData, priceUnit: pu });
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
                    )}

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
                  <span className="font-black text-slate-800">
                    {restockMed.isUnitOnly || restockMed.unitsPerBox === 1
                      ? `${restockMed.stockUnits} unidades`
                      : `${restockMed.stockBoxes} cajas (${restockMed.stockUnits} uds)`}
                  </span>
                </div>

                {/* Selector: Ingresar por Cajas vs Ingresar por Unidades Sueltas */}
                {!(restockMed.isUnitOnly || restockMed.unitsPerBox === 1) && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRestockByUnit(false)}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                        !restockByUnit ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      📦 Por Cajas
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockByUnit(true)}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                        restockByUnit ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      🧪 Solo Unidades
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                    {restockByUnit ? 'Unidades Nuevas a Ingresar:' : 'Cajas Nuevas a Ingresar:'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={restockBoxes}
                    onChange={(e) => setRestockBoxes(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                    {restockByUnit
                      ? `Se sumarán +${restockBoxes} unidades individuales.`
                      : `Equivale a +${restockBoxes * restockMed.unitsPerBox} unidades.`}
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
