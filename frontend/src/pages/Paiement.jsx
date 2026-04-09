import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import * as api from '../api.js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)

const LABELS_TYPE = {
  declaration:  'Déclaration de traitement',
  autorisation: "Demande d'autorisation",
  dpo:          'Correspondant DPO',
  transfert:    'Transfert international',
}

const FRAIS_FCFA = {
  declaration:  8000,
  autorisation: 16000,
  dpo:          5000,
  transfert:    12000,
}

function formatFCFA(montant) {
  return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
}

// ── Formulaire de paiement Stripe ────────────────────────────
function FormulaireStripe({ dossierId, reference, onSuccess }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErreur('')

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })

      if (error) {
        setErreur(error.message || 'Erreur de paiement.')
        setLoading(false)
        return
      }

      // Confirmer côté backend
      await api.stripeConfirm({ dossier_id: dossierId })
      onSuccess()
    } catch (e) {
      setErreur(e.message || 'Une erreur est survenue.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 24 }}>
        <PaymentElement />
      </div>
      {erreur && (
        <div className="alert alert-err" style={{ marginBottom: 16 }}>{erreur}</div>
      )}
      <button
        className="btn btn-primary btn-full"
        disabled={!stripe || loading}
        style={{ fontSize: 15 }}
      >
        {loading ? 'Paiement en cours...' : `Payer — réf. ${reference}`}
      </button>
    </form>
  )
}

// ── Page Paiement ────────────────────────────────────────────
export default function Paiement() {
  const { id }  = useParams()
  const nav     = useNavigate()
  const [clientSecret, setClientSecret] = useState(null)
  const [dossier, setDossier]           = useState(null)
  const [montant, setMontant]           = useState(null)
  const [erreur, setErreur]             = useState('')
  const [succes, setSucces]             = useState(false)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const dos = await api.getDossier(id)
        setDossier(dos)
        const r = await api.stripeCreateIntent({ dossier_id: parseInt(id) })
        setClientSecret(r.client_secret)
        setMontant(r.montant_fcfa)
      } catch (e) {
        setErreur(e.message || 'Impossible de charger le paiement.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  function handleSucces() {
    setSucces(true)
    setTimeout(() => nav('/dashboard'), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 500 }}>

        {/* En-tête */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'var(--green)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, margin: '0 auto 16px' }}>IC</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Paiement sécurisé</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Infinity Compliance — Plateforme ARTCI</div>
        </div>

        {/* Etat chargement */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Chargement du paiement...</div>
          </div>
        )}

        {/* Erreur */}
        {!loading && erreur && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div className="alert alert-err">{erreur}</div>
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => nav('/dashboard')}>
              ← Retour au tableau de bord
            </button>
          </div>
        )}

        {/* Succès */}
        {succes && (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Paiement effectué !</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
              Votre dossier <strong>{dossier?.reference}</strong> a été transmis à l'ARTCI.<br />
              Redirection en cours...
            </div>
            <div style={{ width: 40, height: 4, background: 'var(--green)', borderRadius: 2, margin: '0 auto', animation: 'none' }} />
          </div>
        )}

        {/* Formulaire de paiement */}
        {!loading && !erreur && !succes && clientSecret && dossier && (
          <div className="card">
            {/* Résumé du dossier */}
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px 16px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Récapitulatif</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Type de démarche</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{LABELS_TYPE[dossier.type_formulaire]}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Référence</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{dossier.reference}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                  {formatFCFA(montant || FRAIS_FCFA[dossier.type_formulaire])}
                </span>
              </div>
            </div>

            {/* Stripe Elements */}
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#1a7a4a',
                    borderRadius: '6px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  },
                },
              }}
            >
              <FormulaireStripe
                dossierId={parseInt(id)}
                reference={dossier.reference}
                onSuccess={handleSucces}
              />
            </Elements>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button className="btn-link" style={{ fontSize: 12, color: 'var(--text-3)' }} onClick={() => nav('/dashboard')}>
                ← Retour au tableau de bord
              </button>
            </div>

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-3)', fontSize: 11 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm-.5 4v1h-1v1h1v3h1V8h1V7h-1V6h-1zM8 4a.5.5 0 100 1 .5.5 0 000-1z"/></svg>
              Paiement sécurisé par Stripe
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
