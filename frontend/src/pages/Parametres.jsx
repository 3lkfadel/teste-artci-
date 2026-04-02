import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

export default function Parametres() {
  const nav = useNavigate()

  const [profil, setProfil]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')
  const [ok, setOk]                 = useState('')

  // Changement mot de passe
  const [mdpActuel, setMdpActuel]   = useState('')
  const [mdpNouv, setMdpNouv]       = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')

  useEffect(() => {
    api.getProfil().then(setProfil).catch(() => nav('/auth'))
  }, [])

  function reset() { setErr(''); setOk('') }

  // ── Changer mot de passe ──────────────────────────────────
  async function changerMotDePasse(e) {
    e.preventDefault()
    reset()
    if (mdpNouv !== mdpConfirm) { setErr('Les mots de passe ne correspondent pas'); return }
    if (mdpNouv.length < 8)     { setErr('Minimum 8 caractères'); return }
    setLoading(true)
    try {
      await api.changerMotDePasse({ mot_de_passe_actuel: mdpActuel, nouveau_mot_de_passe: mdpNouv })
      setOk('Mot de passe modifié avec succès.')
      setMdpActuel(''); setMdpNouv(''); setMdpConfirm('')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Activer / Désactiver A2F ──────────────────────────────
  async function toggleA2f() {
    reset()
    setLoading(true)
    try {
      if (profil.a2f_active) {
        await api.desactiverA2f()
        setProfil(p => ({ ...p, a2f_active: false }))
        setOk('Double authentification désactivée.')
      } else {
        await api.activerA2f()
        setProfil(p => ({ ...p, a2f_active: true }))
        setOk('Double authentification activée. Un code vous sera envoyé par email à chaque connexion.')
      }
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  if (!profil) return <div className="page"><p>Chargement...</p></div>

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          <span className="nav-link" onClick={() => nav('/dashboard')}>← Tableau de bord</span>
        </div>
      </nav>

      <div className="page" style={{ maxWidth: 600 }}>
        <h1>Paramètres du compte</h1>

        {err && <div className="alert alert-err">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        {/* Infos compte */}
        <div style={{ background:'#f9f9f9', border:'1px solid #eee', borderRadius:8, padding:20, marginBottom:28 }}>
          <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>Email du compte</div>
          <div style={{ fontWeight:600 }}>{profil.email}</div>
          <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: profil.email_verifie ? '#22c55e' : '#f59e0b' }} />
            <span style={{ fontSize:12, color:'#888' }}>
              {profil.email_verifie ? 'Email vérifié' : 'Email non vérifié'}
            </span>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:20, marginBottom:24 }}>
          <h2 style={{ fontSize:16, marginBottom:16 }}>Changer le mot de passe</h2>
          <form onSubmit={changerMotDePasse}>
            <div className="field">
              <label>Mot de passe actuel</label>
              <input type="password" value={mdpActuel} onChange={e=>setMdpActuel(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="field">
              <label>Nouveau mot de passe</label>
              <input type="password" value={mdpNouv} onChange={e=>setMdpNouv(e.target.value)} placeholder="8 caractères minimum" required />
            </div>
            <div className="field">
              <label>Confirmer le nouveau mot de passe</label>
              <input type="password" value={mdpConfirm} onChange={e=>setMdpConfirm(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>

        {/* Double authentification */}
        <div style={{ border:'1px solid #eee', borderRadius:8, padding:20, marginBottom:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <h2 style={{ fontSize:16, marginBottom:4 }}>Double authentification (A2F)</h2>
              <p style={{ fontSize:13, color:'#666', lineHeight:1.5 }}>
                Un code de vérification sera envoyé par email à chaque connexion.
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: profil.a2f_active ? '#22c55e' : '#ddd' }} />
                <span style={{ fontSize:12, color: profil.a2f_active ? '#22c55e' : '#888' }}>
                  {profil.a2f_active ? 'Activée' : 'Désactivée'}
                </span>
              </div>
            </div>
            <button
              className={`btn ${profil.a2f_active ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleA2f}
              disabled={loading}
              style={{ flexShrink:0, marginLeft:16 }}
            >
              {loading ? '...' : profil.a2f_active ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        </div>

        {/* Déconnexion */}
        <div style={{ border:'1px solid #fee2e2', borderRadius:8, padding:20 }}>
          <h2 style={{ fontSize:16, marginBottom:4, color:'#ef4444' }}>Zone dangereuse</h2>
          <p style={{ fontSize:13, color:'#666', marginBottom:12 }}>Se déconnecter de tous les appareils.</p>
          <button
            className="btn btn-secondary"
            style={{ borderColor:'#ef4444', color:'#ef4444' }}
            onClick={() => { localStorage.removeItem('token'); nav('/auth') }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  )
}