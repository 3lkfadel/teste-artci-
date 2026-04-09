import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

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
  const [ok, setOk] = useState('')
  
  function reset() { setErr(''); setOk('') }

  async function handleInscription(e) {
    e.preventDefault(); reset()
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

  async function handleVerifEmail(e) {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const r = await api.verifierEmail({ utilisateur_id: userId, code })
      localStorage.setItem('token', r.token)
      nav('/entreprise?nouveau=true')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function renvoyerVerif() {
    reset(); setLoading(true)
    try { await api.renvoyerVerification({ utilisateur_id: userId }); setOk('Nouveau code envoyé.') }
    catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function handleConnexion(e) {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const r = await api.connexion({ email, mot_de_passe: mdp })
      if (r.email_non_verifie) {
        setUserId(r.utilisateur_id); setEmailHint(r.email_hint)
        setOk('Un nouveau code de vérification vous a été envoyé.')
        setVue('verif_email'); return
      }
      if (r.a2f_requis) {
        setUserId(r.utilisateur_id); setEmailHint(r.email_hint)
        setVue('otp_a2f'); return
      }
      localStorage.setItem('token', r.token)
      nav('/dashboard')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function handleOtpA2f(e) {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const r = await api.verifierOtp({ utilisateur_id: userId, code })
      localStorage.setItem('token', r.token)
      nav('/dashboard')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function renvoyerOtp() {
    reset(); setLoading(true)
    try { await api.renvoyerOtp({ utilisateur_id: userId }); setOk('Nouveau code envoyé.') }
    catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function handleMdpOublie(e) {
    e.preventDefault(); reset(); setLoading(true)
    try { await api.motDePasseOublie({ email }); setVue('reset_envoye') }
    catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex' }}>
      {/* Panel gauche — branding */}
      <div style={{ width:'45%', background:'var(--green)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 48px' }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ width:48, height:48, background:'rgba(255,255,255,0.2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:20, marginBottom:20 }}>IC</div>
          <div style={{ color:'#fff', fontSize:28, fontWeight:600, lineHeight:1.2, marginBottom:12 }}>
            Infinity Compliance
          </div>
          <div style={{ color:'rgba(255,255,255,0.75)', fontSize:15, lineHeight:1.6 }}>
            La plateforme de dématérialisation des démarches ARTCI en Côte d'Ivoire.
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[
            { icon:'✓', label:'Formulaires ARTCI officiels' },
            { icon:'✓', label:'Assistant IA loi n°2013-450' },
            { icon:'✓', label:'Signature électronique OTP' },
            { icon:'✓', label:'Suivi de dossier en temps réel' },
          ].map(item => (
            <div key={item.label} style={{ display:'flex', alignItems:'center', gap:12, color:'rgba(255,255,255,0.85)', fontSize:14 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>{item.icon}</div>
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop:'auto', paddingTop:40, color:'rgba(255,255,255,0.45)', fontSize:11 }}>
          © 2026 Infinity Compliance — Plateforme ARTCI CI
        </div>
      </div>

      {/* Panel droit — formulaire */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
        <div style={{ width:'100%', maxWidth:400 }}>

          {err && <div className="alert alert-err">{err}</div>}
          {ok  && <div className="alert alert-ok">{ok}</div>}

          {/* CONNEXION */}
          {vue === 'connexion' && (
            <>
              <h2 style={{ fontSize:22, fontWeight:600, marginBottom:6 }}>Connexion</h2>
              <p style={{ color:'var(--text-3)', fontSize:13, marginBottom:24 }}>Accédez à votre espace Infinity Compliance</p>
              <form onSubmit={handleConnexion}>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
                </div>
                <div className="field">
                  <label>Mot de passe</label>
                  <input type="password" value={mdp} onChange={e=>setMdp(e.target.value)} placeholder="••••••••" required />
                </div>
                <button type="button" className="btn-link" style={{ fontSize:13, marginBottom:16, display:'block' }}
                  onClick={() => { reset(); setVue('mdp_oublie') }}>
                  Mot de passe oublié ?
                </button>
                <button className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter →'}
                </button>
              </form>
              <div style={{ marginTop:20, textAlign:'center', fontSize:13, color:'var(--text-3)' }}>
                Pas encore de compte ?{' '}
                <button className="btn-link" onClick={() => { reset(); setVue('inscription') }}>Créer un compte</button>
              </div>
            </>
          )}

          {/* INSCRIPTION */}
          {vue === 'inscription' && (
            <>
              <h2 style={{ fontSize:22, fontWeight:600, marginBottom:6 }}>Créer un compte</h2>
              <p style={{ color:'var(--text-3)', fontSize:13, marginBottom:24 }}>Commencez vos démarches ARTCI en ligne</p>
              <form onSubmit={handleInscription}>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
                </div>
                <div className="field">
                  <label>Mot de passe</label>
                  <input type="password" value={mdp} onChange={e=>setMdp(e.target.value)} placeholder="8 caractères minimum" required />
                </div>
                <div className="field">
                  <label>Confirmer le mot de passe</label>
                  <input type="password" value={mdpConfirm} onChange={e=>setMdpConfirm(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Création...' : 'Créer mon compte →'}
                </button>
              </form>
              <div style={{ marginTop:20, textAlign:'center', fontSize:13, color:'var(--text-3)' }}>
                Déjà un compte ?{' '}
                <button className="btn-link" onClick={() => { reset(); setVue('connexion') }}>Se connecter</button>
              </div>
            </>
          )}

          {/* VÉRIF EMAIL */}
          {vue === 'verif_email' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
                <h2 style={{ fontSize:20, fontWeight:600, marginBottom:6 }}>Vérifiez votre email</h2>
                <p style={{ color:'var(--text-3)', fontSize:13, lineHeight:1.6 }}>
                  Un code à 6 chiffres a été envoyé à <strong>{emailHint}</strong>.<br />
                  Saisissez-le pour activer votre compte.
                </p>
              </div>
              <form onSubmit={handleVerifEmail}>
                <div className="field">
                  <label>Code de vérification</label>
                  <input type="text" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}
                    placeholder="000000" style={{ letterSpacing:10, fontSize:26, textAlign:'center', fontFamily:'var(--mono)' }} autoFocus required />
                </div>
                <button className="btn btn-primary btn-full" disabled={loading || code.length < 6}>
                  {loading ? 'Vérification...' : 'Activer mon compte →'}
                </button>
              </form>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, fontSize:13 }}>
                <button className="btn-link" onClick={renvoyerVerif} disabled={loading}>Renvoyer le code</button>
                <button className="btn-link" style={{ color:'var(--text-3)' }} onClick={() => { reset(); setVue('connexion'); setCode('') }}>← Retour</button>
              </div>
              <div style={{ marginTop:16, padding:12, background:'var(--bg)', borderRadius:6, fontSize:12, color:'var(--text-3)' }}>
                Vérifiez vos spams. Le code est valable <strong>15 minutes</strong>.
              </div>
            </>
          )}

          {/* OTP A2F */}
          {vue === 'otp_a2f' && (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
                <h2 style={{ fontSize:20, fontWeight:600, marginBottom:6 }}>Double authentification</h2>
                <p style={{ color:'var(--text-3)', fontSize:13 }}>Code envoyé à <strong>{emailHint}</strong>. Valable 10 minutes.</p>
              </div>
              <form onSubmit={handleOtpA2f}>
                <div className="field">
                  <input type="text" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}
                    placeholder="000000" style={{ letterSpacing:10, fontSize:26, textAlign:'center', fontFamily:'var(--mono)' }} autoFocus required />
                </div>
                <button className="btn btn-primary btn-full" disabled={loading || code.length < 6}>
                  {loading ? 'Vérification...' : 'Confirmer →'}
                </button>
              </form>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, fontSize:13 }}>
                <button className="btn-link" onClick={renvoyerOtp} disabled={loading}>Renvoyer</button>
                <button className="btn-link" style={{ color:'var(--text-3)' }} onClick={() => { reset(); setVue('connexion'); setCode('') }}>← Retour</button>
              </div>
            </>
          )}

          {/* MOT DE PASSE OUBLIÉ */}
          {vue === 'mdp_oublie' && (
            <>
              <h2 style={{ fontSize:22, fontWeight:600, marginBottom:6 }}>Mot de passe oublié</h2>
              <p style={{ color:'var(--text-3)', fontSize:13, marginBottom:24 }}>Recevez un lien de réinitialisation par email.</p>
              <form onSubmit={handleMdpOublie}>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.ci" required autoFocus />
                </div>
                <button className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
              <div style={{ marginTop:16, textAlign:'center' }}>
                <button className="btn-link" style={{ fontSize:13 }} onClick={() => { reset(); setVue('connexion') }}>← Retour à la connexion</button>
              </div>
            </>
          )}

          {/* RESET ENVOYÉ */}
          {vue === 'reset_envoye' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>📧</div>
              <h2 style={{ fontSize:20, fontWeight:600, marginBottom:8 }}>Email envoyé !</h2>
              <p style={{ color:'var(--text-3)', fontSize:13, lineHeight:1.7, marginBottom:20 }}>
                Si <strong>{email}</strong> est associé à un compte,<br />vous recevrez un lien dans quelques minutes.
              </p>
              <div style={{ background:'var(--bg)', borderRadius:6, padding:12, fontSize:12, color:'var(--text-3)', marginBottom:20, textAlign:'left' }}>
                Vérifiez vos spams. Le lien est valable <strong>1 heure</strong>.
              </div>
              <button className="btn btn-secondary btn-full" onClick={() => { reset(); setVue('connexion') }}>
                ← Retour à la connexion
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}