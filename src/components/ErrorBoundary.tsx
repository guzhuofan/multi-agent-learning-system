import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                出现了一些问题
              </h1>
              <p className="text-gray-600 mb-6">
                应用遇到了意外错误，请尝试刷新页面或重置应用状态。
              </p>
              
              {/* 错误详情（开发模式） */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 text-left">
                  <h3 className="text-sm font-semibold text-red-800 mb-2">
                    错误详情：
                  </h3>
                  <pre className="text-xs text-red-700 overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={this.handleReset}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>重试</span>
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>刷新页面</span>
                </button>
              </div>
              
              <div className="mt-6 text-xs text-gray-500">
                如果问题持续存在，请联系技术支持。
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;