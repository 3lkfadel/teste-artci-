import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'
import PiecesJointes from './PiecesJointes.jsx'
import { telechargerPDF } from './ApercuPDF.jsx'

const FORMULAIRES = [
  { type:'declaration',  titre:'Déclaration de traitement',          desc:"Pour tout traitement courant de données personnelles.",                         badge:'Simple déclaration', sensible:false },
  { type:'autorisation', titre:"Demande d'autorisation préalable",   desc:'Pour les données sensibles : biométrie, santé, NNI, vidéosurveillance.',       badge:'Données sensibles',  sensible:true  },
  { type:'dpo',          titre:'Enregistrement correspondant DPO',   desc:'Désigner officiellement votre Délégué à la Protection des Données.',           badge:'Correspondant DPO',  sensible:false },
  { type:'transfert',    titre:'Transfert international de données', desc:"Pour tout envoi de données personnelles hors de Côte d'Ivoire.",               badge:'Transfert international', sensible:false },
]

const LABELS_STATUT = {
  brouillon:            'Brouillon',
  en_attente_signature: 'En attente signature',
  en_attente_paiement:  'En attente paiement',
  transmis:             'Transmis ARTCI',
  en_cours:             'En cours',
  complet:              'Récépissé reçu',
  refuse:               'Refusé',
}

const LABELS_TYPE = {
  declaration:  'Déclaration',
  autorisation: 'Autorisation',
  dpo:          'Correspondant DPO',
  transfert:    'Transfert international',
}

export default function Dashboard() {
  const nav = useNavigate()
  const [dossiers, setDossiers]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [dossierDocuments, setDossierDocuments] = useState(null) // id du dossier dont on affiche les docs

  useEffect(() => {
    api.listerDossiers().then(setDossiers).catch(() => {})
  }, [])

  async function nouveauDossier(type) {
    setLoading(true)
    try {
      const r = await api.creerDossier({ type_formulaire: type, donnees: {} })
      nav(`/formulaire/${type}/${r.id}`)
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          <span className="nav-link" onClick={() => nav('/entreprise')}>Mon entreprise</span>
          <span className="nav-link" onClick={() => nav('/parametres')}>Paramètres</span>
          <span className="nav-link" onClick={() => { localStorage.removeItem('token'); nav('/auth') }}>Déconnexion</span>
        </div>
      </nav>

      <div className="page-wide">
        <h1>Tableau de bord</h1>
        <p className="subtitle">Sélectionnez le type de démarche ARTCI à effectuer.</p>

        {/* Nouvelle démarche */}
        <h2>Nouvelle démarche</h2>
        <div className="cards">
          {FORMULAIRES.map(f => (
            <div key={f.type} className="card" onClick={() => !loading && nouveauDossier(f.type)} style={{ opacity: loading ? 0.6 : 1 }}>
              <div className="card-title">{f.titre}</div>
              <div className="card-desc">{f.desc}</div>
              <div className={`card-badge ${f.sensible ? 'sensible' : ''}`}>{f.badge}</div>
            </div>
          ))}
        </div>

        {/* Mes dossiers */}
        {dossiers.length > 0 && (
          <>
            <hr className="divider" />
            <h2>Mes dossiers</h2>
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map(d => (
                  <>
                    <tr key={d.id}>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>{d.reference}</td>
                      <td>{LABELS_TYPE[d.type_formulaire] || d.type_formulaire}</td>
                      <td>
                        <span className={`statut-badge statut-${d.statut}`}>
                          {LABELS_STATUT[d.statut] || d.statut}
                        </span>
                      </td>
                      <td style={{ color:'#888', fontSize:12 }}>
                        {d.cree_le ? new Date(d.cree_le).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {d.statut === 'brouillon' && (
                            <button className="btn-link" onClick={() => nav(`/formulaire/${d.type_formulaire}/${d.id}`)}>
                              Reprendre
                            </button>
                          )}
                          {d.statut === 'en_attente_signature' && (
                            <button className="btn-link" onClick={() => nav(`/signature/${d.id}`)}>
                              Signer
                            </button>
                          )}
                          {['en_attente_paiement','transmis','en_cours','complet','refuse'].includes(d.statut) && (
                            <button className="btn-link" onClick={() => nav(`/suivi/${d.reference}`)}>
                              Suivre
                            </button>
                          )}
                          {/* Bouton PDF — dossiers signés */}
                          {d.statut !== 'brouillon' && (
                            <button className="btn-link" onClick={() => telechargerPDF(d)}>
                              📄 PDF
                            </button>
                          )}
                          {/* Bouton documents */}

                          {/* Bouton documents — disponible dès que le dossier est signé */}
                          {d.statut !== 'brouillon' && (
                            <button
                              className="btn-link"
                              style={{ color: dossierDocuments === d.id ? '#111' : '#666' }}
                              onClick={() => setDossierDocuments(dossierDocuments === d.id ? null : d.id)}
                            >
                              📎 Documents
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Panel pièces jointes inline */}
                    {dossierDocuments === d.id && (
                      <tr key={`pj-${d.id}`}>
                        <td colSpan={5} style={{ background:'#f9f9f9', padding:'0 16px 16px' }}>
                          <PiecesJointes dossierId={d.id} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  )
}