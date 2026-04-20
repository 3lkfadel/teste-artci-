import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

export default function ARTCILogin() {
  const nav = useNavigate()
  const [email, setEmail]     = useState('')
  const [mdp, setMdp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function login(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const res = await fetch(`${BASE}/artci/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mot_de_passe: mdp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erreur || `Erreur ${res.status}`)
      localStorage.setItem('artci_token', data.token)
      localStorage.setItem('artci_agent', JSON.stringify(data.agent))
      nav('/artci/dashboard')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,49,137,0.12)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>

        {/* Header bleu ARTCI */}
        <div style={{ background: '#003189', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#003189', letterSpacing: -1 }}>
              A
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Espace Agents ARTCI</div>
              <div style={{ color: '#93b4ff', fontSize: 12, marginTop: 2 }}>Autorité de Régulation des Télécommunications</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#111' }}>Connexion agent</h2>

          {err && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 18 }}>
              {err}
            </div>
          )}

          <form onSubmit={login}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                Email professionnel
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="agent@artci.ci"
                required
                autoFocus
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#003189'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#374151' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={mdp}
                onChange={e => setMdp(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#003189'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? '#6b7280' : '#003189', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
            >
              ← Retour au site Infinity Compliance
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
