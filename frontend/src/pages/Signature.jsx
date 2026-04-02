import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

const LABELS_TYPE = {
  declaration:  'Déclaration de traitement',
  autorisation: "Demande d'autorisation préalable",
  dpo:          'Enregistrement correspondant DPO',
  transfert:    'Transfert international de données',
}

export default function Signature() {
  const { id } = useParams()
  const nav = useNavigate()

  const [dossier, setDossier]       = useState(null)
  const [etape, setEtape]           = useState('recap')  // recap | otp | confirme
  const [otpCode, setOtpCode]       = useState('')
  const [otpVisible, setOtpVisible] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')

  useEffect(() => {
    api.getDossier(id)
      .then(setDossier)
      .catch(() => nav('/dashboard'))
  }, [id])

  async function envoyerOtp() {
    setErr('')
    setLoading(true)
    try {
      const r = await api.envoyerOtpSignature({ dossier_id: Number(id) })
      setOtpVisible(r.otp_code)
      setEtape('otp')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmer(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await api.confirmerSignature({ dossier_id: Number(id), code: otpCode })
      setEtape('confirme')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!dossier) return <div className="page"><p>Chargement...</p></div>

  const donnees = dossier.donnees || {}

  // ── Étape 1 : Récapitulatif ──────────────────────────────
  if (etape === 'recap') return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          <span className="nav-link" onClick={() => nav('/dashboard')}>← Tableau de bord</span>
        </div>
      </nav>
      <div className="page">
        <h1>Récapitulatif du dossier</h1>
        <p className="subtitle">Vérifiez les informations avant de signer électroniquement.</p>

        {/* Référence */}
        <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Référence dossier</div>
          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600 }}>{dossier.reference}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{LABELS_TYPE[dossier.type_formulaire]}</div>
        </div>

        {/* Données du formulaire */}
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          {Object.entries(donnees).map(([k, v]) => {
            if (!v || (Array.isArray(v) && v.length === 0)) return null
            return (
              <div className="recap-row" key={k} style={{ padding: '10px 16px' }}>
                <span className="recap-label">{k.replace(/_/g, ' ')}</span>
                <span>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
              </div>
            )
          })}
        </div>

        {/* Mention légale */}
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          En signant ce document, vous attestez que les informations fournies sont exactes.
          La signature électronique par OTP SMS a la même valeur juridique qu'une signature
          manuscrite conformément à la Loi n°2013-546 (Art. 37 Al. 4).
        </div>

        {err && <div className="alert alert-err">{err}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={envoyerOtp} disabled={loading}>
            {loading ? 'Envoi en cours...' : 'Signer électroniquement →'}
          </button>
          <button className="btn btn-secondary" onClick={() => nav(`/formulaire/${dossier.type_formulaire}/${id}`)}>
            ← Modifier le formulaire
          </button>
        </div>
      </div>
    </>
  )

  // ── Étape 2 : Saisie OTP ────────────────────────────────
  if (etape === 'otp') return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
      </nav>
      <div className="page">
        <h1>Signature électronique</h1>
        <p className="subtitle">Saisissez le code à 6 chiffres envoyé sur votre téléphone.</p>

        {otpVisible && (
          <div className="alert alert-warn">
            Code de test : <strong style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 6 }}>{otpVisible}</strong>
            <div style={{ fontSize: 11, marginTop: 4, color: '#888' }}>Ce code s'affiche uniquement en mode test. En production il sera envoyé par SMS.</div>
          </div>
        )}

        {err && <div className="alert alert-err">{err}</div>}

        <form onSubmit={confirmer}>
          <div className="field">
            <label>Code OTP à 6 chiffres</label>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              style={{ letterSpacing: 10, fontSize: 24, textAlign: 'center', fontFamily: 'monospace' }}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              disabled={loading || otpCode.length < 6}
            >
              {loading ? 'Vérification...' : 'Confirmer la signature'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={envoyerOtp}
              disabled={loading}
            >
              Renvoyer le code
            </button>
          </div>
        </form>
      </div>
    </>
  )

  // ── Étape 3 : Confirmation ──────────────────────────────
  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
      </nav>
      <div className="page">
        <h1>Dossier signé ✓</h1>
        <p className="subtitle">Votre signature électronique a été confirmée avec succès.</p>

        <div style={{ background: '#f0faf5', border: '1px solid #a8dfc0', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Référence</div>
          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: '#1a6b40' }}>{dossier.reference}</div>
          <div style={{ fontSize: 13, color: '#1a6b40', marginTop: 8 }}>
            Statut : En attente de paiement
          </div>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          Prochaine étape : procéder au paiement des frais de dossier pour que votre
          dossier soit transmis à l'ARTCI.
        </div>

        import PiecesJointes from './PiecesJointes.jsx'
        // Dans le JSX, après le récapitulatif :
        <PiecesJointes dossierId={Number(id)} />

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => nav('/dashboard')}>
            Retour au tableau de bord
          </button>
          <button className="btn btn-secondary" onClick={() => nav(`/suivi/${dossier.reference}`)}>
            Suivre mon dossier
          </button>
        </div>
      </div>
    </>
  )
}