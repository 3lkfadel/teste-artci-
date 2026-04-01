import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../api.js'

export default function ResetPassword() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token    = params.get('token') || ''

  const [vue, setVue]           = useState('verification') // verification | formulaire | succes | invalide
  const [emailHint, setEmailHint] = useState('')
  const [mdp, setMdp]           = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  // Vérifier le token au chargement
  useEffect(() => {
    if (!token) { setVue('invalide'); return }
    api.verifierTokenReset(token)
      .then(r => {
        if (r.valide) {
          setEmailHint(r.email)
          setVue('formulaire')
        } else {
          setVue('invalide')
        }
      })
      .catch(() => setVue('invalide'))
  }, [token])

  async function handleReset(e) {
    e.preventDefault()
    setErr('')
    if (mdp !== mdpConfirm) { setErr('Les mots de passe ne correspondent pas'); return }
    if (mdp.length < 8)     { setErr('Le mot de passe doit contenir au moins 8 caractères'); return }
    setLoading(true)
    try {
      await api.reinitialiserMotDePasse({ token, mot_de_passe: mdp })
      setVue('succes')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">IC</div>
          <div>
            <div className="auth-logo-title">Infinity Compliance</div>
            <div className="auth-logo-sub">Plateforme ARTCI — Côte d'Ivoire</div>
          </div>
        </div>

        {/* Vérification en cours */}
        {vue === 'verification' && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#888' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p>Vérification du lien en cours...</p>
          </div>
        )}

        {/* Lien invalide ou expiré */}
        {vue === 'invalide' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2>Lien invalide</h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>
              Ce lien de réinitialisation est invalide ou a expiré.<br />
              Les liens sont valables <strong>1 heure</strong>.
            </p>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 20 }}
              onClick={() => nav('/auth')}
            >
              Faire une nouvelle demande
            </button>
          </div>
        )}

        {/* Formulaire de réinitialisation */}
        {vue === 'formulaire' && (
          <>
            <h2>Nouveau mot de passe</h2>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
              Compte : <strong>{emailHint}</strong>
            </p>

            {err && <div className="alert alert-err">{err}</div>}

            <form onSubmit={handleReset}>
              <div className="field">
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={mdp}
                  onChange={e => setMdp(e.target.value)}
                  placeholder="8 caractères minimum"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={mdpConfirm}
                  onChange={e => setMdpConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Indicateur de force */}
              {mdp.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: mdp.length >= i * 3
                          ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#3b82f6' : '#22c55e'
                          : '#eee'
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {mdp.length < 8 ? 'Trop court' : mdp.length < 12 ? 'Acceptable' : 'Fort'}
                  </div>
                </div>
              )}

              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Réinitialisation...' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          </>
        )}

        {/* Succès */}
        {vue === 'succes' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2>Mot de passe modifié !</h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>
              Votre mot de passe a été réinitialisé avec succès.<br />
              Vous pouvez maintenant vous connecter.
            </p>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 20 }}
              onClick={() => nav('/auth')}
            >
              Se connecter →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}