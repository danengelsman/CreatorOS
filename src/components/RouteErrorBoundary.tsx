import React from 'react';
import {
  WarningCircle as AlertCircle,
  ArrowsClockwise as RefreshCcw,
  House,
} from '@phosphor-icons/react';
import { logErrorToFirestore } from '../lib/logger';

interface Props {
  children: React.ReactNode;
  /** Recovery action: resets the app-level route (e.g. navigate('/')). */
  onGoHome: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * F4.7 — Per-route error boundary. A crash in one view renders a scoped error
 * card inside the app shell (nav/tab bar stay usable) instead of blanking the
 * whole app. Remounted per tab by the router's keyed wrapper, so recovering is
 * just switching tabs — or using the actions below.
 */
export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RouteErrorBoundary caught an error:', error, errorInfo);
    logErrorToFirestore(error, {
      componentStack: errorInfo.componentStack,
      source: 'RouteErrorBoundary',
    });
  }

  // Reset our own state too: if the crash happened on the home view,
  // onGoHome alone wouldn't remount us and the card would persist.
  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onGoHome();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected error occurred.';

      return (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full premium-card p-10 bg-premium-surface text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[24px] flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight mb-2">This view hit a snag</h2>
              <p className="text-premium-muted text-sm leading-relaxed">
                The rest of the app is still working. You can retry this view or head back home.
              </p>
              <div className="mt-5 p-4 bg-premium-bg rounded-2xl text-left overflow-hidden">
                <p className="text-[11px] font-bold text-premium-muted uppercase tracking-widest mb-2">
                  Error Details
                </p>
                <p className="text-xs font-mono text-red-600 break-words">{errorMessage}</p>
              </div>
            </div>
            <div className="space-y-3">
              <button onClick={this.handleGoHome} className="ios-button ios-button-filled w-full">
                <House className="w-4 h-4" />
                Go Home
              </button>
              <button onClick={this.handleRetry} className="ios-button ios-button-tinted w-full">
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
