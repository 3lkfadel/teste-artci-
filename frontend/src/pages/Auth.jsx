import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

// ── Vues possibles ──────────────────────────────────────────
// connexion | inscription | otp | mot_de_passe_oublie | reset_envoye

export default function Auth() {
  const nav = useNavigate()

  const [vue, setVue]               = useState('connexion')
  const [email, setEmail]           = useState('')
  const [mdp, setMdp]               = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')
  const [otpCode, setOtpCode]       = useState('')
  const [userId, setUserId]         = useState(null)
  const [emailHint, setEmailHint]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')
  const [ok, setOk]                 = useState('')

  function reset() {
    setErr(''); setOk('')
  }

  // ── Connexion ─────────────────────────────────────────────
  async function handleConnexion(e) {
    e.preventDefault()
    reset(); setLoading(true)
    try {
      const r = await api.connexion({ email, mot_de_passe: mdp })
      if (r.a2f_requis) {
        setUserId(r.utilisateur_id)
        setEmailHint(r.email_hint)
        setVue('otp')
      } else {
        localStorage.setItem('token', r.token)
        nav(r.profil_complet ? '/dashboard' : '/entreprise')
      }
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Inscription ───────────────────────────────────────────
  async function handleInscription(e) {
    e.preventDefault()
    reset()
    if (mdp !== mdpConfirm) { setErr('Les mots de passe ne correspondent pas'); return }
    if (mdp.length < 8)     { setErr('Le mot de passe doit contenir au moins 8 caractères'); return }
    setLoading(true)
    try {
      const r = await api.inscription({ email, mot_de_passe: mdp })
      localStorage.setItem('token', r.token)
      nav('/entreprise')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Vérification OTP A2F ──────────────────────────────────
  async function handleOtp(e) {
    e.preventDefault()
    reset(); setLoading(true)
    try {
      const r = await api.verifierOtp({ utilisateur_id: userId, code: otpCode })
      localStorage.setItem('token', r.token)
      nav(r.profil_complet ? '/dashboard' : '/entreprise')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Renvoyer OTP ──────────────────────────────────────────
  async function renvoyerOtp() {
    reset(); setLoading(true)
    try {
      await api.renvoyerOtp({ utilisateur_id: userId })
      setOk('Nouveau code envoyé sur votre email.')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Mot de passe oublié ───────────────────────────────────
  async function handleMdpOublie(e) {
    e.preventDefault()
    reset(); setLoading(true)
    try {
      await api.motDePasseOublie({ email })
      setVue('reset_envoye')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">IC</div>
          <div>
            <div className="auth-logo-title">Infinity Compliance</div>
            <div className="auth-logo-sub">Plateforme ARTCI — Côte d'Ivoire</div>
          </div>
        </div>

        {err && <div className="alert alert-err">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        {/* ── VUE CONNEXION ── */}
        {vue === 'connexion' && (
          <>
            <h2>Connexion</h2>
            <form onSubmit={handleConnexion}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input type="password" value={mdp} onChange={e => setMdp(e.target.value)} placeholder="••••••••" required />
              </div>
              <button
                type="button"
                className="btn-link"
                style={{ fontSize: 13, marginBottom: 16, display: 'block' }}
                onClick={() => { reset(); setVue('mot_de_passe_oublie') }}
              >
                Mot de passe oublié ?
              </button>
              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
            <div className="auth-switch">
              Pas encore de compte ?{' '}
              <button className="btn-link" onClick={() => { reset(); setVue('inscription') }}>
                Créer un compte
              </button>
            </div>
          </>
        )}

        {/* ── VUE INSCRIPTION ── */}
        {vue === 'inscription' && (
          <>
            <h2>Créer un compte</h2>
            <form onSubmit={handleInscription}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input type="password" value={mdp} onChange={e => setMdp(e.target.value)} placeholder="8 caractères minimum" required />
              </div>
              <div className="field">
                <label>Confirmer le mot de passe</label>
                <input type="password" value={mdpConfirm} onChange={e => setMdpConfirm(e.target.value)} placeholder="••••••••" required />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
            <div className="auth-switch">
              Déjà un compte ?{' '}
              <button className="btn-link" onClick={() => { reset(); setVue('connexion') }}>
                Se connecter
              </button>
            </div>
          </>
        )}

        {/* ── VUE OTP A2F ── */}
        {vue === 'otp' && (
          <>
            <h2>Vérification en deux étapes</h2>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
              Un code à 6 chiffres a été envoyé à <strong>{emailHint}</strong>.<br />
              Vérifiez votre boîte mail et saisissez le code ci-dessous.
            </p>
            <form onSubmit={handleOtp}>
              <div className="field">
                <label>Code de vérification</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ letterSpacing: 10, fontSize: 24, textAlign: 'center', fontFamily: 'monospace' }}
                  autoFocus
                  required
                />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading || otpCode.length < 6}>
                {loading ? 'Vérification...' : 'Confirmer'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 13 }}>
              <button className="btn-link" onClick={renvoyerOtp} disabled={loading}>
                Renvoyer le code
              </button>
              <button className="btn-link" onClick={() => { reset(); setVue('connexion'); setOtpCode('') }}>
                ← Retour
              </button>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6, fontSize: 12, color: '#888' }}>
              💡 Vérifiez vos spams si vous ne recevez pas l'email. Le code est valable <strong>10 minutes</strong>.
            </div>
          </>
        )}

        {/* ── VUE MOT DE PASSE OUBLIÉ ── */}
        {vue === 'mot_de_passe_oublie' && (
          <>
            <h2>Mot de passe oublié</h2>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
              Saisissez votre email. Vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <form onSubmit={handleMdpOublie}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button className="btn-link" style={{ fontSize: 13 }} onClick={() => { reset(); setVue('connexion') }}>
                ← Retour à la connexion
              </button>
            </div>
          </>
        )}

        {/* ── VUE CONFIRMATION ENVOI RESET ── */}
        {vue === 'reset_envoye' && (
          <>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h2>Email envoyé !</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>
                Si <strong>{email}</strong> est associé à un compte,<br />
                vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <div style={{ background: '#f5f5f5', borderRadius: 6, padding: 12, fontSize: 12, color: '#888', margin: '20px 0', textAlign: 'left' }}>
                💡 Pensez à vérifier vos <strong>spams</strong>.<br />
                Le lien est valable <strong>1 heure</strong>.
              </div>
              <button className="btn btn-secondary btn-full" onClick={() => { reset(); setVue('connexion') }}>
                ← Retour à la connexion
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}