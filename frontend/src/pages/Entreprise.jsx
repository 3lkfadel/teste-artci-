import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api.js'

const CHAMPS = [
  { id: 'denomination',   label: 'Dénomination sociale',          required: true  },
  { id: 'forme_juridique',label: 'Forme juridique',               required: false, type: 'select',
    options: ['','SA','SARL','SAS','EI','ONG','Organisme public'] },
  { id: 'rccm',           label: 'Numéro RCCM',                   required: true,  placeholder: 'CI-ABJ-2018-B-12345' },
  { id: 'fiscal',         label: 'Numéro fiscal',                 required: true,  placeholder: '1234567 A' },
  { id: 'siege',          label: 'Siège social',                  required: true,  placeholder: 'Abidjan Plateau, Immeuble CCIA' },
  { id: 'representant',   label: 'Représentant légal',            required: true  },
  { id: 'fonction',       label: 'Fonction du représentant',      required: true,  placeholder: 'Directeur Général' },
  { id: 'telephone',      label: 'Téléphone (signature OTP)',     required: true,  placeholder: '+225 07 00 00 00 00' },
  { id: 'email_droits',   label: 'Email de contact droits ARTCI', required: true,  type: 'email', placeholder: 'droits@entreprise.ci' },
  { id: 'secteur',        label: "Secteur d'activité",            required: false },
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
  const [form, setForm]           = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [analyzing, setAnalyzing] = useState({})
  const [loading, setLoading]     = useState(false)
  const [err, setErr]             = useState('')
  const [ok, setOk]               = useState('')
  const debounce = useDebounce()

  useEffect(() => {
    api.getEntreprise()
      .then(d => { if (d) setForm(d) })
      .catch(() => {})
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
      } catch {
        setFb(id, { type: 'info', message: 'IA indisponible.' })
      } finally {
        setAn(id, false)
      }
    })
  }

  async function sauvegarder(e) {
    e.preventDefault()
    setErr(''); setOk('')
    setLoading(true)
    try {
      const r = await api.sauvegarderEntreprise(form)
      setOk('Profil sauvegardé.')
      if (r.profil_complet) setTimeout(() => nav('/dashboard'), 800)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  function renderFb(id) {
    if (analyzing[id]) return <div className="fb show loading">Analyse IA en cours...</div>
    const f = feedbacks[id]
    if (!f) return null
    return <div className={`fb show ${f.type}`}>{f.message}</div>
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          <span className="nav-link" onClick={() => nav('/dashboard')}>Tableau de bord</span>
          <span className="nav-link" onClick={() => { localStorage.removeItem('token'); nav('/auth') }}>Déconnexion</span>
        </div>
      </nav>

      <div className="page">
        <h1>Profil de l'entreprise</h1>
        <p className="subtitle">
          Ces informations seront pré-remplies dans tous vos formulaires ARTCI.
          L'assistant IA valide chaque champ en temps réel.
        </p>

        {err && <div className="alert alert-err">{err}</div>}
        {ok  && <div className="alert alert-ok">{ok}</div>}

        <form onSubmit={sauvegarder}>
          {CHAMPS.map(c => (
            <div className="field" key={c.id}>
              <label>
                {c.label} {c.required && <span className="required">*</span>}
              </label>

              {c.type === 'select' ? (
                <select
                  value={form[c.id] || ''}
                  onChange={e => onInput(c.id, e.target.value)}
                >
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

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Sauvegarde...' : 'Sauvegarder et continuer'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => nav('/dashboard')}
            >
              Tableau de bord
            </button>
          </div>
        </form>
      </div>
    </>
  )
}