import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as api from '../api.js'

// ════════════════════════════════════════════════════════════
// BIBLIOTHÈQUE DE SECTIONS RÉUTILISABLES
// ════════════════════════════════════════════════════════════

const S = {

  // ── DÉCLARANT ──────────────────────────────────────────────
  declarant: {
    label: 'Le déclarant',
    champs: [
      { id: 'type_declarant', label: 'Type de déclarant', required: true, type: 'select',
        options: [{v:'morale',l:'Personne Morale (entreprise, ONG...)'},{v:'physique',l:'Personne Physique'}],
        aide: "Choisissez 'Personne Morale' si vous déclarez au nom d'une entreprise, association ou organisme. 'Personne Physique' si vous déclarez en votre nom propre." },
      { id: 'raison_sociale', label: 'Raison sociale / Nom et prénoms', required: true,
        aide: "Personne morale : nom officiel de l'entreprise tel qu'au RCCM.\nPersonne physique : nom et prénoms complets." },
      { id: 'num_cc', label: 'N°CC (Numéro Carte du Contribuable)', required: true, placeholder: 'Ex: 1234567 A',
        aide: "C'est votre numéro fiscal ivoirien délivré par la Direction Générale des Impôts (DGI).\n⚠️ ATTENTION : Ce n'est PAS le RCCM.\nOù le trouver : sur votre attestation fiscale, votre patente ou vos déclarations TVA." },
      { id: 'domaine_activite', label: "Domaine d'activité", required: true, placeholder: 'Ex: Commerce, Banque, Santé, Éducation...',
        aide: "Indiquez le secteur d'activité principal de votre organisation." },
      { id: 'adresse', label: 'Adresse', required: true,
        aide: "Adresse complète du siège social ou du domicile. Ex: Abidjan Plateau, Immeuble CCIA, 2ème étage." },
      { id: 'ville', label: 'Ville', required: true },
      { id: 'pays', label: 'Pays', required: true, placeholder: 'Côte d\'Ivoire' },
      { id: 'telephone', label: 'Téléphone', required: true, placeholder: '+225 27 XX XX XX XX' },
      { id: 'email_contact', label: 'Email de contact', required: true, type: 'email',
        aide: "Email de la personne à contacter pour le récépissé et les éventuels compléments d'information." },
      { id: 'contact_nom', label: 'Personne à contacter (pour le récépissé)', required: true,
        aide: "Nom et prénom de la personne qui recevra le récépissé de l'ARTCI par email." },
    ],
  },

  // ── REPRÉSENTANT LÉGAL ─────────────────────────────────────
  representant_legal: {
    label: 'Représentant légal',
    champs: [
      { id: 'rep_nom', label: 'Nom du représentant légal', required: true,
        aide: "Nom de famille du dirigeant (gérant, DG, Président selon la forme juridique)." },
      { id: 'rep_prenom', label: 'Prénom', required: true },
      { id: 'rep_qualite', label: 'Qualité / Fonction', required: true, placeholder: 'Ex: Directeur Général, Gérant, Président',
        aide: "Fonction officielle du représentant légal telle qu'elle figure dans les statuts." },
      { id: 'rep_piece_identite', label: "Type de pièce d'identité", required: true, type: 'select',
        options: [{v:'cni',l:'CNI (Carte Nationale d\'Identité)'},{v:'passeport',l:'Passeport'},{v:'autre',l:'Autre'}],
        aide: "La loi exige que le représentant légal signataire soit de NATIONALITÉ IVOIRIENNE." },
      { id: 'rep_num_piece', label: "N° de la pièce d'identité", required: true },
      { id: 'rep_nationalite', label: 'Nationalité', required: true, placeholder: 'Ivoirienne',
        aide: "⚠️ OBLIGATOIRE : La personne signataire doit obligatoirement être de nationalité ivoirienne conformément à la loi n°2013-450." },
      { id: 'rep_email', label: 'Email du représentant légal', required: true, type: 'email' },
      { id: 'rep_telephone', label: 'Téléphone', required: true },
    ],
  },

  // ── SERVICE CHARGÉ DE LA MISE EN ŒUVRE ────────────────────
  service_mise_en_oeuvre: {
    label: 'Service chargé de la mise en œuvre',
    champs: [
      { id: 'service_type', label: 'Qui met en œuvre le traitement ?', required: true, type: 'select',
        options: [{v:'declarant',l:'Le déclarant lui-même'},{v:'sous_traitant',l:'Un prestataire / Sous-traitant'}],
        aide: "Si c'est un prestataire externe (hébergeur, éditeur de logiciel...), précisez ses coordonnées ci-dessous." },
      { id: 'service_raison_sociale', label: 'Raison sociale du prestataire (si applicable)', placeholder: 'Laisser vide si déclarant lui-même',
        aide: "Nom de l'entreprise prestataire qui traite les données pour votre compte." },
      { id: 'service_adresse', label: 'Adresse du prestataire' },
      { id: 'service_pays', label: 'Pays du prestataire', placeholder: 'Ex: Côte d\'Ivoire, France...',
        aide: "⚠️ Si le prestataire est hors CEDEAO, un transfert international doit également être déclaré." },
    ],
  },

  // ── FINALITÉ ───────────────────────────────────────────────
  finalite: {
    label: 'Finalité du traitement',
    champs: [
      { id: 'finalite', label: 'Finalité ou objectif du traitement', required: true, type: 'textarea',
        placeholder: 'Ex: Gestion des ressources humaines, Gestion de la relation client, Gestion du recrutement...',
        aide: "La finalité désigne l'objectif poursuivi par le traitement. Soyez précis.\n❌ Trop vague : améliorer nos services\n✅ Correct : Envoi de newsletters aux clients ayant consenti et gestion des commandes en ligne\nPlusieurs finalités possibles pour un même traitement." },
      { id: 'personnes_concernees', label: 'Personnes concernées par le traitement', required: true, type: 'checkboxes',
        aide: "Cochez toutes les catégories de personnes dont vous traitez les données.",
        options: [
          {v:'salaries', l:'Salariés'}, {v:'usagers', l:'Usagers'},
          {v:'adherents', l:'Adhérents'}, {v:'clients', l:'Clients'},
          {v:'visiteurs', l:'Visiteurs'}, {v:'patients', l:'Patients'},
          {v:'etudiants', l:'Étudiants / Élèves'}, {v:'autres', l:'Autres'},
        ] },
      { id: 'technologies', label: 'Technologies particulières utilisées', type: 'checkboxes',
        aide: "Cochez si votre traitement utilise une ou plusieurs de ces technologies.",
        options: [
          {v:'rfid', l:'Dispositif sans contact (RFID, NFC...)'}, {v:'carte_puce', l:'Carte à puce'},
          {v:'video', l:'Vidéo-protection'}, {v:'geo', l:'Géo-localisation (GPS/GPRS)'},
          {v:'nano', l:'Nanotechnologie'}, {v:'anonymisation', l:'Mécanisme d\'anonymisation'},
        ] },
    ],
  },

  // ── FINALITÉ AUTORISATION (plus détaillée) ─────────────────
  finalite_autorisation: {
    label: 'Finalité et fondement juridique',
    champs: [
      { id: 'finalite', label: 'Finalité ou objectif du traitement', required: true, type: 'textarea',
        placeholder: 'Ex: Gestion des ressources humaines...',
        aide: "La finalité désigne l'objectif poursuivi par le traitement. Soyez précis et complet." },
      { id: 'fondement_juridique', label: 'Fondement juridique du traitement', required: true, type: 'textarea',
        placeholder: 'Ex: Art. 7 de la Loi n°2013-450 du 19 juin 2013 autorisant le traitement de données biométriques...',
        aide: "Indiquez la référence légale qui autorise ce traitement sensible. Pour les données biométriques, c'est l'Art. 7 de la loi n°2013-450." },
      { id: 'logiciel_application', label: 'Logiciel / Application utilisé', type: 'textarea',
        placeholder: 'Ex: Oracle HR, Salesforce, système maison...',
        aide: "Précisez le ou les logiciels mis en œuvre pour ce traitement." },
      { id: 'personnes_concernees', label: 'Personnes concernées', required: true, type: 'checkboxes',
        options: [
          {v:'salaries',l:'Salariés'},{v:'usagers',l:'Usagers'},{v:'adherents',l:'Adhérents'},
          {v:'clients',l:'Clients'},{v:'visiteurs',l:'Visiteurs'},{v:'patients',l:'Patients'},
          {v:'etudiants',l:'Étudiants/Élèves'},{v:'autres',l:'Autres'},
        ] },
      { id: 'technologies', label: 'Technologies particulières', type: 'checkboxes',
        options: [
          {v:'rfid',l:'RFID/NFC'},{v:'carte_puce',l:'Carte à puce'},
          {v:'video_surveillance',l:'Vidéo-surveillance'},{v:'geolocalisation',l:'Géolocalisation'},
          {v:'nano',l:'Nanotechnologies'},{v:'anonymisation',l:'Mécanisme d\'anonymisation'},
        ] },
    ],
  },

  // ── CATÉGORIES DE DONNÉES ──────────────────────────────────
  categories_donnees: {
    label: 'Catégories de données traitées',
    champs: [
      { id: 'cat_etat_civil', label: 'État civil, Identité, Données d\'identification', type: 'checkboxes',
        aide: "Pour chaque catégorie cochée, précisez l'origine, la durée de conservation et les destinataires dans les champs ci-dessous.",
        options: [
          {v:'nom_prenom',l:'Nom et prénom'},{v:'adresse',l:'Adresse'},
          {v:'date_naissance',l:'Date et lieu de naissance'},{v:'num_tel',l:'N° de téléphone', sensible:true},
          {v:'email',l:'Email'},{v:'num_cni',l:'N° CNI / NNI', sensible:true},{v:'photo',l:'Photo'},
        ] },
      { id: 'cat_vie_personnelle', label: 'Vie personnelle', type: 'checkboxes',
        options: [{v:'habitude_vie',l:'Habitude de consommation'},{v:'localisation',l:'Localisation géographique'},{v:'autres_perso',l:'Autres'}] },
      { id: 'cat_vie_pro', label: 'Vie professionnelle (CV, scolarité, formation, expérience, distinctions...)', type: 'checkboxes',
        options: [{v:'cv',l:'CV / Parcours'},{v:'formation',l:'Formation / Diplômes'},{v:'experience',l:'Expérience'},{v:'autres_pro',l:'Autres'}] },
      { id: 'cat_financier', label: 'Informations d\'ordre économique et financier', type: 'checkboxes',
        options: [{v:'revenus',l:'Revenus'},{v:'info_bancaires',l:'Informations bancaires'},{v:'dettes',l:'Dettes / Situation financière'}] },
      { id: 'cat_connexion', label: 'Données de connexion (adresse IP, logs, etc.)', type: 'checkboxes',
        options: [{v:'ip_logs',l:'Adresse IP et logs de connexion'},{v:'horodatage',l:'Horodatage des accès'},{v:'autres_connexion',l:'Autres'}] },
      { id: 'cat_localisation', label: 'Données de localisation (GPS, GSM, etc.)', type: 'checkboxes',
        options: [{v:'gps',l:'Données GPS / Satellite'},{v:'gsm',l:'Données téléphone mobile'},{v:'autres_loc',l:'Autres'}] },
      { id: 'origine_donnees', label: 'Origine des données', required: true, type: 'select',
        options: [{v:'directe',l:'Directement auprès de la personne concernée'},{v:'indirecte',l:'De manière indirecte (précisez ci-dessous)'}],
        aide: "Directe : vous collectez vous-même auprès de la personne.\nIndirecte : vous avez obtenu les données via un tiers (service du personnel, achat de fichier...)." },
      { id: 'origine_indirecte_detail', label: 'Si collecte indirecte : précisez la source', placeholder: 'Ex: Service du personnel, DRH, achat de fichier auprès de...' },
      { id: 'duree_conservation', label: 'Durée de conservation', required: true, type: 'select',
        options: [
          {v:'1mois',l:'1 mois'},{v:'3mois',l:'3 mois'},{v:'1an',l:'1 an'},
          {v:'duree_relation',l:'Pendant la durée de la relation contractuelle'},
          {v:'autre',l:'Autre (précisez ci-dessous)'},
        ],
        aide: "Les données doivent être conservées pendant une durée qui n'excède pas la période nécessaire aux finalités pour lesquelles elles ont été collectées." },
      { id: 'duree_autre_detail', label: 'Si autre durée : précisez', placeholder: 'Ex: 5 ans après fin de contrat de travail' },
      { id: 'destinataires', label: 'Destinataires des données', required: true, type: 'textarea',
        placeholder: 'Ex: Direction RH, Service comptabilité, Sous-traitant paie (nom de l\'entreprise)...',
        aide: "Les destinataires sont les personnes ou organismes habilités à recevoir communication des données. Listez tous les services internes et prestataires externes concernés." },
    ],
  },

  // ── DONNÉES SENSIBLES ──────────────────────────────────────
  donnees_sensibles: {
    label: 'Données sensibles',
    champs: [
      { id: 'has_sensibles', label: 'Votre traitement inclut-il des données sensibles ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'oui',l:'Oui'}],
        aide: "Données sensibles = opinions religieuses/philosophiques/politiques/syndicales, vie sexuelle ou raciale, santé, mesures d'ordre social, poursuites, sanctions pénales.\n⚠️ Le traitement de données sensibles est en principe INTERDIT sauf si la finalité l'exige absolument." },
      { id: 'sensibles_categories', label: 'Si oui : catégories concernées', type: 'checkboxes',
        options: [
          {v:'num_securite_sociale',l:'N° de sécurité sociale / CNPS'},{v:'infractions',l:'Infractions / Condamnations (réservé auxiliaires de justice)'},
          {v:'opinions_philo',l:'Opinions philosophiques / politiques / religieuses'},{v:'syndicale',l:'Appartenance syndicale'},
          {v:'sante',l:'Données de santé'},{v:'vie_sexuelle',l:'Vie sexuelle'},{v:'origine_raciale',l:'Origine raciale ou ethnique'},
        ] },
      { id: 'sensibles_justification', label: 'Justification de la nécessité', type: 'textarea',
        placeholder: 'Expliquez pourquoi ce traitement sensible est absolument nécessaire à votre activité...',
        aide: "L'ARTCI exige une justification solide. Expliquez en quoi ce traitement est indispensable et quelles alternatives moins intrusives ont été envisagées." },
    ],
  },

  // ── DONNÉES SENSIBLES AUTORISATION (plus détaillé) ────────
  donnees_sensibles_auto: {
    label: 'Données sensibles',
    champs: [
      { id: 'sensibles_biometrie', label: 'Données biométriques', type: 'checkboxes',
        aide: "Précisez les types de données biométriques traitées.",
        options: [
          {v:'contour_main',l:'Contour de la main'},{v:'empreintes',l:'Empreintes digitales'},
          {v:'reseau_veineux',l:'Réseau veineux'},{v:'iris',l:'Iris de l\'œil'},
          {v:'reconnaissance_faciale',l:'Reconnaissance faciale'},{v:'reconnaissance_vocale',l:'Reconnaissance vocale'},
          {v:'adn',l:'ADN'},{v:'autre_biometrie',l:'Autre procédé biométrique'},
        ] },
      { id: 'sensibles_sante', label: 'Données de santé', type: 'checkboxes',
        options: [
          {v:'pathologie',l:'Pathologie / Affection'},{v:'antecedents',l:'Antécédents familiaux'},
          {v:'risques',l:'Données relatives aux risques'},{v:'comportements_risque',l:'Comportements à risques'},
          {v:'autres_sante',l:'Autres données de santé'},
        ] },
      { id: 'sensibles_autres', label: 'Autres données sensibles', type: 'checkboxes',
        options: [
          {v:'nni',l:'N° de sécurité sociale / NNI'},{v:'infractions',l:'Infractions / Condamnations'},
          {v:'opinions',l:'Opinions politiques / philosophiques / religieuses'},
          {v:'syndicale',l:'Appartenance syndicale'},{v:'origine_raciale',l:'Origine raciale ou ethnique'},
          {v:'vie_sexuelle',l:'Vie sexuelle'},
        ] },
      { id: 'sensibles_origine', label: 'Origine des données sensibles', required: true, type: 'select',
        options: [{v:'directe',l:'Directement auprès de la personne concernée'},{v:'indirecte',l:'De manière indirecte'}] },
      { id: 'sensibles_consentement', label: 'Consentement exprès de la personne concernée obtenu ?', required: true, type: 'select',
        options: [{v:'oui',l:'Oui'},{v:'non',l:'Non — justification requise'}],
        aide: "Pour les données sensibles, le consentement explicite de la personne est en principe requis." },
      { id: 'sensibles_duree', label: 'Durée de conservation', required: true, type: 'select',
        options: [{v:'jours',l:'Quelques jours'},{v:'mois',l:'Quelques mois'},{v:'1an',l:'1 an'},{v:'plus',l:'Plusieurs années (précisez)'}] },
      { id: 'sensibles_destinataires', label: 'Destinataires', required: true, type: 'textarea', placeholder: 'Organismes auxquels ces données sont transmises...' },
    ],
  },

  // ── ÉCHANGES / INTERCONNEXIONS ─────────────────────────────
  echanges_interconnexions: {
    label: 'Échanges de données / Interconnexions',
    champs: [
      { id: 'echanges_donnees', label: 'Procédez-vous à des échanges de données ?', required: true, type: 'select',
        options: [
          {v:'non',l:'Non'},
          {v:'interne',l:'Oui, avec d\'autres services au sein de l\'organisme déclarant'},
          {v:'externe',l:'Oui, avec des organismes extérieurs au déclarant'},
        ],
        aide: "⚠️ ALERTE : Si vous procédez à des échanges avec des organismes EXTÉRIEURS, votre traitement relève de la procédure d'AUTORISATION et non d'une simple déclaration." },
    ],
  },

  // ── INTERCONNEXIONS AUTORISATION ──────────────────────────
  interconnexions: {
    label: 'Interconnexions',
    champs: [
      { id: 'has_interconnexion', label: 'Procédez-vous à des interconnexions de fichiers ayant des finalités différentes ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'oui',l:'Oui'}],
        aide: "L'interconnexion = mise en relation automatisée d'informations provenant de fichiers distincts. Ex: croiser votre fichier clients avec votre fichier fournisseurs." },
      { id: 'interconnexion_detail', label: 'Si oui : fichiers interconnectés (nom + finalité + N° déclaration)', type: 'textarea',
        placeholder: 'Fichier 1: Fichier clients (gestion commerciale) - N° déclaration: ...\nFichier 2: ...' },
      { id: 'interconnexion_raison', label: 'Raisons de cette interconnexion', type: 'textarea' },
    ],
  },

  // ── SÉCURITÉ / CONFIDENTIALITÉ (déclaration) ──────────────
  securite: {
    label: 'Sécurité / Confidentialité',
    champs: [
      { id: 'securite_mesures', label: 'Mesures de sécurité mises en œuvre', required: true, type: 'checkboxes',
        aide: "Cochez toutes les mesures de sécurité et de confidentialité mises en place.",
        options: [
          {v:'acces_physique',l:'Accès physique protégé (bâtiment ou local sécurisé)'},
          {v:'authentification',l:'Procédé d\'authentification des utilisateurs (mot de passe, carte à puce, certificat, signature...)'},
          {v:'journalisation',l:'Journalisation des connexions effectuée'},
          {v:'reseau_interne',l:'Traitement sur réseau interne dédié (non relié à internet)'},
          {v:'chiffrement',l:'Canal de transport ou données chiffrés (si échanges en réseau)'},
        ] },
    ],
  },

  // ── SÉCURITÉ ARCHITECTURE (autorisation — détaillé) ────────
  securite_architecture: {
    label: 'Sécurité et architecture informatique',
    champs: [
      { id: 'os', label: 'Système(s) d\'exploitation utilisé(s)', required: true, placeholder: 'Ex: Windows Server 2019, Ubuntu 22.04, iOS...' },
      { id: 'systeme_info', label: 'Constitution du système informatique', required: true, type: 'checkboxes',
        options: [{v:'micro_ordi',l:'Micro-ordinateurs (fixes ou nomades)'},{v:'serveur',l:'Serveur(s)'},{v:'autre_si',l:'Autre architecture'}] },
      { id: 'logiciel_app', label: 'Logiciel d\'application', type: 'checkboxes',
        options: [{v:'bdd',l:'Base de données'},{v:'infocentre',l:'Infocentre'},{v:'stats',l:'Logiciel d\'analyse statistique'},{v:'autre_logiciel',l:'Autre'}] },
      { id: 'reseau', label: 'Nature du réseau informatique', required: true, type: 'checkboxes',
        aide: "Décrivez l'infrastructure réseau de votre organisation.",
        options: [
          {v:'aucun',l:'Aucun réseau (micro-ordinateur isolé)'},{v:'meme_site',l:'Réseaux sur un même site'},
          {v:'distants',l:'Plusieurs réseaux distants interconnectés'},{v:'externe',l:'Réseaux externalisés chez un prestataire'},
          {v:'internet',l:'Communications avec l\'extérieur (Internet)'},{v:'wifi',l:'WiFi'},
        ] },
      { id: 'echanges_techniques', label: 'Échanges de données techniques', type: 'checkboxes',
        options: [
          {v:'internet_web',l:'Échanges sur Internet (Web, email, transfert de fichier...)'},{v:'reseau_prive',l:'Échanges sur réseau privé (VPN, LS...)'},
          {v:'supports_num',l:'Transfert de supports numériques (disque, CD, clé USB...)'},
        ] },
      { id: 'securite_physique', label: 'Sécurité physique des locaux et équipements', required: true, type: 'textarea',
        placeholder: 'Ex: badges d\'accès, gardiennage, sas sécurisé, alarme...' },
      { id: 'sauvegarde', label: 'Sauvegarde des données', required: true, type: 'textarea',
        placeholder: 'Ex: Sauvegarde quotidienne sur serveur NAS sécurisé, copie mensuelle externalisée chez OVH France...' },
      { id: 'protection_intrusions', label: 'Protection contre les intrusions', required: true, type: 'checkboxes',
        options: [
          {v:'antivirus',l:'Antivirus installé sur tous les postes'},{v:'ids',l:'Système de détection d\'intrusion (IDS)'},
          {v:'dmz_firewall',l:'Compartimentage réseau avec DMZ / Firewall'},{v:'vlan',l:'Réseaux isolés (VLAN)'},
        ] },
      { id: 'authentification_users', label: 'Authentification des utilisateurs', required: true, type: 'checkboxes',
        options: [
          {v:'mdp',l:'Mot de passe (avec règles de complexité)'},{v:'carte_puce',l:'Carte à puce ou dispositif physique'},
          {v:'biometrie',l:'Dispositif biométrique'},{v:'certificat',l:'Certificats logiciels'},
        ] },
      { id: 'journalisation', label: 'Journalisation', required: true, type: 'checkboxes',
        options: [
          {v:'acces_app',l:'Accès à l\'application journalisés (date/heure, poste, utilisateur)'},{v:'acces_donnees',l:'Accès aux fichiers de données journalisés'},
          {v:'operations',l:'Opérations journalisées (consultation, création, modification, suppression)'},
        ] },
      { id: 'chiffrement_donnees', label: 'Chiffrement et confidentialité', type: 'textarea',
        placeholder: 'Ex: Chiffrement AES-256 des données stockées, TLS 1.3 pour les communications...' },
    ],
  },

  // ── TRANSFERT HORS CEDEAO ──────────────────────────────────
  transfert_cedeao: {
    label: 'Transfert de données hors CEDEAO',
    champs: [
      { id: 'has_transfert', label: 'Transférez-vous des données vers un pays hors CEDEAO ?', required: true, type: 'select',
        options: [{v:'non',l:'Non'},{v:'oui',l:'Oui — compléter les informations ci-dessous'}],
        aide: "CEDEAO = 15 pays d'Afrique de l'Ouest (Bénin, Burkina Faso, Cap-Vert, CI, Gambie, Ghana, Guinée, Guinée-Bissau, Libéria, Mali, Niger, Nigeria, Sénégal, Sierra Leone, Togo).\nTransferts intra-CEDEAO : LIBRES.\nTransferts hors CEDEAO : AUTORISATION ARTCI obligatoire." },
      { id: 'transfert_pays', label: 'Pays destinataire', placeholder: 'Ex: France, USA, Maroc...' },
      { id: 'transfert_organisme', label: 'Coordonnées de l\'organisme destinataire', type: 'textarea',
        placeholder: 'Raison sociale, adresse complète, email, téléphone...' },
      { id: 'transfert_type_dest', label: 'Type de destinataire', type: 'select',
        options: [{v:'',l:'-- Choisir --'},{v:'maison_mere',l:'Maison mère'},{v:'filiale',l:'Filiale / Succursale'},{v:'client',l:'Client'},{v:'sous_traitant',l:'Sous-traitant'},{v:'fournisseur',l:'Fournisseur'},{v:'autre',l:'Autre'}] },
      { id: 'transfert_autorite', label: 'Le pays destinataire a-t-il une autorité de protection des données ?', type: 'select',
        options: [{v:'',l:'-- Choisir --'},{v:'oui',l:'Oui'},{v:'non',l:'Non'},{v:'inconnu',l:'Je ne sais pas'}],
        aide: "Si oui, indiquez si le traitement est déclaré/autorisé dans ce pays et son numéro d'enregistrement." },
      { id: 'transfert_garanties', label: 'Garanties apportées pour ce transfert', type: 'checkboxes',
        aide: "Quelles garanties assurent la protection des données une fois transférées ?",
        options: [
          {v:'clauses_contractuelles',l:'Clauses contractuelles types'},{v:'bcr',l:'BCR (Binding Corporate Rules)'},
          {v:'safe_harbor',l:'Safe Harbor / Privacy Shield'},{v:'accord_bilateral',l:'Accord bilatéral CI'},
          {v:'consentement',l:'Consentement explicite de la personne concernée'},
        ] },
    ],
  },

  // ── DROIT D'ACCÈS ──────────────────────────────────────────
  droit_acces: {
    label: "Droit d'accès des personnes",
    champs: [
      { id: 'info_methodes', label: 'Comment informez-vous les personnes de leur droit d\'accès ?', required: true, type: 'checkboxes',
        aide: "Le responsable doit informer les personnes de : son identité, la finalité, le caractère obligatoire/facultatif des réponses, les destinataires, les modalités d'exercice des droits.",
        options: [
          {v:'mentions_formulaire',l:'Mentions légales sur formulaire'},{v:'affichage',l:'Affichage dans les locaux'},
          {v:'site_internet',l:'Mentions sur site internet'},{v:'courrier_perso',l:'Envoi d\'un courrier personnalisé'},
          {v:'autres',l:'Autres mesures'},
        ] },
      { id: 'service_droit_acces', label: 'Service chargé de répondre aux demandes de droit d\'accès', required: true,
        placeholder: 'Ex: Direction RH, Service juridique, DPO...',
        aide: "Indiquez le service ou la personne que les individus doivent contacter pour exercer leurs droits." },
      { id: 'email_droit_acces', label: 'Email dédié aux droits', required: true, type: 'email',
        placeholder: 'Ex: droits@votre-entreprise.ci' },
    ],
  },

  // ── SIGNATURE ──────────────────────────────────────────────
  signature: {
    label: 'Signature du responsable',
    champs: [
      { id: 'signataire_nom', label: 'Nom et prénom du signataire', required: true,
        aide: "La personne signataire doit impérativement être le responsable de l'organisme déclarant ET être de nationalité ivoirienne." },
      { id: 'signataire_fonction', label: 'Fonction du signataire', required: true, placeholder: 'Ex: Directeur Général, Gérant...' },
      { id: 'signataire_nationalite', label: 'Nationalité du signataire', required: true, placeholder: 'Ivoirienne',
        aide: "⚠️ OBLIGATOIRE : Conformément à la loi n°2013-450, le signataire doit obligatoirement être de nationalité ivoirienne." },
      { id: 'email_recepisse', label: 'Email pour réception du récépissé ARTCI', required: true, type: 'email',
        aide: "L'ARTCI enverra le récépissé de déclaration ou la décision d'autorisation à cette adresse." },
      { id: 'engagement', label: 'Engagement', required: true, type: 'select',
        options: [{v:'oui',l:'Je m\'engage à ce que le traitement décrit respecte les exigences de la loi n°2013-450 du 19 juin 2013'}],
        aide: "En signant électroniquement, vous attestez que toutes les informations fournies sont exactes et que le traitement est conforme à la loi." },
    ],
  },

  // ── CONTACT (autorisation) ─────────────────────────────────
  personne_contact: {
    label: 'Personne à contacter',
    champs: [
      { id: 'contact_nom_prenom', label: 'Nom et prénom ou raison sociale', required: true,
        aide: "Personne qui a complété ce formulaire et sera le contact ARTCI pour tout complément d'information." },
      { id: 'contact_service', label: 'Service', placeholder: 'Ex: Direction Juridique, DPO...' },
      { id: 'contact_adresse', label: 'Adresse' },
      { id: 'contact_email', label: 'Adresse électronique', required: true, type: 'email' },
      { id: 'contact_telephone', label: 'Téléphone', required: true },
    ],
  },

  // ── SECTIONS SPÉCIFIQUES TRANSFERT INTERNATIONAL ──────────
  destinataire_transfert: {
    label: 'Identification du destinataire des données',
    champs: [
      { id: 'dest_type_personne', label: 'Le destinataire est', required: true, type: 'select',
        options: [{v:'morale',l:'Personne Morale'},{v:'physique',l:'Personne Physique'}] },
      { id: 'dest_raison_sociale', label: 'Raison sociale / Nom', required: true },
      { id: 'dest_adresse', label: 'Adresse', required: true },
      { id: 'dest_pays', label: 'Pays', required: true },
      { id: 'dest_email', label: 'Email', required: true, type: 'email' },
      { id: 'dest_telephone', label: 'Téléphone', required: true },
      { id: 'dest_type', label: 'Type de destinataire', required: true, type: 'select',
        options: [{v:'',l:'-- Choisir --'},{v:'succursale',l:'Succursale'},{v:'siege',l:'Siège'},{v:'client',l:'Client'},{v:'sous_traitant',l:'Sous-traitant'},{v:'fournisseur',l:'Fournisseur'},{v:'autre',l:'Autre'}] },
      { id: 'dest_autorite_protection', label: 'Le pays destinataire dispose-t-il d\'une autorité de protection des données ?', required: true, type: 'select',
        options: [{v:'oui',l:'Oui'},{v:'non',l:'Non'}],
        aide: "Si oui, indiquez si le traitement est déclaré/autorisé dans ce pays (numéro d'enregistrement)." },
      { id: 'dest_num_declaration', label: 'N° de déclaration/autorisation dans le pays destinataire (si applicable)' },
      { id: 'dest_rep_legal_nom', label: 'Représentant légal du destinataire — Nom', required: true },
      { id: 'dest_rep_legal_prenom', label: 'Prénom du représentant légal', required: true },
      { id: 'dest_rep_legal_qualite', label: 'Qualité / Fonction', required: true },
      { id: 'dest_rep_legal_nationalite', label: 'Nationalité' },
    ],
  },

  description_fichier: {
    label: 'Description du fichier transféré',
    champs: [
      { id: 'fichier_nom', label: 'Nom du fichier', required: true, placeholder: 'Ex: Fichier RH Groupe, Base clients CI...' },
      { id: 'fichier_descriptif', label: 'Descriptif du fichier', required: true, type: 'textarea',
        placeholder: 'Description du contenu et de l\'objet du fichier transféré...' },
      { id: 'fichier_nb_personnes', label: 'Nombre approximatif de personnes concernées', required: true, placeholder: 'Ex: 500, 2000, 10000...' },
      { id: 'mode_transfert', label: 'Mode de transfert', required: true, type: 'checkboxes',
        aide: "Comment les données sont-elles transmises hors du territoire de la CEDEAO ?",
        options: [
          {v:'email',l:'Fichier joint à un email'},{v:'cle_usb',l:'Clé USB / Support physique'},
          {v:'plateforme',l:'Plateforme de téléchargement'},{v:'reseau_dedie',l:'Réseau informatique dédié (VPN, ligne spécialisée)'},
          {v:'cloud',l:'Service Cloud (AWS, Azure, Google Cloud...)'},{v:'autre',l:'Autre mode'},
        ] },
      { id: 'finalite_transfert', label: 'Finalité du transfert', required: true, type: 'textarea',
        placeholder: 'Ex: Gestion centralisée des RH du groupe, hébergement des données sur serveurs européens...' },
      { id: 'frequence_transfert', label: 'Fréquence du transfert', required: true, type: 'select',
        options: [{v:'ponctuel',l:'Ponctuel (une seule fois)'},{v:'quotidien',l:'Quotidien'},{v:'hebdomadaire',l:'Hebdomadaire'},{v:'mensuel',l:'Mensuel'},{v:'permanent',l:'Flux permanent / Continu'},{v:'autre',l:'Autre'}] },
      { id: 'date_premier_transfert', label: 'Date prévue du premier transfert', placeholder: 'Ex: 01/06/2026' },
    ],
  },

  consentement_transfert: {
    label: 'Consentement des personnes concernées',
    champs: [
      { id: 'consentement_obtenu', label: 'Les personnes ont-elles consenti au transfert de leurs données ?', required: true, type: 'select',
        options: [{v:'oui_direct',l:'Oui — consentement obtenu directement auprès de la personne'},{v:'oui_indirect',l:'Oui — collecte indirecte (consentement obtenu par un tiers)'},{v:'non',l:'Non — transfert sans consentement (justification requise)'}],
        aide: "Pour les transferts vers des pays hors CEDEAO, le consentement explicite des personnes est en principe requis." },
      { id: 'consentement_methode', label: 'Si oui — Méthode de recueil du consentement', type: 'textarea',
        placeholder: 'Ex: Case à cocher non précochée sur le formulaire d\'inscription, avec mention indiquant que les données peuvent être transférées vers [pays]...' },
      { id: 'consentement_info_pays', label: 'Les personnes ont-elles été informées des pays destinataires ?', type: 'select',
        options: [{v:'oui',l:'Oui'},{v:'non',l:'Non'}] },
    ],
  },

  garanties_pays_tiers: {
    label: 'Transfert vers pays sans protection suffisante',
    champs: [
      { id: 'raison_transfert_non_adequat', label: 'Justification du transfert', required: true, type: 'checkboxes',
        aide: "Si le pays destinataire n'offre pas un niveau de protection équivalent à la CI, cochez la ou les raisons qui justifient ce transfert.",
        options: [
          {v:'sauvegarde_vie',l:'Sauvegarde de la vie de la personne concernée'},
          {v:'interet_public',l:'Prévention de l\'intérêt public'},
          {v:'obligation_juridique',l:'Respect d\'obligations permettant de constater, exercer ou défendre un droit en justice'},
          {v:'execution_contrat',l:'Exécution d\'un contrat entre le responsable et la personne concernée'},
          {v:'conclusion_contrat',l:'Conclusion ou exécution d\'un contrat avec un tiers dans l\'intérêt de la personne'},
          {v:'entraide_judiciaire',l:'Exécution d\'une mesure d\'entraide judiciaire internationale'},
          {v:'prevention_medicale',l:'Prévention, diagnostic ou traitement d\'affection médicale'},
          {v:'accord_bilateral',l:'Accord bilatéral ou multilatéral auquel la CI est partie'},
          {v:'garanties_contractuelles',l:'Garanties contractuelles suffisantes (clauses types, BCR...)'},
        ] },
    ],
  },

  securite_transfert: {
    label: 'Sécurité des transferts',
    champs: [
      { id: 'securite_transfert_mesures', label: 'Mesures de sécurisation du transfert', required: true, type: 'checkboxes',
        aide: "Précisez les mesures de sécurité mises en place pour sécuriser le transfert de données.",
        options: [
          {v:'authentification_dest',l:'Authentification des destinataires (contrôle d\'identité, VPN...)'},
          {v:'integrite',l:'Intégrité des données (mesure de sécurité au niveau du canal de transmission)'},
          {v:'clauses_contractuelles',l:'Clauses contractuelles (sécurité des données, droit d\'accès, audit...)'},
          {v:'destruction',l:'Destruction des données non utilisées (engagement du destinataire, contrôle sur site)'},
          {v:'confidentialite',l:'Confidentialité (droit d\'accès et des profils, login et mot de passe)'},
          {v:'controle_acces',l:'Contrôle de l\'accès (protection physique des locaux et équipements)'},
          {v:'chiffrement_com',l:'Chiffrement de la communication (VPN, certificat électronique)'},
          {v:'cryptage',l:'Cryptage ou codage des données (algorithmes, logiciel de cryptage, anonymisation...)'},
        ] },
    ],
  },
}

