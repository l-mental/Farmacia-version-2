
import React, { useState } from 'react';
import { Camera, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { analyzePrescription } from '../services/geminiService';
import { PrescriptionAnalysis } from '../types';

const PrescriptionScanner: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PrescriptionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const analysis = await analyzePrescription(base64);
        setResult(analysis);
      } catch (err) {
        setError("No pudimos analizar la receta. Por favor, intenta con una foto más clara.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                Escáner de Recetas IA
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </h2>
              <p className="text-slate-500 text-sm mt-1">Nuestra inteligencia artificial verificará y extraerá los datos de tu receta automáticamente.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {!result ? (
            <div className="space-y-6">
              <label className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                      <p className="text-lg font-medium text-slate-700 animate-pulse">Analizando prescripción médica...</p>
                      <p className="text-sm text-slate-400 mt-1">Esto puede tardar unos segundos</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-emerald-600" />
                      </div>
                      <p className="mb-2 text-lg font-semibold text-slate-700">Subir foto de la receta</p>
                      <p className="text-sm text-slate-400">JPG, PNG o PDF (Máximo 5MB)</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isAnalyzing} />
              </label>

              {error && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3 text-rose-600">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Camera className="w-6 h-6 text-slate-400 mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">Usa buena luz</h4>
                  <p className="text-xs text-slate-400 mt-1">Asegúrate de que el texto sea legible.</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FileText className="w-6 h-6 text-slate-400 mb-2" />
                  <h4 className="font-bold text-slate-800 text-sm">Documento completo</h4>
                  <p className="text-xs text-slate-400 mt-1">Incluye fecha y firma del médico.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  <h3 className="text-xl font-bold text-slate-800">Análisis Completado</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicamentos Identificados</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.medications.map((med, i) => (
                        <span key={i} className="bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-700 border border-emerald-100 shadow-sm">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dosificación</span>
                    <p className="text-slate-700 bg-white/50 p-3 rounded-xl mt-2 text-sm leading-relaxed border border-white">
                      {result.dosage}
                    </p>
                  </div>

                  {result.warnings && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider">Advertencias de la IA</span>
                        <p className="text-sm mt-0.5">{result.warnings}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setResult(null)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors"
                >
                  Subir otra
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  Continuar Compra
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionScanner;
