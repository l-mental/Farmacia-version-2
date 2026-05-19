
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Sparkles, Loader2, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSystemAssistantResponse } from '@/services/geminiService';
import { Medication, SaleRecord, Customer, User as SystemUser } from '@/types';
import { generateBolivianInvoice, exportSalesToExcel, generateReportPDF } from '../lib/invoiceUtils';
import * as XLSX from 'xlsx';

interface Message {
  role: 'bot' | 'user';
  content: string;
}

interface AIConsultantProps {
  onClose: () => void;
  medications: Medication[];
  sales: SaleRecord[];
  customers: Customer[];
  currentUser: SystemUser;
}

const AIConsultant: React.FC<AIConsultantProps> = ({ onClose, medications, sales, customers, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: `¡Hola ${currentUser.name}! Soy el Asistente de FarmaPOS. Tengo acceso a los datos de inventario, ventas y clientes. ¿En qué puedo ayudarte con la gestión de la farmacia hoy?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const systemData = {
      inventory: medications.map(m => ({ name: m.name, stock: m.stockBoxes, price: m.priceBox, controlled: m.isControlled })),
      sales: sales.map(s => ({ id: s.id, total: s.total, customer: s.customerName, date: s.timestamp, itemsCount: s.items.length })),
      customersCount: customers.length,
      currentUser: { name: currentUser.name, role: currentUser.role }
    };

    const botResponse = await getSystemAssistantResponse(userMsg, systemData);
    
    // Process Special Commands from Bot
    if (botResponse.includes('[GENERATE_REPORT:')) {
      const match = botResponse.match(/\[GENERATE_REPORT:(.*?)\]/);
      if (match) {
        try {
          const config = JSON.parse(match[1]);
          handleBotReport(config);
        } catch (e) {
          console.error("Error parsing bot report command", e);
        }
      }
    }

    if (botResponse.includes('[GENERATE_INVOICE:')) {
      const match = botResponse.match(/\[GENERATE_INVOICE:(.*?)\]/);
      if (match) {
        try {
          const config = JSON.parse(match[1]);
          const sale = sales.find(s => s.id === config.saleId);
          if (sale) generateBolivianInvoice(sale, 'Bs.');
        } catch (e) {
          console.error("Error parsing bot invoice command", e);
        }
      }
    }

    // Clean response for display
    const cleanResponse = botResponse.replace(/\[GENERATE_.*?\]/g, '').trim();
    setMessages(prev => [...prev, { role: 'bot', content: cleanResponse }]);
    setIsLoading(false);
  };

  const handleBotReport = (config: any) => {
    const { type, period, format } = config;
    let filteredSales = [...sales];
    const now = new Date();

    if (period === 'TODAY') {
      filteredSales = sales.filter(s => new Date(s.timestamp).toDateString() === now.toDateString());
    } else if (period === 'WEEK') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredSales = sales.filter(s => new Date(s.timestamp) >= weekAgo);
    } else if (period === 'YEAR') {
      filteredSales = sales.filter(s => new Date(s.timestamp).getFullYear() === now.getFullYear());
    }

    if (type === 'SALES') {
      if (format === 'EXCEL') {
        exportSalesToExcel(filteredSales, `Reporte_Ventas_${period}`);
      } else {
        const reportData = filteredSales.map(s => ({
          id: s.id,
          fecha: new Date(s.timestamp).toLocaleDateString(),
          cliente: s.customerName,
          total: `Bs. ${s.total.toFixed(2)}`
        }));
        generateReportPDF(`Reporte de Ventas - ${period}`, reportData, ['ID', 'FECHA', 'CLIENTE', 'TOTAL'], `Reporte_Ventas_${period}`);
      }
    } else if (type === 'PERFORMANCE') {
      // Top Sellers
      const performance: any = {};
      filteredSales.forEach(s => {
        performance[s.userId] = (performance[s.userId] || 0) + s.total;
      });
      const perfData = Object.entries(performance).map(([user, total]) => ({
        vendedor: user,
        total: `Bs. ${(total as number).toFixed(2)}`
      }));
      
      if (format === 'EXCEL') {
        const worksheet = XLSX.utils.json_to_sheet(perfData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rendimiento');
        XLSX.writeFile(workbook, `Rendimiento_Vendedores_${period}.xlsx`);
      } else {
        generateReportPDF(`Rendimiento de Vendedores - ${period}`, perfData, ['VENDEDOR', 'TOTAL VENTAS'], `Rendimiento_${period}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col h-[600px] max-h-[80vh] overflow-hidden border border-emerald-100">
        {/* Header */}
        <div className="bg-emerald-600 p-6 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none mb-1 flex items-center gap-2">
                Asistente FarmaPOS
                <Sparkles className="w-4 h-4 text-emerald-200" />
              </h2>
              <p className="text-emerald-100 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Impulsado por Marca Registrada
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-emerald-100 text-emerald-600'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-slate-600" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[90%] md:max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="markdown-body prose prose-sm max-w-none prose-emerald">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
                {msg.role === 'bot' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 italic">
                    <BarChart3 className="w-3 h-3" />
                    Información basada en datos del sistema.
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-pulse">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-sm text-slate-500">Analizando datos...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pregunta sobre stock, ventas o rendimiento..."
              className="flex-1 px-4 py-3 bg-slate-100 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3">
            Usa el asistente con responsabilidad. En caso de emergencia, llama al 112.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIConsultant;
