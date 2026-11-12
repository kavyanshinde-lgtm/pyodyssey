import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from './Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  detail: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, detail: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PyOdyssey] component fault', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fatal-screen">
        <div className="fatal-grid" />
        <div className="fatal-card">
          <span className="fatal-eyebrow">CORE FAULT · RECOVERY MODE</span>
          <h1>The machine hit a snag.</h1>
          <p>
            A visual component failed to render. Your save is still local and untouched. Reload the toybox to bring
            the Python core back online.
          </p>
          <pre>{this.state.detail}</pre>
          <button type="button" onClick={() => window.location.reload()}>
            <Icon name="refresh" size={16} /> RESTART THE TOYBOX
          </button>
        </div>
      </div>
    );
  }
}
