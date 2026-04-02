import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

// Vues : connexion | inscription | verif_email | otp_a2f | mdp_oublie | reset_envoye

export default function Auth() {
  const nav = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const [vue, setVue]               = useState('connexion')
  const [email, setEmail]           = useState('')
  const [mdp, setMdp]               = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')
  const [code, setCode]             = useState('')
  const [userId, setUserId]         = useState(null)
  const [emailHint, setEmailHint]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState(
    params.get('session') === 'expiree'
      ? 'Votre session a expiré. Veuillez vous reconnecter.'
      : ''
  )
  const [ok, setOk]                 = useState('')

  function reset() { setErr(''); setOk('') }

  // ── Inscription ─────────────────────────────────────────
  async function handleInscription(e) {
    e.preventDefault()
    reset()
    if (mdp !== mdpConfirm) { setErr('Les mots de passe ne correspondent pas'); return }
    if (mdp.length < 8)     { setErr('Minimum 8 caractères'); return }
    setLoading(true)
    try {
      const r = await api.inscription({ email, mot_de_passe: mdp })
      setUserId(r.utilisateur_id)
      setEmailHint(r.email_hint)
      setVue('verif_email')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Vérification email inscription ──────────────────────
  async function handleVerifEmail(e) {
    e.preventDefault()
    reset(); setLoading(true)
    try {
      const r = await api.verifierEmail({ utilisateur_id: userId, code })
      localStorage.setItem('token', r.token)
      nav('/entreprise')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function renvoyerVerif() {
    reset(); setLoading(true)
    try {
      await api.renvoyerVerification({ utilisateur_id: userId })
      setOk('Nouveau code envoyé sur votre email.')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Connexion ───────────────────────────────────────────
  async function handleConnexion(e) {
    e.preventDefault()
    reset(); setLoading(true)
    try {
      const r = await api.connexion({ email, mot_de_passe: mdp })

      // Email non vérifié → aller saisir le code
      if (r.email_non_verifie) {
        setUserId(r.utilisateur_id)
        setEmailHint(r.email_hint)
        setOk('Un nouveau code de vérification vous a été envoyé.')
        setVue('verif_email')
        return
      }

      // A2F activée
      if (r.a2f_requis) {
        setUserId(r.utilisateur_id)
        setEmailHint(r.email_hint)
        setVue('otp_a2f')
        return
      }

      localStorage.setItem('token', r.token)
      nav(r.profil_complet ? '/dashboard' : '/entreprise')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── OTP A2F ─────────────────────────────────────────────
  async function handleOtpA2f(e) {
    e.preventDefault()
    reset(); setLoading(true)
    try {
      const r = await api.verifierOtp({ utilisateur_id: userId, code })
      localStorage.setItem('token', r.token)
      nav(r.profil_complet ? '/dashboard' : '/entreprise')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function renvoyerOtp() {
    reset(); setLoading(true)
    try {
      await api.renvoyerOtp({ utilisateur_id: userId })
      setOk('Nouveau code envoyé.')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Mot de passe oublié ─────────────────────────────────
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

        {/* ── CONNEXION ── */}
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
              <button type="button" className="btn-link" style={{ fontSize:13, marginBottom:16, display:'block' }}
                onClick={() => { reset(); setVue('mdp_oublie') }}>
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

        {/* ── INSCRIPTION ── */}
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

        {/* ── VÉRIFICATION EMAIL ── */}
        {vue === 'verif_email' && (
          <>
            <h2>Vérifiez votre email</h2>
            <p style={{ fontSize:14, color:'#666', marginBottom:20, lineHeight:1.6 }}>
              Un code à 6 chiffres a été envoyé à <strong>{emailHint}</strong>.<br />
              Saisissez-le ci-dessous pour activer votre compte.
            </p>
            <form onSubmit={handleVerifEmail}>
              <div className="field">
                <label>Code de vérification</label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ letterSpacing:10, fontSize:28, textAlign:'center', fontFamily:'monospace' }}
                  autoFocus
                  required
                />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading || code.length < 6}>
                {loading ? 'Vérification...' : 'Activer mon compte'}
              </button>
            </form>

            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, fontSize:13 }}>
              <button className="btn-link" onClick={renvoyerVerif} disabled={loading}>
                Renvoyer le code
              </button>
              <button className="btn-link" onClick={() => { reset(); setVue('connexion'); setCode('') }}>
                ← Retour
              </button>
            </div>

            <div style={{ marginTop:16, padding:12, background:'#f5f5f5', borderRadius:6, fontSize:12, color:'#888' }}>
              💡 Vérifiez vos <strong>spams</strong> si vous ne recevez pas l'email.<br />
              Le code est valable <strong>15 minutes</strong>.
            </div>
          </>
        )}

        {/* ── OTP A2F ── */}
        {vue === 'otp_a2f' && (
          <>
            <h2>Double authentification</h2>
            <p style={{ fontSize:14, color:'#666', marginBottom:20, lineHeight:1.6 }}>
              Code envoyé à <strong>{emailHint}</strong>.<br />
              Valable <strong>10 minutes</strong>.
            </p>
            <form onSubmit={handleOtpA2f}>
              <div className="field">
                <label>Code à 6 chiffres</label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ letterSpacing:10, fontSize:28, textAlign:'center', fontFamily:'monospace' }}
                  autoFocus
                  required
                />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading || code.length < 6}>
                {loading ? 'Vérification...' : 'Confirmer'}
              </button>
            </form>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, fontSize:13 }}>
              <button className="btn-link" onClick={renvoyerOtp} disabled={loading}>Renvoyer</button>
              <button className="btn-link" onClick={() => { reset(); setVue('connexion'); setCode('') }}>← Retour</button>
            </div>
          </>
        )}

        {/* ── MOT DE PASSE OUBLIÉ ── */}
        {vue === 'mdp_oublie' && (
          <>
            <h2>Mot de passe oublié</h2>
            <p style={{ fontSize:14, color:'#666', marginBottom:20, lineHeight:1.6 }}>
              Saisissez votre email pour recevoir un lien de réinitialisation.
            </p>
            <form onSubmit={handleMdpOublie}>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
            <div style={{ marginTop:16, textAlign:'center' }}>
              <button className="btn-link" style={{ fontSize:13 }} onClick={() => { reset(); setVue('connexion') }}>
                ← Retour à la connexion
              </button>
            </div>
          </>
        )}

        {/* ── CONFIRMATION RESET ENVOYÉ ── */}
        {vue === 'reset_envoye' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
            <h2>Email envoyé !</h2>
            <p style={{ fontSize:14, color:'#666', lineHeight:1.7 }}>
              Si <strong>{email}</strong> est associé à un compte,<br />
              vous recevrez un lien dans quelques minutes.
            </p>
            <div style={{ background:'#f5f5f5', borderRadius:6, padding:12, fontSize:12, color:'#888', margin:'20px 0', textAlign:'left' }}>
              💡 Vérifiez vos <strong>spams</strong>.<br />
              Le lien est valable <strong>1 heure</strong>.
            </div>
            <button className="btn btn-secondary btn-full" onClick={() => { reset(); setVue('connexion') }}>
              ← Retour à la connexion
            </button>
          </div>
        )}

      </div>
    </div>
  )
}