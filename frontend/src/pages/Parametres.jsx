import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'
import Sidebar from './Sidebar.jsx'

const CHAMPS_ENTREPRISE = [
  { id:'denomination',   label:'Dénomination sociale',          required:true  },
  { id:'forme_juridique',label:'Forme juridique',               required:false, type:'select',
    options:['','SA','SARL','SAS','EI','ONG','Organisme public'] },
  { id:'rccm',           label:'Numéro RCCM',                   required:true,  placeholder:'CI-ABJ-2018-B-12345' },
  { id:'fiscal',         label:'Numéro fiscal (N°CC)',           required:true,  placeholder:'1234567 A' },
  { id:'siege',          label:'Siège social',                   required:true,  placeholder:'Abidjan Plateau, Immeuble CCIA...' },
  { id:'representant',   label:'Représentant légal',             required:true  },
  { id:'fonction',       label:'Fonction du représentant',       required:true,  placeholder:'Directeur Général' },
  { id:'telephone',      label:'Téléphone',                      required:true,  placeholder:'+225 07 00 00 00 00' },
  { id:'email_droits',   label:'Email de contact droits ARTCI',  required:true,  type:'email' },
  { id:'secteur',        label:"Secteur d'activité",             required:false },
]

function useDebounce(delay = 1200) {
  const timers = useRef({})
  return (id, fn) => {
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(fn, delay)
  }
}

