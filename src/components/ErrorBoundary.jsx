import React from 'react';
import { reportError } from '../core/error/reportError';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportError(error, {
      type: 'REACT_ERROR_BOUNDARY',
      componentStack: errorInfo?.componentStack,
      ...(this.props.context ? { context: this.props.context } : {}),
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '2rem',
            margin: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--color-surface, #111827)',
            border: '1px solid var(--color-danger, #ef4444)',
            color: 'var(--color-text, #e5e7eb)',
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={40} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            Algo salió mal
          </h3>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {this.state.error?.message || 'Error inesperado en la interfaz'}
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            El error ha sido registrado automáticamente.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: 'var(--color-accent, #ffbf00)',
              color: '#14181F',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
