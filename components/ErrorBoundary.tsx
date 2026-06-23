"use client";

/**
 * React Error Boundary
 * NIST 800-171: SI-11 (Error Handling)
 *
 * Catches unhandled render errors in child components.
 * Displays a safe fallback UI without leaking stack traces or internal details.
 * Logs the error via the audit system.
 */

import React from "react";
import { audit } from "@/lib/audit-log";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorId: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    const errorId = `ERR-${Date.now()}`;
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // NIST AU-2: Log the error for audit trail
    audit({
      event: "API_ERROR",
      userId: "session-user",
      role: "ANALYST",
      ip: "client",
      userAgent: "ie-sync-ui",
      resource: "ErrorBoundary",
      action: "unhandled_render_error",
      outcome: "FAILURE",
      details: {
        errorId: this.state.errorId,
        message: error.message,
        componentStack: errorInfo.componentStack?.substring(0, 500),
      },
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">&#9888;</div>
            <h1 className="text-xl font-bold text-[#e2e8f0]">
              System Error
            </h1>
            <p className="text-[#94a3b8] text-sm">
              An unexpected error occurred in the IE-SYNC interface.
              This incident has been logged for review.
            </p>
            <p className="text-[#64748b] text-xs font-mono">
              Error ID: {this.state.errorId}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorId: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#3b82f6] text-white text-sm rounded hover:bg-[#2563eb] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
