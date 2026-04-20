import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { telechargerPDF } from './ApercuPDF'

const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

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
}

const COULEURS_STATUT = {
  brouillon:            '#888',
  en_attente_signature: '#f59e0b',
  en_attente_paiement:  '#8b5cf6',
  transmis:             '#3b82f6',
  en_cours:             '#06b6d4',
  complet:              '#22c55e',
  refuse:               '#ef4444',
}

const COULEURS_TYPE = {
  declaration:  '#00843D',
  autorisation: '#3b82f6',
  dpo:          '#8b5cf6',
  transfert:    '#f59e0b',
}

const LABELS_CHAMPS = {
  type_declarant:         'Type de déclarant',
  raison_sociale:         'Raison sociale',
  num_cc:                 'N°CC (Carte du Contribuable)',
  domaine_activite:       "Domaine d'activité",
  adresse:                'Adresse',
  ville:                  'Ville',
  pays:                   'Pays',
  telephone:              'Téléphone',
  email_contact:          'Email de contact',
  contact_nom:            'Personne à contacter',
  rep_nom:                'Nom du représentant légal',
  rep_prenom:             'Prénom',
  rep_qualite:            'Qualité / Fonction',
  rep_piece_identite:     "Type de pièce d'identité",
  rep_num_piece:          "N° de pièce d'identité",
  rep_nationalite:        'Nationalité',
  rep_email:              'Email du représentant',
  rep_telephone:          'Téléphone du représentant',
  service_type:           'Mise en œuvre du traitement',
  service_raison_sociale: 'Raison sociale prestataire',
  service_adresse:        'Adresse prestataire',
  service_pays:           'Pays prestataire',
  finalite:               'Finalité du traitement',
  fondement_juridique:    'Fondement juridique',
  logiciel_application:   'Logiciel / Application',
  personnes_concernees:   'Personnes concernées',
  technologies:           'Technologies utilisées',
  origine_donnees:        'Origine des données',
  duree_conservation:     'Durée de conservation',
  destinataires:          'Destinataires',
  has_sensibles:          'Données sensibles',
  sensibles_categories:   'Catégories sensibles',
  securite_mesures:       'Mesures de sécurité',
  has_transfert:          'Transfert hors CEDEAO',
  transfert_pays:         'Pays destinataire',
  transfert_organisme:    'Organisme destinataire',
  info_methodes:          "Méthodes d'information",
  signataire_nom:         'Nom du signataire',
  signataire_fonction:    'Fonction du signataire',
  email_recepisse:        'Email pour le récépissé',
  dpo_nom:                'Nom du DPO',
  dpo_email:              'Email du DPO',
  dpo_telephone:          'Téléphone du DPO',
  dpo_qualification:      'Qualification du DPO',
}

// ── Helpers ─────────────────────────────────────────────────

function req(path, options = {}) {
  const token = localStorage.getItem('admin_token')
  return fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  }).then(async r => {
    const d = await r.json()
    if (!r.ok) throw new Error(d.erreur || `Erreur ${r.status}`)
    return d
  })
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR')
}

function fmtMontant(n) {
  if (!n && n !== 0) return '0 FCFA'
  return Number(n).toLocaleString('fr-FR') + ' FCFA'
}

function exportCSV(rows, filename) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const lines = [
    keys.join(';'),
    ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(';')),
  ]
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── SVG Charts ───────────────────────────────────────────────

function BarChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const barW = 30
  const gap = 8
  const W = data.length * (barW + gap)
  return (
    <svg width={W} height={110} style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.count / max) * 70))
        const x = i * (barW + gap)
        const y = 78 - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#00843D" opacity={0.85} />
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#333" fontWeight="600">{d.count}</text>
            )}
            <text x={x + barW / 2} y={95} textAnchor="middle" fontSize={9} fill="#888">{d.mois}</text>
          </g>
        )
      })}
    </svg>
  )
}

