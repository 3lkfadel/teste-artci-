from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Utilisateur(db.Model):
    __tablename__ = 'utilisateur'
    id             = db.Column(db.Integer, primary_key=True)
    email          = db.Column(db.String(255), unique=True, nullable=False)
    mot_de_passe   = db.Column(db.String(255), nullable=False)
    a2f_active     = db.Column(db.Boolean, default=False)
    otp_temp       = db.Column(db.String(6))
    profil_complet = db.Column(db.Boolean, default=False)
    cree_le        = db.Column(db.DateTime, default=datetime.utcnow)
    entreprise     = db.relationship('Entreprise', backref='utilisateur', uselist=False)
    dossiers       = db.relationship('Dossier', backref='utilisateur', lazy=True)


class Entreprise(db.Model):
    __tablename__ = 'entreprise'
    id              = db.Column(db.Integer, primary_key=True)
    utilisateur_id  = db.Column(db.Integer, db.ForeignKey('utilisateur.id'), unique=True)
    denomination    = db.Column(db.String(255))
    forme_juridique = db.Column(db.String(50))
    rccm            = db.Column(db.String(100))
    fiscal          = db.Column(db.String(100))
    siege           = db.Column(db.String(500))
    representant    = db.Column(db.String(255))
    fonction        = db.Column(db.String(100))
    telephone       = db.Column(db.String(20))
    email_droits    = db.Column(db.String(255))
    secteur         = db.Column(db.String(100))


class Dossier(db.Model):
    __tablename__ = 'dossier'
    id              = db.Column(db.Integer, primary_key=True)
    reference       = db.Column(db.String(20), unique=True)
    utilisateur_id  = db.Column(db.Integer, db.ForeignKey('utilisateur.id'))
    type_formulaire = db.Column(db.String(50))
    statut          = db.Column(db.String(30), default='brouillon')
    donnees         = db.Column(db.Text)
    otp_signature   = db.Column(db.String(6))
    signe_le        = db.Column(db.DateTime)
    cree_le         = db.Column(db.DateTime, default=datetime.utcnow)
    mis_a_jour_le   = db.Column(db.DateTime, default=datetime.utcnow)