// ════════════════════════════════════════════════════════════
// CONFIGURATION DES FORMULAIRES PAR COMPOSITION DE SECTIONS
// ════════════════════════════════════════════════════════════

const CONFIGS = {
  declaration: {
    titre: 'Déclaration normale de traitement',
    etapes: [
      { label: 'Le déclarant',        section: 'declarant' },
      { label: 'Représentant légal',  section: 'representant_legal' },
      { label: 'Mise en œuvre',       section: 'service_mise_en_oeuvre' },
      { label: 'Finalité',            section: 'finalite' },
      { label: 'Données traitées',    section: 'categories_donnees' },
      { label: 'Données sensibles',   section: 'donnees_sensibles' },
      { label: 'Échanges',            section: 'echanges_interconnexions' },
      { label: 'Sécurité',            section: 'securite' },
      { label: 'Transfert CEDEAO',    section: 'transfert_cedeao' },
      { label: 'Droit d\'accès',      section: 'droit_acces' },
      { label: 'Signature',           section: 'signature' },
    ],
  },
  autorisation: {
    titre: "Demande d'autorisation préalable",
    etapes: [
      { label: 'Le déclarant',        section: 'declarant' },
      { label: 'Représentant légal',  section: 'representant_legal' },
      { label: 'Mise en œuvre',       section: 'service_mise_en_oeuvre' },
      { label: 'Finalité',            section: 'finalite_autorisation' },
      { label: 'Transfert CEDEAO',    section: 'transfert_cedeao' },
      { label: 'Données traitées',    section: 'categories_donnees' },
      { label: 'Données sensibles',   section: 'donnees_sensibles_auto' },
      { label: 'Interconnexions',     section: 'interconnexions' },
      { label: 'Droit d\'accès',      section: 'droit_acces' },
      { label: 'Sécurité & Archi',    section: 'securite_architecture' },
      { label: 'Personne contact',    section: 'personne_contact' },
      { label: 'Signature',           section: 'signature' },
    ],
  },
  transfert: {
    titre: 'Demande de transfert de données à l\'étranger',
    etapes: [
      { label: 'Déclarant',           section: 'declarant' },
      { label: 'Représentant légal',  section: 'representant_legal' },
      { label: 'Destinataire',        section: 'destinataire_transfert' },
      { label: 'Fichier transféré',   section: 'description_fichier' },
      { label: 'Consentement',        section: 'consentement_transfert' },
      { label: 'Garanties',           section: 'garanties_pays_tiers' },
      { label: 'Sécurité transfert',  section: 'securite_transfert' },
      { label: 'Signature',           section: 'signature' },
    ],
  },
  dpo: {
    titre: 'Enregistrement du correspondant DPO',
    etapes: [
      { label: 'L\'entreprise',       section: 'declarant' },
      { label: 'Représentant légal',  section: 'representant_legal' },
      { label: 'Le correspondant',    section: null, champs: [
        { id: 'dpo_nom', label: 'Nom et prénom du DPO', required: true,
          aide: "Le DPO doit être indépendant du responsable de traitement. Il ne peut pas être le dirigeant de l'entreprise. Peut être salarié ou prestataire externe." },
        { id: 'dpo_email', label: 'Email du DPO', required: true, type: 'email',
          aide: "L'ARTCI utilisera cet email pour contacter le DPO directement en cas de contrôle." },
        { id: 'dpo_telephone', label: 'Téléphone du DPO', required: true },
        { id: 'dpo_qualification', label: 'Qualification / Expérience', type: 'textarea',
          placeholder: 'Formation juridique ou informatique, certifications (CIPP, CIPM...), expérience en protection des données personnelles...', aide: "L'ARTCI vérifie que le DPO dispose des compétences requises. Décrivez sa formation et son expérience." },
        { id: 'dpo_independance', label: 'Confirmation d\'indépendance', required: true, type: 'select',
          options: [{v:'oui',l:'Je confirme que le DPO est indépendant du responsable de traitement et n\'est pas le dirigeant de l\'entreprise'}],
          aide: "Le DPO ne peut pas recevoir d'instructions pour l'exercice de sa mission." },
      ]},
      { label: 'Signature', section: 'signature' },
    ],
  },
}

