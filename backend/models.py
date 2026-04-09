from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Utilisateur(db.Model):
    __tablename__ = 'utilisateurs'

    id             = db.Column(db.Integer, primary_key=True)
    email          = db.Column(db.String(255), unique=True, nullable=False, index=True)
    mot_de_passe   = db.Column(db.String(255), nullable=False)
    profil_complet = db.Column(db.Boolean, default=False)

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

    nom        = db.Column(db.String(255), nullable=False)
    url        = db.Column(db.Text,        nullable=False)
    public_id  = db.Column(db.String(255), nullable=False)
    type       = db.Column(db.String(10),  nullable=False)
    taille     = db.Column(db.Integer,     nullable=False)

    cree_le    = db.Column(db.DateTime, default=datetime.utcnow)