function SvgIcon({ name, size = 16 }) {
  const icons = {
    building: <><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 14V9h6v5"/><rect x="6" y="5" width="1.5" height="2" rx=".5"/><rect x="8.5" y="5" width="1.5" height="2" rx=".5"/></>,
    shield:   <><path d="M8 1L1 4v4c0 3.5 3 6.5 7 7.5 4-1 7-4 7-7.5V4L8 1z"/></>,
    palette:  <><circle cx="8" cy="8" r="5"/><path d="M8 3v1M8 12v1M3 8h1M12 8h1M4.9 4.9l.7.7M10.4 10.4l.7.7M4.9 11.1l.7-.7M10.4 5.6l.7-.7"/></>,
    user:     <><circle cx="8" cy="5" r="3"/><path d="M1 14c0-3 3.1-5 7-5s7 2 7 5"/></>,
    chevron:  <><polyline points="5 7 8 10 11 7"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}

const CARDS = [
  { key:'entreprise', title:'Mon entreprise',  icon:'building', desc:'Informations de votre organisation' },
  { key:'securite',   title:'Sécurité',         icon:'shield',   desc:'Mot de passe et double authentification' },
  { key:'perso',      title:'Personnalisation', icon:'palette',  desc:'Logo et apparence de vos documents' },
  { key:'compte',     title:'Mon compte',       icon:'user',     desc:'Informations et déconnexion' },
]

export default function Parametres() {
  const nav = useNavigate()
  const urlParams = new URLSearchParams(window.location.search)
  const [section, setSection] = useState(urlParams.get('section') || null)

  // Auth profil
  const [profil, setProfil]   = useState(null)

  // Entreprise
  const [form, setForm]           = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [analyzing, setAnalyzing] = useState({})
  const debounce = useDebounce()

  // Sécurité
  const [mdpActuel, setMdpActuel]   = useState('')
  const [mdpNouv, setMdpNouv]       = useState('')
  const [mdpConfirm, setMdpConfirm] = useState('')

  // Personnalisation
  const [logoPreview, setLogoPreview]     = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [hasNewLogo, setHasNewLogo]       = useState(false)
  const logoInputRef = useRef(null)

  // Global
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [ok, setOk]           = useState('')

  useEffect(() => {
    api.getProfil().then(setProfil).catch(() => nav('/auth'))
    api.getEntreprise().then(d => {
      if (d) {
        setForm(d)
        if (d.logo_url) {
          setLogoPreview(d.logo_url)
          localStorage.setItem('company_logo', d.logo_url)
        }
      }
    }).catch(() => {})
  }, [])

  function reset() { setErr(''); setOk('') }

  function toggleSection(s) {
    reset()
    setSection(prev => prev === s ? null : s)
  }

  // ── Entreprise ──────────────────────────────────────────
  const setFb = (id, v) => setFeedbacks(f => ({ ...f, [id]: v }))
  const setAn = (id, v) => setAnalyzing(a => ({ ...a, [id]: v }))

  function onInput(id, valeur) {
    setForm(f => ({ ...f, [id]: valeur }))
    if (valeur.length < 3) { setFb(id, null); return }
    setAn(id, true)
    debounce(id, async () => {
      try {
        const r = await api.validerChamp({ champ: id, valeur, contexte: id })
        setFb(id, r)
      } catch { setFb(id, { type:'info', message:'IA indisponible.' }) }
      finally { setAn(id, false) }
    })
  }

  async function sauvegarderEntreprise(e) {
    e.preventDefault(); reset(); setLoading(true)
    try {
      await api.sauvegarderEntreprise(form)
      setOk('Profil entreprise sauvegardé.')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  function renderFb(id) {
    if (analyzing[id]) return <div className="fb show loading">Analyse IA en cours...</div>
    const f = feedbacks[id]
    if (!f) return null
    return <div className={`fb show ${f.type}`}>{f.message}</div>
  }

  // ── Sécurité ────────────────────────────────────────────
  async function changerMotDePasse(e) {
    e.preventDefault(); reset()
    if (mdpNouv !== mdpConfirm) { setErr('Les mots de passe ne correspondent pas'); return }
    if (mdpNouv.length < 8)     { setErr('Minimum 8 caractères'); return }
    setLoading(true)
    try {
      await api.changerMotDePasse({ mot_de_passe_actuel: mdpActuel, nouveau_mot_de_passe: mdpNouv })
      setOk('Mot de passe modifié avec succès.')
      setMdpActuel(''); setMdpNouv(''); setMdpConfirm('')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function toggleA2f() {
    reset(); setLoading(true)
    try {
      if (profil.a2f_active) {
        await api.desactiverA2f()
        setProfil(p => ({ ...p, a2f_active: false }))
        setOk('A2F désactivée.')
      } else {
        await api.activerA2f()
        setProfil(p => ({ ...p, a2f_active: true }))
        setOk('A2F activée. Un code sera envoyé par email à chaque connexion.')
      }
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  // ── Personnalisation ────────────────────────────────────
  function onLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    reset()
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setErr('Format non autorisé. PNG ou JPG uniquement.'); return
    }
    if (file.size > 2 * 1024 * 1024) {
      setErr('Logo trop volumineux. Maximum 2 MB.'); return
    }
    const reader = new FileReader()
    reader.onload = () => { setLogoPreview(reader.result); setHasNewLogo(true) }
    reader.readAsDataURL(file)
  }

  async function uploadLogo() {
    const file = logoInputRef.current?.files[0]
    if (!file) return
    setLogoUploading(true); reset()
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const r = await api.uploadLogo(formData)
      setLogoPreview(r.logo_url)
      setHasNewLogo(false)
      localStorage.setItem('company_logo', r.logo_url)
      setOk('Logo sauvegardé avec succès.')
    } catch (e) { setErr(e.message) } finally { setLogoUploading(false) }
  }

  if (!profil) return <div className="page"><p>Chargement...</p></div>

  return (
    <div className="app-layout">
      <Sidebar active="parametres" />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">Paramètres</div>
              <div className="topbar-sub">Gérez votre compte, entreprise et préférences</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn btn-secondary" onClick={() => nav('/dashboard')}>← Dashboard</button>
          </div>
        </div>

        <div className="page">
          {err && <div className="alert alert-err">{err}</div>}
          {ok  && <div className="alert alert-ok">{ok}</div>}

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {CARDS.map(card => {
              const isOpen = section === card.key
              return (
                <div key={card.key} className="card" style={{ padding:0, overflow:'hidden' }}>
                  {/* En-tête de la card */}
                  <div
                    onClick={() => toggleSection(card.key)}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'16px 20px', cursor:'pointer',
                      background: isOpen ? 'var(--green-light)' : 'var(--white)',
                      borderBottom: isOpen ? '1px solid var(--green-mid)' : 'none',
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{
                        width:38, height:38, borderRadius:8, flexShrink:0,
                        background: isOpen ? 'var(--green)' : 'var(--green-light)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: isOpen ? '#fff' : 'var(--green)',
                      }}>
                        <SvgIcon name={card.icon} size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{card.title}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{card.desc}</div>
                      </div>
                    </div>
                    <div style={{
                      color:'var(--text-3)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition:'transform 0.2s',
                    }}>
                      <SvgIcon name="chevron" />
                    </div>
                  </div>

                  {/* Contenu */}
                  {isOpen && (
                    <div style={{ padding:'20px' }}>

                      {/* ── MON ENTREPRISE ── */}
                      {card.key === 'entreprise' && (
                        <form onSubmit={sauvegarderEntreprise}>
                          {CHAMPS_ENTREPRISE.map(c => (
                            <div className="field" key={c.id}>
                              <label>{c.label} {c.required && <span className="required">*</span>}</label>
                              {c.type === 'select' ? (
                                <select value={form[c.id] || ''} onChange={e => onInput(c.id, e.target.value)}>
                                  {c.options.map(o => <option key={o} value={o}>{o || '-- Choisir --'}</option>)}
                                </select>
                              ) : (
                                <input
                                  type={c.type || 'text'}
                                  value={form[c.id] || ''}
                                  onChange={e => onInput(c.id, e.target.value)}
                                  placeholder={c.placeholder || ''}
                                />
                              )}
                              {renderFb(c.id)}
                            </div>
                          ))}
                          <button className="btn btn-primary" disabled={loading} style={{ marginTop:8 }}>
                            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                          </button>
                        </form>
                      )}

                      {/* ── SÉCURITÉ ── */}
                      {card.key === 'securite' && (
                        <div>
                          <form onSubmit={changerMotDePasse} style={{ marginBottom:24 }}>
                            <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>Changer le mot de passe</div>
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

                          <div style={{ borderTop:'1px solid var(--border)', paddingTop:20 }}>
                            <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>Double authentification (A2F)</div>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div>
                                <div style={{ fontSize:13, color:'var(--text-2)' }}>Un code envoyé par email à chaque connexion.</div>
                                <div style={{ marginTop:6, fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                                  <div style={{ width:8, height:8, borderRadius:'50%', background: profil.a2f_active ? 'var(--green)' : '#ddd' }} />
                                  <span style={{ color: profil.a2f_active ? 'var(--green)' : 'var(--text-3)' }}>
                                    {profil.a2f_active ? 'Activée' : 'Désactivée'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                className={`btn ${profil.a2f_active ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={toggleA2f} disabled={loading}
                              >
                                {loading ? '...' : profil.a2f_active ? 'Désactiver' : 'Activer'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── PERSONNALISATION ── */}
                      {card.key === 'perso' && (
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>Logo entreprise</div>
                          <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:16 }}>
                            Affiché dans le header de vos PDF et dans la sidebar. PNG ou JPG, max 2 MB.
                          </div>

                          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
                            {logoPreview ? (
                              <div style={{
                                width:80, height:80, borderRadius:8, border:'1px solid var(--border)',
                                overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
                                background:'var(--bg)', flexShrink:0,
                              }}>
                                <img src={logoPreview} alt="Logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                              </div>
                            ) : (
                              <div style={{
                                width:80, height:80, borderRadius:8, border:'2px dashed var(--border)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                color:'var(--text-3)', fontSize:11, textAlign:'center',
                                background:'var(--bg)', flexShrink:0,
                              }}>
                                Aucun<br/>logo
                              </div>
                            )}
                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg"
                                onChange={onLogoChange}
                                style={{ display:'none' }}
                                id="logo-input"
                              />
                              <label htmlFor="logo-input" className="btn btn-secondary" style={{ cursor:'pointer', fontSize:13, display:'inline-block' }}>
                                Choisir un fichier
                              </label>
                              {logoPreview && (
                                <div style={{ fontSize:12, color:'var(--text-3)' }}>
                                  {hasNewLogo ? 'Nouveau logo sélectionné' : 'Logo actuel'}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            className="btn btn-primary"
                            onClick={uploadLogo}
                            disabled={logoUploading || !hasNewLogo}
                            style={{ fontSize:13 }}
                          >
                            {logoUploading ? 'Upload en cours...' : 'Sauvegarder le logo'}
                          </button>
                        </div>
                      )}

                      {/* ── MON COMPTE ── */}
                      {card.key === 'compte' && (
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
                            <div style={{
                              width:48, height:48, borderRadius:'50%',
                              background:'var(--green-light)', display:'flex', alignItems:'center',
                              justifyContent:'center', color:'var(--green)', fontWeight:600, fontSize:16, flexShrink:0,
                            }}>
                              {profil.email.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:500, fontSize:14 }}>{profil.email}</div>
                              <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>
                                {profil.email_verifie
                                  ? <span style={{ color:'var(--green)' }}>✓ Email vérifié</span>
                                  : <span style={{ color:'#D97706' }}>⚠ Email non vérifié</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            className="btn btn-secondary"
                            style={{ borderColor:'#DC2626', color:'#DC2626' }}
                            onClick={() => {
                              localStorage.removeItem('token')
                              localStorage.removeItem('user_email')
                              nav('/auth')
                            }}
                          >
                            Se déconnecter
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
