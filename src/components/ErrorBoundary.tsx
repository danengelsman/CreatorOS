import React from 'react';
import { WarningCircle as AlertCircle, ArrowsClockwise as RefreshCcw } from '@phosphor-icons/react';
import { logErrorToFirestore } from '../lib/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    logErrorToFirestore(error, {
      componentStack: errorInfo.componentStack,
      source: 'ErrorBoundary'
    });
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirebaseError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firebase Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path || 'unknown path'}`;
            isFirebaseError = true;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-premium-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full premium-card p-10 bg-premium-surface text-center space-y-8">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight mb-3">System Interruption</h2>
              <p className="text-premium-muted leading-relaxed">
                {isFirebaseError ? "We encountered a permission or data issue with our cloud services." : "Something went wrong while rendering this view."}
              </p>
              <div className="mt-6 p-4 bg-premium-bg rounded-2xl text-left overflow-hidden">
                <p className="text-[11px] font-bold text-premium-muted uppercase tracking-widest mb-2">Error Details</p>
                <p className="text-xs font-mono text-red-600 break-words">{errorMessage}</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="ios-button ios-button-filled w-full"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
