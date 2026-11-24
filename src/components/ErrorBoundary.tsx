import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ha ocurrido un error inesperado.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#2D3E46] text-[#F4F1EA]">
          <div className="max-w-md w-full rounded-2xl border border-white/15 bg-[#344750] p-8 space-y-4">
            <h1 className="text-2xl font-semibold">Algo salió mal en tu estudio</h1>
            <p className="text-sm text-[#B8C7CE] leading-relaxed">
              Tus notas locales permanecen guardadas. Puedes recargar la página para continuar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#E3B469] text-[#1E2A30] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Recargar Not-a taking app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
