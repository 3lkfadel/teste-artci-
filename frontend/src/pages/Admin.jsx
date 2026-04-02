import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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

// ── Composant Stats ─────────────────────────────────────
function Stats({ stats }) {
  if (!stats) return null
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:28 }}>
      <div style={{ background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, padding:16, textAlign:'center' }}>
        <div style={{ fontSize:28, fontWeight:700 }}>{stats.total_users}</div>
        <div style={{ fontSize:12, color:'#888', marginTop:4 }}>Utilisateurs</div>
      </div>
      <div style={{ background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, padding:16, textAlign:'center' }}>
        <div style={{ fontSize:28, fontWeight:700 }}>{stats.total_dossiers}</div>
        <div style={{ fontSize:12, color:'#888', marginTop:4 }}>Dossiers total</div>
      </div>
      {Object.entries(stats.par_statut || {}).filter(([,v])=>v>0).map(([k,v]) => (
        <div key={k} style={{ background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, padding:16, textAlign:'center' }}>
          <div style={{ fontSize:24, fontWeight:700, color: COULEURS_STATUT[k] || '#111' }}>{v}</div>
          <div style={{ fontSize:11, color:'#888', marginTop:4 }}>{LABELS_STATUT[k]}</div>
        </div>
      ))}
    </div>
  )
}

