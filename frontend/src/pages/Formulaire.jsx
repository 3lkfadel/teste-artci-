import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

// ── Configuration des formulaires ───────────────────────────
const CONFIGS = {
  declaration: {
    titre: 'Déclaration de traitement',
    etapes: [
      {
        label: 'Responsable',
        champs: [
          { id: 'denomination',  label: 'Dénomination sociale',    required: true,  aide: "Nom officiel complet de votre entreprise tel qu'il apparaît dans vos documents légaux.\nEx: SOCIÉTÉ GÉNÉRALE DE CÔTE D'IVOIRE SA" },
          { id: 'rccm',          label: 'Numéro RCCM',             required: true,  aide: "Numéro d'immatriculation au Registre du Commerce et du Crédit Mobilier, obtenu au Tribunal de Commerce.\nFormat: CI-ABJ-2018-B-12345\nOù le trouver: sur votre registre de commerce ou vos statuts." },
          { id: 'representant',  label: 'Représentant légal',      required: true,  aide: "Nom et prénom complets du gérant, directeur général ou président selon la forme juridique. C'est la personne habilitée à signer les actes au nom de l'entreprise." },
          { id: 'siege',         label: 'Siège social',            required: true,  aide: "Adresse complète du siège social telle qu'indiquée dans vos statuts.\nEx: Abidjan Plateau, Immeuble CCIA, Avenue Botreau Roussel, 2ème étage" },
          { id: 'email_droits',  label: 'Email de contact droits', required: true,  type: 'email', aide: "Adresse email où les citoyens enverront leurs demandes d'accès, de rectification ou de suppression.\nEx: droits@votre-entreprise.ci" },
        ],
      },
      {
        label: 'Traitement',
        champs: [
          { id: 'nom_traitement',     label: 'Nom du traitement',      required: true,  placeholder: 'Ex: Gestion de la relation client', aide: "Donnez un nom clair et descriptif.\nEx: Gestion des ressources humaines, Fichier clients, Vidéosurveillance des locaux" },
          { id: 'finalite',           label: 'Finalité du traitement', required: true,  type: 'textarea', placeholder: "Décrivez précisément l'objectif.", aide: "Expliquez POURQUOI vous collectez ces données. Soyez précis.\n❌ Mauvais: améliorer nos services\n✅ Bon: Envoi de newsletters aux clients ayant consenti et gestion des commandes en ligne" },
          { id: 'base_legale',        label: 'Base légale',            required: true,  type: 'select',
            options: [
              { v: '',             l: '-- Choisir --' },
              { v: 'consentement', l: 'Consentement de la personne' },
              { v: 'contrat',      l: "Exécution d'un contrat" },
              { v: 'obligation',   l: 'Obligation légale' },
              { v: 'interet',      l: 'Intérêt légitime' },
              { v: 'mission',      l: "Mission d'intérêt public" },
            ],
            aide: "• Consentement: la personne a accepté explicitement\n• Contrat: nécessaire pour exécuter un contrat (ex: livraison)\n• Obligation légale: la loi vous y oblige (ex: déclaration fiscale)\n• Intérêt légitime: votre intérêt business sans porter atteinte aux droits des personnes"
          },
          { id: 'duree_conservation', label: 'Durée de conservation',  required: true,  placeholder: 'Ex: 3 ans après fin de contrat', aide: "La durée doit être proportionnelle à la finalité.\nEx: données clients → 3 ans après le dernier achat\nEx: données RH → 5 ans après départ du salarié\nEx: vidéosurveillance → 30 jours maximum" },
        ],
      },
      {
        label: 'Données',
        champs: [
          {
            id: 'categories_donnees', label: 'Catégories de données', required: true, type: 'checkboxes',
            aide: "Cochez toutes les catégories que vous collectez réellement.\nAttention: les données sensibles (santé, biométrie, NNI) nécessitent une autorisation préalable ARTCI.",
            options: [
              { v: 'identification',   l: 'Identification (nom, prénom, email)' },
              { v: 'coordonnees',      l: 'Coordonnées (adresse, téléphone)' },
              { v: 'financieres',      l: 'Données financières' },
              { v: 'professionnelles', l: 'Données professionnelles' },
              { v: 'sante',            l: 'Données de santé',             sensible: true },
              { v: 'biometrie',        l: 'Données biométriques',         sensible: true },
              { v: 'nni',              l: "NNI / Numéro d'identité",      sensible: true },
              { v: 'connexion',        l: 'Données de connexion (IP, logs)' },
            ],
          },
          {
            id: 'personnes_concernees', label: 'Personnes concernées', required: true, type: 'checkboxes',
            aide: "Qui sont les personnes dont vous traitez les données ?",
            options: [
              { v: 'clients',      l: 'Clients / Prospects' },
              { v: 'employes',     l: 'Employés / Salariés' },
              { v: 'fournisseurs', l: 'Fournisseurs' },
              { v: 'visiteurs',    l: 'Visiteurs web' },
              { v: 'mineurs',      l: 'Mineurs',            sensible: true },
              { v: 'candidats',    l: 'Candidats / Stagiaires' },
            ],
          },
        ],
      },
      {
        label: 'Sécurité',
        champs: [
          {
            id: 'mesures_securite', label: 'Mesures de sécurité', type: 'checkboxes',
            aide: "Cochez toutes les mesures de sécurité mises en place pour protéger les données.",
            options: [
              { v: 'chiffrement',    l: 'Chiffrement des données' },
              { v: 'controle_acces', l: "Contrôle d'accès" },
              { v: 'sauvegardes',    l: 'Sauvegardes régulières' },
              { v: 'parefeu',        l: 'Pare-feu / Antivirus' },
              { v: 'mdp',            l: 'Politique de mot de passe' },
              { v: 'journalisation', l: 'Journalisation des accès' },
            ],
          },
          { id: 'sous_traitants', label: 'Sous-traitants (optionnel)', type: 'textarea', placeholder: 'Ex: OVH (hébergement France), Salesforce (CRM USA)', aide: "Listez les prestataires externes qui accèdent à vos données.\nPour chacun: nom, pays, type de service.\nSi un sous-traitant est hors CI → déclarez aussi un transfert international." },
        ],
      },
    ],
  },
  autorisation: {
    titre: "Demande d'autorisation préalable",
    etapes: [
      {
        label: 'Responsable',
        champs: [
          { id: 'denomination', label: 'Dénomination sociale', required: true, aide: "Nom officiel de votre entreprise tel qu'il figure au RCCM." },
          { id: 'rccm',         label: 'Numéro RCCM',          required: true, aide: "Format: CI-ABJ-AAAA-X-NNNNN. Disponible sur votre registre de commerce." },
          { id: 'siege',        label: 'Siège social',         required: true, aide: "Adresse complète du siège social." },
          { id: 'representant', label: 'Représentant légal',   required: true, aide: "Nom et prénom du gérant ou directeur général." },
        ],
      },
      {
        label: 'Traitement sensible',
        champs: [
          { id: 'nom_traitement', label: 'Nom du traitement',         required: true, aide: "Nom descriptif du traitement de données sensibles." },
          { id: 'type_sensible',  label: 'Type de données sensibles', required: true, type: 'select',
            options: [
              { v: '',           l: '-- Choisir --' },
              { v: 'biometrie',  l: 'Données biométriques' },
              { v: 'sante',      l: 'Données de santé' },
              { v: 'nni',        l: "NNI / Numéro d'identité nationale" },
              { v: 'video',      l: 'Vidéosurveillance' },
              { v: 'judiciaire', l: 'Données judiciaires' },
            ],
            aide: "Ces données sont dites sensibles car elles présentent des risques élevés. Elles nécessitent une autorisation préalable ARTCI avant tout traitement."
          },
          { id: 'finalite',      label: 'Finalité',                   required: true, type: 'textarea', aide: "Expliquez précisément pourquoi vous avez besoin de traiter ces données sensibles." },
          { id: 'justification', label: 'Justification de la nécessité', required: true, type: 'textarea', placeholder: 'Pourquoi ce traitement sensible est-il nécessaire ?', aide: "L'ARTCI exige une justification solide. Expliquez en quoi ce traitement est indispensable et quelles alternatives moins intrusives ont été envisagées." },
        ],
      },
    ],
  },
  dpo: {
    titre: 'Enregistrement correspondant DPO',
    etapes: [
      {
        label: 'Entreprise',
        champs: [
          { id: 'denomination', label: 'Dénomination sociale', required: true, aide: "Nom officiel de votre entreprise." },
          { id: 'rccm',         label: 'RCCM',                 required: true, aide: "Numéro d'immatriculation au Registre du Commerce." },
          { id: 'siege',        label: 'Siège social',         required: true, aide: "Adresse complète du siège social." },
        ],
      },
      {
        label: 'Correspondant',
        champs: [
          { id: 'nom_dpo',       label: 'Nom et prénom du DPO',       required: true, aide: "Le DPO doit être indépendant du responsable de traitement. Il ne peut pas être le dirigeant de l'entreprise." },
          { id: 'email_dpo',     label: 'Email du DPO',               required: true, type: 'email', aide: "Email professionnel du DPO. L'ARTCI l'utilisera pour le contacter directement." },
          { id: 'tel_dpo',       label: 'Téléphone du DPO',           required: true, aide: "Numéro professionnel joignable en cas de contrôle ARTCI." },
          { id: 'qualification', label: 'Qualification / Expérience', type: 'textarea', placeholder: 'Formation, certification, expérience...', aide: "Décrivez les qualifications du DPO: formation juridique ou informatique, certifications (CIPP, CIPM...), expérience en protection des données." },
        ],
      },
    ],
  },
  transfert: {
    titre: 'Transfert international de données',
    etapes: [
      {
        label: 'Entreprise',
        champs: [
          { id: 'denomination', label: 'Dénomination sociale', required: true, aide: "Nom officiel de votre entreprise tel qu'au RCCM." },
          { id: 'rccm',         label: 'RCCM',                 required: true, aide: "Numéro RCCM de votre entreprise." },
        ],
      },
      {
        label: 'Transfert',
        champs: [
          { id: 'pays_destinataire',  label: 'Pays destinataire',           required: true, aide: "Pays vers lequel les données sont transférées.\nEx: France, Sénégal, USA. Certains pays offrent moins de garanties de protection." },
          { id: 'destinataire',       label: 'Destinataire (nom, adresse)', required: true, type: 'textarea', aide: "Nom complet et adresse de l'entité qui recevra les données.\nEx: OVH SAS, 2 rue Kellermann, 59100 Roubaix, France" },
          { id: 'finalite_transfert', label: 'Finalité du transfert',       required: true, type: 'textarea', aide: "Pourquoi envoyez-vous ces données à l'étranger ?\nEx: hébergement sur serveurs européens, CRM américain, collaboration avec filiale étrangère." },
          { id: 'garanties',          label: 'Garanties apportées',         type: 'textarea', placeholder: 'Clauses contractuelles, certification...', aide: "Quelles garanties assurent la protection des données une fois transférées ?\nEx: clauses contractuelles types, certification ISO 27001, accord de sous-traitance conforme." },
        ],
      },
    ],
  },
}

