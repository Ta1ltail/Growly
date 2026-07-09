"use client";

// React Error Boundary — catches rendering errors and displays a fallback UI
// instead of crashing the entire page. Wraps the app in RootLayout.

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <div className="mx-auto max-w-md rounded-2xl bg-surface p-8 shadow-lg ring-1 ring-line">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="mb-2 text-xl font-bold text-ink">Something went wrong</h1>
            <p className="mb-4 text-sm text-muted">
              An unexpected error occurred. Your data is safely stored locally.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-xs text-faint hover:text-muted">
                  Error details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-surface2 p-3 text-xs text-muted">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-xl bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 active:scale-95"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
