
export enum Category {
  PAINKILLERS = 'Analgésicos',
  ANTIBIOTICS = 'Antibióticos',
  VITAMINS = 'Vitaminas',
  SKINCARE = 'Cuidado de la piel',
  DIGESTIVE = 'Digestivo',
  PSYCHOTROPIC = 'Psicotrópicos',
  OTHERS = 'Otros'
}

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'PHARMACIST';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  password?: string;
  phone?: string;
  email?: string;
  originalRole?: UserRole;
}

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
  name: string;
  genericName: string;
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

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  customerId?: string;
  customerName?: string;
  insuranceName: string;
  userId: string;
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