// ── Hook debounce ────────────────────────────────────────────
function useDebounce(delay = 1200) {
  const timers = useRef({})
  return (id, fn) => {
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(fn, delay)
  }
}

// ── Formatage des messages IA ─────────────────────────────────
function FormattedMessage({ text }) {
  const clean = text.replace(/\\n/g, '\n').replace(/\\t/g, ' ').trim()
  const lines = clean.split('\n')

  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        const l = line.trim()

        if (l === '')
          return <div key={i} style={{ height: 4 }} />

        if (l === '---')
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid #ddd', margin: '6px 0' }} />

        if (l.startsWith('### '))
          return (
            <div key={i} style={{ fontWeight: 600, fontSize: 13, marginTop: 8, marginBottom: 2 }}>
              {l.replace(/^###\s*/, '').replace(/\*\*/g, '')}
            </div>
          )

        if (l.startsWith('## '))
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>
              {l.replace(/^##\s*/, '').replace(/\*\*/g, '')}
            </div>
          )

        if (l.startsWith('# '))
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 6 }}>
              {l.replace(/^#\s*/, '').replace(/\*\*/g, '')}
            </div>
          )

        if (l.startsWith('- ') || l.startsWith('• ') || l.startsWith('* ')) {
          const content = l.replace(/^[-•*]\s*/, '')
          return (
            <div key={i} style={{ paddingLeft: 12, marginBottom: 3, display: 'flex', gap: 6 }}>
              <span style={{ flexShrink: 0 }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          )
        }

        return (
          <div key={i} style={{ marginBottom: 3 }}
            dangerouslySetInnerHTML={{ __html: l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        )
      })}
    </div>
  )
}

// ── Composant Chat Assistant ─────────────────────────────────
function ChatAssistant({ config, etape, donnees, visible, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Bonjour ! Je suis votre assistant DPO.\n\nJe connais votre formulaire "${config.titre}" et l'étape actuelle : **${config.etapes[etape]?.label}**.\n\nJe peux vous aider sur :\n- Un champ spécifique\n- Tout le formulaire\n- La réglementation ARTCI\n\nQuelle est votre question ?`
    }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef    = useRef(null)
  const inputRef  = useRef(null)
  const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (visible) inputRef.current?.focus()
  }, [visible])

  function buildContexte() {
    const etapeCourante = config.etapes[etape]
    const champsActuels = etapeCourante?.champs.map(c => ({
      id:     c.id,
      label:  c.label,
      aide:   c.aide,
      valeur: donnees[c.id] || '(vide)',
    }))
    return JSON.stringify({
      formulaire:     config.titre,
      etape_actuelle: etapeCourante?.label,
      champs:         champsActuels,
      donnees_saisies: donnees,
    })
  }

  async function envoyer(e) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/ia/valider-champ`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ champ: 'chat', valeur: question, contexte: buildContexte(), mode: 'chat' }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', text: data.message || 'Je ne peux pas répondre pour le moment.' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Erreur de connexion.' }])
    } finally {
      setLoading(false)
    }
  }

  function questionRapide(q) {
    setInput(q)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      width: 380, height: 540,
      background: '#fff', border: '1px solid #ddd', borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', borderRadius: '12px 12px 0 0' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Assistant DPO</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>Spécialisé loi n°2013-450 CI</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: m.role === 'user' ? '#111' : '#f5f5f5',
              color: m.role === 'user' ? '#fff' : '#111',
            }}>
              {m.role === 'user'
                ? m.text
                : <FormattedMessage text={m.text} />
              }
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#888' }}>
              Analyse en cours...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Questions rapides */}
      <div style={{ padding: '6px 10px', borderTop: '1px solid #eee', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {["C'est quoi le RCCM ?", "Aide finalité", "Quelle base légale ?", "Tout expliquer"].map(q => (
          <button key={q} onClick={() => questionRapide(q)} style={{
            padding: '3px 8px', fontSize: 11, border: '1px solid #ddd',
            borderRadius: 20, background: '#fff', cursor: 'pointer', color: '#555',
          }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={envoyer} style={{ padding: '8px 12px', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Posez votre question..."
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none' }}
          disabled={loading}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{
          padding: '8px 14px', background: '#111', color: '#fff',
          border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
        }}>
          →
        </button>
      </form>
    </div>
  )
}

// ── Page Formulaire ──────────────────────────────────────────
export default function Formulaire() {
  const { type, id } = useParams()
  const nav           = useNavigate()
  const config        = CONFIGS[type] || CONFIGS.declaration

  const [etape, setEtape]             = useState(0)
  const [donnees, setDonnees]         = useState({})
  const [feedbacks, setFeedbacks]     = useState({})
  const [analyzing, setAnalyzing]     = useState({})
  const [blockSensible, setBlockSensible] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [err, setErr]                 = useState('')
  const [chatVisible, setChatVisible] = useState(false)
  const debounce = useDebounce()

  useEffect(() => {
    api.getEntreprise().then(e => { if (e) setDonnees(d => ({ ...e, ...d })) }).catch(() => {})
    if (id) api.getDossier(id).then(d => { if (d.donnees) setDonnees(prev => ({ ...prev, ...d.donnees })) }).catch(() => {})
  }, [id])

  const setFb = (k, v) => setFeedbacks(f => ({ ...f, [k]: v }))
  const setAn = (k, v) => setAnalyzing(a => ({ ...a, [k]: v }))

  function onTextChange(chamId, valeur) {
    setDonnees(d => ({ ...d, [chamId]: valeur }))
    if (valeur.length < 3) { setFb(chamId, null); return }
    setAn(chamId, true)
    debounce(chamId, async () => {
      try {
        const r = await api.validerChamp({ champ: chamId, valeur, contexte: JSON.stringify(donnees).slice(0, 300) })
        setFb(chamId, r)
      } catch {
        setFb(chamId, { type: 'info', message: 'IA indisponible.' })
      } finally {
        setAn(chamId, false)
      }
    })
  }

  function onCheckChange(chamId, val, checked) {
    setDonnees(d => {
      const prev = Array.isArray(d[chamId]) ? d[chamId] : []
      const next = checked ? [...prev, val] : prev.filter(v => v !== val)
      return { ...d, [chamId]: next }
    })
    const SENSIBLES = ['sante', 'biometrie', 'nni']
    if (SENSIBLES.includes(val) && checked && type === 'declaration') setBlockSensible(true)
    else if (SENSIBLES.includes(val) && !checked) {
      const reste = SENSIBLES.filter(s => s !== val && (donnees[chamId] || []).includes(s))
      if (reste.length === 0) setBlockSensible(false)
    }
  }

  async function suivant() {
    setErr('')
    if (blockSensible) { setErr("Données sensibles détectées — soumettez une demande d'autorisation préalable."); return }
    setLoading(true)
    try {
      if (id) await api.majDossier(id, { donnees })
      if (etape < config.etapes.length - 1) {
        setEtape(e => e + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        await api.majDossier(id, { donnees, statut: 'en_attente_signature' })
        nav(`/signature/${id}`)
      }
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  function renderChamp(c) {
    const val = donnees[c.id] || ''
    const fb  = feedbacks[c.id]
    const an  = analyzing[c.id]

    if (c.type === 'checkboxes') {
      const selected = Array.isArray(donnees[c.id]) ? donnees[c.id] : []
      return (
        <div className="field" key={c.id}>
          <label>{c.label} {c.required && <span className="required">*</span>}</label>
          {c.aide && <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{c.aide}</div>}
          <div className="check-grid">
            {c.options.map(o => {
              const checked = selected.includes(o.v)
              return (
                <label key={o.v} className={`check-item ${checked ? 'checked' : ''} ${o.sensible && checked ? 'danger' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={e => onCheckChange(c.id, o.v, e.target.checked)} />
                  <span className="check-label">{o.l}</span>
                  {o.sensible && <span className="check-badge">SENSIBLE</span>}
                </label>
              )
            })}
          </div>
          {blockSensible && c.id === 'categories_donnees' && (
            <div className="alert alert-err" style={{ marginTop: 10 }}>
              <strong>Autorisation préalable requise.</strong> Ces données nécessitent une demande d'autorisation ARTCI, pas une simple déclaration.{' '}
              <button className="btn-link" onClick={() => nav('/dashboard')}>Créer une demande d'autorisation →</button>
            </div>
          )}
        </div>
      )
    }

    if (c.type === 'select') return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{c.aide}</div>}
        <select value={val} onChange={e => onTextChange(c.id, e.target.value)}>
          {c.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        {fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )

    if (c.type === 'textarea') return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{c.aide}</div>}
        <textarea value={val} onChange={e => onTextChange(c.id, e.target.value)} placeholder={c.placeholder || ''} />
        {an && <div className="fb show loading">Analyse IA en cours...</div>}
        {!an && fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )

    return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{c.aide}</div>}
        <input type={c.type || 'text'} value={val} onChange={e => onTextChange(c.id, e.target.value)} placeholder={c.placeholder || ''} />
        {an && <div className="fb show loading">Analyse IA en cours...</div>}
        {!an && fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )
  }

  const etapeCourante = config.etapes[etape]
  const estDerniere   = etape === config.etapes.length - 1

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          <span className="nav-link" onClick={() => nav('/dashboard')}>← Tableau de bord</span>
        </div>
      </nav>

      <div className="page">
        <h1>{config.titre}</h1>
        <p className="subtitle">L'assistant IA valide vos saisies en temps réel.</p>

        <div className="steps">
          {config.etapes.map((e, i) => (
            <>
              {i > 0 && <div key={`line-${i}`} className={`step-line ${i <= etape ? 'done' : ''}`} />}
              <div key={i} className={`step ${i === etape ? 'active' : i < etape ? 'done' : ''}`}>
                <div className="step-num">{i < etape ? '✓' : i + 1}</div>
                <div className="step-label">{e.label}</div>
              </div>
            </>
          ))}
        </div>

        {err && <div className="alert alert-err">{err}</div>}
        <h2>{etapeCourante.label}</h2>
        {etapeCourante.champs.map(c => renderChamp(c))}

        <div className="wizard-nav">
          <button className="btn btn-secondary" onClick={() => etape > 0 ? setEtape(e => e - 1) : nav('/dashboard')} disabled={loading}>
            {etape === 0 ? '← Annuler' : '← Retour'}
          </button>
          <button className="btn btn-primary" onClick={suivant} disabled={loading}>
            {loading ? 'Sauvegarde...' : estDerniere ? 'Passer à la signature →' : 'Suivant →'}
          </button>
        </div>
      </div>

      {/* Bouton chat flottant */}
      {!chatVisible && (
        <button onClick={() => setChatVisible(true)} style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#111', color: '#fff',
          border: 'none', borderRadius: 50, padding: '12px 20px',
          cursor: 'pointer', fontSize: 14, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 999,
        }}>
          💬 Aide DPO
        </button>
      )}

      <ChatAssistant
        config={config}
        etape={etape}
        donnees={donnees}
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
      />
    </>
  )
}