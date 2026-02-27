
import React from 'react';
import { Medication } from '../types';
import { ShoppingCart, Info, AlertTriangle } from 'lucide-react';

interface MedicationCardProps {
  medication: Medication;
  onAddToCart: (med: Medication) => void;
  onShowDetails: (med: Medication) => void;
}

const MedicationCard: React.FC<MedicationCardProps> = ({ medication, onAddToCart, onShowDetails }) => {
  const isPrescriptionRequired = medication.category === 'Antibióticos';

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={medication.imageUrl} 
          alt={medication.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {isPrescriptionRequired && (
          <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3" />
            Receta Obligatoria
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="text-xs font-semibold text-emerald-600 mb-1">{medication.category}</div>
        <h3 className="font-bold text-slate-800 text-lg leading-snug mb-1">{medication.name}</h3>
        <p className="text-xs text-slate-400 mb-4">{medication.genericName}</p>
        
        <div className="flex items-center justify-between mt-auto">
          {/* Fixed: Accessing priceBox instead of non-existent price property */}
          <div className="text-xl font-bold text-slate-900">${medication.priceBox.toFixed(2)}</div>
          <div className="flex gap-2">
            <button 
              onClick={() => onShowDetails(medication)}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
            >
              <Info className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onAddToCart(medication)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationCard;
