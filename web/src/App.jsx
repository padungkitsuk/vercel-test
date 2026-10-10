import { useState } from 'react'

// Empty = same origin (Vite proxy locally, or Vercel Services in one project).
// Set VITE_API_BASE_URL when the API lives on another domain.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export default function App() {
  const [name, setName] = useState('World')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function callApi() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/hello?name=${encodeURIComponent(name)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setResult(null)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Hello React + Spring Boot</h1>
      <p>API: <code>{API_BASE || '(same origin)'}/api/hello</code></p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <button onClick={callApi} disabled={loading} style={{ marginLeft: 8 }}>
        {loading ? 'Calling...' : 'Say hello'}
      </button>
      {result && <h2>{result.message}</h2>}
      {result && <small>from {result.from} at {result.time}</small>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
    </main>
  )
}