function TypeChart({ data }) {
  if (!data) return null
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: '#555' }}>{LABELS_TYPE[k] || k}</span>
            <span style={{ fontWeight: 700 }}>{v}</span>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
            <div style={{ background: COULEURS_TYPE[k] || '#00843D', width: `${Math.max(4, (v / max) * 100)}%`, height: '100%', borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function FunnelChart({ funnel }) {
  if (!funnel) return null
  const steps = [
    { label: 'Créés',   value: funnel.crees,    color: '#3b82f6' },
    { label: 'Signés',  value: funnel.signes,   color: '#8b5cf6' },
    { label: 'Payés',   value: funnel.payes,    color: '#f59e0b' },
    { label: 'Transmis',value: funnel.transmis, color: '#00843D' },
  ]
  const max = Math.max(funnel.crees, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 56, fontSize: 11, color: '#666', textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
          <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 20, position: 'relative' }}>
            <div style={{ background: s.color, width: `${Math.max(2, (s.value / max) * 100)}%`, height: '100%', borderRadius: 4, transition: 'width .4s' }} />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#333' }}>{s.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({ label, value, icon, color, small }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: small ? 15 : 24, fontWeight: 700, color: '#111', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#333' }}>{title}</div>
      {children}
    </div>
  )
}

function BadgeStatut({ statut }) {
  const color = COULEURS_STATUT[statut] || '#888'
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: color + '22', color, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {LABELS_STATUT[statut] || statut}
    </span>
  )
}

// ── Page Admin ───────────────────────────────────────────────

