import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

const LABELS_TYPE = {
  declaration:  'Déclaration de traitement',
  autorisation: "Demande d'autorisation préalable",
  dpo:          'Enregistrement correspondant DPO',
  transfert:    'Transfert international de données',
}

const ETAPES = [
  { statut:'brouillon',            titre:'Formulaire créé',         desc:'En cours de remplissage.' },
  { statut:'en_attente_signature', titre:'En attente de signature', desc:'Formulaire rempli, signature électronique requise.' },
  { statut:'en_attente_paiement',  titre:'En attente de paiement',  desc:'Dossier signé, paiement des frais requis.' },
  { statut:'transmis',             titre:"Transmis à l'ARTCI",      desc:"Dossier transmis. Délai de traitement : 1 mois." },
  { statut:'en_cours',             titre:"En cours d'instruction",  desc:"L'ARTCI instruit votre dossier." },
  { statut:'complet',              titre:'Récépissé délivré ✓',     desc:"Dossier accepté. Récépissé disponible." },
]

const ORDRE = { brouillon:0, en_attente_signature:1, en_attente_paiement:2, transmis:3, en_cours:4, complet:5, refuse:5 }

export default function Suivi() {
  const { ref } = useParams()
  const nav = useNavigate()
  const [dossier, setDossier]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState('')
  const [inputRef, setInputRef] = useState(ref || '')

  useEffect(() => { if (ref) charger(ref); else setLoading(false) }, [ref])

  async function charger(reference) {
    setLoading(true); setErr('')
    try { setDossier(await api.suiviPublic(reference)) }
    catch { setErr('Référence introuvable. Vérifiez le numéro de dossier.'); setDossier(null) }
    finally { setLoading(false) }
  }

  function rechercher(e) {
    e.preventDefault()
    if (inputRef.trim()) charger(inputRef.trim())
  }

  const idx = dossier ? (ORDRE[dossier.statut] ?? 0) : -1
  const token = localStorage.getItem('token')

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <div className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          {token && <span className="nav-link" onClick={() => nav('/dashboard')}>← Tableau de bord</span>}
        </div>
      </div>

      <div className="page">
        <h1>Suivi de dossier</h1>
        <p className="subtitle">Entrez votre référence pour suivre l'avancement de votre dossier ARTCI.</p>

        {/* Recherche */}
        <form onSubmit={rechercher} style={{ display:'flex', gap:10, marginBottom:28 }}>
          <div className="field" style={{ flex:1, marginBottom:0 }}>
            <input
              type="text"
              value={inputRef}
              onChange={e => setInputRef(e.target.value.toUpperCase())}
              placeholder="Ex: IC-2026-0001"
              style={{ fontFamily:'var(--mono)', letterSpacing:1 }}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>

        {err && <div className="alert alert-err">{err}</div>}

        {dossier && (
          <>
            {/* En-tête */}
            <div className="card" style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Référence</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:600 }}>{dossier.reference}</div>
                  <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{LABELS_TYPE[dossier.type_formulaire]}</div>
                </div>
                <span className={`statut-badge statut-${dossier.statut}`}>
                  {dossier.statut?.replace(/_/g,' ')}
                </span>
              </div>
              <div style={{ display:'flex', gap:20, marginTop:14, fontSize:12, color:'var(--text-3)' }}>
                {dossier.cree_le && <span>Créé le {new Date(dossier.cree_le).toLocaleDateString('fr-FR')}</span>}
                {dossier.signe_le && <span>Signé le {new Date(dossier.signe_le).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>

            {/* Refusé */}
            {dossier.statut === 'refuse' && (
              <div className="alert alert-err" style={{ marginBottom:20 }}>
                <strong>Dossier refusé par l'ARTCI.</strong> Vous pouvez introduire un recours gracieux dans les 30 jours.
                Contact : courrier@artci.ci — Tél : +225 27 20 34 43 73
              </div>
            )}

            {/* Timeline */}
            {dossier.statut !== 'refuse' && (
              <div className="card" style={{ marginBottom:20 }}>
                <div className="card-header"><div className="card-title">Avancement</div></div>
                <div className="timeline">
                  {ETAPES.map((e, i) => {
                    const fait  = i < idx
                    const actif = i === idx
                    return (
                      <div key={e.statut} className="timeline-item">
                        <div className={`timeline-dot ${fait?'done':actif?'active':''}`} />
                        <div className="timeline-content">
                          <div className="timeline-title" style={{ color: actif?'var(--text)':fait?'var(--green-dark)':'var(--text-3)' }}>
                            {fait ? '✓ ' : ''}{e.titre}
                          </div>
                          {(actif || fait) && <div className="timeline-desc">{e.desc}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {dossier.statut === 'en_attente_signature' && token && (
                <button className="btn btn-primary" onClick={() => nav(`/signature/${dossier.id}`)}>
                  Signer le dossier →
                </button>
              )}
              {dossier.statut === 'complet' && (
                <div className="alert alert-ok" style={{ width:'100%' }}>
                  Votre récépissé ARTCI est disponible. Contactez l'ARTCI pour le télécharger.
                </div>
              )}
              {token && <button className="btn btn-secondary" onClick={() => nav('/dashboard')}>Tableau de bord</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}