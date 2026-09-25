
export enum Category {
  PAINKILLERS = 'Analgésicos',
  ANTIBIOTICS = 'Antibióticos',
  VITAMINS = 'Vitaminas',
  SKINCARE = 'Cuidado de la piel',
  DIGESTIVE = 'Digestivo',
  PSYCHOTROPIC = 'Psicotrópicos',
  OTHERS = 'Otros'
}

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST' | 'CUSTOM';

export type AppSection = 
  | 'DASHBOARD' 
  | 'POS' 
  | 'INVENTORY' 
  | 'REPORTS' 
  | 'CUSTOMERS' 
  | 'SUPPLIERS' 
  | 'PURCHASES' 
  | 'STAFF';

export interface UserPermissions {
  allowedSections: AppSection[];
  canEditInventory: boolean;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  customRoleName?: string;
  permissions?: UserPermissions;
  username: string;
  password?: string;
  phone?: string;
  email?: string;
  originalRole?: UserRole;
  assignedRegister?: 'Caja 1' | 'Caja 2';
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  ADMIN: {
    allowedSections: ['DASHBOARD', 'POS', 'INVENTORY', 'REPORTS', 'CUSTOMERS', 'SUPPLIERS', 'PURCHASES', 'STAFF'],
    canEditInventory: true
  },
  PHARMACIST: {
    allowedSections: ['DASHBOARD', 'POS', 'INVENTORY', 'CUSTOMERS', 'PURCHASES'],
    canEditInventory: true
  },
  EMPLOYEE: {
    allowedSections: ['POS', 'INVENTORY', 'CUSTOMERS'],
    canEditInventory: false
  },
  CUSTOM: {
    allowedSections: ['POS'],
    canEditInventory: false
  }
};

export const canUserAccessSection = (user: User | null | undefined, section: AppSection): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.permissions && Array.isArray(user.permissions.allowedSections)) {
    return user.permissions.allowedSections.includes(section);
  }
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || DEFAULT_ROLE_PERMISSIONS.EMPLOYEE;
  return defaultPerms.allowedSections.includes(section);
};

export const canUserEditInventory = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.permissions && typeof user.permissions.canEditInventory === 'boolean') {
    return user.permissions.canEditInventory;
  }
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || DEFAULT_ROLE_PERMISSIONS.EMPLOYEE;
  return defaultPerms.canEditInventory;
};

export interface Batch {
  lotNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface InsurancePlan {
  id: string;
  name: string;
  coveragePercent: number;
}

export interface Medication {
  id: string;
  name: string; // Nombre Comercial
  genericName: string; // Nombre Genérico / Principio Activo
  laboratory: string;
  description: string;
  priceBox: number;
  priceUnit: number;
  unitsPerBox: number;
  category: Category;
  imageUrl: string;
  stockBoxes: number;
  stockUnits: number;
  isControlled: boolean;
  minStock: number;
  maxStock?: number;
  batches: Batch[];
}

export interface Customer {
  id: string;
  name: string;
  dni: string;
  insuranceId: string;
  phone?: string;
  email?: string;
  address?: string;
  history: string[]; // IDs of sales
}

export interface PharmacyInfo {
  name: string;
  commercialName: string;
  nit: string;
  address: string;
  phone: string;
  city: string;
  authorizationNumber?: string;
}

export interface SaleItem {
  medication: Medication;
  quantity: number;
  isFractional: boolean;
  selectedBatch: string;
  subtotal: number;
}

export interface PrescriptionData {
  doctorLicense: string;
  patientName: string;
  date: string;
}

/* Fix: Added the missing PrescriptionAnalysis interface expected by PrescriptionScanner.tsx */
export interface PrescriptionAnalysis {
  medications: string[];
  dosage: string;
  warnings: string;
  isAuthentic: boolean;
}

export type PaymentMethod = 'CASH' | 'QR' | 'CARD';
export type DocumentType = 'FACTURA' | 'RECIBO';

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  customerId?: string;
  customerName?: string;
  clientNit?: string;
  clientBusinessName?: string;
  documentType?: DocumentType;
  qrVerified?: boolean;
  insuranceName: string;
  userId: string;
  cashierName?: string;
  cashRegister?: 'Caja 1' | 'Caja 2';
  paymentMethod: PaymentMethod;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  ci: string;
  address: string;
  status: 'active' | 'inactive';
  registrationDate: string;
  lastUpdate: string;
}

export type PurchaseStatus = 'Completado' | 'Pendiente' | 'Cancelado';

export interface PurchaseItem {
  medicationId: string;
  medicationName: string;
  quantity: number;
  costPrice: number;
  lotNumber: string;
  expiryDate: string;
  subtotal: number;
}

export interface Purchase {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  warehouseName: string;
  total: number;
  status: PurchaseStatus;
  items: PurchaseItem[];
  registrationDate: string;
}

declare global {
  interface Window {
    google: any;
  }
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
