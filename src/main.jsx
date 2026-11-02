import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorState from './components/ErrorState.jsx'

class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('Hotel search rendering failed', error)
  }

  render() {
    if (this.state.failed) {
      return <main dir="rtl" className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <ErrorState onRetry={() => this.setState({ failed: false })} />
      </main>
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