// ── Page Admin ──────────────────────────────────────────
export default function Admin() {
  const nav = useNavigate()
  const [vue, setVue]             = useState('login') // login | dashboard
  const [password, setPassword]   = useState('')
  const [stats, setStats]         = useState(null)
  const [dossiers, setDossiers]   = useState([])
  const [users, setUsers]         = useState([])
  const [onglet, setOnglet]       = useState('dossiers') // dossiers | users
  const [filtreStatut, setFiltreStatut] = useState('')
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [ok, setOk]               = useState('')

  // Détail dossier sélectionné
  const [dossierSelec, setDossierSelec]   = useState(null)
  const [nouveauStatut, setNouveauStatut] = useState('')
  const [numRecepisse, setNumRecepisse]   = useState('')

  // Vérifier si déjà connecté
  useEffect(() => {
    if (localStorage.getItem('admin_token')) {
      setVue('dashboard')
      chargerDonnees()
    }
  }, [])

  async function login(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      const r = await req('/admin/login', { method:'POST', body:JSON.stringify({ password }) })
      localStorage.setItem('admin_token', r.token)
      setVue('dashboard')
      chargerDonnees()
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function chargerDonnees() {
    try {
      const [s, d, u] = await Promise.all([
        req('/admin/stats'),
        req(`/admin/dossiers?statut=${filtreStatut}`),
        req('/admin/utilisateurs'),
      ])
      setStats(s)
      setDossiers(d.dossiers)
      setUsers(u)
    } catch {}
  }

  useEffect(() => {
    if (vue === 'dashboard') chargerDonnees()
  }, [filtreStatut])

  async function ouvrirDossier(dos) {
    try {
      const d = await req(`/admin/dossiers/${dos.id}`)
      setDossierSelec(d)
      setNouveauStatut(d.statut)
      setNumRecepisse(d.num_recepisse || '')
    } catch {}
  }

  async function majDossier() {
    setErr(''); setOk(''); setLoading(true)
    try {
      await req(`/admin/dossiers/${dossierSelec.id}`, {
        method: 'PUT',
        body: JSON.stringify({ statut: nouveauStatut, num_recepisse: numRecepisse })
      })
      setOk('Dossier mis à jour. Email envoyé au client.')
      setDossierSelec(null)
      chargerDonnees()
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function supprimerDossier(dos) {
    if (!confirm(`Supprimer le dossier ${dos.reference} ? Cette action est irréversible.`)) return
    try {
      await req(`/admin/dossiers/${dos.id}`, { method:'DELETE' })
      chargerDonnees()
    } catch (e) { alert(e.message) }
  }

  function logout() {
    localStorage.removeItem('admin_token')
    setVue('login')
  }

  // ── Login ─────────────────────────────────────────────
  if (vue === 'login') return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background:'#dc2626' }}>A</div>
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
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required autoFocus />
          </div>
          <button className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Accéder'}
          </button>
        </form>
        <div style={{ marginTop:16, textAlign:'center' }}>
          <button className="btn-link" style={{ fontSize:13 }} onClick={() => nav('/')}>
            ← Retour au site
          </button>
        </div>
      </div>
    </div>
  )

  // ── Dashboard admin ───────────────────────────────────
  return (
    <>
      <nav className="nav">
        <div className="nav-logo">
          <span style={{ color:'#dc2626', marginRight:8 }}>⚙</span>
          Admin — Infinity Compliance
        </div>
        <div className="nav-right">
          <span style={{ fontSize:12, color:'#888' }}>Interface administration</span>
          <button className="btn-link" onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div className="page-wide">
        <h1>Tableau de bord administration</h1>

        {err && <div className="alert alert-err">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        {/* Stats */}
        <Stats stats={stats} />

        {/* Onglets */}
        <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:'2px solid #eee' }}>
          {[['dossiers','📁 Dossiers'],['users','👥 Utilisateurs']].map(([k,l]) => (
            <button key={k} onClick={()=>setOnglet(k)} style={{ padding:'10px 20px', border:'none', borderBottom: onglet===k?'2px solid #111':'2px solid transparent', background:'none', cursor:'pointer', fontWeight: onglet===k?600:400, color: onglet===k?'#111':'#888', marginBottom:-2 }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── ONGLET DOSSIERS ── */}
        {onglet === 'dossiers' && (
          <>
            <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
              <select value={filtreStatut} onChange={e=>setFiltreStatut(e.target.value)} style={{ padding:'6px 10px', border:'1px solid #ddd', borderRadius:6, fontSize:13 }}>
                <option value="">Tous les statuts</option>
                {Object.entries(LABELS_STATUT).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className="btn btn-secondary" onClick={chargerDonnees} style={{ fontSize:13 }}>
                🔄 Actualiser
              </button>
              <span style={{ fontSize:12, color:'#888' }}>{dossiers.length} dossier(s)</span>
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
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{d.reference}</td>
                    <td style={{ fontSize:12 }}>{d.utilisateur?.email || '—'}</td>
                    <td style={{ fontSize:12 }}>{LABELS_TYPE[d.type_formulaire]}</td>
                    <td>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: COULEURS_STATUT[d.statut]+'22', color: COULEURS_STATUT[d.statut], fontWeight:500 }}>
                        {LABELS_STATUT[d.statut]}
                      </span>
                    </td>
                    <td style={{ fontSize:12, fontFamily:'monospace' }}>{d.num_recepisse || '—'}</td>
                    <td style={{ fontSize:12, color:'#888' }}>{d.cree_le ? new Date(d.cree_le).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn-link" onClick={() => ouvrirDossier(d)}>Gérer</button>
                        <button className="btn-link" style={{ color:'#ef4444' }} onClick={() => supprimerDossier(d)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dossiers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign:'center', color:'#888', padding:24 }}>Aucun dossier</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {/* ── ONGLET UTILISATEURS ── */}
        {onglet === 'users' && (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Email vérifié</th>
                <th>A2F</th>
                <th>Profil complet</th>
                <th>Dossiers</th>
                <th>Inscription</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td style={{ textAlign:'center' }}>{u.email_verifie ? '✅' : '❌'}</td>
                  <td style={{ textAlign:'center' }}>{u.a2f_active ? '✅' : '—'}</td>
                  <td style={{ textAlign:'center' }}>{u.profil_complet ? '✅' : '❌'}</td>
                  <td style={{ textAlign:'center' }}>{u.nb_dossiers}</td>
                  <td style={{ fontSize:12, color:'#888' }}>{u.cree_le ? new Date(u.cree_le).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'#888', padding:24 }}>Aucun utilisateur</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal gestion dossier */}
      {dossierSelec && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:10, padding:28, width:'100%', maxWidth:500, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:18, margin:0 }}>Gérer le dossier</h2>
              <button onClick={()=>setDossierSelec(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#888' }}>×</button>
            </div>

            <div style={{ background:'#f9f9f9', borderRadius:8, padding:14, marginBottom:20, fontSize:13 }}>
              <div><strong>Référence :</strong> <span style={{ fontFamily:'monospace' }}>{dossierSelec.reference}</span></div>
              <div><strong>Type :</strong> {LABELS_TYPE[dossierSelec.type_formulaire]}</div>
              <div><strong>Client :</strong> {dossierSelec.utilisateur?.email}</div>
            </div>

            <div className="field">
              <label>Statut du dossier</label>
              <select value={nouveauStatut} onChange={e=>setNouveauStatut(e.target.value)}>
                {Object.entries(LABELS_STATUT).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Numéro de récépissé ARTCI</label>
              <input type="text" value={numRecepisse} onChange={e=>setNumRecepisse(e.target.value)} placeholder="Ex: ARTCI-2026-DEC-00123" />
              <div style={{ fontSize:11, color:'#888', marginTop:4 }}>Laisser vide si pas encore reçu</div>
            </div>

            {err && <div className="alert alert-err">{err}</div>}

            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-primary" onClick={majDossier} disabled={loading}>
                {loading ? 'Mise à jour...' : 'Enregistrer'}
              </button>
              <button className="btn btn-secondary" onClick={()=>setDossierSelec(null)}>
                Annuler
              </button>
            </div>

            <div style={{ marginTop:20, borderTop:'1px solid #eee', paddingTop:16 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Données du formulaire</div>
              {Object.entries(dossierSelec.donnees || {}).map(([k,v]) => {
                if (!v || (Array.isArray(v) && v.length === 0)) return null
                return (
                  <div key={k} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid #f5f5f5', fontSize:12 }}>
                    <span style={{ color:'#888', minWidth:140, flexShrink:0 }}>{k.replace(/_/g,' ')}</span>
                    <span>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
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