import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Errore non gestito:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 560, margin: '60px auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
          <h2>⚠ Si è verificato un errore imprevisto</h2>
          <p>Invece di una schermata bianca, ecco il messaggio tecnico — utile per capire cosa è successo:</p>
          <pre style={{ background: '#1a2029', color: '#ffd8db', padding: 14, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '10px 16px', borderRadius: 8, border: 'none', background: '#3fe0c0', color: '#06231d', fontWeight: 700, cursor: 'pointer' }}
          >
            Ricarica l'app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
