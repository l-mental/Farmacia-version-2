import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, X, RefreshCw, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { SUPABASE_SETUP_SQL } from '@/services/supabaseService';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => Promise<boolean>;
  supabaseUrl?: string;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  supabaseUrl = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifySuccess(null);
    try {
      const ready = await onVerify();
      setVerifySuccess(ready);
      if (ready) {
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Extract project ref for direct dashboard link
  let projectRef = '';
  try {
    const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
    if (match && match[1]) {
      projectRef = match[1];
    }
  } catch {}

  const sqlEditorUrl = projectRef 
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` 
    : 'https://supabase.com/dashboard';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Activar Tabla en Supabase</h3>
              <p className="text-xs text-slate-400 font-medium">1 solo paso para sincronizar permanentemente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-medium space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tu base de datos está conectada, pero está vacía</span>
            </div>
            <p>
              Supabase fue vinculado con éxito desde Vercel, pero para que pueda guardar los medicamentos, ventas y personal sin borrarse, necesita la tabla <strong className="font-mono text-amber-950">farma_sync</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Pasos Rápidos (Menos de 1 minuto):</p>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 font-medium pl-1">
              <li>
                Haz clic en el botón verde <strong className="text-emerald-700">"Copiar Script SQL"</strong>.
              </li>
              <li>
                Abre el <strong className="text-slate-900">SQL Editor</strong> en tu proyecto de Supabase.
              </li>
              <li>
                Pega el código copiado y haz clic en <strong className="text-emerald-700">"Run"</strong> (Ejecutar).
              </li>
              <li>
                ¡Listo! Haz clic en <strong className="text-slate-900">"Verificar Conexión"</strong> abajo.
              </li>
            </ol>
          </div>

          <div className="relative">
            <pre className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-2xl overflow-x-auto max-h-40 border border-slate-800 leading-relaxed">
              {SUPABASE_SETUP_SQL}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>

          {verifySuccess === true && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2 text-emerald-900 text-xs font-black animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>¡Excelente! La tabla farma_sync ha sido verificada con éxito. Los datos ya se sincronizan en tiempo real.</span>
            </div>
          )}

          {verifySuccess === false && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold animate-in fade-in">
              Aún no se detecta la tabla "farma_sync". Asegúrate de hacer clic en <strong>RUN</strong> en el SQL Editor de Supabase y vuelve a probar.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Abrir SQL Editor en Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            disabled={isVerifying}
            onClick={handleVerify}
            className="w-full sm:w-auto py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verificando...' : 'Verificar Conexión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
