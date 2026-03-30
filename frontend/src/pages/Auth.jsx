import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

export default function Auth() {
  const nav = useNavigate()
  const [mode, setMode]         = useState('connexion') // connexion | inscription | otp
  const [form, setForm]         = useState({ email: '', mot_de_passe: '' })
  const [otpCode, setOtpCode]   = useState('')
  const [userId, setUserId]     = useState(null)
  const [otpVisible, setOtpVisible] = useState(null)
  const [err, setErr]           = useState('')
  const [loading, setLoading]   = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function soumettre(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      if (mode === 'inscription') {
        const r = await api.inscription(form)
        localStorage.setItem('token', r.token)
        nav(r.profil_complet ? '/dashboard' : '/entreprise')
      } else {
        const r = await api.connexion(form)
        if (r.a2f_requis) {
          setUserId(r.utilisateur_id)
          setOtpVisible(r.otp_code)
          setMode('otp')
        } else {
          localStorage.setItem('token', r.token)
          nav(r.profil_complet ? '/dashboard' : '/entreprise')
        }
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function verifierOtp(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const r = await api.verifierOtp({ utilisateur_id: userId, code: otpCode })
      localStorage.setItem('token', r.token)
      nav(r.profil_complet ? '/dashboard' : '/entreprise')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Vue OTP ──────────────────────────────────────────────
  if (mode === 'otp') return (
    <div className="page">
      <h1>Vérification A2F</h1>
      <p className="subtitle">Saisissez le code à 6 chiffres envoyé sur votre téléphone.</p>

      {otpVisible && (
        <div className="alert alert-warn">
          Code de test : <strong style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 4 }}>{otpVisible}</strong>
        </div>
      )}

      {err && <div className="alert alert-err">{err}</div>}

      <form onSubmit={verifierOtp}>
        <div className="field">
          <label>Code à 6 chiffres</label>
          <input
            type="text"
            maxLength={6}
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
            style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }}
            autoFocus
            required
          />
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? 'Vérification...' : 'Confirmer'}
        </button>
      </form>

      <hr className="divider" />
      <button className="btn-link" onClick={() => { setMode('connexion'); setErr('') }}>
        ← Retour à la connexion
      </button>
    </div>
  )

  // ── Vue principale ────────────────────────────────────────
  return (
    <div className="page">
      <h1>Infinity Compliance</h1>
      <p className="subtitle">
        {mode === 'connexion'
          ? 'Connectez-vous à votre espace ARTCI.'
          : 'Créez votre compte pour déposer vos dossiers ARTCI en ligne.'}
      </p>

      {err && <div className="alert alert-err">{err}</div>}

      <form onSubmit={soumettre}>
        <div className="field">
          <label>Email <span className="required">*</span></label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="votre@email.ci"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Mot de passe <span className="required">*</span></label>
          <input
            type="password"
            value={form.mot_de_passe}
            onChange={e => set('mot_de_passe', e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          disabled={loading}
        >
          {loading
            ? 'Chargement...'
            : mode === 'connexion' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      <hr className="divider" />

      <p style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>
        {mode === 'connexion' ? "Pas encore de compte ?" : 'Déjà un compte ?'}
        {' '}
        <button
          className="btn-link"
          onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErr('') }}
        >
          {mode === 'connexion' ? "S'inscrire" : 'Se connecter'}
        </button>
      </p>
    </div>
  )
}