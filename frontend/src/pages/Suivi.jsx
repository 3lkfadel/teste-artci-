import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

const LABELS_TYPE = {
  declaration:  'Déclaration de traitement',
  autorisation: "Demande d'autorisation préalable",
  dpo:          'Enregistrement correspondant DPO',
  transfert:    'Transfert international de données',
}

const ETAPES_STATUT = [
  {
    statut:  'brouillon',
    titre:   'Formulaire créé',
    desc:    'Le formulaire est en cours de remplissage.',
  },
  {
    statut:  'en_attente_signature',
    titre:   'En attente de signature',
    desc:    'Le formulaire est rempli, en attente de signature électronique.',
  },
  {
    statut:  'en_attente_paiement',
    titre:   'En attente de paiement',
    desc:    'Le dossier est signé, en attente de paiement des frais de dossier.',
  },
  {
    statut:  'transmis',
    titre:   'Transmis à l\'ARTCI',
    desc:    'Le dossier a été transmis à l\'ARTCI. Délai de traitement : 30 jours.',
  },
  {
    statut:  'en_cours',
    titre:   'En cours d\'instruction',
    desc:    'L\'ARTCI instruit votre dossier.',
  },
  {
    statut:  'complet',
    titre:   'Récépissé délivré',
    desc:    'Votre dossier a été accepté par l\'ARTCI. Téléchargez votre récépissé.',
  },
]

const ORDRE_STATUT = {
  brouillon:            0,
  en_attente_signature: 1,
  en_attente_paiement:  2,
  transmis:             3,
  en_cours:             4,
  complet:              5,
  refuse:               5,
}

export default function Suivi() {
  const { ref } = useParams()
  const nav = useNavigate()

  const [dossier, setDossier]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState('')
  const [recherche, setRecherche] = useState(ref || '')
  const [inputRef, setInputRef] = useState(ref || '')

  useEffect(() => {
    if (ref) charger(ref)
    else setLoading(false)
  }, [ref])

  async function charger(reference) {
    setLoading(true)
    setErr('')
    try {
      const d = await api.suiviPublic(reference)
      setDossier(d)
    } catch (e) {
      setErr('Référence introuvable. Vérifiez le numéro de dossier.')
      setDossier(null)
    } finally {
      setLoading(false)
    }
  }

  function rechercher(e) {
    e.preventDefault()
    if (inputRef.trim()) {
      setRecherche(inputRef.trim())
      charger(inputRef.trim())
    }
  }

  const indexActuel = dossier ? (ORDRE_STATUT[dossier.statut] ?? 0) : -1
  const estRefuse   = dossier?.statut === 'refuse'

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          {localStorage.getItem('token') && (
            <span className="nav-link" onClick={() => nav('/dashboard')}>
              Tableau de bord
            </span>
          )}
        </div>
      </nav>

      <div className="page">
        <h1>Suivi de dossier</h1>
        <p className="subtitle">
          Entrez votre numéro de référence pour suivre l'avancement de votre dossier ARTCI.
        </p>

        {/* Formulaire de recherche */}
        <form onSubmit={rechercher} style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              type="text"
              value={inputRef}
              onChange={e => setInputRef(e.target.value.toUpperCase())}
              placeholder="Ex: IC-2026-0001"
              style={{ fontFamily: 'monospace', letterSpacing: 1 }}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>

        {err && <div className="alert alert-err">{err}</div>}

        {/* Résultat */}
        {dossier && (
          <>
            {/* En-tête dossier */}
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Référence</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 600 }}>{dossier.reference}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {LABELS_TYPE[dossier.type_formulaire] || dossier.type_formulaire}
                  </div>
                </div>
                <span className={`statut-badge statut-${dossier.statut}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                  {dossier.statut?.replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 12, color: '#888' }}>
                {dossier.cree_le && (
                  <span>Créé le {new Date(dossier.cree_le).toLocaleDateString('fr-FR')}</span>
                )}
                {dossier.signe_le && (
                  <span>Signé le {new Date(dossier.signe_le).toLocaleDateString('fr-FR')}</span>
                )}
              </div>
            </div>

            {/* Dossier refusé */}
            {estRefuse && (
              <div className="alert alert-err" style={{ marginBottom: 24 }}>
                <strong>Dossier refusé par l'ARTCI.</strong> Vous pouvez introduire un recours
                gracieux auprès de l'ARTCI dans les 30 jours suivant la notification du refus.
                Contact : courrier@artci.ci — Tél : +225 27 20 34 43 73
              </div>
            )}

            {/* Timeline */}
            {!estRefuse && (
              <div className="timeline">
                {ETAPES_STATUT.map((e, i) => {
                  const fait   = i < indexActuel
                  const actif  = i === indexActuel
                  return (
                    <div key={e.statut} className="timeline-item">
                      <div className={`timeline-dot ${fait ? 'done' : actif ? 'active' : ''}`} />
                      <div className="timeline-content">
                        <div className="timeline-title" style={{ color: actif ? '#111' : fait ? '#1a6b40' : '#aaa' }}>
                          {fait ? '✓ ' : ''}{e.titre}
                        </div>
                        {(actif || fait) && (
                          <div className="timeline-desc">{e.desc}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <hr className="divider" />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {dossier.statut === 'en_attente_signature' && localStorage.getItem('token') && (
                <button className="btn btn-primary" onClick={() => nav(`/signature/${dossier.id}`)}>
                  Signer le dossier →
                </button>
              )}
              {dossier.statut === 'complet' && (
                <div className="alert alert-ok" style={{ width: '100%' }}>
                  Votre récépissé ARTCI est disponible. Contactez l'ARTCI pour le télécharger.
                </div>
              )}
              {localStorage.getItem('token') && (
                <button className="btn btn-secondary" onClick={() => nav('/dashboard')}>
                  Tableau de bord
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}