export default function Admin() {
  const nav = useNavigate()
  const [vue, setVue]           = useState('login')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [ok, setOk]             = useState('')

  // Dashboard data
  const [stats, setStats]           = useState(null)
  const [alertes, setAlertes]       = useState(null)
  const [dossiers, setDossiers]     = useState([])
  const [dosTotal, setDosTotal]     = useState(0)
  const [dosPages, setDosPages]     = useState(1)
  const [users, setUsers]           = useState([])
  const [paiements, setPaiements]   = useState([])
  const [paiementsTotal, setPTotal] = useState(0)
  const [logs, setLogs]             = useState([])
  const [logsPages, setLogsPages]   = useState(1)
  const [configForm, setConfigForm] = useState({})
  const [configSaving, setConfigSaving] = useState(false)

  // Filters & navigation
  const [onglet, setOnglet]             = useState('dossiers')
  const [search, setSearch]             = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreType, setFiltreType]     = useState('')
  const [page, setPage]                 = useState(1)
  const [logPage, setLogPage]           = useState(1)

  // Dossier modal
  const [dossierSelec, setDossierSelec]   = useState(null)
  const [nouveauStatut, setNouveauStatut] = useState('')
  const [numRecepisse, setNumRecepisse]   = useState('')
  const [pdfLoading, setPdfLoading]       = useState(false)

  useEffect(() => {
    if (localStorage.getItem('admin_token')) {
      setVue('dashboard')
      chargerInitial()
    }
  }, [])

  // Load tab data on switch
  useEffect(() => {
    if (vue !== 'dashboard') return
    if (onglet === 'users')     chargerUsers()
    if (onglet === 'paiements') chargerPaiements()
    if (onglet === 'logs')      chargerLogs(1)
    if (onglet === 'config')    chargerConfig()
  }, [onglet])

  async function login(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const r = await req('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      localStorage.setItem('admin_token', r.token)
      setVue('dashboard')
      chargerInitial()
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function chargerInitial() {
    try {
      const [s, a, d] = await Promise.all([
        req('/admin/stats'),
        req('/admin/alertes'),
        req('/admin/dossiers'),
      ])
      setStats(s)
      setAlertes(a)
      setDossiers(d.dossiers)
      setDosTotal(d.total)
      setDosPages(d.pages)
    } catch {}
  }

  async function chargerDossiers(p, s, st, ty) {
    try {
      const params = new URLSearchParams({ page: p })
      if (s)  params.set('search', s)
      if (st) params.set('statut', st)
      if (ty) params.set('type', ty)
      const r = await req(`/admin/dossiers?${params}`)
      setDossiers(r.dossiers)
      setDosTotal(r.total)
      setDosPages(r.pages)
    } catch {}
  }

  async function chargerUsers() {
    try { setUsers(await req('/admin/utilisateurs')) } catch {}
  }

  async function chargerPaiements() {
    try {
      const r = await req('/admin/paiements')
      setPaiements(r.paiements)
      setPTotal(r.total_fcfa)
    } catch {}
  }

  async function chargerLogs(p) {
    try {
      const r = await req(`/admin/logs?page=${p}`)
      setLogs(r.logs)
      setLogsPages(r.pages)
    } catch {}
  }

  async function chargerConfig() {
    try { const r = await req('/admin/config'); setConfigForm(r) } catch {}
  }

  function appliquerFiltres() {
    setPage(1)
    chargerDossiers(1, search, filtreStatut, filtreType)
  }

  async function ouvrirDossier(dos) {
    try {
      const d = await req(`/admin/dossiers/${dos.id}`)
      setDossierSelec(d)
      setNouveauStatut(d.statut)
      setNumRecepisse(d.num_recepisse || '')
      setErr('')
    } catch {}
  }

  async function majDossier() {
    setErr(''); setOk(''); setLoading(true)
    try {
      await req(`/admin/dossiers/${dossierSelec.id}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: nouveauStatut, num_recepisse: numRecepisse }),
      })
      setOk('Dossier mis à jour. Email envoyé au client.')
      setDossierSelec(null)
      chargerDossiers(page, search, filtreStatut, filtreType)
      chargerInitial()
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function supprimerDossier(dos) {
    if (!confirm(`Supprimer le dossier ${dos.reference} ? Cette action est irréversible.`)) return
    try {
      await req(`/admin/dossiers/${dos.id}`, { method: 'DELETE' })
      chargerDossiers(page, search, filtreStatut, filtreType)
      chargerInitial()
    } catch (e) { alert(e.message) }
  }

  async function telechargerPDFAdmin(dos) {
    setPdfLoading(true)
    try { await telechargerPDF(dos) } catch (e) { alert('Erreur PDF : ' + e.message) } finally { setPdfLoading(false) }
  }

  async function toggleActif(u) {
    try {
      const r = await req(`/admin/utilisateurs/${u.id}/actif`, { method: 'PUT' })
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, actif: r.actif } : x))
    } catch (e) { alert(e.message) }
  }

  async function renvoyerVerif(uid) {
    try { await req(`/admin/utilisateurs/${uid}/renvoyer-verification`, { method: 'POST' }); alert('Email de vérification envoyé.') }
    catch (e) { alert(e.message) }
  }

  async function resetMdp(uid) {
    if (!confirm('Envoyer un lien de réinitialisation au client ?')) return
    try { await req(`/admin/utilisateurs/${uid}/reset-mdp`, { method: 'POST' }); alert('Lien envoyé.') }
    catch (e) { alert(e.message) }
  }

  async function sauvegarderConfig() {
    setConfigSaving(true)
    try {
      await req('/admin/config', { method: 'PUT', body: JSON.stringify(configForm) })
      alert('Configuration mise à jour.')
    } catch (e) { alert(e.message) } finally { setConfigSaving(false) }
  }

  function logout() {
    localStorage.removeItem('admin_token')
    setVue('login')
    setStats(null)
  }

  function exportDossiers() {
    exportCSV(dossiers.map(d => ({
      reference:  d.reference,
      type:       LABELS_TYPE[d.type_formulaire] || d.type_formulaire,
      statut:     LABELS_STATUT[d.statut] || d.statut,
      client:     d.utilisateur?.email || '—',
      recepisse:  d.num_recepisse || '',
      date:       fmtDate(d.cree_le),
    })), 'dossiers.csv')
  }

  function exportUsers() {
    exportCSV(users.map(u => ({
      email:          u.email,
      email_verifie:  u.email_verifie ? 'Oui' : 'Non',
      a2f:            u.a2f_active ? 'Oui' : 'Non',
      profil_complet: u.profil_complet ? 'Oui' : 'Non',
      actif:          u.actif ? 'Oui' : 'Non',
      nb_dossiers:    u.nb_dossiers,
      inscription:    fmtDate(u.cree_le),
    })), 'utilisateurs.csv')
  }

  // ── Login ──────────────────────────────────────────────────
  if (vue === 'login') return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: '#dc2626' }}>A</div>
          <div>
            <div className="auth-logo-title">Infinity Compliance</div>
            <div className="auth-logo-sub">Interface Administration</div>
          </div>
        </div>
        {err && <div className="alert alert-err">{err}</div>}
        <h2>Accès administrateur</h2>
        <form onSubmit={login}>
          <div className="field">
            <label>Mot de passe admin</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus />
          </div>
          <button className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Accéder'}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="btn-link" style={{ fontSize: 13 }} onClick={() => nav('/')}>← Retour au site</button>
        </div>
      </div>
    </div>
  )

  const nbAlertes = (stats?.alertes?.transmis_sans_maj || 0) + (stats?.alertes?.en_attente_signature || 0)

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          <span style={{ color: '#dc2626', marginRight: 8 }}>⚙</span>
          Admin — Infinity Compliance
          {nbAlertes > 0 && (
            <span style={{ marginLeft: 10, background: '#ef4444', color: '#fff', fontSize: 11, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
              {nbAlertes}
            </span>
          )}
        </div>
        <div className="nav-right">
          <span style={{ fontSize: 12, color: '#888' }}>Interface administration</span>
          <button className="btn-link" onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div className="page-wide">
        <h1 style={{ marginBottom: 20 }}>Tableau de bord administration</h1>

        {err && <div className="alert alert-err" style={{ marginBottom: 16 }}>{err}</div>}
        {ok  && <div className="alert alert-ok"  style={{ marginBottom: 16 }}>{ok}</div>}

        {/* ── Stats cards ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Utilisateurs"      value={stats.total_users}          icon="👥" color="#3b82f6" />
            <StatCard label="Dossiers total"     value={stats.total_dossiers}       icon="📁" color="#00843D" />
            <StatCard label="Transmis ce mois"   value={stats.transmis_mois}        icon="📤" color="#06b6d4" />
            <StatCard label="Revenus ce mois"    value={fmtMontant(stats.revenus_mois)} icon="💰" color="#f59e0b" small />
          </div>
        )}

        {/* ── Charts ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            <ChartCard title="Évolution mensuelle (6 mois)">
              <BarChart data={stats.monthly} />
            </ChartCard>
            <ChartCard title="Répartition par type">
              <TypeChart data={stats.par_type} />
            </ChartCard>
            <ChartCard title="Funnel de conversion">
              <FunnelChart funnel={stats.funnel} />
            </ChartCard>
          </div>
        )}

        {/* ── Alertes ── */}
        {alertes && (alertes.transmis_sans_maj?.length > 0 || alertes.en_attente_signature?.length > 0) && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#92400e' }}>🔔 Alertes requérant votre attention</div>
            {alertes.transmis_sans_maj?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                  Dossiers transmis sans mise à jour depuis +7 jours ({alertes.transmis_sans_maj.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {alertes.transmis_sans_maj.map(d => (
                    <span key={d.id} style={{ fontSize: 11, padding: '3px 8px', background: '#fed7aa', borderRadius: 4, fontFamily: 'monospace', cursor: 'pointer' }}
                      onClick={() => { setOnglet('dossiers'); ouvrirDossier(d) }}>
                      {d.reference} — {d.email}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {alertes.en_attente_signature?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                  En attente de signature depuis +3 jours ({alertes.en_attente_signature.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {alertes.en_attente_signature.map(d => (
                    <span key={d.id} style={{ fontSize: 11, padding: '3px 8px', background: '#fde68a', borderRadius: 4, fontFamily: 'monospace', cursor: 'pointer' }}
                      onClick={() => { setOnglet('dossiers'); ouvrirDossier(d) }}>
                      {d.reference} — {d.email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Onglets ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #eee', overflowX: 'auto' }}>
          {[
            ['dossiers',  '📁 Dossiers'],
            ['users',     '👥 Utilisateurs'],
            ['paiements', '💳 Paiements'],
            ['logs',      '📋 Logs'],
            ['config',    '⚙ Configuration'],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setOnglet(k)} style={{
              padding: '10px 18px', border: 'none', whiteSpace: 'nowrap',
              borderBottom: onglet === k ? '2px solid #111' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: onglet === k ? 600 : 400,
              color: onglet === k ? '#111' : '#888',
              marginBottom: -2,
            }}>{l}</button>
          ))}
        </div>

        {/* ── DOSSIERS ── */}
        {onglet === 'dossiers' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text" placeholder="Référence ou email..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && appliquerFiltres()}
                style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, width: 200 }}
              />
              <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Tous les statuts</option>
                {Object.entries(LABELS_STATUT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="">Tous les types</option>
                {Object.entries(LABELS_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className="btn btn-primary" onClick={appliquerFiltres} style={{ fontSize: 13 }}>🔍 Rechercher</button>
              <button className="btn btn-secondary" onClick={exportDossiers} style={{ fontSize: 13 }}>⬇ CSV</button>
              <span style={{ fontSize: 12, color: '#888' }}>{dosTotal} dossier(s)</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Récépissé</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.reference}</td>
                    <td style={{ fontSize: 12 }}>{d.utilisateur?.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{LABELS_TYPE[d.type_formulaire] || d.type_formulaire}</td>
                    <td><BadgeStatut statut={d.statut} /></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{d.num_recepisse || '—'}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>{fmtDate(d.cree_le)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-link" onClick={() => ouvrirDossier(d)}>Gérer</button>
                        <button className="btn-link" style={{ color: '#3b82f6' }} onClick={() => telechargerPDFAdmin(d)}>PDF</button>
                        <button className="btn-link" style={{ color: '#ef4444' }} onClick={() => supprimerDossier(d)}>Suppr.</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dossiers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: 24 }}>Aucun dossier</td></tr>
                )}
              </tbody>
            </table>

            {dosPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: 12 }}
                  disabled={page === 1}
                  onClick={() => { const p = page - 1; setPage(p); chargerDossiers(p, search, filtreStatut, filtreType) }}>
                  ← Préc.
                </button>
                <span style={{ fontSize: 13, color: '#555' }}>Page {page} / {dosPages}</span>
                <button className="btn btn-secondary" style={{ fontSize: 12 }}
                  disabled={page === dosPages}
                  onClick={() => { const p = page + 1; setPage(p); chargerDossiers(p, search, filtreStatut, filtreType) }}>
                  Suiv. →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── UTILISATEURS ── */}
        {onglet === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-secondary" onClick={exportUsers} style={{ fontSize: 13 }}>⬇ CSV</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Vérifié</th>
                  <th>A2F</th>
                  <th>Profil</th>
                  <th>Statut</th>
                  <th>Dossiers</th>
                  <th>Inscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.actif ? 1 : 0.55 }}>
                    <td style={{ fontSize: 13 }}>{u.email}</td>
                    <td style={{ textAlign: 'center' }}>{u.email_verifie ? '✅' : '❌'}</td>
                    <td style={{ textAlign: 'center' }}>{u.a2f_active ? '✅' : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{u.profil_complet ? '✅' : '❌'}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: u.actif ? '#dcfce7' : '#fee2e2', color: u.actif ? '#166534' : '#991b1b', fontWeight: 500 }}>
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{u.nb_dossiers}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>{fmtDate(u.cree_le)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn-link" style={{ color: u.actif ? '#ef4444' : '#22c55e', fontSize: 12 }} onClick={() => toggleActif(u)}>
                          {u.actif ? 'Désactiver' : 'Activer'}
                        </button>
                        {!u.email_verifie && (
                          <button className="btn-link" style={{ fontSize: 12 }} onClick={() => renvoyerVerif(u.id)}>Vérif.</button>
                        )}
                        <button className="btn-link" style={{ color: '#f59e0b', fontSize: 12 }} onClick={() => resetMdp(u.id)}>Reset MDP</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 24 }}>Aucun utilisateur</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ── PAIEMENTS ── */}
        {onglet === 'paiements' && (
          <>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 32, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: '#888' }}>Total encaissé</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>{fmtMontant(paiementsTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#888' }}>Transactions</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{paiements.length}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Dossier</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Stripe ID</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.reference}</td>
                    <td style={{ fontSize: 12 }}>{p.email}</td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{fmtMontant(p.montant_fcfa)}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#888' }}>
                      {p.stripe_id ? p.stripe_id.slice(0, 22) + '…' : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontWeight: 500 }}>{p.statut}</span>
                    </td>
                    <td style={{ fontSize: 12, color: '#888' }}>{fmtDate(p.cree_le)}</td>
                  </tr>
                ))}
                {paiements.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 24 }}>Aucun paiement</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ── LOGS ── */}
        {onglet === 'logs' && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Dossier</th>
                  <th>Détails</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td><span style={{ fontSize: 11, padding: '2px 7px', background: '#f1f5f9', borderRadius: 4, fontFamily: 'monospace' }}>{l.action}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{l.dossier_ref || '—'}</td>
                    <td style={{ fontSize: 12, color: '#555' }}>{l.details || '—'}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>{fmtDate(l.cree_le)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: 24 }}>Aucun log</td></tr>
                )}
              </tbody>
            </table>
            {logsPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: 12 }}
                  disabled={logPage === 1}
                  onClick={() => { const p = logPage - 1; setLogPage(p); chargerLogs(p) }}>
                  ← Préc.
                </button>
                <span style={{ fontSize: 13, color: '#555' }}>Page {logPage} / {logsPages}</span>
                <button className="btn btn-secondary" style={{ fontSize: 12 }}
                  disabled={logPage === logsPages}
                  onClick={() => { const p = logPage + 1; setLogPage(p); chargerLogs(p) }}>
                  Suiv. →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── CONFIGURATION ── */}
        {onglet === 'config' && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Frais ARTCI (FCFA)</div>
              {[
                ['frais_declaration',  'Déclaration normale de traitement'],
                ['frais_autorisation', "Demande d'autorisation préalable"],
                ['frais_dpo',          'Enregistrement correspondant DPO'],
                ['frais_transfert',    "Demande de transfert à l'étranger"],
              ].map(([k, label]) => (
                <div className="field" key={k}>
                  <label>{label}</label>
                  <input
                    type="number" min="0"
                    value={configForm[k] || ''}
                    onChange={e => setConfigForm(f => ({ ...f, [k]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Mode maintenance</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
                <input
                  type="checkbox"
                  checked={configForm.maintenance_actif === 'true'}
                  onChange={e => setConfigForm(f => ({ ...f, maintenance_actif: e.target.checked ? 'true' : 'false' }))}
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 14 }}>Activer le mode maintenance</span>
                {configForm.maintenance_actif === 'true' && (
                  <span style={{ fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 600 }}>ACTIF</span>
                )}
              </label>
              <div className="field">
                <label>Message affiché aux utilisateurs</label>
                <textarea
                  value={configForm.maintenance_message || ''}
                  onChange={e => setConfigForm(f => ({ ...f, maintenance_message: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={sauvegarderConfig} disabled={configSaving}>
              {configSaving ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        )}
      </div>

      {/* ── Modal dossier ── */}
      {dossierSelec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }}>

            {/* En-tête modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Gérer le dossier</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => telechargerPDFAdmin(dossierSelec)}>
                  {pdfLoading ? '...' : '📄 Télécharger PDF'}
                </button>
                <button onClick={() => setDossierSelec(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Infos */}
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              <div><strong>Référence :</strong> <span style={{ fontFamily: 'monospace' }}>{dossierSelec.reference}</span></div>
              <div><strong>Type :</strong> {LABELS_TYPE[dossierSelec.type_formulaire] || dossierSelec.type_formulaire}</div>
              <div><strong>Client :</strong> {dossierSelec.utilisateur?.email || '—'}</div>
              {dossierSelec.signe_le && <div><strong>Signé le :</strong> {fmtDate(dossierSelec.signe_le)}</div>}
            </div>

            {/* Signature */}
            {dossierSelec.signature_image && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Signature manuscrite</div>
                <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10, background: '#fafafa', display: 'inline-block' }}>
                  <img src={dossierSelec.signature_image} alt="Signature" style={{ maxHeight: 80, maxWidth: 320, display: 'block' }} />
                </div>
              </div>
            )}

            {/* Gestion statut */}
            <div className="field">
              <label>Statut du dossier</label>
              <select value={nouveauStatut} onChange={e => setNouveauStatut(e.target.value)}>
                {Object.entries(LABELS_STATUT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Numéro de récépissé ARTCI</label>
              <input type="text" value={numRecepisse} onChange={e => setNumRecepisse(e.target.value)} placeholder="Ex: ARTCI-2026-DEC-00123" />
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Laisser vide si pas encore reçu</div>
            </div>

            {err && <div className="alert alert-err">{err}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={majDossier} disabled={loading}>
                {loading ? 'Mise à jour...' : 'Enregistrer'}
              </button>
              <button className="btn btn-secondary" onClick={() => setDossierSelec(null)}>Annuler</button>
            </div>

            {/* Données formulaire */}
            <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Données du formulaire</div>
              {Object.entries(dossierSelec.donnees || {}).map(([k, v]) => {
                if (v === null || v === undefined || v === '' || v === false) return null
                if (Array.isArray(v) && v.length === 0) return null
                if (k === 'engagement' || k === 'dpo_independance') return null
                return (
                  <div key={k} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 12 }}>
                    <span style={{ color: '#888', minWidth: 170, flexShrink: 0 }}>{LABELS_CHAMPS[k] || k.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#222' }}>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
