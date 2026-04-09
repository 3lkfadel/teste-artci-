import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

const CHAMPS = [
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

export default function Entreprise() {
  const nav = useNavigate()
  const isNouveau = new URLSearchParams(window.location.search).get('nouveau') === 'true'

  const [form, setForm]           = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [analyzing, setAnalyzing] = useState({})
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [ok, setOk]               = useState('')
  const debounce = useDebounce()

  useEffect(() => {
    api.getEntreprise().then(d => { if (d) setForm(d) }).catch(() => {})
  }, [])

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

  async function sauvegarder(e) {
    e.preventDefault()
    setErr(''); setOk('')
    setLoading(true)
    try {
      await api.sauvegarderEntreprise(form)
      setOk('Profil sauvegardé avec succès.')
      setTimeout(() => nav('/dashboard'), 900)
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  function renderFb(id) {
    if (analyzing[id]) return <div className="fb show loading">Analyse IA en cours...</div>
    const f = feedbacks[id]
    if (!f) return null
    return <div className={`fb show ${f.type}`}>{f.message}</div>
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:600 }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:40, height:40, borderRadius:8, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:16 }}>IC</div>
            <div style={{ fontSize:13, color:'var(--text-3)' }}>Infinity Compliance</div>
          </div>

          {isNouveau ? (
            <div style={{ background:'var(--green-light)', border:'1px solid var(--green-mid)', borderRadius:10, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ fontWeight:600, fontSize:15, color:'var(--green-dark)', marginBottom:4 }}>
                Bienvenue !
              </div>
              <div style={{ fontSize:13, color:'var(--green-dark)', lineHeight:1.6 }}>
                Complétez votre profil entreprise pour pré-remplir vos formulaires automatiquement.
              </div>
            </div>
          ) : null}

          <div style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Mon entreprise</div>
          <div style={{ fontSize:13, color:'var(--text-3)' }}>Ces informations seront pré-remplies dans vos formulaires ARTCI</div>
        </div>

        {err && <div className="alert alert-err">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        <div className="card">
          <form onSubmit={sauvegarder}>
            {CHAMPS.map(c => (
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

            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Sauvegarde...' : 'Compléter mon profil →'}
              </button>
              {isNouveau && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => nav('/dashboard')}
                >
                  Passer pour l'instant → Aller au dashboard
                </button>
              )}
              {!isNouveau && (
                <button type="button" className="btn btn-secondary" onClick={() => nav('/dashboard')}>
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
