from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Utilisateur(db.Model):
    __tablename__ = 'utilisateurs'

    id               = db.Column(db.Integer, primary_key=True)
    email            = db.Column(db.String(255), unique=True, nullable=False)
    mot_de_passe     = db.Column(db.String(255), nullable=False)
    profil_complet   = db.Column(db.Boolean, default=False)

    # Double authentification
    a2f_active       = db.Column(db.Boolean, default=False)
    otp_temp         = db.Column(db.String(6), nullable=True)
    otp_expire       = db.Column(db.DateTime, nullable=True)

    # Password reset
    reset_token        = db.Column(db.String(100), nullable=True)
    reset_token_expire = db.Column(db.DateTime, nullable=True)

    cree_le          = db.Column(db.DateTime, default=datetime.utcnow)

    entreprise = db.relationship('Entreprise', backref='utilisateur', uselist=False)
    dossiers   = db.relationship('Dossier', backref='utilisateur', lazy=True)


class Entreprise(db.Model):
    __tablename__ = 'entreprises'

    id             = db.Column(db.Integer, primary_key=True)
    utilisateur_id = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False)

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

    cree_le        = db.Column(db.DateTime, default=datetime.utcnow)
    mis_a_jour_le  = db.Column(db.DateTime, onupdate=datetime.utcnow)


class Dossier(db.Model):
    __tablename__ = 'dossiers'

    id               = db.Column(db.Integer, primary_key=True)
    utilisateur_id   = db.Column(db.Integer, db.ForeignKey('utilisateurs.id'), nullable=False)

    reference        = db.Column(db.String(20), unique=True, nullable=False)
    type_formulaire  = db.Column(db.String(50), nullable=False)
    statut           = db.Column(db.String(50), default='brouillon')
    donnees          = db.Column(db.Text, default='{}')

    # Signature
    otp_signature    = db.Column(db.String(6), nullable=True)
    signe_le         = db.Column(db.DateTime, nullable=True)

    # Récépissé ARTCI
    num_recepisse    = db.Column(db.String(100), nullable=True)
    recepisse_le     = db.Column(db.DateTime, nullable=True)

    cree_le          = db.Column(db.DateTime, default=datetime.utcnow)
    mis_a_jour_le    = db.Column(db.DateTime, onupdate=datetime.utcnow)