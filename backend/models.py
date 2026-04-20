from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Utilisateur(db.Model):
    __tablename__ = 'utilisateurs'

    id             = db.Column(db.Integer, primary_key=True)
    email          = db.Column(db.String(255), unique=True, nullable=False, index=True)
    mot_de_passe   = db.Column(db.String(255), nullable=False)
    profil_complet = db.Column(db.Boolean, default=False)
    actif          = db.Column(db.Boolean, default=True)

    # Vérification email
    email_verifie        = db.Column(db.Boolean, default=False)
    verification_code    = db.Column(db.String(6),   nullable=True)
    verification_expire  = db.Column(db.DateTime,    nullable=True)

    # A2F
    a2f_active   = db.Column(db.Boolean, default=False)
    otp_temp     = db.Column(db.String(6),  nullable=True)
    otp_expire   = db.Column(db.DateTime,   nullable=True)

    # Password reset
    reset_token        = db.Column(db.String(100), nullable=True)
    reset_token_expire = db.Column(db.DateTime,    nullable=True)

    cree_le = db.Column(db.DateTime, default=datetime.utcnow)

    entreprise = db.relationship('Entreprise', backref='utilisateur', uselist=False)
    dossiers   = db.relationship('Dossier',    backref='utilisateur', lazy=True)


class Entreprise(db.Model):
    __tablename__ = 'entreprises'

    id             = db.Column(db.Integer, primary_key=True)
    utilisateur_id = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False, index=True)

    denomination    = db.Column(db.String(255))
    forme_juridique = db.Column(db.String(50))
    rccm            = db.Column(db.String(100))
    fiscal          = db.Column(db.String(100))
    siege           = db.Column(db.Text)
    representant    = db.Column(db.String(255))
    fonction        = db.Column(db.String(100))
    telephone       = db.Column(db.String(50))
    email_droits    = db.Column(db.String(255))
    secteur         = db.Column(db.String(100))
    logo_url        = db.Column(db.String(500), nullable=True)

    cree_le       = db.Column(db.DateTime, default=datetime.utcnow)
    mis_a_jour_le = db.Column(db.DateTime, onupdate=datetime.utcnow)


class Dossier(db.Model):
    __tablename__ = 'dossiers'

    id              = db.Column(db.Integer, primary_key=True)
    utilisateur_id  = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False, index=True)

    reference       = db.Column(db.String(20),  unique=True, nullable=False, index=True)
    type_formulaire = db.Column(db.String(50),  nullable=False)
    statut          = db.Column(db.String(50),  default='brouillon', index=True)
    donnees         = db.Column(db.JSON,        default=dict)

    # Signature
    otp_signature = db.Column(db.String(6),  nullable=True)
    signe_le      = db.Column(db.DateTime,   nullable=True)

    # Récépissé ARTCI
    num_recepisse = db.Column(db.String(100), nullable=True)
    recepisse_le  = db.Column(db.DateTime,   nullable=True)
    signature_image = db.Column(db.String(500), nullable=True)  # URL Cloudinary

    cree_le       = db.Column(db.DateTime, default=datetime.utcnow)
    mis_a_jour_le = db.Column(db.DateTime, onupdate=datetime.utcnow)

    pieces_jointes = db.relationship('PieceJointe', backref='dossier', lazy=True, cascade='all, delete-orphan')


class PieceJointe(db.Model):
    __tablename__ = 'pieces_jointes'

    id         = db.Column(db.Integer, primary_key=True)
    dossier_id = db.Column(db.Integer, db.ForeignKey('dossiers.id'), nullable=False)

    nom           = db.Column(db.String(255), nullable=False)
    url           = db.Column(db.Text,        nullable=False)
    public_id     = db.Column(db.String(255), nullable=False)
    resource_type = db.Column(db.String(10),  nullable=False, default='raw')
    type          = db.Column(db.String(10),  nullable=False)
    taille        = db.Column(db.Integer,     nullable=False)

    cree_le    = db.Column(db.DateTime, default=datetime.utcnow)


class Paiement(db.Model):
    __tablename__ = 'paiements'

    id                  = db.Column(db.Integer, primary_key=True)
    dossier_id          = db.Column(db.Integer, db.ForeignKey('dossiers.id'), nullable=False)
    utilisateur_id      = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False)
    montant_fcfa        = db.Column(db.Integer, nullable=False)
    montant_eur_centimes= db.Column(db.Integer, nullable=False, default=0)
    stripe_id           = db.Column(db.String(255), nullable=True)
    statut              = db.Column(db.String(20),  default='reussi')
    cree_le             = db.Column(db.DateTime, default=datetime.utcnow)

    dossier      = db.relationship('Dossier',      backref='paiements')
    utilisateur  = db.relationship('Utilisateur',  backref='paiements')


class LogAdmin(db.Model):
    __tablename__ = 'logs_admin'

    id          = db.Column(db.Integer, primary_key=True)
    action      = db.Column(db.String(100), nullable=False)
    dossier_ref = db.Column(db.String(50),  nullable=True)
    details     = db.Column(db.Text,        nullable=True)
    cree_le     = db.Column(db.DateTime, default=datetime.utcnow)


class Config(db.Model):
    __tablename__ = 'config'

    id     = db.Column(db.Integer, primary_key=True)
    cle    = db.Column(db.String(100), unique=True, nullable=False)
    valeur = db.Column(db.Text, nullable=False)


class AgentARTCI(db.Model):
    __tablename__ = 'agents_artci'

    id           = db.Column(db.Integer, primary_key=True)
    nom          = db.Column(db.String(100), nullable=False)
    prenom       = db.Column(db.String(100), nullable=False)
    email        = db.Column(db.String(255), unique=True, nullable=False, index=True)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    service      = db.Column(db.String(100), nullable=False)
    actif        = db.Column(db.Boolean, default=True)
    cree_le      = db.Column(db.DateTime, default=datetime.utcnow)

    rapports = db.relationship('RapportARTCI', backref='agent', lazy=True)


class RapportARTCI(db.Model):
    __tablename__ = 'rapports_artci'

    id              = db.Column(db.Integer, primary_key=True)
    dossier_id      = db.Column(db.Integer, db.ForeignKey('dossiers.id'), nullable=False)
    agent_id        = db.Column(db.Integer, db.ForeignKey('agents_artci.id'), nullable=False)
    contenu_rapport = db.Column(db.Text, nullable=False)
    decision        = db.Column(db.String(20), nullable=True)  # valide | refuse | None
    note_refus      = db.Column(db.Text, nullable=True)
    genere_le       = db.Column(db.DateTime, default=datetime.utcnow)
    decide_le       = db.Column(db.DateTime, nullable=True)

    dossier = db.relationship('Dossier', backref='rapports_artci')
