import { useState, useEffect, useRef } from 'react'

export default function RapportAudio({ texte }) {
  const [lecture, setLecture]         = useState(false)
  const [pause, setPause]             = useState(false)
  const [progression, setProgression] = useState(0)
  const [vitesse, setVitesse]         = useState(1)
  const [voix, setVoix]               = useState(null)
  const [voixDispo, setVoixDispo]     = useState([])
  const [erreur, setErreur]           = useState('')
  const utteranceRef                  = useRef(null)
  const motsRef                       = useRef([])
  const motActuelRef                  = useRef(0)
  const keepAliveRef                  = useRef(null)   // Fix bug Chrome 15s
  const vitesseRef                    = useRef(1)      // valeur stable dans les callbacks

  // Synchroniser la ref de vitesse
  useEffect(() => { vitesseRef.current = vitesse }, [vitesse])

  // Charger les voix disponibles
  useEffect(() => {
    if (!window.speechSynthesis) return
    function chargerVoix() {
      const toutes = window.speechSynthesis.getVoices()
      if (toutes.length === 0) return
      const fr = toutes.filter(v => v.lang.startsWith('fr'))
      const disponibles = fr.length > 0 ? fr : toutes
      setVoixDispo(disponibles)
      const preferee =
        disponibles.find(v => v.lang === 'fr-FR' && v.name.toLowerCase().includes('google')) ||
        disponibles.find(v => v.lang === 'fr-FR') ||
        disponibles.find(v => v.lang.startsWith('fr')) ||
        disponibles[0]
      setVoix(preferee || null)
    }
    chargerVoix()
    window.speechSynthesis.onvoiceschanged = chargerVoix
    return () => {
      stopperKeepAlive()
      window.speechSynthesis.cancel()
    }
  }, [])

  // Fix bug Chrome : arrêt après ~15s sur les textes longs
  // Solution : pause + resume toutes les 14s pour réinitialiser le timer interne
  function demarrerKeepAlive() {
    stopperKeepAlive()
    keepAliveRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 14000)
  }

  function stopperKeepAlive() {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }

  function lire() {
    setErreur('')
    if (!window.speechSynthesis) {
      setErreur('Votre navigateur ne supporte pas la lecture audio.')
      return
    }
    if (!texte || !texte.trim()) {
      setErreur('Aucun texte à lire.')
      return
    }

    window.speechSynthesis.cancel()
    stopperKeepAlive()

    const utterance    = new SpeechSynthesisUtterance(texte)
    utterance.lang     = 'fr-FR'
    utterance.rate     = vitesseRef.current
    if (voix) utterance.voice = voix

    motsRef.current      = texte.trim().split(/\s+/)
    motActuelRef.current = 0

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        motActuelRef.current++
        const pct = Math.round((motActuelRef.current / motsRef.current.length) * 100)
        setProgression(Math.min(pct, 100))
      }
    }

    utterance.onstart = () => {
      setLecture(true)
      setPause(false)
      demarrerKeepAlive()
    }

    utterance.onend = () => {
      setLecture(false)
      setPause(false)
      setProgression(100)
      stopperKeepAlive()
    }

    utterance.onerror = (e) => {
      // 'interrupted' est normal (cancel manuel), on n'affiche pas d'erreur
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        setErreur(`Erreur lecture : ${e.error}`)
      }
      setLecture(false)
      setPause(false)
      stopperKeepAlive()
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)

    // Fix : certains navigateurs ne déclenchent pas onstart
    // On force l'état après un court délai si onstart n'a pas répondu
    setTimeout(() => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        setLecture(true)
        setPause(false)
        demarrerKeepAlive()
      }
    }, 300)
  }

  function mettreEnPause() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      stopperKeepAlive()
      window.speechSynthesis.pause()
      setPause(true)
    }
  }

  function reprendre() {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setPause(false)
      demarrerKeepAlive()
    }
  }

  function arreter() {
    stopperKeepAlive()
    window.speechSynthesis.cancel()
    setLecture(false)
    setPause(false)
    setProgression(0)
    motActuelRef.current = 0
  }

  function changerVitesse(v) {
    vitesseRef.current = v
    setVitesse(v)
    if (lecture) {
      // Relancer depuis le début avec la nouvelle vitesse
      arreter()
      setTimeout(() => lire(), 150)
    }
  }

  const VITESSES = [
    { v: 0.75, label: '0.75×' },
    { v: 1,    label: '1×'    },
    { v: 1.25, label: '1.25×' },
    { v: 1.5,  label: '1.5×'  },
    { v: 2,    label: '2×'    },
  ]

  const pret = !!(texte && texte.trim())

  return (
    <div style={{ background: '#EEF2FF', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#003189', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
          🔊
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#003189' }}>Lecture audio du rapport</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>
            {pret
              ? `${motsRef.current.length || texte.trim().split(/\s+/).length} mots — Web Speech API`
              : 'Aucun texte chargé'}
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {erreur && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
          {erreur}
        </div>
      )}

      {/* Barre de progression */}
      <div style={{ background: '#C7D2FE', borderRadius: 4, height: 5, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{
          background: '#003189', height: '100%',
          width: `${progression}%`,
          transition: 'width 0.4s ease',
          borderRadius: 4,
        }} />
      </div>
      {progression > 0 && (
        <div style={{ fontSize: 10, color: '#6B7280', marginTop: -10, marginBottom: 8, textAlign: 'right' }}>
          {progression < 100 ? `${progression}%` : 'Terminé'}
        </div>
      )}

      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>

        {/* Bouton principal */}
        {!lecture ? (
          <button
            onClick={lire}
            disabled={!pret}
            style={{
              background: pret ? '#003189' : '#9ca3af',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontWeight: 600, fontSize: 13,
              cursor: pret ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ▶&nbsp;{progression > 0 && progression < 100 ? 'Recommencer' : 'Écouter le rapport'}
          </button>
        ) : pause ? (
          <button
            onClick={reprendre}
            style={{ background: '#003189', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            ▶&nbsp;Reprendre
          </button>
        ) : (
          <button
            onClick={mettreEnPause}
            style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            ⏸&nbsp;Pause
          </button>
        )}

        {/* Bouton Stop */}
        {(lecture || progression > 0) && (
          <button
            onClick={arreter}
            style={{ background: '#fff', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 14px', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
          >
            ⏹&nbsp;Stop
          </button>
        )}

        {/* Indicateur visuel */}
        {lecture && !pause && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%', background: '#003189',
                animation: `pulseDot 0.9s ease-in-out ${i * 0.18}s infinite alternate`,
              }} />
            ))}
            <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 4 }}>Lecture en cours…</span>
          </div>
        )}
      </div>

      {/* Vitesse + Voix */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>Vitesse :</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {VITESSES.map(({ v, label }) => (
              <button
                key={v}
                onClick={() => changerVitesse(v)}
                style={{
                  padding: '3px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                  fontWeight: vitesse === v ? 700 : 400,
                  background: vitesse === v ? '#003189' : '#fff',
                  color: vitesse === v ? '#fff' : '#374151',
                  border: `1px solid ${vitesse === v ? '#003189' : '#D1D5DB'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {voixDispo.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Voix :</span>
            <select
              value={voix?.name || ''}
              onChange={e => setVoix(voixDispo.find(v => v.name === e.target.value) || null)}
              style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', cursor: 'pointer', maxWidth: 180 }}
            >
              {voixDispo.map(v => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulseDot {
          from { transform: scale(0.7); opacity: 0.4; }
          to   { transform: scale(1.5); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
