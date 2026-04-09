import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const LABELS_TYPE = {
  declaration:  'Déclaration normale de traitement',
  autorisation: "Demande d'autorisation préalable",
  dpo:          'Enregistrement correspondant DPO',
  transfert:    "Demande de transfert de données à l'étranger",
}

const LABELS_CHAMPS = {
  type_declarant:           'Type de déclarant',
  raison_sociale:           'Raison sociale',
  num_cc:                   'N°CC (Carte du Contribuable)',
  domaine_activite:         "Domaine d'activité",
  adresse:                  'Adresse',
  ville:                    'Ville',
  pays:                     'Pays',
  telephone:                'Téléphone',
  email_contact:            'Email de contact',
  contact_nom:              'Personne à contacter',
  rep_nom:                  'Nom du représentant légal',
  rep_prenom:               'Prénom',
  rep_qualite:              'Qualité / Fonction',
  rep_piece_identite:       "Type de pièce d'identité",
  rep_num_piece:            "N° de pièce d'identité",
  rep_nationalite:          'Nationalité',
  rep_email:                'Email du représentant légal',
  rep_telephone:            'Téléphone du représentant',
  service_type:             'Mise en œuvre du traitement',
  service_raison_sociale:   'Raison sociale du prestataire',
  service_adresse:          'Adresse du prestataire',
  service_pays:             'Pays du prestataire',
  finalite:                 'Finalité du traitement',
  fondement_juridique:      'Fondement juridique',
  logiciel_application:     'Logiciel / Application',
  personnes_concernees:     'Personnes concernées',
  technologies:             'Technologies utilisées',
  origine_donnees:          'Origine des données',
  duree_conservation:       'Durée de conservation',
  destinataires:            'Destinataires',
  has_sensibles:            'Données sensibles',
  sensibles_categories:     'Catégories sensibles',
  sensibles_justification:  'Justification',
  sensibles_consentement:   'Consentement obtenu',
  echanges_donnees:         'Échanges de données',
  securite_mesures:         'Mesures de sécurité',
  has_transfert:            'Transfert hors CEDEAO',
  transfert_pays:           'Pays destinataire',
  transfert_organisme:      'Organisme destinataire',
  info_methodes:            "Méthodes d'information",
  service_droit_acces:      "Service droit d'accès",
  email_droit_acces:        "Email droit d'accès",
  signataire_nom:           'Nom du signataire',
  signataire_fonction:      'Fonction du signataire',
  signataire_nationalite:   'Nationalité du signataire',
  email_recepisse:          'Email pour le récépissé',
  dpo_nom:                  'Nom du DPO',
  dpo_email:                'Email du DPO',
  dpo_telephone:            'Téléphone du DPO',
  dpo_qualification:        'Qualification du DPO',
}

// Champs à exclure du tableau (internes)
const CHAMPS_EXCLUS = ['engagement', 'dpo_independance']

function formaterValeur(val) {
  if (!val) return '—'
  if (Array.isArray(val)) return val.join(', ') || '—'
  return String(val)
}

