import { useEffect, useRef } from 'react'
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
  service_droit_acces:      'Service droit d\'accès',
  email_droit_acces:        'Email droit d\'accès',
  signataire_nom:           'Nom du signataire',
  signataire_fonction:      'Fonction du signataire',
  signataire_nationalite:   'Nationalité du signataire',
  email_recepisse:          'Email pour le récépissé',
  dpo_nom:                  'Nom du DPO',
  dpo_email:                'Email du DPO',
  dpo_telephone:            'Téléphone du DPO',
  dpo_qualification:        'Qualification du DPO',
}

function formaterValeur(val) {
  if (!val) return '—'
  if (Array.isArray(val)) return val.join(', ') || '—'
  return String(val)
}

export function genererPDF(dossier) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now  = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

  // ── En-tête ─────────────────────────────────────────────
  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('INFINITY COMPLIANCE', 14, 11)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Plateforme de conformité ARTCI — Côte d\'Ivoire', 14, 17)
  doc.text(`Généré le : ${now}`, 14, 23)

  // ── Titre formulaire ────────────────────────────────────
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(LABELS_TYPE[dossier.type_formulaire] || dossier.type_formulaire, 14, 38)

  // ── Référence ───────────────────────────────────────────
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(14, 42, 182, 14, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(136, 136, 136)
  doc.text('Référence dossier', 18, 48)
  doc.setTextColor(17, 17, 17)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(dossier.reference || '—', 18, 54)

  // ── Données du formulaire ────────────────────────────────
  const donnees = dossier.donnees || {}
  const lignes  = []

  Object.entries(donnees).forEach(([k, v]) => {
    const label  = LABELS_CHAMPS[k] || k.replace(/_/g, ' ')
    const valeur = formaterValeur(v)
    if (valeur !== '—' && valeur !== '') {
      lignes.push([label, valeur])
    }
  })

  if (lignes.length > 0) {
    autoTable(doc, {
      startY:    62,
      head:      [['Champ', 'Valeur']],
      body:      lignes,
      theme:     'grid',
      headStyles: {
        fillColor:  [17, 17, 17],
        textColor:  [255, 255, 255],
        fontStyle:  'bold',
        fontSize:   9,
      },
      bodyStyles: {
        fontSize:   8,
        textColor:  [50, 50, 50],
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold', fillColor: [245, 245, 245] },
        1: { cellWidth: 112 },
      },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Mention légale ──────────────────────────────────────
  const finalY = doc.lastAutoTable?.finalY || 62
  if (finalY < 250) {
    doc.setFontSize(7)
    doc.setTextColor(136, 136, 136)
    doc.setFont('helvetica', 'italic')
    const mention = "En signant ce document, le responsable du traitement atteste que toutes les informations fournies sont exactes et s'engage à ce que le traitement soit conforme aux dispositions de la Loi n°2013-450 du 19 juin 2013."
    const lignesMention = doc.splitTextToSize(mention, 182)
    doc.text(lignesMention, 14, finalY + 10)
  }

  // ── Pied de page ────────────────────────────────────────
  const nbPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= nbPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(136, 136, 136)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} / ${nbPages}`, 196, 290, { align: 'right' })
    doc.text('Infinity Compliance — www.autoritedeprotection.ci', 14, 290)
  }

  return doc
}

export function telechargerPDF(dossier) {
  const doc = genererPDF(dossier)
  doc.save(`${dossier.reference || 'dossier'}_ARTCI.pdf`)
}

export function ouvrirPDFNouvelOnglet(dossier) {
  const doc = genererPDF(dossier)
  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ── Composant boutons ────────────────────────────────────
export default function ApercuPDF({ dossier }) {
  if (!dossier) return null

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
      <button
        className="btn btn-secondary"
        onClick={() => ouvrirPDFNouvelOnglet(dossier)}
        style={{ fontSize: 13 }}
      >
        👁 Aperçu PDF
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => telechargerPDF(dossier)}
        style={{ fontSize: 13 }}
      >
        ⬇ Télécharger PDF
      </button>
    </div>
  )
}