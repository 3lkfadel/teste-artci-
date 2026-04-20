import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import RapportAudio from './RapportAudio.jsx'

const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

const LABELS_TYPE = {
  declaration:  'Déclaration normale de traitement',
  autorisation: "Demande d'autorisation préalable",
  dpo:          'Enregistrement correspondant DPO',
  transfert:    "Demande de transfert à l'étranger",
}
const LABELS_STATUT = {
  transmis:  'Transmis',
  en_cours:  'En cours d\'instruction',
  complet:   'Récépissé délivré',
  refuse:    'Refusé',
}
const COULEURS_STATUT = {
  transmis:  '#3b82f6',
  en_cours:  '#06b6d4',
  complet:   '#22c55e',
  refuse:    '#ef4444',
}
const LABELS_CHAMPS = {
  type_declarant: 'Type de déclarant', raison_sociale: 'Raison sociale', num_cc: 'N°CC', domaine_activite: "Domaine d'activité",
  adresse: 'Adresse', ville: 'Ville', pays: 'Pays', telephone: 'Téléphone', email_contact: 'Email de contact',
  contact_nom: 'Personne à contacter', rep_nom: 'Nom représentant légal', rep_prenom: 'Prénom', rep_qualite: 'Fonction',
  rep_piece_identite: "Type pièce d'identité", rep_num_piece: "N° pièce d'identité", rep_nationalite: 'Nationalité',
  rep_email: 'Email représentant', rep_telephone: 'Téléphone représentant', service_type: 'Mise en œuvre',
  service_raison_sociale: 'Prestataire', service_adresse: 'Adresse prestataire', service_pays: 'Pays prestataire',
  finalite: 'Finalité du traitement', fondement_juridique: 'Fondement juridique', logiciel_application: 'Logiciel/Application',
  personnes_concernees: 'Personnes concernées', technologies: 'Technologies', origine_donnees: 'Origine des données',
  duree_conservation: 'Durée de conservation', destinataires: 'Destinataires', has_sensibles: 'Données sensibles',
  sensibles_categories: 'Catégories sensibles', securite_mesures: 'Mesures de sécurité', has_transfert: 'Transfert CEDEAO',
  transfert_pays: 'Pays destinataire', transfert_organisme: 'Organisme destinataire',
  signataire_nom: 'Signataire', signataire_fonction: 'Fonction signataire', email_recepisse: 'Email récépissé',
  dpo_nom: 'Nom DPO', dpo_email: 'Email DPO', dpo_telephone: 'Téléphone DPO', dpo_qualification: 'Qualification DPO',
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
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtTaille(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

// Rendu markdown simple
function MarkdownText({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.7, fontSize: 13, color: '#222' }}>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '16px 0 6px', color: '#003189', borderBottom: '1px solid #e0e7ff', paddingBottom: 4 }}>{line.slice(3)}</h3>
        if (line.startsWith('# '))  return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft: 16, marginBottom: 3 }}>• {line.slice(2)}</div>
        if (line.trim() === '') return <div key={i} style={{ height: 8 }} />
        return <div key={i} style={{ marginBottom: 2 }}>{line}</div>
      })}
    </div>
  )
}

