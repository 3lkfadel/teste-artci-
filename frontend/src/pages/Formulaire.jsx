import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

// ════════════════════════════════════════════════════════════
// BIBLIOTHÈQUE DE SECTIONS RÉUTILISABLES
// ════════════════════════════════════════════════════════════

const S = {
  declarant: {
    label: 'Le déclarant',
    champs: [
      { id: 'type_declarant', label: 'Type de déclarant', required: true, type: 'select',
        options: [{v:'morale',l:'Personne Morale (entreprise, ONG...)'},{v:'physique',l:'Personne Physique'}],
        aide: "Choisissez 'Personne Morale' si vous déclarez au nom d'une entreprise." },
      { id: 'raison_sociale', label: 'Raison sociale / Nom et prénoms', required: true,
        aide: "Nom officiel de l'entreprise tel qu'au RCCM." },
      { id: 'num_cc', label: 'N°CC (Numéro Carte du Contribuable)', required: true, placeholder: 'Ex: 1234567 A',
        aide: "Votre numéro fiscal ivoirien délivré par la DGI.\n⚠️ Ce n'est PAS le RCCM." },
      { id: 'domaine_activite', label: "Domaine d'activité", required: true, placeholder: 'Ex: Commerce, Banque, Santé...' },
      { id: 'adresse', label: 'Adresse', required: true },
      { id: 'ville', label: 'Ville', required: true },
      { id: 'pays', label: 'Pays', required: true, placeholder: "Côte d'Ivoire" },
      { id: 'telephone', label: 'Téléphone', required: true, placeholder: '+225 27 XX XX XX XX' },
      { id: 'email_contact', label: 'Email de contact', required: true, type: 'email' },
      { id: 'contact_nom', label: 'Personne à contacter (pour le récépissé)', required: true },
    ],
  },
  representant_legal: {
    label: 'Représentant légal',
    champs: [
      { id: 'rep_nom',           label: 'Nom du représentant légal',   required: true },
      { id: 'rep_prenom',        label: 'Prénom',                       required: true },
      { id: 'rep_qualite',       label: 'Qualité / Fonction',           required: true, placeholder: 'Ex: Directeur Général' },
      { id: 'rep_piece_identite',label: "Type de pièce d'identité",     required: true, type: 'select',
        options: [{v:'cni',l:"CNI"},{v:'passeport',l:'Passeport'},{v:'autre',l:'Autre'}] },
      { id: 'rep_num_piece',     label: "N° de la pièce d'identité",   required: true },
      { id: 'rep_nationalite',   label: 'Nationalité',                  required: true, placeholder: 'Ivoirienne',
        aide: "⚠️ OBLIGATOIRE : Le signataire doit être de nationalité ivoirienne." },
      { id: 'rep_email',         label: 'Email du représentant légal',  required: true, type: 'email' },
      { id: 'rep_telephone',     label: 'Téléphone',                    required: true },
    ],
  },
  service_mise_en_oeuvre: {
    label: 'Service chargé de la mise en œuvre',
    champs: [
      { id: 'service_type', label: 'Qui met en œuvre le traitement ?', required: true, type: 'select',
        options: [{v:'declarant',l:'Le déclarant lui-même'},{v:'sous_traitant',l:'Un prestataire / Sous-traitant'}] },
      { id: 'service_raison_sociale', label: 'Raison sociale du prestataire', placeholder: 'Laisser vide si déclarant lui-même' },
      { id: 'service_adresse',        label: 'Adresse du prestataire' },
      { id: 'service_pays',           label: 'Pays du prestataire' },
    ],
  },
  finalite: {
    label: 'Finalité du traitement',
    champs: [
      { id: 'finalite', label: 'Finalité ou objectif du traitement', required: true, type: 'textarea',
        placeholder: 'Ex: Gestion des ressources humaines...',
        aide: "Soyez précis.\n❌ Trop vague : améliorer nos services\n✅ Correct : Gestion des contrats clients et envoi de factures" },
      { id: 'personnes_concernees', label: 'Personnes concernées', required: true, type: 'checkboxes',
        options: [{v:'salaries',l:'Salariés'},{v:'usagers',l:'Usagers'},{v:'adherents',l:'Adhérents'},{v:'clients',l:'Clients'},{v:'visiteurs',l:'Visiteurs'},{v:'patients',l:'Patients'},{v:'etudiants',l:'Étudiants/Élèves'},{v:'autres',l:'Autres'}] },
      { id: 'technologies', label: 'Technologies particulières (optionnel)', type: 'checkboxes',
        options: [{v:'rfid',l:'RFID/NFC'},{v:'carte_puce',l:'Carte à puce'},{v:'video',l:'Vidéo-protection'},{v:'geo',l:'Géo-localisation'},{v:'nano',l:'Nanotechnologie'},{v:'anonymisation',l:"Mécanisme d'anonymisation"}] },
    ],
  },
  finalite_autorisation: {
    label: 'Finalité et fondement juridique',
    champs: [
      { id: 'finalite',           label: 'Finalité ou objectif',         required: true,  type: 'textarea' },
      { id: 'fondement_juridique',label: 'Fondement juridique',          required: true,  type: 'textarea',
        placeholder: 'Ex: Art. 7 de la Loi n°2013-450...' },
      { id: 'logiciel_application',label: 'Logiciel / Application',      type: 'textarea' },
      { id: 'personnes_concernees',label: 'Personnes concernées',        required: true,  type: 'checkboxes',
        options: [{v:'salaries',l:'Salariés'},{v:'usagers',l:'Usagers'},{v:'clients',l:'Clients'},{v:'patients',l:'Patients'},{v:'etudiants',l:'Étudiants/Élèves'},{v:'autres',l:'Autres'}] },
    ],
  },
  categories_donnees: {
    label: 'Catégories de données traitées',
    champs: [
      { id: 'cat_etat_civil', label: "État civil, Identité", type: 'checkboxes',
        options: [{v:'nom_prenom',l:'Nom et prénom'},{v:'adresse',l:'Adresse'},{v:'date_naissance',l:'Date de naissance'},{v:'num_tel',l:'N° de téléphone',sensible:true},{v:'email',l:'Email'},{v:'num_cni',l:'N° CNI / NNI',sensible:true},{v:'photo',l:'Photo'}] },
      { id: 'cat_vie_pro', label: 'Vie professionnelle', type: 'checkboxes',
        options: [{v:'cv',l:'CV / Parcours'},{v:'formation',l:'Formation'},{v:'experience',l:'Expérience'}] },
      { id: 'cat_financier', label: 'Données financières', type: 'checkboxes',
        options: [{v:'revenus',l:'Revenus'},{v:'info_bancaires',l:'Informations bancaires'},{v:'dettes',l:'Dettes'}] },
      { id: 'cat_connexion', label: 'Données de connexion', type: 'checkboxes',
        options: [{v:'ip_logs',l:'Adresse IP et logs'},{v:'horodatage',l:'Horodatage'}] },
      { id: 'origine_donnees', label: 'Origine des données', required: true, type: 'select',
        options: [{v:'directe',l:'Directement auprès de la personne concernée'},{v:'indirecte',l:'De manière indirecte'}] },
      { id: 'duree_conservation', label: 'Durée de conservation', required: true, type: 'select',
        options: [{v:'1mois',l:'1 mois'},{v:'3mois',l:'3 mois'},{v:'1an',l:'1 an'},{v:'duree_relation',l:'Durée de la relation contractuelle'},{v:'autre',l:'Autre'}] },
      { id: 'destinataires', label: 'Destinataires des données', required: true, type: 'textarea',
        placeholder: 'Ex: Direction RH, Service comptabilité...' },
    ],
  },
  donnees_sensibles: {
    label: 'Données sensibles',
    champs: [
      { id: 'has_sensibles', label: 'Votre traitement inclut-il des données sensibles ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'oui',l:'Oui'}],
        aide: "Données sensibles = opinions religieuses/politiques, santé, vie sexuelle, sanctions pénales.\n⚠️ Leur traitement est en principe INTERDIT sauf nécessité absolue." },
      { id: 'sensibles_categories', label: 'Si oui : catégories concernées', type: 'checkboxes',
        options: [{v:'num_securite',l:'N° de sécurité sociale'},{v:'infractions',l:'Infractions / Condamnations'},{v:'opinions',l:'Opinions politiques / religieuses'},{v:'syndicale',l:'Appartenance syndicale'},{v:'sante',l:'Données de santé'},{v:'vie_sexuelle',l:'Vie sexuelle'},{v:'origine_raciale',l:'Origine raciale'}] },
      { id: 'sensibles_justification', label: 'Justification', type: 'textarea' },
    ],
  },
  donnees_sensibles_auto: {
    label: 'Données sensibles',
    champs: [
      { id: 'sensibles_biometrie', label: 'Données biométriques', type: 'checkboxes',
        options: [{v:'contour_main',l:'Contour de la main'},{v:'empreintes',l:'Empreintes digitales'},{v:'iris',l:"Iris"},{v:'reconnaissance_faciale',l:'Reconnaissance faciale'},{v:'adn',l:'ADN'}] },
      { id: 'sensibles_sante', label: 'Données de santé', type: 'checkboxes',
        options: [{v:'pathologie',l:'Pathologie'},{v:'antecedents',l:'Antécédents familiaux'},{v:'risques',l:'Données de risques'}] },
      { id: 'sensibles_consentement', label: 'Consentement exprès obtenu ?', required: true, type: 'select',
        options: [{v:'oui',l:'Oui'},{v:'non',l:'Non — justification requise'}] },
      { id: 'sensibles_duree', label: 'Durée de conservation', required: true, type: 'select',
        options: [{v:'jours',l:'Quelques jours'},{v:'mois',l:'Quelques mois'},{v:'1an',l:'1 an'},{v:'plus',l:'Plusieurs années'}] },
      { id: 'sensibles_destinataires', label: 'Destinataires', required: true, type: 'textarea' },
    ],
  },
  echanges_interconnexions: {
    label: 'Échanges de données',
    champs: [
      { id: 'echanges_donnees', label: 'Procédez-vous à des échanges de données ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'interne',l:"Oui, au sein de l'organisme"},{v:'externe',l:'Oui, avec des organismes extérieurs'}],
        aide: "⚠️ Échanges avec organismes EXTÉRIEURS → procédure d'AUTORISATION obligatoire." },
    ],
  },
  interconnexions: {
    label: 'Interconnexions',
    champs: [
      { id: 'has_interconnexion', label: 'Procédez-vous à des interconnexions de fichiers ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'oui',l:'Oui'}] },
      { id: 'interconnexion_detail', label: 'Si oui : fichiers interconnectés', type: 'textarea' },
    ],
  },
  securite: {
    label: 'Sécurité / Confidentialité',
    champs: [
      { id: 'securite_mesures', label: 'Mesures de sécurité mises en œuvre', required: true, type: 'checkboxes',
        options: [
          {v:'acces_physique',   l:'Accès physique protégé'},
          {v:'authentification', l:"Authentification des utilisateurs"},
          {v:'journalisation',   l:'Journalisation des connexions'},
          {v:'reseau_interne',   l:'Réseau interne dédié'},
          {v:'chiffrement',      l:'Données ou canal chiffrés'},
        ] },
    ],
  },
  securite_architecture: {
    label: 'Sécurité et architecture informatique',
    champs: [
      { id: 'os',                    label: "Système(s) d'exploitation", required: true },
      { id: 'systeme_info',          label: 'Constitution du système',    required: true, type: 'checkboxes',
        options: [{v:'micro_ordi',l:'Micro-ordinateurs'},{v:'serveur',l:'Serveur(s)'},{v:'autre_si',l:'Autre'}] },
      { id: 'reseau',                label: 'Nature du réseau',           required: true, type: 'checkboxes',
        options: [{v:'aucun',l:'Aucun'},{v:'meme_site',l:'Même site'},{v:'distants',l:'Réseaux distants'},{v:'internet',l:'Internet'},{v:'wifi',l:'WiFi'}] },
      { id: 'securite_physique',     label: 'Sécurité physique',          required: true, type: 'textarea' },
      { id: 'sauvegarde',            label: 'Sauvegarde des données',     required: true, type: 'textarea' },
      { id: 'protection_intrusions', label: 'Protection intrusions',      required: true, type: 'checkboxes',
        options: [{v:'antivirus',l:'Antivirus'},{v:'ids',l:'IDS'},{v:'firewall',l:'Firewall'},{v:'vlan',l:'VLAN'}] },
      { id: 'authentification_users',label: 'Authentification',           required: true, type: 'checkboxes',
        options: [{v:'mdp',l:'Mot de passe'},{v:'carte_puce',l:'Carte à puce'},{v:'biometrie',l:'Biométrie'},{v:'certificat',l:'Certificats'}] },
      { id: 'chiffrement_donnees',   label: 'Chiffrement',                type: 'textarea' },
    ],
  },
  transfert_cedeao: {
    label: 'Transfert de données hors CEDEAO',
    champs: [
      { id: 'has_transfert', label: 'Transférez-vous des données hors CEDEAO ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'oui',l:'Oui'}],
        aide: "CEDEAO = 15 pays d'Afrique de l'Ouest.\nTransferts intra-CEDEAO : LIBRES.\nHors CEDEAO : AUTORISATION obligatoire." },
      { id: 'transfert_pays',      label: 'Pays destinataire' },
      { id: 'transfert_organisme', label: 'Organisme destinataire', type: 'textarea' },
      { id: 'transfert_garanties', label: 'Garanties apportées', type: 'checkboxes',
        options: [{v:'clauses',l:'Clauses contractuelles types'},{v:'bcr',l:'BCR'},{v:'consentement',l:'Consentement explicite'}] },
    ],
  },
  droit_acces: {
    label: "Droit d'accès des personnes",
    champs: [
      { id: 'info_methodes', label: "Comment informez-vous les personnes ?", required: true, type: 'checkboxes',
        options: [{v:'mentions_formulaire',l:'Mentions légales sur formulaire'},{v:'affichage',l:'Affichage'},{v:'site_internet',l:'Site internet'},{v:'courrier',l:'Courrier personnalisé'}] },
      { id: 'service_droit_acces', label: "Service chargé des demandes", required: true },
      { id: 'email_droit_acces',   label: 'Email dédié aux droits',       required: true, type: 'email' },
    ],
  },
  signature: {
    label: 'Signature du responsable',
    champs: [
      { id: 'signataire_nom',        label: 'Nom et prénom du signataire', required: true,
        aide: "Le signataire doit être le responsable ET de nationalité ivoirienne." },
      { id: 'signataire_fonction',   label: 'Fonction du signataire',      required: true },
      { id: 'signataire_nationalite',label: 'Nationalité',                  required: true, placeholder: 'Ivoirienne' },
      { id: 'email_recepisse',       label: 'Email pour le récépissé ARTCI', required: true, type: 'email' },
      { id: 'engagement', label: 'Engagement', required: true, type: 'select',
        options: [{v:'oui',l:"Je m'engage à ce que le traitement respecte la loi n°2013-450 du 19 juin 2013"}] },
    ],
  },
  personne_contact: {
    label: 'Personne à contacter',
    champs: [
      { id: 'contact_nom_prenom', label: 'Nom et prénom',        required: true },
      { id: 'contact_service',    label: 'Service',               placeholder: 'Ex: DPO, Direction Juridique...' },
      { id: 'contact_email',      label: 'Email',                 required: true, type: 'email' },
      { id: 'contact_telephone',  label: 'Téléphone',             required: true },
    ],
  },
  destinataire_transfert: {
    label: 'Identification du destinataire',
    champs: [
      { id: 'dest_raison_sociale',    label: 'Raison sociale / Nom',  required: true },
      { id: 'dest_adresse',           label: 'Adresse',                required: true },
      { id: 'dest_pays',              label: 'Pays',                   required: true },
      { id: 'dest_email',             label: 'Email',                  required: true, type: 'email' },
      { id: 'dest_telephone',         label: 'Téléphone',              required: true },
      { id: 'dest_type',              label: 'Type de destinataire',   required: true, type: 'select',
        options: [{v:'succursale',l:'Succursale'},{v:'siege',l:'Siège'},{v:'client',l:'Client'},{v:'sous_traitant',l:'Sous-traitant'},{v:'fournisseur',l:'Fournisseur'},{v:'autre',l:'Autre'}] },
      { id: 'dest_rep_legal_nom',     label: 'Représentant légal — Nom',    required: true },
      { id: 'dest_rep_legal_prenom',  label: 'Prénom',                       required: true },
      { id: 'dest_rep_legal_qualite', label: 'Qualité / Fonction',           required: true },
    ],
  },
  description_fichier: {
    label: 'Description du fichier transféré',
    champs: [
      { id: 'fichier_nom',        label: 'Nom du fichier',                     required: true },
      { id: 'fichier_descriptif', label: 'Descriptif',                          required: true, type: 'textarea' },
      { id: 'fichier_nb_personnes',label: 'Nombre de personnes concernées',     required: true },
      { id: 'mode_transfert',     label: 'Mode de transfert',                   required: true, type: 'checkboxes',
        options: [{v:'email',l:'Email'},{v:'cle_usb',l:'Clé USB'},{v:'plateforme',l:'Plateforme'},{v:'reseau',l:'Réseau dédié'},{v:'cloud',l:'Cloud'},{v:'autre',l:'Autre'}] },
      { id: 'finalite_transfert', label: 'Finalité du transfert',               required: true, type: 'textarea' },
      { id: 'frequence_transfert',label: 'Fréquence',                            required: true, type: 'select',
        options: [{v:'ponctuel',l:'Ponctuel'},{v:'quotidien',l:'Quotidien'},{v:'hebdomadaire',l:'Hebdomadaire'},{v:'mensuel',l:'Mensuel'},{v:'permanent',l:'Permanent'},{v:'autre',l:'Autre'}] },
    ],
  },
  consentement_transfert: {
    label: 'Consentement des personnes',
    champs: [
      { id: 'consentement_obtenu', label: 'Les personnes ont-elles consenti ?', required: true, type: 'select',
        options: [{v:'oui_direct',l:'Oui — directement'},{v:'oui_indirect',l:'Oui — via un tiers'},{v:'non',l:'Non — justification requise'}] },
      { id: 'consentement_methode', label: 'Méthode de recueil', type: 'textarea' },
    ],
  },
  garanties_pays_tiers: {
    label: 'Garanties pour transfert vers pays sans protection suffisante',
    champs: [
      { id: 'raison_transfert', label: 'Justification du transfert', required: true, type: 'checkboxes',
        options: [
          {v:'sauvegarde_vie',         l:'Sauvegarde de la vie'},
          {v:'interet_public',         l:"Intérêt public"},
          {v:'obligation_juridique',   l:'Obligation juridique'},
          {v:'execution_contrat',      l:"Exécution d'un contrat"},
          {v:'accord_bilateral',       l:'Accord bilatéral CI'},
          {v:'garanties_contractuelles',l:'Garanties contractuelles'},
        ] },
    ],
  },
  securite_transfert: {
    label: 'Sécurité des transferts',
    champs: [
      { id: 'securite_transfert_mesures', label: 'Mesures de sécurisation', required: true, type: 'checkboxes',
        options: [
          {v:'authentification_dest', l:'Authentification des destinataires'},
          {v:'integrite',             l:'Intégrité des données'},
          {v:'clauses',               l:'Clauses contractuelles'},
          {v:'destruction',           l:'Destruction des données non utilisées'},
          {v:'chiffrement_com',       l:'Chiffrement de la communication'},
          {v:'cryptage',              l:'Cryptage des données'},
        ] },
    ],
  },
}

// ════════════════════════════════════════════════════════════
// CONFIGURATION DES FORMULAIRES
// ════════════════════════════════════════════════════════════

const CONFIGS = {
  declaration: {
    titre: 'Déclaration normale de traitement',
    etapes: [
      { label: 'Le déclarant',       section: 'declarant' },
      { label: 'Représentant légal', section: 'representant_legal' },
      { label: 'Mise en œuvre',      section: 'service_mise_en_oeuvre' },
      { label: 'Finalité',           section: 'finalite' },
      { label: 'Données traitées',   section: 'categories_donnees' },
      { label: 'Données sensibles',  section: 'donnees_sensibles' },
      { label: 'Échanges',           section: 'echanges_interconnexions' },
      { label: 'Sécurité',           section: 'securite' },
      { label: 'Transfert CEDEAO',   section: 'transfert_cedeao' },
      { label: "Droit d'accès",      section: 'droit_acces' },
      { label: 'Signature',          section: 'signature' },
    ],
  },
  autorisation: {
    titre: "Demande d'autorisation préalable",
    etapes: [
      { label: 'Le déclarant',       section: 'declarant' },
      { label: 'Représentant légal', section: 'representant_legal' },
      { label: 'Mise en œuvre',      section: 'service_mise_en_oeuvre' },
      { label: 'Finalité',           section: 'finalite_autorisation' },
      { label: 'Transfert CEDEAO',   section: 'transfert_cedeao' },
      { label: 'Données traitées',   section: 'categories_donnees' },
      { label: 'Données sensibles',  section: 'donnees_sensibles_auto' },
      { label: 'Interconnexions',    section: 'interconnexions' },
      { label: "Droit d'accès",      section: 'droit_acces' },
      { label: 'Sécurité & Archi',   section: 'securite_architecture' },
      { label: 'Personne contact',   section: 'personne_contact' },
      { label: 'Signature',          section: 'signature' },
    ],
  },
  transfert: {
    titre: "Demande de transfert de données à l'étranger",
    etapes: [
      { label: 'Déclarant',          section: 'declarant' },
      { label: 'Représentant légal', section: 'representant_legal' },
      { label: 'Destinataire',       section: 'destinataire_transfert' },
      { label: 'Fichier transféré',  section: 'description_fichier' },
      { label: 'Consentement',       section: 'consentement_transfert' },
      { label: 'Garanties',          section: 'garanties_pays_tiers' },
      { label: 'Sécurité transfert', section: 'securite_transfert' },
      { label: 'Signature',          section: 'signature' },
    ],
  },
  dpo: {
    titre: 'Enregistrement du correspondant DPO',
    etapes: [
      { label: "L'entreprise",       section: 'declarant' },
      { label: 'Représentant légal', section: 'representant_legal' },
      { label: 'Le correspondant',   section: null, champs: [
        { id: 'dpo_nom',           label: 'Nom et prénom du DPO',       required: true },
        { id: 'dpo_email',         label: 'Email du DPO',               required: true, type: 'email' },
        { id: 'dpo_telephone',     label: 'Téléphone du DPO',           required: true },
        { id: 'dpo_qualification', label: 'Qualification / Expérience', type: 'textarea' },
        { id: 'dpo_independance',  label: "Confirmation d'indépendance", required: true, type: 'select',
          options: [{v:'oui',l:"Je confirme que le DPO est indépendant et n'est pas le dirigeant"}] },
      ]},
      { label: 'Signature', section: 'signature' },
    ],
  },
}

// ════════════════════════════════════════════════════════════
// HOOK DEBOUNCE
// ════════════════════════════════════════════════════════════

function useDebounce(delay = 2000) {
  const timers = useRef({})
  return (id, fn) => {
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(fn, delay)
  }
}

// ════════════════════════════════════════════════════════════
// FORMATAGE MESSAGES IA
// ════════════════════════════════════════════════════════════

function FormattedMessage({ text }) {
  const clean = text.replace(/\\n/g, '\n').replace(/\\t/g, ' ').trim()
  const lines = clean.split('\n')
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        const l = line.trim()
        if (l === '') return <div key={i} style={{ height: 4 }} />
        if (l === '---') return <hr key={i} style={{ border:'none', borderTop:'1px solid #ddd', margin:'4px 0' }} />
        if (l.startsWith('### ')) return <div key={i} style={{ fontWeight:600, fontSize:13, marginTop:8 }}>{l.replace(/^###\s*/,'').replace(/\*\*/g,'')}</div>
        if (l.startsWith('## '))  return <div key={i} style={{ fontWeight:700, fontSize:14, marginTop:10 }}>{l.replace(/^##\s*/,'').replace(/\*\*/g,'')}</div>
        if (l.startsWith('- ') || l.startsWith('• ')) {
          return <div key={i} style={{ paddingLeft:12, marginBottom:3, display:'flex', gap:6 }}>
            <span>•</span>
            <span dangerouslySetInnerHTML={{ __html: l.replace(/^[-•]\s*/,'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
          </div>
        }
        return <div key={i} style={{ marginBottom:3 }} dangerouslySetInnerHTML={{ __html: l.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }} />
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// CHAT ASSISTANT
// ════════════════════════════════════════════════════════════

function ChatAssistant({ config, etapeIndex, donnees, visible, onClose }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: `Bonjour ! Je suis votre assistant DPO.\n\nFormulaire : **${config.titre}**\n\nQuelle est votre question ?`
  }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])
  useEffect(() => { if (visible) inputRef.current?.focus() }, [visible])

  async function envoyer(e) {
    e?.preventDefault()
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role:'user', text:question }])
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${BASE}/ia/valider-champ`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ champ:'chat', valeur:question, contexte:JSON.stringify({ formulaire:config.titre, etape:config.etapes[etapeIndex]?.label, donnees }), mode:'chat' }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role:'assistant', text:data.message || 'Je ne peux pas répondre.' }])
    } catch {
      setMessages(m => [...m, { role:'assistant', text:'Erreur de connexion.' }])
    } finally { setLoading(false) }
  }

  if (!visible) return null

  return (
    <div style={{ position:'fixed', bottom:24, right:24, width:380, height:540, background:'#fff', border:'1px solid #ddd', borderRadius:12, display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:1000 }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111', borderRadius:'12px 12px 0 0' }}>
        <div>
          <div style={{ fontWeight:600, fontSize:14, color:'#fff' }}>Assistant DPO — ARTCI</div>
          <div style={{ fontSize:11, color:'#aaa' }}>Loi n°2013-450</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'90%' }}>
            <div style={{ padding:'8px 12px', borderRadius:8, fontSize:13, background:m.role==='user'?'#111':'#f5f5f5', color:m.role==='user'?'#fff':'#111' }}>
              {m.role==='user' ? m.text : <FormattedMessage text={m.text} />}
            </div>
          </div>
        ))}
        {loading && <div style={{ alignSelf:'flex-start' }}><div style={{ padding:'8px 12px', background:'#f5f5f5', borderRadius:8, fontSize:13, color:'#888' }}>Analyse en cours...</div></div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding:'6px 10px', borderTop:'1px solid #eee', display:'flex', gap:5, flexWrap:'wrap' }}>
        {["C'est quoi le N°CC ?","Données sensibles","Transfert CEDEAO","Tout expliquer"].map(q => (
          <button key={q} onClick={() => { setInput(q); setTimeout(()=>inputRef.current?.focus(),50) }} style={{ padding:'3px 8px', fontSize:11, border:'1px solid #ddd', borderRadius:20, background:'#fff', cursor:'pointer', color:'#555' }}>{q}</button>
        ))}
      </div>
      <form onSubmit={envoyer} style={{ padding:'8px 12px', borderTop:'1px solid #eee', display:'flex', gap:8 }}>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder="Posez votre question..." style={{ flex:1, padding:'8px 10px', border:'1px solid #ddd', borderRadius:6, fontSize:13, outline:'none' }} disabled={loading} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();envoyer()}}} />
        <button type="submit" disabled={loading||!input.trim()} style={{ padding:'8px 14px', background:'#111', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:14, fontWeight:600 }}>→</button>
      </form>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PAGE FORMULAIRE
// ════════════════════════════════════════════════════════════

export default function Formulaire() {
  const { type, id } = useParams()
  const nav = useNavigate()
  const config = CONFIGS[type] || CONFIGS.declaration

  const [etape, setEtape]               = useState(0)
  const [donnees, setDonnees] = useState({
  type_declarant:         'morale',
  rep_piece_identite:     'cni',
  service_type:           'declarant',
  origine_donnees:        'directe',
  duree_conservation:     '1an',
  has_sensibles:          'non',
  echanges_donnees:       'non',
  has_transfert:          'non',
  has_interconnexion:     'non',
  sensibles_consentement: 'oui',
  sensibles_duree:        '1an',
  consentement_obtenu:    'oui_direct',
  frequence_transfert:    'ponctuel',
  dest_type:              'sous_traitant',
  dpo_independance:       'oui',
  engagement:             'oui',
})
  const [feedbacks, setFeedbacks]       = useState({})
  const [analyzing, setAnalyzing]       = useState({})
  const [errorsChamps, setErrorsChamps] = useState({})
  const [loading, setLoading]           = useState(false)
  const [err, setErr]                   = useState('')
  const [chatVisible, setChatVisible]   = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('')
  const debounce     = useDebounce(2000)  // debounce 2s
  const autoSaveTimer = useRef(null)
  const iaSaving     = useRef(false)      // empêcher blocage sur suivant

  // ── Chargement initial ────────────────────────────────────
  useEffect(() => {
    api.getEntreprise().then(e => {
      if (e) setDonnees(d => ({
        type_declarant:        'morale',
        raison_sociale:        e.denomination || '',
        num_cc:                e.fiscal || '',
        adresse:               e.siege || '',
        telephone:             e.telephone || '',
        email_contact:         e.email_droits || '',
        contact_nom:           e.representant || '',
        rep_nom:               e.representant?.split(' ').slice(-1)[0] || '',
        rep_prenom:            e.representant?.split(' ').slice(0,-1).join(' ') || '',
        rep_qualite:           e.fonction || '',
        rep_piece_identite:    'cni',
        signataire_nom:        e.representant || '',
        signataire_fonction:   e.fonction || '',
        email_recepisse:       e.email_droits || '',
        engagement:            'oui',
        service_type:          'declarant',
        origine_donnees:       'directe',
        duree_conservation:    '1an',
        has_sensibles:         'non',
        echanges_donnees:      'non',
        has_transfert:         'non',
        has_interconnexion:    'non',
        sensibles_consentement:'oui',
        sensibles_duree:       '1an',
        consentement_obtenu:   'oui_direct',
        frequence_transfert:   'ponctuel',
        dest_type:             'sous_traitant',
        dpo_independance:      'oui',
        ...d
      }))
    }).catch(() => {})
    if (id) {
      api.getDossier(id).then(d => {
        if (d.donnees) setDonnees(prev => ({ ...prev, ...d.donnees }))
      }).catch(() => {})
    }
  }, [id])

  // ── Autosave toutes les 30 secondes ──────────────────────
  const sauvegarder = useCallback(async () => {
    if (!id || iaSaving.current) return
    try {
      setAutoSaveStatus('saving')
      await api.majDossier(id, { donnees })
      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus(''), 2000)
    } catch { setAutoSaveStatus('') }
  }, [id, donnees])

  useEffect(() => {
    autoSaveTimer.current = setInterval(sauvegarder, 30000)
    return () => clearInterval(autoSaveTimer.current)
  }, [sauvegarder])

  // ── Helpers ───────────────────────────────────────────────
  const setFb = (k, v) => setFeedbacks(f => ({ ...f, [k]: v }))
  const setAn = (k, v) => setAnalyzing(a => ({ ...a, [k]: v }))

  // ── Validation ────────────────────────────────────────────
  function validerEtape(champs) {
    const errors = {}
    champs.forEach(c => {
      if (!c.required) return
      const val = donnees[c.id]

      if (c.type === 'checkboxes') {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          errors[c.id] = 'Sélectionnez au moins une option'
        }
      } else if (c.type === 'select') {
        // Pour les selects : valide si une valeur est présente (même la première option)
        if (val === undefined || val === null || val === '') {
          errors[c.id] = 'Ce champ est obligatoire'
        }
      } else {
        if (!val || String(val).trim() === '') {
          errors[c.id] = 'Ce champ est obligatoire'
        }
      }
    })
    setErrorsChamps(errors)
    return Object.keys(errors).length === 0
  }

  // ── Changements champs ────────────────────────────────────
  function onTextChange(chamId, valeur) {
    setDonnees(d => ({ ...d, [chamId]: valeur }))
    if (errorsChamps[chamId]) setErrorsChamps(e => ({ ...e, [chamId]: null }))
    // IA validation seulement pour textarea et input (pas select)
    if (valeur.length < 4) { setFb(chamId, null); return }
    setAn(chamId, true)
    debounce(chamId, async () => {
      if (iaSaving.current) { setAn(chamId, false); return }
      try {
        const r = await api.validerChamp({ champ:chamId, valeur, contexte: JSON.stringify({ formulaire:config.titre }).slice(0,200) })
        setFb(chamId, r)
      } catch { setFb(chamId, null) }
      finally { setAn(chamId, false) }
    })
  }

  function onCheckChange(chamId, val, checked) {
    setDonnees(d => {
      const prev = Array.isArray(d[chamId]) ? d[chamId] : []
      const next = checked ? [...prev, val] : prev.filter(v => v !== val)
      return { ...d, [chamId]: next }
    })
    if (errorsChamps[chamId]) setErrorsChamps(e => ({ ...e, [chamId]: null }))
  }

  // ── Navigation — IMMÉDIATE, sauvegarde en arrière-plan ────
  async function suivant() {
    setErr('')
    const champs = getChampsEtape(config.etapes[etape])
    if (!validerEtape(champs)) {
      setErr('Veuillez remplir tous les champs obligatoires (*) avant de continuer.')
      window.scrollTo({ top:0, behavior:'smooth' })
      return
    }

    // Navigation immédiate
    if (etape < config.etapes.length - 1) {
      setEtape(e => e + 1)
      window.scrollTo({ top:0, behavior:'smooth' })
    } else {
      setLoading(true)
      try {
        if (id) await api.majDossier(id, { donnees, statut:'en_attente_signature' })
        nav(`/signature/${id}`)
      } catch (e) { setErr(e.message) } finally { setLoading(false) }
      return
    }

    // Sauvegarde en arrière-plan (ne bloque pas la navigation)
    if (id) {
      iaSaving.current = true
      api.majDossier(id, { donnees })
        .then(() => { setAutoSaveStatus('saved'); setTimeout(()=>setAutoSaveStatus(''),2000) })
        .catch(() => {})
        .finally(() => { iaSaving.current = false })
    }
  }

  function retour() {
    setErrorsChamps({})
    if (etape > 0) { setEtape(e => e-1); window.scrollTo({top:0,behavior:'smooth'}) }
    else nav('/dashboard')
  }

  function getChampsEtape(etapeConfig) {
    if (etapeConfig.champs)  return etapeConfig.champs
    if (etapeConfig.section && S[etapeConfig.section]) return S[etapeConfig.section].champs
    return []
  }

  // ── Rendu champ ───────────────────────────────────────────
  function renderChamp(c) {
    const val    = donnees[c.id] !== undefined ? donnees[c.id] : ''
    const fb     = feedbacks[c.id]
    const an     = analyzing[c.id]
    const erreur = errorsChamps[c.id]
    const borderErreur = erreur ? { border:'1px solid #ef4444', borderRadius:6 } : {}

    if (c.type === 'checkboxes') {
      const selected = Array.isArray(donnees[c.id]) ? donnees[c.id] : []
      return (
        <div className="field" key={c.id}>
          <label>{c.label} {c.required && <span className="required">*</span>}</label>
          {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
          <div className="check-grid" style={erreur?{border:'1px solid #ef4444',borderRadius:6,padding:8}:{}}>
            {c.options.map(o => {
              const checked = selected.includes(o.v)
              return (
                <label key={o.v} className={`check-item ${checked?'checked':''} ${o.sensible&&checked?'danger':''}`}>
                  <input type="checkbox" checked={checked} onChange={e=>onCheckChange(c.id,o.v,e.target.checked)} />
                  <span className="check-label">{o.l}</span>
                  {o.sensible && <span className="check-badge">AUTORISATION</span>}
                </label>
              )
            })}
          </div>
          {erreur && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>⚠ {erreur}</div>}
        </div>
      )
    }

    if (c.type === 'select') return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
        <select value={val} onChange={e=>onTextChange(c.id,e.target.value)} style={borderErreur}>
          {c.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        {erreur && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>⚠ {erreur}</div>}
      </div>
    )

    if (c.type === 'textarea') return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
        <textarea value={val} onChange={e=>onTextChange(c.id,e.target.value)} placeholder={c.placeholder||''} style={borderErreur} />
        {erreur && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>⚠ {erreur}</div>}
        {!erreur && an && <div className="fb show loading">Analyse IA...</div>}
        {!erreur && !an && fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )

    return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
        <input type={c.type||'text'} value={val} onChange={e=>onTextChange(c.id,e.target.value)} placeholder={c.placeholder||''} style={borderErreur} />
        {erreur && <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>⚠ {erreur}</div>}
        {!erreur && an && <div className="fb show loading">Analyse IA...</div>}
        {!erreur && !an && fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )
  }

  const etapeCourante = config.etapes[etape]
  const champsEtape   = getChampsEtape(etapeCourante)
  const estDerniere   = etape === config.etapes.length - 1
  const nbEtapes      = config.etapes.length
  const showFirst     = Math.max(0, etape - 2)
  const showLast      = Math.min(nbEtapes, showFirst + 5)

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          {autoSaveStatus==='saving' && <span style={{ fontSize:12, color:'#888' }}>💾 Sauvegarde...</span>}
          {autoSaveStatus==='saved'  && <span style={{ fontSize:12, color:'#22c55e' }}>✓ Sauvegardé</span>}
          <span style={{ fontSize:12, color:'#888' }}>Étape {etape+1}/{nbEtapes}</span>
          <span className="nav-link" onClick={()=>nav('/dashboard')}>← Tableau de bord</span>
        </div>
      </nav>

      <div className="page">
        <h1>{config.titre}</h1>
        <p className="subtitle">Formulaire officiel ARTCI — Les champs marqués * sont obligatoires.</p>

        {/* Barre de progression */}
        <div style={{ display:'flex', gap:4, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
          {config.etapes.slice(showFirst, showLast).map((e, i) => {
            const idx = showFirst + i
            return (
              <div key={idx} style={{ display:'flex', alignItems:'center', gap:4 }}>
                {i > 0 && <div style={{ width:12, height:1, background:idx<=etape?'#111':'#ddd' }} />}
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, background:idx===etape?'#111':idx<etape?'#22c55e':'#eee', color:idx<=etape?'#fff':'#888', flexShrink:0 }}>
                    {idx < etape ? '✓' : idx+1}
                  </div>
                  <span style={{ fontSize:11, color:idx===etape?'#111':'#888', fontWeight:idx===etape?500:400, whiteSpace:'nowrap' }}>{e.label}</span>
                </div>
              </div>
            )
          })}
          {showLast < nbEtapes && <span style={{ fontSize:11, color:'#888' }}>+{nbEtapes-showLast} étapes</span>}
        </div>

        {err && <div className="alert alert-err">{err}</div>}

        <h2>{etapeCourante.label}</h2>
        {champsEtape.map(c => renderChamp(c))}

        <div className="wizard-nav">
          <button className="btn btn-secondary" onClick={retour} disabled={loading}>
            {etape===0 ? '← Annuler' : '← Retour'}
          </button>
          <button className="btn btn-primary" onClick={suivant} disabled={loading}>
            {loading ? 'Finalisation...' : estDerniere ? 'Passer à la signature →' : 'Suivant →'}
          </button>
        </div>
      </div>

      {!chatVisible && (
        <button onClick={()=>setChatVisible(true)} style={{ position:'fixed', bottom:24, right:24, background:'#111', color:'#fff', border:'none', borderRadius:50, padding:'12px 20px', cursor:'pointer', fontSize:14, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:8, zIndex:999 }}>
          💬 Aide DPO
        </button>
      )}

      <ChatAssistant config={config} etapeIndex={etape} donnees={donnees} visible={chatVisible} onClose={()=>setChatVisible(false)} />
    </>
  )
}