export function genererPDF(dossier, logoUrl = null) {
  const doc  = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const now  = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  const donnees = dossier.donnees || {}

  // ── En-tête ──────────────────────────────────────────────
  doc.setFillColor(0, 132, 61)  // vert ARTCI
  doc.rect(0, 0, 210, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('INFINITY COMPLIANCE', 14, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text("Plateforme de conformité ARTCI — République de Côte d'Ivoire", 14, 19)
  doc.text(`Généré le : ${now}`, 14, 25)

  // Logo entreprise (coin supérieur droit)
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'AUTO', 168, 4, 22, 22)
    } catch(e) { /* logo non disponible, on continue */ }
  }

  // ── Titre formulaire ──────────────────────────────────────
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(LABELS_TYPE[dossier.type_formulaire] || dossier.type_formulaire, 14, 42)

  // ── Référence ─────────────────────────────────────────────
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(14, 46, 182, 14, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  doc.text('Référence dossier', 18, 52)
  doc.setTextColor(17, 17, 17)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(dossier.reference || '—', 18, 58)

  // Statut
  if (dossier.statut) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(136, 136, 136)
    doc.text('Statut', 140, 52)
    doc.setTextColor(0, 132, 61)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(dossier.statut.replace(/_/g, ' ').toUpperCase(), 140, 58)
  }

  // ── Données du formulaire ─────────────────────────────────
  const lignes = []
  Object.entries(donnees).forEach(([k, v]) => {
    if (CHAMPS_EXCLUS.includes(k)) return
    const label  = LABELS_CHAMPS[k] || k.replace(/_/g, ' ')
    const valeur = formaterValeur(v)
    if (valeur !== '—' && valeur !== '') {
      lignes.push([label, valeur])
    }
  })

  if (lignes.length > 0) {
    autoTable(doc, {
      startY: 66,
      head:   [['Champ', 'Valeur']],
      body:   lignes,
      theme:  'grid',
      headStyles: {
        fillColor: [0, 132, 61],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize:  9,
      },
      bodyStyles: {
        fontSize:    8,
        textColor:   [50, 50, 50],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 70, fontStyle:'bold', fillColor:[245,245,245] },
        1: { cellWidth: 112 },
      },
      margin: { left:14, right:14 },
    })
  }

  const finalY = doc.lastAutoTable?.finalY || 66

  // ── Bloc signature ────────────────────────────────────────
  const sigY = finalY + 10

  // Vérifier si assez de place sinon nouvelle page
  if (sigY > 230) { doc.addPage() }
  const startY = sigY > 230 ? 20 : sigY

  doc.setFillColor(245, 245, 245)
  doc.roundedRect(14, startY, 182, dossier.signature_image ? 55 : 35, 2, 2, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 17, 17)
  doc.text('SIGNATURE DU RESPONSABLE', 18, startY + 8)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)

  const nomSignataire = donnees.signataire_nom || donnees.rep_nom || '—'
  const fonctionSig   = donnees.signataire_fonction || donnees.rep_qualite || '—'
  const dateSig       = dossier.signe_le
    ? new Date(dossier.signe_le).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })

  doc.text(`Nom : ${nomSignataire}`, 18, startY + 15)
  doc.text(`Fonction : ${fonctionSig}`, 18, startY + 21)
  doc.text(`Date : ${dateSig}`, 18, startY + 27)

  // Intégrer l'image de signature si disponible
  if (dossier.signature_image) {
    try {
      doc.addImage(dossier.signature_image, 'PNG', 100, startY + 8, 80, 35)
      // Ligne de signature
      doc.setDrawColor(200, 200, 200)
      doc.line(100, startY + 43, 180, startY + 43)
      doc.setFontSize(7)
      doc.setTextColor(136, 136, 136)
      doc.text('Signature manuscrite', 100, startY + 48)
    } catch(e) {
      // Si erreur image, afficher placeholder
      doc.setDrawColor(200, 200, 200)
      doc.rect(100, startY + 8, 80, 30)
      doc.setFontSize(8)
      doc.setTextColor(136, 136, 136)
      doc.text('[Signature]', 130, startY + 25)
    }
  } else {
    // Cadre vide pour signature manuelle
    doc.setDrawColor(180, 180, 180)
    doc.rect(100, startY + 8, 80, 22)
    doc.setFontSize(7)
    doc.setTextColor(180, 180, 180)
    doc.text('Signature', 135, startY + 21)
  }

  // ── Mention légale ────────────────────────────────────────
  const mentionY = startY + (dossier.signature_image ? 62 : 42)
  if (mentionY < 275) {
    doc.setFontSize(7)
    doc.setTextColor(136, 136, 136)
    doc.setFont('helvetica', 'italic')
    const mention = "En signant ce document, le responsable du traitement atteste que toutes les informations fournies sont exactes et s'engage à ce que le traitement soit conforme aux dispositions de la Loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel en République de Côte d'Ivoire."
    const lignesMention = doc.splitTextToSize(mention, 182)
    doc.text(lignesMention, 14, mentionY)
  }

  // ── Pied de page ──────────────────────────────────────────
  const nbPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= nbPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(136, 136, 136)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} / ${nbPages}`, 196, 290, { align:'right' })
    doc.text('Infinity Compliance — www.autoritedeprotection.ci', 14, 290)
    // Ligne séparatrice pied de page
    doc.setDrawColor(220, 220, 220)
    doc.line(14, 286, 196, 286)
  }

  return doc
}

export function telechargerPDF(dossier, logoUrl = null) {
  const doc = genererPDF(dossier, logoUrl)
  doc.save(`${dossier.reference || 'dossier'}_ARTCI.pdf`)
}

export function ouvrirPDFNouvelOnglet(dossier, logoUrl = null) {
  const doc  = genererPDF(dossier, logoUrl)
  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ── Composant boutons ──────────────────────────────────────
export default function ApercuPDF({ dossier }) {
  if (!dossier) return null
  return (
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', margin:'16px 0' }}>
      <button
        className="btn btn-secondary"
        onClick={() => ouvrirPDFNouvelOnglet(dossier)}
        style={{ fontSize:13 }}
      >
        👁 Aperçu PDF
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => telechargerPDF(dossier)}
        style={{ fontSize:13 }}
      >
        ⬇ Télécharger PDF
      </button>
    </div>
  )
}