// ════════════════════════════════════════════════════════════
// HOOK DEBOUNCE
// ════════════════════════════════════════════════════════════

function useDebounce(delay = 1200) {
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
        if (l === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid #ddd', margin: '4px 0' }} />
        if (l.startsWith('### ')) return <div key={i} style={{ fontWeight: 600, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{l.replace(/^###\s*/, '').replace(/\*\*/g, '')}</div>
        if (l.startsWith('## '))  return <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{l.replace(/^##\s*/, '').replace(/\*\*/g, '')}</div>
        if (l.startsWith('# '))   return <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 6 }}>{l.replace(/^#\s*/, '').replace(/\*\*/g, '')}</div>
        if (l.startsWith('- ') || l.startsWith('• ') || l.startsWith('* ')) {
          const content = l.replace(/^[-•*]\s*/, '')
          return <div key={i} style={{ paddingLeft: 12, marginBottom: 3, display: 'flex', gap: 6 }}>
            <span style={{ flexShrink: 0 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        }
        return <div key={i} style={{ marginBottom: 3 }} dangerouslySetInnerHTML={{ __html: l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
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
    text: `Bonjour ! Je suis votre assistant DPO.\n\nJe connais les formulaires officiels ARTCI et je peux vous aider à remplir chaque champ correctement.\n\nFormulaire en cours : **${config.titre}**\n\nQuelle est votre question ?`
  }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (visible) inputRef.current?.focus() }, [visible])

  function buildContexte() {
    const etape = config.etapes[etapeIndex]
    return JSON.stringify({ formulaire: config.titre, etape_actuelle: etape?.label, donnees_saisies: donnees })
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
    } finally { setLoading(false) }
  }

  if (!visible) return null

  return (
    <div style={{ position:'fixed', bottom:24, right:24, width:380, height:540, background:'#fff', border:'1px solid #ddd', borderRadius:12, display:'flex', flexDirection:'column', boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:1000 }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111', borderRadius:'12px 12px 0 0' }}>
        <div>
          <div style={{ fontWeight:600, fontSize:14, color:'#fff' }}>Assistant DPO — ARTCI</div>
          <div style={{ fontSize:11, color:'#aaa' }}>Formulaires officiels loi n°2013-450</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role==='user'?'flex-end':'flex-start', maxWidth:'90%' }}>
            <div style={{ padding:'8px 12px', borderRadius:8, fontSize:13, background: m.role==='user'?'#111':'#f5f5f5', color: m.role==='user'?'#fff':'#111' }}>
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

  const [etape, setEtape]             = useState(0)
  const [donnees, setDonnees]         = useState({})
  const [feedbacks, setFeedbacks]     = useState({})
  const [analyzing, setAnalyzing]     = useState({})
  const [loading, setLoading]         = useState(false)
  const [err, setErr]                 = useState('')
  const [chatVisible, setChatVisible] = useState(false)
  const debounce = useDebounce()

  useEffect(() => {
    api.getEntreprise().then(e => {
      if (e) setDonnees(d => ({
        raison_sociale: e.denomination, num_cc: e.fiscal,
        adresse: e.siege, telephone: e.telephone,
        email_contact: e.email_droits, contact_nom: e.representant,
        rep_nom: e.representant?.split(' ').slice(-1)[0] || '',
        rep_prenom: e.representant?.split(' ').slice(0,-1).join(' ') || '',
        rep_qualite: e.fonction, signataire_nom: e.representant,
        signataire_fonction: e.fonction, email_recepisse: e.email_droits,
        ...d
      }))
    }).catch(() => {})
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
        const r = await api.validerChamp({ champ: chamId, valeur, contexte: JSON.stringify({formulaire: config.titre, ...donnees}).slice(0,400) })
        setFb(chamId, r)
      } catch { setFb(chamId, { type:'info', message:'IA indisponible.' }) }
      finally { setAn(chamId, false) }
    })
  }

  function onCheckChange(chamId, val, checked) {
    setDonnees(d => {
      const prev = Array.isArray(d[chamId]) ? d[chamId] : []
      const next = checked ? [...prev, val] : prev.filter(v => v !== val)
      return { ...d, [chamId]: next }
    })
  }

  async function suivant() {
    setErr('')
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

  function getChampsEtape(etapeConfig) {
    if (etapeConfig.champs) return etapeConfig.champs
    if (etapeConfig.section && S[etapeConfig.section]) return S[etapeConfig.section].champs
    return []
  }

  function renderChamp(c) {
    const val = donnees[c.id] !== undefined ? donnees[c.id] : ''
    const fb  = feedbacks[c.id]
    const an  = analyzing[c.id]

    if (c.type === 'checkboxes') {
      const selected = Array.isArray(donnees[c.id]) ? donnees[c.id] : []
      return (
        <div className="field" key={c.id}>
          <label>{c.label} {c.required && <span className="required">*</span>}</label>
          {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
          <div className="check-grid">
            {c.options.map(o => {
              const checked = selected.includes(o.v)
              return (
                <label key={o.v} className={`check-item ${checked?'checked':''} ${o.sensible&&checked?'danger':''}`}>
                  <input type="checkbox" checked={checked} onChange={e => onCheckChange(c.id, o.v, e.target.checked)} />
                  <span className="check-label">{o.l}</span>
                  {o.sensible && <span className="check-badge">AUTORISATION</span>}
                </label>
              )
            })}
          </div>
        </div>
      )
    }

    if (c.type === 'select') return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
        <select value={val} onChange={e => onTextChange(c.id, e.target.value)}>
          {c.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        {fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )

    if (c.type === 'textarea') return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
        <textarea value={val} onChange={e => onTextChange(c.id, e.target.value)} placeholder={c.placeholder||''} />
        {an && <div className="fb show loading">Analyse IA en cours...</div>}
        {!an && fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )

    return (
      <div className="field" key={c.id}>
        <label>{c.label} {c.required && <span className="required">*</span>}</label>
        {c.aide && <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.5, whiteSpace:'pre-line' }}>{c.aide}</div>}
        <input type={c.type||'text'} value={val} onChange={e => onTextChange(c.id, e.target.value)} placeholder={c.placeholder||''} />
        {an && <div className="fb show loading">Analyse IA en cours...</div>}
        {!an && fb && <div className={`fb show ${fb.type}`}>{fb.message}</div>}
      </div>
    )
  }

  const etapeCourante = config.etapes[etape]
  const champsEtape   = getChampsEtape(etapeCourante)
  const estDerniere   = etape === config.etapes.length - 1

  // Barre de progression condensée (max 6 visible)
  const nbEtapes = config.etapes.length
  const showFirst = Math.max(0, etape - 2)
  const showLast  = Math.min(nbEtapes, showFirst + 5)

  return (
    <>
      <nav className="nav">
        <div className="nav-logo">Infinity Compliance</div>
        <div className="nav-right">
          <span style={{ fontSize:12, color:'#888' }}>Étape {etape+1}/{nbEtapes}</span>
          <span className="nav-link" onClick={() => nav('/dashboard')}>← Tableau de bord</span>
        </div>
      </nav>

      <div className="page">
        <h1>{config.titre}</h1>
        <p className="subtitle">Formulaire officiel ARTCI — L'assistant IA valide vos saisies en temps réel.</p>

        {/* Progress condensé */}
        <div style={{ display:'flex', gap:4, marginBottom:24, flexWrap:'wrap' }}>
          {config.etapes.slice(showFirst, showLast).map((e, i) => {
            const idx = showFirst + i
            return (
              <div key={idx} style={{ display:'flex', alignItems:'center', gap:4 }}>
                {i > 0 && <div style={{ width:12, height:1, background: idx<=etape?'#111':'#ddd' }} />}
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, background: idx===etape?'#111':idx<etape?'#111':'#eee', color: idx<=etape?'#fff':'#888', flexShrink:0 }}>
                    {idx < etape ? '✓' : idx+1}
                  </div>
                  <span style={{ fontSize:11, color: idx===etape?'#111':'#888', fontWeight: idx===etape?500:400, whiteSpace:'nowrap' }}>{e.label}</span>
                </div>
              </div>
            )
          })}
          {showLast < nbEtapes && <span style={{ fontSize:11, color:'#888' }}>... +{nbEtapes - showLast} étapes</span>}
        </div>

        {err && <div className="alert alert-err">{err}</div>}

        <h2>{etapeCourante.label}</h2>
        {champsEtape.map(c => renderChamp(c))}

        <div className="wizard-nav">
          <button className="btn btn-secondary" onClick={() => etape > 0 ? (setEtape(e=>e-1), window.scrollTo({top:0})) : nav('/dashboard')} disabled={loading}>
            {etape === 0 ? '← Annuler' : '← Retour'}
          </button>
          <button className="btn btn-primary" onClick={suivant} disabled={loading}>
            {loading ? 'Sauvegarde...' : estDerniere ? 'Passer à la signature →' : 'Suivant →'}
          </button>
        </div>
      </div>

      {!chatVisible && (
        <button onClick={() => setChatVisible(true)} style={{ position:'fixed', bottom:24, right:24, background:'#111', color:'#fff', border:'none', borderRadius:50, padding:'12px 20px', cursor:'pointer', fontSize:14, fontWeight:500, boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:8, zIndex:999 }}>
          💬 Aide DPO
        </button>
      )}

      <ChatAssistant config={config} etapeIndex={etape} donnees={donnees} visible={chatVisible} onClose={() => setChatVisible(false)} />
    </>
  )
}