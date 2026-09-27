import { Category, Medication } from '@/types';

export interface MedicationPreset {
  name: string;
  genericName: string;
  category: Category;
  laboratory: string;
  unitsPerBox: number;
  priceBox: number;
  costPriceBox?: number;
  profitMarginPercent?: number;
  isControlled: boolean;
  description: string;
  imageUrl: string;
}

export const COMMON_MEDICATIONS_PRESETS: MedicationPreset[] = [
  {
    name: 'Mentisan Ungüento 15g',
    genericName: 'Alcanfor + Mentol + Aceite de Eucalipto',
    category: Category.SKINCARE,
    laboratory: 'Droguería INTI S.A.',
    unitsPerBox: 12,
    costPriceBox: 90,
    profitMarginPercent: 33.3,
    priceBox: 120,
    isControlled: false,
    description: 'Ungüento balsámico descongestionante, calmante muscular y antiséptico.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Mentisan Ungüento 25g (Lata Grande)',
    genericName: 'Alcanfor + Mentol + Aceite de Eucalipto',
    category: Category.SKINCARE,
    laboratory: 'Droguería INTI S.A.',
    unitsPerBox: 12,
    costPriceBox: 150,
    profitMarginPercent: 33.3,
    priceBox: 200,
    isControlled: false,
    description: 'Ungüento tradicional Mentisan en lata de 25g para alivio respiratorio.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Paracetamol 500mg',
    genericName: 'Paracetamol / Acetaminofén',
    category: Category.PAINKILLERS,
    laboratory: 'Genfar',
    unitsPerBox: 20,
    costPriceBox: 18,
    profitMarginPercent: 38.9,
    priceBox: 25,
    isControlled: false,
    description: 'Analgésico y antipirético para el alivio del dolor y la fiebre.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Ibuprofeno 600mg',
    genericName: 'Ibuprofeno',
    category: Category.PAINKILLERS,
    laboratory: 'Bagó',
    unitsPerBox: 20,
    costPriceBox: 25,
    profitMarginPercent: 40,
    priceBox: 35,
    isControlled: false,
    description: 'Antiinflamatorio no esteroideo y analgésico de rápida acción.',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=400'
  },
  {
    name: 'Amoxicilina 500mg',
    genericName: 'Amoxicilina Trihidrato',
    category: Category.ANTIBIOTICS,
    laboratory: 'Inti',
    unitsPerBox: 16,
    priceBox: 48,
    isControlled: false,
    description: 'Antibiótico bactericida de amplio espectro para infecciones.',
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=400'
  },
  {
    name: 'Amoxicilina + Ác. Clavulánico 875/125mg',
    genericName: 'Amoxicilina / Ácido Clavulánico',
    category: Category.ANTIBIOTICS,
    laboratory: 'Bagó',
    unitsPerBox: 14,
    priceBox: 85,
    isControlled: false,
    description: 'Antibiótico reforzado para infecciones respiratorias y dentales.',
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=400'
  },
  {
    name: 'Omeprazol 20mg',
    genericName: 'Omeprazol',
    category: Category.DIGESTIVE,
    laboratory: 'Genfar',
    unitsPerBox: 30,
    priceBox: 30,
    isControlled: false,
    description: 'Inhibidor de la bomba de protones para reflujo y gastritis.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Losartán Potásico 50mg',
    genericName: 'Losartán Potásico',
    category: Category.OTHERS,
    laboratory: 'Inti',
    unitsPerBox: 30,
    priceBox: 42,
    isControlled: false,
    description: 'Antihipertensivo para el control de la presión arterial.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Azitromicina 500mg',
    genericName: 'Azitromicina',
    category: Category.ANTIBIOTICS,
    laboratory: 'Pfizer',
    unitsPerBox: 3,
    priceBox: 45,
    isControlled: false,
    description: 'Macrólido para infecciones respiratorias y de piel.',
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=400'
  },
  {
    name: 'Loratadina 10mg',
    genericName: 'Loratadina',
    category: Category.OTHERS,
    laboratory: 'Genfar',
    unitsPerBox: 20,
    priceBox: 22,
    isControlled: false,
    description: 'Antihistamínico no sedante para alergias y rinitis.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Diclofenaco Sódico 50mg',
    genericName: 'Diclofenaco Sódico',
    category: Category.PAINKILLERS,
    laboratory: 'Bagó',
    unitsPerBox: 20,
    priceBox: 28,
    isControlled: false,
    description: 'Antiinflamatorio y calmante para dolores musculares y articulares.',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=400'
  },
  {
    name: 'Metformina 850mg',
    genericName: 'Metformina Clorhidrato',
    category: Category.OTHERS,
    laboratory: 'Genfar',
    unitsPerBox: 30,
    priceBox: 36,
    isControlled: false,
    description: 'Hipoglucemiante oral para control de glucosa.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Aspirina 100mg Cardio',
    genericName: 'Ácido Acetilsalicílico',
    category: Category.PAINKILLERS,
    laboratory: 'Bayer',
    unitsPerBox: 30,
    priceBox: 32,
    isControlled: false,
    description: 'Antiagregante plaquetario para prevención cardiovascular.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Complejo B Forte',
    genericName: 'Vitaminas B1, B6, B12',
    category: Category.VITAMINS,
    laboratory: 'Inti',
    unitsPerBox: 30,
    priceBox: 40,
    isControlled: false,
    description: 'Neurotrófico y multivitamínico para el sistema nervioso.',
    imageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=400'
  },
  {
    name: 'Vitamina C 1000mg Efervescente',
    genericName: 'Ácido Ascórbico',
    category: Category.VITAMINS,
    laboratory: 'Bayer',
    unitsPerBox: 10,
    priceBox: 35,
    isControlled: false,
    description: 'Refuerzo del sistema inmune y antioxidante.',
    imageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=400'
  },
  {
    name: 'Ketorolaco 10mg SL',
    genericName: 'Ketorolaco Trometamol Sublingual',
    category: Category.PAINKILLERS,
    laboratory: 'Genfar',
    unitsPerBox: 10,
    priceBox: 26,
    isControlled: false,
    description: 'Analgésico potente sublingual para dolor agudo moderado a severo.',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=400'
  },
  {
    name: 'Salbutamol Inhalador 100mcg',
    genericName: 'Salbutamol Sulfato',
    category: Category.OTHERS,
    laboratory: 'GlaxoSmithKline',
    unitsPerBox: 1,
    priceBox: 45,
    isControlled: false,
    description: 'Broncodilatador de acción rápida para crisis asmáticas.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Clonazepam 2mg (Controlado)',
    genericName: 'Clonazepam',
    category: Category.PSYCHOTROPIC,
    laboratory: 'Roche',
    unitsPerBox: 30,
    priceBox: 65,
    isControlled: true,
    description: 'Ansiolítico y anticonvulsivo. Requiere receta médica archivada.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Antigripal Compuesto',
    genericName: 'Paracetamol + Pseudoefedrina + Clorfenamina',
    category: Category.OTHERS,
    laboratory: 'Inti',
    unitsPerBox: 20,
    priceBox: 30,
    isControlled: false,
    description: 'Descongestionante, analgésico y antialérgico para la gripe.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    name: 'Ciprofloxacino 500mg',
    genericName: 'Ciprofloxacino Clorhidrato',
    category: Category.ANTIBIOTICS,
    laboratory: 'Bagó',
    unitsPerBox: 10,
    priceBox: 38,
    isControlled: false,
    description: 'Fluoroquinolona antibiótica para infecciones urinarias y gastrointestinales.',
    imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=400'
  }
];

export const generateAutoLot = (): string => {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `L${yearSuffix}-${randomChars}`;
};

export const getDatePlusYears = (years: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
};

export const getDatePlusMonths = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

export const getCategoryDefaultImage = (cat: Category): string => {
  switch (cat) {
    case Category.PAINKILLERS:
      return 'https://images.unsplash.com/photo-1550572017-ed200f545dec?q=80&w=400';
    case Category.ANTIBIOTICS:
      return 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=400';
    case Category.VITAMINS:
      return 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?q=80&w=400';
    case Category.SKINCARE:
      return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=400';
    case Category.DIGESTIVE:
      return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400';
    case Category.PSYCHOTROPIC:
      return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400';
    default:
      return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400';
  }
};