async function genererRapportPDF(dossier, rapport, agent) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // En-tête bleu ARTCI
  doc.setFillColor(0, 49, 137)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text('ARTCI — Autorité de Régulation des Télécommunications', 14, 12)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text("Direction de la Protection des Données Personnelles", 14, 19)
  doc.text(`Généré le : ${now}`, 14, 25)

  // Titre rapport
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text("RAPPORT D'ANALYSE DE DOSSIER", 14, 42)

  // Infos dossier
  doc.setFillColor(240, 244, 255)
  doc.roundedRect(14, 46, 182, 20, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(136, 136, 136)
  doc.text('Référence', 18, 52)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17); doc.setFontSize(11)
  doc.text(dossier.reference || '—', 18, 58)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(136, 136, 136)
  doc.text('Type', 90, 52)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 17, 17)
  doc.text(LABELS_TYPE[dossier.type_formulaire] || dossier.type_formulaire, 90, 58)

  // Contenu rapport
  const lignesRapport = doc.splitTextToSize(rapport.contenu_rapport || '', 182)
  let y = 74
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50)

  for (const ligne of lignesRapport) {
    if (y > 265) { doc.addPage(); y = 20 }
    if (ligne.startsWith('## ') || ligne.startsWith('# ')) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 49, 137)
      doc.text(ligne.replace(/^#+\s/, ''), 14, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(50, 50, 50)
      y += 7
    } else {
      doc.text(ligne, 14, y); y += 5
    }
  }

  // Décision
  if (rapport.decision) {
    if (y > 240) { doc.addPage(); y = 20 }
    y += 6
    const couleur = rapport.decision === 'valide' ? [22, 101, 52] : [153, 27, 27]
    doc.setFillColor(...(rapport.decision === 'valide' ? [220, 252, 231] : [254, 226, 226]))
    doc.roundedRect(14, y, 182, 20, 2, 2, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...couleur)
    doc.text(`Décision : ${rapport.decision === 'valide' ? '✅ VALIDÉ' : '❌ REFUSÉ'}`, 18, y + 8)
    if (rapport.note_refus) {
      const noteLines = doc.splitTextToSize(`Motif : ${rapport.note_refus}`, 174)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.text(noteLines, 18, y + 14)
    }
    y += 26
  }

  // Agent signataire
  if (y > 250) { doc.addPage(); y = 20 }
  y += 10
  doc.setFillColor(245, 245, 245); doc.roundedRect(14, y, 182, 22, 2, 2, 'F')
  doc.setFontSize(8); doc.setTextColor(136, 136, 136); doc.setFont('helvetica', 'normal')
  doc.text('Rapport établi par', 18, y + 7)
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 17, 17)
  doc.text(`${agent?.prenom || ''} ${agent?.nom || ''}  —  Service : ${agent?.service || ''}`, 18, y + 14)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(136, 136, 136)
  doc.text(`Décision prise le : ${rapport.decide_le ? fmtDate(rapport.decide_le) : '—'}`, 18, y + 20)

  // Pied de page
  const nb = doc.internal.getNumberOfPages()
  for (let i = 1; i <= nb; i++) {
    doc.setPage(i)
    doc.setFontSize(7); doc.setTextColor(136, 136, 136)
    doc.setDrawColor(220, 220, 220); doc.line(14, 286, 196, 286)
    doc.text(`Page ${i} / ${nb}`, 196, 290, { align: 'right' })
    doc.text('ARTCI — Document confidentiel — Usage officiel uniquement', 14, 290)
  }

  doc.save(`rapport_ARTCI_${dossier.reference}.pdf`)
}

function extraireTexteJSON(obj) {
  // Cherche la valeur string la plus longue dans un objet JSON parsé
  const CHAMPS_PRIORITAIRES = ['response', 'message', 'rapport', 'contenu', 'text', 'content']
  const valeurPrio = CHAMPS_PRIORITAIRES.map(c => obj[c]).find(v => typeof v === 'string' && v.trim().length > 20)
  if (valeurPrio) return valeurPrio
  const plusLongue = Object.values(obj)
    .filter(v => typeof v === 'string')
    .sort((a, b) => b.length - a.length)[0]
  return (plusLongue && plusLongue.length > 20) ? plusLongue : null
}

