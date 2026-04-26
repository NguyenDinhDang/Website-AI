import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          padding: 'var(--space-4)',
          textAlign: 'center'
        }}>
          <div className="card" style={{ padding: 'var(--space-8)', maxWidth: '400px' }}>
            <h1 style={{ color: 'var(--error-text)', marginBottom: 'var(--space-2)' }}>Đã xảy ra lỗi</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Xin lỗi, có một lỗi không mong muốn đã xảy ra. Vui lòng thử lại sau.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
