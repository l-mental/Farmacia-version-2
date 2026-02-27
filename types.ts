
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
  history: string[];
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

export interface SaleRecord {
  id: string;
  timestamp: string;
  items: SaleItem[];
  total: number;
  customerName?: string;
  insuranceName: string;
  userId: string;
}