function nettoyerRapport(texte) {
  if (!texte) return ''
  let brut = texte

  // Cas 1 : JSON encapsulé dans un bloc ```json ... ```
  // On EXTRAIT le contenu au lieu de supprimer le bloc entier
  const blocJson = brut.match(/```json\s*([\s\S]*?)```/)
  if (blocJson) {
    try {
      const parsed = JSON.parse(blocJson[1].trim())
      const valeur = extraireTexteJSON(parsed)
      brut = valeur || blocJson[1]  // fallback : contenu brut du bloc si pas de champ textuel
    } catch {
      brut = blocJson[1]  // le bloc n'est pas du JSON valide : garder le contenu tel quel
    }
  } else {
    // Cas 2 : toute la chaîne est du JSON direct
    try {
      const parsed = JSON.parse(brut)
      const valeur = extraireTexteJSON(parsed)
      if (valeur) brut = valeur
    } catch {}
  }

  // Si brut est vide après extraction, revenir au texte d'origine
  if (!brut.trim()) brut = texte

  // Nettoyer les résidus de formatage (markdown, JSON partiel, etc.)
  return brut
    .replace(/```[\s\S]*?```/g, '')               // blocs code restants
    .replace(/\\n/g, '\n')                          // \n échappés dans du JSON mal parsé
    .replace(/\\t/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6} /g, '')
    .replace(/^\s*[{}[\]]\s*$/gm, '')              // lignes contenant uniquement { } [ ]
    .replace(/"[a-zA-Z_]+"\s*:\s*"(?:[^"\\]|\\.)*",?\s*/g, '')  // "clé": "valeur" JSON résiduels
    .replace(/"[a-zA-Z_]+"\s*:\s*[\w.]+,?\s*/g, '')              // "clé": valeur JSON résiduels
    .replace(/[{}"[\]]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function afficherRapportStructure(texte) {
  if (!texte) return null
  const propre = nettoyerRapport(texte)
  if (!propre) return null

  // Détection souple des 4 sections (insensible à la casse, avec ou sans titre complet)
  const SECTIONS = [
    { re: /^\s*1\.\s+/m, titre: '1. RÉSUMÉ DE LA DEMANDE',  couleur: '#003189', bg: '#E6F1FB' },
    { re: /^\s*2\.\s+/m, titre: '2. POINTS DE CONFORMITÉ',  couleur: '#27500A', bg: '#EAF3DE' },
    { re: /^\s*3\.\s+/m, titre: "3. POINTS D'ATTENTION",    couleur: '#633806', bg: '#FAEEDA' },
    { re: /^\s*4\.\s+/m, titre: '4. RECOMMANDATION FINALE', couleur: '#1a1a1a', bg: '#F1EFE8' },
  ]

  // Trouver la position de chaque section dans le texte
  const lignes = propre.split('\n')
  const positions = SECTIONS.map((s) => {
    let pos = 0
    for (let i = 0; i < lignes.length; i++) {
      if (s.re.test(lignes[i])) {
        return { ...s, debutLigne: pos, finLigne: pos + lignes[i].length }
      }
      pos += lignes[i].length + 1
    }
    return null
  }).filter(Boolean)

  // Aucune section détectée → affichage MarkdownText classique (compatible anciens rapports)
  if (positions.length === 0) return <MarkdownText text={propre} />  // propre = déjà nettoyé

  return (
    <>
      {positions.map((s, i) => {
        const next = positions[i + 1]
        const debut = s.finLigne + 1
        const fin = next ? next.debutLigne : propre.length
        const contenu = propre.substring(debut, fin).trim()
        return (
          <div key={s.titre} style={{ background: s.bg, borderLeft: `3px solid ${s.couleur}`, borderRadius: 6, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: s.couleur, marginBottom: 6 }}>{s.titre}</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#1a1a1a', whiteSpace: 'pre-wrap' }}>{contenu}</div>
          </div>
        )
      })}
    </>
  )
}

export default function ARTCIDossier() {
  const { id }   = useParams()
  const nav      = useNavigate()
  const agent    = (() => { try { return JSON.parse(localStorage.getItem('artci_agent') || '{}') } catch { return {} } })()

  const [dossier, setDossier]       = useState(null)
  const [rapport, setRapport]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [genLoading, setGenLoading] = useState(false)
  const [decLoading, setDecLoading] = useState(false)
  const [err, setErr]               = useState('')
  const [ok, setOk]                 = useState('')

  // Décision refus
  const [showRefusForm, setShowRefusForm] = useState(false)
  const [noteRefus, setNoteRefus]         = useState('')

  useEffect(() => {
    if (!localStorage.getItem('artci_token')) { nav('/artci/login'); return }
    charger()
  }, [id])

  async function charger() {
    setLoading(true)
    try {
      const d = await req(`/artci/dossiers/${id}`)
      setDossier(d)
      if (d.rapport) setRapport(d.rapport)
    } catch (e) {
      setErr(e.message)
    } finally { setLoading(false) }
  }

  async function genererRapport() {
    setGenLoading(true); setErr('')
    try {
      const r = await req(`/artci/dossiers/${id}/generer-rapport`, { method: 'POST' })
      setRapport({ contenu_rapport: r.contenu_rapport, genere_le: r.genere_le, decision: null })
      setOk('Rapport généré avec succès.')
    } catch (e) { setErr(e.message) } finally { setGenLoading(false) }
  }

  async function valider() {
    if (!confirm('Valider ce dossier ? Un email sera envoyé au demandeur.')) return
    setDecLoading(true); setErr('')
    try {
      await req(`/artci/dossiers/${id}/valider`, { method: 'POST' })
      setOk('Dossier validé. Email envoyé au demandeur.')
      setRapport(r => ({ ...r, decision: 'valide', decide_le: new Date().toISOString() }))
      setDossier(d => ({ ...d, statut: 'en_cours' }))
    } catch (e) { setErr(e.message) } finally { setDecLoading(false) }
  }

  async function refuser() {
    if (!noteRefus.trim()) { setErr('Le motif du refus est obligatoire.'); return }
    setDecLoading(true); setErr('')
    try {
      await req(`/artci/dossiers/${id}/refuser`, { method: 'POST', body: JSON.stringify({ note_refus: noteRefus }) })
      setOk('Dossier refusé. Email envoyé au demandeur avec le motif.')
      setRapport(r => ({ ...r, decision: 'refuse', note_refus: noteRefus, decide_le: new Date().toISOString() }))
      setDossier(d => ({ ...d, statut: 'refuse' }))
      setShowRefusForm(false)
    } catch (e) { setErr(e.message) } finally { setDecLoading(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: 14 }}>Chargement du dossier...</div>
    </div>
  )

  if (!dossier) return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ef4444', fontSize: 14 }}>{err || 'Dossier introuvable'}</div>
    </div>
  )

  const statutColor = COULEURS_STATUT[dossier.statut] || '#888'
  const donnees = dossier.donnees || {}

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff' }}>

      {/* Topbar */}
      <div style={{ background: '#003189', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => nav('/artci/dashboard')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            ← Retour
          </button>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{dossier.reference}</div>
            <div style={{ color: '#93b4ff', fontSize: 11 }}>{LABELS_TYPE[dossier.type_formulaire] || dossier.type_formulaire}</div>
          </div>
        </div>
        <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, background: statutColor + '33', color: '#fff', fontWeight: 600, border: `1px solid ${statutColor}` }}>
          {LABELS_STATUT[dossier.statut] || dossier.statut}
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13 }}>{err}</div>}
        {ok  && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', color: '#166534', fontSize: 13 }}>{ok}</div>}

        {/* Section 1 — Informations générales */}
        <Card title="1. Informations générales">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
            <InfoRow label="Référence" value={<span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{dossier.reference}</span>} />
            <InfoRow label="Type" value={LABELS_TYPE[dossier.type_formulaire]} />
            <InfoRow label="Statut" value={<span style={{ color: statutColor, fontWeight: 600 }}>{LABELS_STATUT[dossier.statut]}</span>} />
            <InfoRow label="Date de création" value={fmtDate(dossier.cree_le)} />
            <InfoRow label="Date de signature" value={fmtDate(dossier.signe_le)} />
            <InfoRow label="Email client" value={dossier.utilisateur?.email} />
            {dossier.utilisateur?.entreprise && (
              <>
                <InfoRow label="Entreprise" value={dossier.utilisateur.entreprise.denomination} />
                <InfoRow label="Siège" value={dossier.utilisateur.entreprise.siege} />
              </>
            )}
          </div>
        </Card>

        {/* Section 2 — Données du formulaire */}
        <Card title="2. Données du formulaire">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
            {Object.entries(donnees).map(([k, v]) => {
              if (!v || v === false || v === 'false') return null
              if (Array.isArray(v) && v.length === 0) return null
              if (k === 'engagement' || k === 'dpo_independance') return null
              return (
                <div key={k} style={{ borderBottom: '1px solid #f3f4f6', padding: '6px 0', display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#6b7280', minWidth: 140, flexShrink: 0 }}>{LABELS_CHAMPS[k] || k.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#111', fontWeight: 500 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Section 3 — Signature */}
        {dossier.signature_image && (
          <Card title="3. Signature manuscrite">
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fafafa', display: 'inline-block' }}>
              <img src={dossier.signature_image} alt="Signature" style={{ maxHeight: 100, maxWidth: 360, display: 'block' }} />
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Signature électronique du responsable du traitement</div>
          </Card>
        )}

        {/* Section 4 — Pièces jointes */}
        <Card title={`4. Pièces jointes (${dossier.pieces_jointes?.length || 0})`}>
          {dossier.pieces_jointes?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dossier.pieces_jointes.map(pj => (
                <div key={pj.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 20 }}>{pj.type === 'pdf' ? '📄' : ['jpg','png'].includes(pj.type) ? '🖼' : '📎'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{pj.nom}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{pj.type?.toUpperCase()} · {fmtTaille(pj.taille)}</div>
                  </div>
                  <a href={pj.url} target="_blank" rel="noreferrer"
                    style={{ padding: '5px 14px', background: '#003189', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Voir
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Aucune pièce jointe</div>
          )}
        </Card>

        {/* Section 5 — Rapport IA */}
        <Card title="5. Rapport d'analyse IA">
          {!rapport ? (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Aucun rapport n'a encore été généré pour ce dossier.</p>
              <button
                onClick={genererRapport}
                disabled={genLoading}
                style={{ padding: '10px 20px', background: genLoading ? '#6b7280' : '#003189', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: genLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {genLoading ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                    L'IA analyse la demande et les documents...
                  </>
                ) : '🤖 Générer le rapport IA'}
              </button>
              {genLoading && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Cette opération peut prendre 15 à 30 secondes selon la complexité du dossier.</div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  Généré le {fmtDate(rapport.genere_le)}
                  {rapport.agent && ` · par ${rapport.agent.prenom} ${rapport.agent.nom}`}
                </div>
                <button
                  onClick={() => genererRapportPDF(dossier, rapport, agent)}
                  style={{ padding: '6px 14px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                >
                  📄 Télécharger PDF
                </button>
              </div>

              <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: '16px 20px' }}>
                {afficherRapportStructure(rapport.contenu_rapport)}
              </div>

              <RapportAudio texte={nettoyerRapport(rapport.contenu_rapport)} />

              {/* Décision déjà prise */}
              {rapport.decision && (
                <div style={{ marginTop: 16, padding: '14px 18px', background: rapport.decision === 'valide' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${rapport.decision === 'valide' ? '#86efac' : '#fca5a5'}`, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: rapport.decision === 'valide' ? '#166534' : '#dc2626', marginBottom: rapport.note_refus ? 8 : 0 }}>
                    {rapport.decision === 'valide' ? '✅ Dossier validé' : '❌ Dossier refusé'}
                    {rapport.decide_le && <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 10, color: '#6b7280' }}>{fmtDate(rapport.decide_le)}</span>}
                  </div>
                  {rapport.note_refus && (
                    <div style={{ fontSize: 13, color: '#7f1d1d' }}><strong>Motif :</strong> {rapport.note_refus}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Section 6 — Décision (visible seulement si rapport généré et pas encore de décision) */}
        {rapport && !rapport.decision && (
          <Card title="6. Décision">
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 20 }}>
              Après analyse du rapport, vous pouvez prendre une décision concernant ce dossier.
              Un email sera automatiquement envoyé au demandeur.
            </p>

            {!showRefusForm ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={valider}
                  disabled={decLoading}
                  style={{ padding: '11px 24px', background: '#00843D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  ✅ Valider la demande
                </button>
                <button
                  onClick={() => setShowRefusForm(true)}
                  style={{ padding: '11px 24px', background: '#fff', color: '#dc2626', border: '2px solid #dc2626', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  ❌ Refuser la demande
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#dc2626' }}>
                    Motif du refus <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    value={noteRefus}
                    onChange={e => setNoteRefus(e.target.value)}
                    placeholder="Expliquez précisément la raison du refus. Ce texte sera envoyé au demandeur par email."
                    rows={4}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={refuser}
                    disabled={decLoading || !noteRefus.trim()}
                    style={{ padding: '10px 20px', background: decLoading ? '#6b7280' : '#dc2626', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {decLoading ? 'En cours...' : 'Confirmer le refus'}
                  </button>
                  <button
                    onClick={() => { setShowRefusForm(false); setNoteRefus('') }}
                    style={{ padding: '10px 20px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#003189', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #e0e7ff' }}>{title}</div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}
