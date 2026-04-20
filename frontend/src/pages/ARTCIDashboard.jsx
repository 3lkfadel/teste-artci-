import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

const LABELS_STATUT = {
  transmis:  'Transmis',
  en_cours:  'En cours',
  complet:   'Récépissé délivré',
  refuse:    'Refusé',
}
const COULEURS_STATUT = {
  transmis:  '#3b82f6',
  en_cours:  '#06b6d4',
  complet:   '#22c55e',
  refuse:    '#ef4444',
}
const LABELS_TYPE = {
  declaration:  'Déclaration',
  autorisation: 'Autorisation',
  dpo:          'DPO',
  transfert:    'Transfert',
}

function req(path, opts = {}) {
  const token = localStorage.getItem('artci_token')
  return fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
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

export default function ARTCIDashboard() {
  const nav   = useNavigate()
  const agent = (() => { try { return JSON.parse(localStorage.getItem('artci_agent') || '{}') } catch { return {} } })()

  const [dossiers, setDossiers] = useState([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreType, setFiltreType]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [onglet, setOnglet]     = useState('dossiers')
  const [rapports, setRapports] = useState([])

  useEffect(() => {
    if (!localStorage.getItem('artci_token')) { nav('/artci/login'); return }
    chargerDossiers(1, '', '', '')
  }, [])

  async function chargerDossiers(p, s, st, ty) {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p })
      if (s)  params.set('search', s)
      if (st) params.set('statut', st)
      if (ty) params.set('type', ty)
      const r = await req(`/artci/dossiers?${params}`)
      setDossiers(r.dossiers)
      setTotal(r.total)
      setPages(r.pages)
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('403')) { logout(); return }
    } finally { setLoading(false) }
  }

  async function chargerRapports() {
    try { setRapports(await req('/artci/rapports')) } catch {}
  }

  useEffect(() => {
    if (onglet === 'rapports') chargerRapports()
  }, [onglet])

  function appliquerFiltres() {
    setPage(1)
    chargerDossiers(1, search, filtreStatut, filtreType)
  }

  function logout() {
    localStorage.removeItem('artci_token')
    localStorage.removeItem('artci_agent')
    nav('/artci/login')
  }

  // Stats calculées depuis la liste
  const stats = {
    total:      total,
    sans_rapport: dossiers.filter(d => !d.has_rapport).length,
    valides:    dossiers.filter(d => d.statut === 'en_cours' || d.statut === 'complet').length,
    refuses:    dossiers.filter(d => d.statut === 'refuse').length,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff' }}>

      {/* Sidebar bleue */}
      <div style={{ width: 240, background: '#003189', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#003189', fontSize: 16 }}>A</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Espace ARTCI</div>
              <div style={{ color: '#93b4ff', fontSize: 11 }}>Agents</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {[
            { key: 'dossiers', label: 'Dossiers reçus',     icon: '📁' },
            { key: 'rapports', label: 'Rapports générés',   icon: '📋' },
          ].map(item => (
            <div
              key={item.key}
              onClick={() => setOnglet(item.key)}
              style={{
                padding: '11px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                background: onglet === item.key ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: onglet === item.key ? '3px solid #fff' : '3px solid transparent',
                color: onglet === item.key ? '#fff' : '#93b4ff',
                fontSize: 13, fontWeight: onglet === item.key ? 600 : 400,
                transition: 'all .15s',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#93b4ff', fontSize: 11, marginBottom: 4 }}>Connecté en tant que</div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{agent.prenom} {agent.nom}</div>
          <div style={{ color: '#93b4ff', fontSize: 11, marginBottom: 12 }}>{agent.service}</div>
          <button
            onClick={logout}
            style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
              {onglet === 'dossiers' ? 'Dossiers reçus' : 'Rapports générés'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Service : <strong>{agent.service}</strong></div>
            {dossiers.filter(d => !d.has_rapport).length > 0 && (
              <div style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                {dossiers.filter(d => !d.has_rapport).length} sans rapport
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 28 }}>

          {/* ── ONGLET DOSSIERS ── */}
          {onglet === 'dossiers' && (
            <>
              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Total reçus',      value: total,               color: '#003189' },
                  { label: 'Sans rapport',      value: dossiers.filter(d => !d.has_rapport).length, color: '#f59e0b' },
                  { label: 'Validés',          value: dossiers.filter(d => d.statut === 'en_cours' || d.statut === 'complet').length, color: '#22c55e' },
                  { label: 'Refusés',          value: dossiers.filter(d => d.statut === 'refuse').length, color: '#ef4444' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filtres */}
              <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <input
                  type="text" placeholder="Référence ou email..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && appliquerFiltres()}
                  style={{ padding: '7px 11px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, width: 200 }}
                />
                <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13 }}>
                  <option value="">Tous les statuts</option>
                  {Object.entries(LABELS_STATUT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <select value={filtreType} onChange={e => setFiltreType(e.target.value)} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13 }}>
                  <option value="">Tous les types</option>
                  {Object.entries(LABELS_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <button onClick={appliquerFiltres} style={{ padding: '7px 16px', background: '#003189', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  🔍 Rechercher
                </button>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>{total} dossier(s)</span>
              </div>

              {/* Tableau */}
              <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {loading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Chargement...</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Référence', 'Type', 'Entreprise', 'Statut', 'Date réception', 'Rapport', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dossiers.map(d => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{d.reference}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12 }}>{LABELS_TYPE[d.type_formulaire] || d.type_formulaire}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: '#374151' }}>
                            {d.entreprise?.denomination || d.utilisateur?.email || '—'}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: (COULEURS_STATUT[d.statut] || '#888') + '22', color: COULEURS_STATUT[d.statut] || '#888', fontWeight: 600 }}>
                              {LABELS_STATUT[d.statut] || d.statut}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{fmtDate(d.cree_le)}</td>
                          <td style={{ padding: '11px 14px' }}>
                            {d.has_rapport ? (
                              <span style={{ fontSize: 11, padding: '2px 8px', background: '#dcfce7', color: '#166534', borderRadius: 4, fontWeight: 500 }}>✓ Généré</span>
                            ) : (
                              <span style={{ fontSize: 11, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 600 }}>NOUVEAU</span>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <button
                              onClick={() => nav(`/artci/dossiers/${d.id}`)}
                              style={{ padding: '5px 14px', background: '#003189', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Consulter
                            </button>
                          </td>
                        </tr>
                      ))}
                      {dossiers.length === 0 && !loading && (
                        <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Aucun dossier</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, alignItems: 'center' }}>
                  <button onClick={() => { const p = page - 1; setPage(p); chargerDossiers(p, search, filtreStatut, filtreType) }} disabled={page === 1}
                    style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>← Préc.</button>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} / {pages}</span>
                  <button onClick={() => { const p = page + 1; setPage(p); chargerDossiers(p, search, filtreStatut, filtreType) }} disabled={page === pages}
                    style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: page === pages ? 'not-allowed' : 'pointer', fontSize: 13 }}>Suiv. →</button>
                </div>
              )}
            </>
          )}

          {/* ── ONGLET RAPPORTS ── */}
          {onglet === 'rapports' && (
            <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Dossier', 'Décision', 'Généré le', 'Décidé le'].map(h => (
                      <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rapports.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{r.reference}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {r.decision === 'valide' && <span style={{ fontSize: 11, padding: '2px 9px', background: '#dcfce7', color: '#166534', borderRadius: 20, fontWeight: 600 }}>✅ Validé</span>}
                        {r.decision === 'refuse' && <span style={{ fontSize: 11, padding: '2px 9px', background: '#fee2e2', color: '#991b1b', borderRadius: 20, fontWeight: 600 }}>❌ Refusé</span>}
                        {!r.decision && <span style={{ fontSize: 11, color: '#9ca3af' }}>En attente</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{fmtDate(r.genere_le)}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{fmtDate(r.decide_le)}</td>
                    </tr>
                  ))}
                  {rapports.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Aucun rapport généré</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
