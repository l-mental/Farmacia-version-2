
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorMsg: error?.message || String(error) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('Error al iniciar aplicación:', error, info);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('FARMA_USER');
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
          <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-2xl space-y-4">
            <h2 className="text-xl font-black text-slate-900">Iniciando Farmacia Yireh</h2>
            <p className="text-xs text-slate-500">
              Se detectó una sesión anterior desactualizada. Presiona el botón para abrir el sistema.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm shadow-lg cursor-pointer"
            >
              Iniciar Sistema FarmaPOS
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("No se pudo encontrar el elemento raíz para montar la aplicación");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
