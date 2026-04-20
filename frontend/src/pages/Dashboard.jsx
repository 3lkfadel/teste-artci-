
import * as api from '../api.js'
import PiecesJointes from './PiecesJointes.jsx'
import { telechargerPDF } from './ApercuPDF.jsx'
import Sidebar from './Sidebar.jsx'
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const FORMULAIRES = [
  { type:'declaration',  titre:'Déclaration de traitement',        desc:'Pour tout traitement courant de données personnelles.',                   icon:'📋', badge:'Simple déclaration', sensible:false },
  { type:'autorisation', titre:"Demande d'autorisation",           desc:'Pour les données sensibles : biométrie, santé, NNI...',                   icon:'🛡️', badge:'Données sensibles',  sensible:true  },
  { type:'dpo',          titre:'Correspondant DPO',                desc:'Désigner officiellement votre Délégué à la Protection des Données.',      icon:'👤', badge:'Correspondant DPO',  sensible:false },
  { type:'transfert',    titre:'Transfert international',          desc:"Pour tout envoi de données personnelles hors de Côte d'Ivoire.",          icon:'🌍', badge:'Transfert international', sensible:false },
  { type:'sva',          titre:'Déclaration SVA',                  desc:'Pour toute startup, app mobile, call center, plateforme web ou service USSD.', icon:'📡', badge:'Service Télécom',          sensible:false },
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
  dpo:          'DPO',
  transfert:    'Transfert',
  sva:          'SVA',
  ussd:         'Code USSD',
}

