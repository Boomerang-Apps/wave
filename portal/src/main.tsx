import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider'

// Error Boundary to catch rendering errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'system-ui', color: '#fff', background: '#1e1e1e' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <pre style={{ background: '#2e2e2e', padding: '15px', overflow: 'auto', color: '#fafafa', borderRadius: '8px', marginTop: '10px' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <pre style={{ background: '#2e2e2e', padding: '15px', overflow: 'auto', color: '#888', borderRadius: '8px', marginTop: '10px', fontSize: '12px' }}>
            {this.state.error?.stack || 'No stack trace available'}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

console.log('WAVE Portal starting...')

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <App />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
} else {
  console.error('Root element not found!')
}