// ── Page Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const nav = useNavigate()
  const [dossiers, setDossiers]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [dossierDocuments, setDossierDocuments] = useState(null)
  const [page, setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [profilComplet, setProfilComplet] = useState(true)
  const [logoUrl, setLogoUrl]             = useState(null)

  useEffect(() => {
    api.listerDossiers(1).then(r => {
      if (r && Array.isArray(r.dossiers)) {
        setDossiers(r.dossiers)
        setTotalPages(r.pages || 1)
        setPage(1)
      }
    }).catch(() => {})
    api.getProfil().then(p => {
      if (p?.email) localStorage.setItem('user_email', p.email)
      setProfilComplet(p?.profil_complet !== false)
    }).catch(() => {})
    api.getEntreprise().then(e => {
      if (e?.logo_url) {
        setLogoUrl(e.logo_url)
        localStorage.setItem('company_logo', e.logo_url)
      }
    }).catch(() => {})
  }, [])

  async function chargerPlus() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const r = await api.listerDossiers(nextPage)
      if (r && Array.isArray(r.dossiers)) {
        setDossiers(prev => [...prev, ...r.dossiers])
        setPage(nextPage)
        setTotalPages(r.pages || 1)
      }
    } catch {} finally { setLoadingMore(false) }
  }

  async function nouveauDossier(type) {
    setLoading(true)
    try {
      const r = await api.creerDossier({ type_formulaire: type, donnees: {} })
      nav(`/formulaire/${type}/${r.id}`)
    } catch (e) { alert(e.message) } finally { setLoading(false) }
  }

  // Stats
  const total   = dossiers.length
  const enCours = dossiers.filter(d => d.statut === 'en_cours' || d.statut === 'transmis').length
  const recus   = dossiers.filter(d => d.statut === 'complet').length
  const attente = dossiers.filter(d => d.statut === 'en_attente_signature' || d.statut === 'en_attente_paiement').length

  return (
    <div className="app-layout">
      <Sidebar active="dashboard" />

      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">Tableau de bord</div>
              <div className="topbar-sub">Gérez vos démarches ARTCI en toute conformité</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn btn-primary" onClick={() => document.getElementById('nouvelle-demarche')?.scrollIntoView({ behavior:'smooth' })}>
              + Nouvelle démarche
            </button>
          </div>
        </div>

        <div className="page-wide">

          {/* Bannière profil incomplet */}
          {!profilComplet && (
            <div style={{
              background:'#FFFBEB', border:'1px solid #FCD34D', borderRadius:8,
              padding:'12px 16px', display:'flex', alignItems:'center',
              justifyContent:'space-between', gap:12, marginBottom:20,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>⚠️</span>
                <span style={{ fontSize:13, color:'#92400E' }}>
                  Votre profil entreprise est incomplet. Complétez-le dans Paramètres pour pré-remplir vos formulaires.
                </span>
              </div>
              <button
                className="btn btn-secondary"
                style={{ borderColor:'#F59E0B', color:'#92400E', fontSize:13, flexShrink:0 }}
                onClick={() => nav('/parametres?section=entreprise')}
              >
                Compléter maintenant →
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card accent">
              <div className="stat-label">Total dossiers</div>
              <div className="stat-value">{total}</div>
              <div className="stat-trend">↑ Tous types confondus</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">En cours ARTCI</div>
              <div className="stat-value">{enCours}</div>
              <div className="stat-trend" style={{ color:'#1D4ED8' }}>↗ Instruction en cours</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Récépissés reçus</div>
              <div className="stat-value">{recus}</div>
              <div className="stat-trend">✓ Conformes</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Action requise</div>
              <div className="stat-value">{attente}</div>
              <div className="stat-trend" style={{ color:'#D97706' }}>⚠ En attente</div>
            </div>
          </div>

          {/* Contenu principal */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start' }}>

            {/* Colonne gauche */}
            <div>
              {/* Nouvelle démarche */}
              <div id="nouvelle-demarche" className="card" style={{ marginBottom:20 }}>
                <div className="card-header">
                  <div className="card-title">Nouvelle démarche ARTCI</div>
                </div>
                <div className="cards" style={{ marginBottom:0 }}>
                  {FORMULAIRES.map(f => (
                    <div
                      key={f.type}
                      className="card-formulaire"
                      onClick={() => !loading && nouveauDossier(f.type)}
                      style={{ opacity: loading ? 0.6 : 1 }}
                    >
                      <div className="card-icon">{f.icon}</div>
                      <div className="card-title">{f.titre}</div>
                      <div className="card-desc">{f.desc}</div>
                      <span className={`card-badge ${f.sensible ? 'sensible' : ''}`}>{f.badge}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dossiers */}
              {dossiers.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Mes dossiers</div>
                    <span style={{ fontSize:12, color:'var(--text-3)' }}>{dossiers.length} dossier(s)</span>
                  </div>
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
                    <React.Fragment key={d.id}>
                      <tr>
                        <td style={{ fontFamily:'var(--mono)', fontSize:12 }}>{d.reference}</td>
                        <td style={{ fontSize:12 }}>{LABELS_TYPE[d.type_formulaire]}</td>
                        <td>
                          <span className={`statut-badge statut-${d.statut}`}>
                            {LABELS_STATUT[d.statut]}
                          </span>
                        </td>
                        <td style={{ color:'var(--text-3)', fontSize:12 }}>
                          {d.cree_le ? new Date(d.cree_le).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            {d.statut === 'brouillon' && (
                              <button className="btn-link" onClick={() => nav(`/formulaire/${d.type_formulaire}/${d.id}`)}>Reprendre</button>
                            )}
                            {d.statut === 'en_attente_paiement' && (
                              <button className="btn-link" onClick={() => nav(`/paiement/${d.id}`)}>Payer</button>
                            )}
                            {d.statut === 'en_attente_signature' && (
                              <button className="btn-link" onClick={() => nav(`/signature/${d.id}`)}>Signer</button>
                            )}
                            {['en_attente_paiement','transmis','en_cours','complet','refuse'].includes(d.statut) && (
                              <button className="btn-link" onClick={() => nav(`/suivi/${d.reference}`)}>Suivre</button>
                            )}
                            {d.statut !== 'brouillon' && (
                              <button className="btn-link" onClick={() => telechargerPDF(d, logoUrl)}>📄 PDF</button>
                            )}
                            {d.statut !== 'brouillon' && (
                              <button
                                className="btn-link"
                                style={{ color: dossierDocuments === d.id ? 'var(--text)' : 'var(--text-3)' }}
                                onClick={() => setDossierDocuments(dossierDocuments === d.id ? null : d.id)}
                              >
                                📎 Docs
                              </button>
                            )}
                            {d.type_formulaire === 'sva' && d.statut === 'complet' && (
                              <button
                                className="btn-link"
                                style={{ color: 'var(--green)', fontWeight: 500 }}
                                onClick={async () => {
                                  try {
                                    const r = await api.creerDossier({ type_formulaire: 'ussd', donnees: {} })
                                    nav(`/formulaire/ussd/${r.id}`)
                                  } catch (e) { alert(e.message) }
                                }}
                              >
                                📡 Demander USSD
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {dossierDocuments === d.id && (
                        <tr>
                          <td colSpan={5} style={{ background:'#fafafa', padding:'0 16px 16px' }}>
                            <PiecesJointes dossierId={d.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                  </table>
                </div>
              )}

              {/* Bouton Voir plus */}
              {dossiers.length > 0 && page < totalPages && (
                <div style={{ textAlign:'center', marginTop:8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={chargerPlus}
                    disabled={loadingMore}
                    style={{ fontSize:13 }}
                  >
                    {loadingMore ? 'Chargement...' : 'Voir plus de dossiers'}
                  </button>
                </div>
              )}

              {dossiers.length === 0 && (
                <div className="card" style={{ textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📂</div>
                  <div style={{ fontSize:14, fontWeight:500, color:'var(--text)', marginBottom:6 }}>Aucun dossier pour le moment</div>
                  <div style={{ fontSize:13, color:'var(--text-3)' }}>Créez votre première démarche ARTCI ci-dessus.</div>
                </div>
              )}
            </div>

            {/* Colonne droite */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Avancement */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Avancement par statut</div>
                </div>
                {[
                  { label:'Récépissés reçus', val: recus, color:'var(--green)' },
                  { label:'En cours ARTCI',   val: enCours, color:'#1D4ED8' },
                  { label:'En attente',        val: attente, color:'#D97706' },
                  { label:'Brouillons',        val: dossiers.filter(d=>d.statut==='brouillon').length, color:'#888' },
                ].map(item => (
                  <div key={item.label} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'var(--text-2)' }}>{item.label}</span>
                      <span style={{ fontWeight:500, color:'var(--text)' }}>{item.val}</span>
                    </div>
                    <div className="gauge-bar">
                      <div className="gauge-fill" style={{ width: total > 0 ? `${(item.val/total)*100}%` : '0%', background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Délais ARTCI */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Délais ARTCI</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Déclaration', val:'Récépissé sous 1 mois' },
                    { label:'Autorisation', val:'Décision sous 1 mois' },
                  ].map(item => (
                    <div key={item.label} style={{ background:'var(--bg)', borderRadius:6, padding:'10px 12px' }}>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:2 }}>{item.label}</div>
                      <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{item.val}</div>
                    </div>
                  ))}
                  <div style={{ background:'#FEE2E2', borderRadius:6, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, color:'#DC2626', marginBottom:2 }}>⚠ Attention</div>
                    <div style={{ fontSize:12, color:'#991B1B' }}>Absence de réponse = rejet automatique</div>
                  </div>
                </div>
              </div>

              {/* Contact ARTCI */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Contact ARTCI</div>
                </div>
                <div style={{ fontSize:12, color:'var(--text-2)', display:'flex', flexDirection:'column', gap:6 }}>
                  <div>📍 Marcory Anoumabo, Abidjan 18</div>
                  <div>📞 +225 27 20 34 43 73</div>
                  <div>✉️ info-apdcp@artci.ci</div>
                  <div style={{ marginTop:4 }}>
                    <a href="https://www.autoritedeprotection.ci" target="_blank" rel="noreferrer" style={{ color:'var(--green)', fontSize:12 }}>
                      www.autoritedeprotection.ci →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}