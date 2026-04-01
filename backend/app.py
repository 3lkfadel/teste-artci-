import os, json, random, string, secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

from models import db, Utilisateur, Entreprise, Dossier
from system_prompt import SYSTEM_IA
from email_service import (
    send_verification_inscription,
    send_otp_a2f,
    send_password_reset,
    send_welcome,
    send_dossier_status
)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI']        = os.getenv('DATABASE_URL', 'sqlite:///artci.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']                 = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(hours=8)

CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    'https://artci-frontend.onrender.com'
])

db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()

# ── Helpers ────────────────────────────────────────────────

def code_otp():
    return ''.join(random.choices(string.digits, k=6))

def gen_reference():
    annee = datetime.utcnow().year
    count = Dossier.query.count() + 1
    return f"IC-{annee}-{count:04d}"


# ══════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════

@app.post('/api/auth/inscription')
def inscription():
    d     = request.json or {}
    email = (d.get('email') or '').strip().lower()
    mdp   = (d.get('mot_de_passe') or '').strip()

    if not email or not mdp:
        return jsonify({'erreur': 'Email et mot de passe requis'}), 400
    if len(mdp) < 8:
        return jsonify({'erreur': 'Le mot de passe doit contenir au moins 8 caractères'}), 400
    if Utilisateur.query.filter_by(email=email).first():
        return jsonify({'erreur': 'Cet email est déjà utilisé'}), 409

    # Créer compte NON activé
    code = code_otp()
    u = Utilisateur(
        email               = email,
        mot_de_passe        = generate_password_hash(mdp),
        email_verifie       = False,
        verification_code   = code,
        verification_expire = datetime.utcnow() + timedelta(minutes=15),
    )
    db.session.add(u)
    db.session.commit()

    # Envoyer code de vérification
    envoye = send_verification_inscription(email, code)

    return jsonify({
        'message':        'Compte créé. Vérifiez votre email pour activer votre compte.',
        'utilisateur_id': u.id,
        'email_hint':     email[:3] + '***' + email[email.find('@'):],
        'email_envoye':   envoye,
        # Mode test uniquement — retirer en prod
        'code_test':      code
    }), 201


@app.post('/api/auth/verifier-email')
def verifier_email():
    d    = request.json or {}
    uid  = d.get('utilisateur_id')
    code = (d.get('code') or '').strip()
    u    = Utilisateur.query.get(uid)

    if not u:
        return jsonify({'erreur': 'Utilisateur introuvable'}), 404

    if u.email_verifie:
        return jsonify({'erreur': 'Email déjà vérifié'}), 400

    if datetime.utcnow() > u.verification_expire:
        return jsonify({'erreur': 'Code expiré. Cliquez sur "Renvoyer le code".'}), 401

    if u.verification_code != code:
        return jsonify({'erreur': 'Code incorrect'}), 401

    # Activer le compte
    u.email_verifie      = True
    u.verification_code  = None
    u.verification_expire = None
    db.session.commit()

    # Email de bienvenue
    send_welcome(u.email)

    token = create_access_token(identity=str(u.id))
    return jsonify({
        'token':          token,
        'profil_complet': u.profil_complet,
        'message':        'Email vérifié ! Bienvenue sur Infinity Compliance.'
    })


@app.post('/api/auth/renvoyer-verification')
def renvoyer_verification():
    d   = request.json or {}
    uid = d.get('utilisateur_id')
    u   = Utilisateur.query.get(uid)

    if not u:
        return jsonify({'erreur': 'Utilisateur introuvable'}), 404
    if u.email_verifie:
        return jsonify({'erreur': 'Email déjà vérifié'}), 400

    code = code_otp()
    u.verification_code   = code
    u.verification_expire = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    envoye = send_verification_inscription(u.email, code)
    return jsonify({
        'message':      'Nouveau code envoyé.',
        'email_envoye': envoye,
        'code_test':    code
    })


@app.post('/api/auth/connexion')
def connexion():
    d     = request.json or {}
    email = (d.get('email') or '').strip().lower()
    mdp   = (d.get('mot_de_passe') or '').strip()
    u     = Utilisateur.query.filter_by(email=email).first()

    if not u or not check_password_hash(u.mot_de_passe, mdp):
        return jsonify({'erreur': 'Email ou mot de passe incorrect'}), 401

    # Vérifier si email confirmé
    if not u.email_verifie:
        # Renvoyer un nouveau code
        code = code_otp()
        u.verification_code   = code
        u.verification_expire = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        send_verification_inscription(email, code)
        return jsonify({
            'erreur':         'Email non vérifié. Un nouveau code vous a été envoyé.',
            'email_non_verifie': True,
            'utilisateur_id': u.id,
            'email_hint':     email[:3] + '***' + email[email.find('@'):],
            'code_test':      code
        }), 403

    # A2F optionnelle
    if u.a2f_active:
        otp = code_otp()
        u.otp_temp   = otp
        u.otp_expire = datetime.utcnow() + timedelta(minutes=10)
        db.session.commit()
        envoye = send_otp_a2f(email, otp)
        return jsonify({
            'a2f_requis':     True,
            'utilisateur_id': u.id,
            'email_hint':     email[:3] + '***' + email[email.find('@'):],
            'email_envoye':   envoye,
            'otp_test':       otp
        })

    token = create_access_token(identity=str(u.id))
    return jsonify({
        'token':          token,
        'profil_complet': u.profil_complet,
        'a2f_requis':     False
    })


@app.post('/api/auth/verifier-otp')
def verifier_otp():
    d    = request.json or {}
    uid  = d.get('utilisateur_id')
    code = (d.get('code') or '').strip()
    u    = Utilisateur.query.get(uid)

    if not u:
        return jsonify({'erreur': 'Utilisateur introuvable'}), 404

    if u.otp_expire and datetime.utcnow() > u.otp_expire:
        u.otp_temp = None; u.otp_expire = None
        db.session.commit()
        return jsonify({'erreur': 'Code expiré. Reconnectez-vous pour recevoir un nouveau code.'}), 401

    if u.otp_temp != code:
        return jsonify({'erreur': 'Code incorrect'}), 401

    u.otp_temp = None; u.otp_expire = None
    db.session.commit()

    token = create_access_token(identity=str(u.id))
    return jsonify({'token': token, 'profil_complet': u.profil_complet})


@app.post('/api/auth/renvoyer-otp')
def renvoyer_otp():
    d   = request.json or {}
    uid = d.get('utilisateur_id')
    u   = Utilisateur.query.get(uid)

    if not u:
        return jsonify({'erreur': 'Utilisateur introuvable'}), 404

    otp = code_otp()
    u.otp_temp   = otp
    u.otp_expire = datetime.utcnow() + timedelta(minutes=10)
    db.session.commit()

    envoye = send_otp_a2f(u.email, otp)
    return jsonify({
        'message':      'Nouveau code envoyé.',
        'email_envoye': envoye,
        'otp_test':     otp
    })


@app.post('/api/auth/activer-a2f')
@jwt_required()
def activer_a2f():
    uid = get_jwt_identity()
    u   = Utilisateur.query.get(uid)
    if not u: return jsonify({'erreur': 'Introuvable'}), 404
    u.a2f_active = True
    db.session.commit()
    return jsonify({'message': 'Double authentification activée.'})


@app.post('/api/auth/desactiver-a2f')
@jwt_required()
def desactiver_a2f():
    uid = get_jwt_identity()
    u   = Utilisateur.query.get(uid)
    if not u: return jsonify({'erreur': 'Introuvable'}), 404
    u.a2f_active = False
    db.session.commit()
    return jsonify({'message': 'Double authentification désactivée.'})


@app.get('/api/auth/profil')
@jwt_required()
def get_profil():
    uid = get_jwt_identity()
    u   = Utilisateur.query.get(uid)
    if not u: return jsonify({'erreur': 'Introuvable'}), 404
    return jsonify({
        'id':             u.id,
        'email':          u.email,
        'a2f_active':     u.a2f_active,
        'email_verifie':  u.email_verifie,
        'profil_complet': u.profil_complet
    })


# ══════════════════════════════════════════════════════════
# PASSWORD RESET
# ══════════════════════════════════════════════════════════

@app.post('/api/auth/mot-de-passe-oublie')
def mot_de_passe_oublie():
    d     = request.json or {}
    email = (d.get('email') or '').strip().lower()
    if not email:
        return jsonify({'erreur': 'Email requis'}), 400

    u = Utilisateur.query.filter_by(email=email).first()
    if u:
        token = secrets.token_urlsafe(32)
        u.reset_token        = token
        u.reset_token_expire = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        send_password_reset(email, token)

    return jsonify({'message': 'Si cet email existe, vous recevrez un lien de réinitialisation.'})


@app.post('/api/auth/reinitialiser-mot-de-passe')
def reinitialiser_mot_de_passe():
    d     = request.json or {}
    token = (d.get('token') or '').strip()
    mdp   = (d.get('mot_de_passe') or '').strip()

    if not token or not mdp:
        return jsonify({'erreur': 'Token et mot de passe requis'}), 400
    if len(mdp) < 8:
        return jsonify({'erreur': 'Le mot de passe doit contenir au moins 8 caractères'}), 400

    u = Utilisateur.query.filter_by(reset_token=token).first()
    if not u:
        return jsonify({'erreur': 'Lien invalide ou déjà utilisé'}), 400
    if datetime.utcnow() > u.reset_token_expire:
        u.reset_token = None; u.reset_token_expire = None
        db.session.commit()
        return jsonify({'erreur': 'Lien expiré. Faites une nouvelle demande.'}), 400

    u.mot_de_passe       = generate_password_hash(mdp)
    u.reset_token        = None
    u.reset_token_expire = None
    db.session.commit()
    return jsonify({'message': 'Mot de passe réinitialisé. Vous pouvez vous connecter.'})


@app.get('/api/auth/verifier-token-reset')
def verifier_token_reset():
    token = request.args.get('token', '').strip()
    if not token:
        return jsonify({'valide': False, 'erreur': 'Token manquant'}), 400
    u = Utilisateur.query.filter_by(reset_token=token).first()
    if not u:
        return jsonify({'valide': False, 'erreur': 'Lien invalide'}), 400
    if datetime.utcnow() > u.reset_token_expire:
        return jsonify({'valide': False, 'erreur': 'Lien expiré'}), 400
    return jsonify({'valide': True, 'email': u.email[:3] + '***' + u.email[u.email.find('@'):]})


# ══════════════════════════════════════════════════════════
# ENTREPRISE
# ══════════════════════════════════════════════════════════

@app.get('/api/entreprise')
@jwt_required()
def get_entreprise():
    uid = get_jwt_identity()
    e   = Entreprise.query.filter_by(utilisateur_id=uid).first()
    if not e: return jsonify(None)
    return jsonify({
        'denomination': e.denomination, 'forme_juridique': e.forme_juridique,
        'rccm': e.rccm, 'fiscal': e.fiscal, 'siege': e.siege,
        'representant': e.representant, 'fonction': e.fonction,
        'telephone': e.telephone, 'email_droits': e.email_droits, 'secteur': e.secteur
    })


@app.post('/api/entreprise')
@jwt_required()
def sauvegarder_entreprise():
    uid = get_jwt_identity()
    d   = request.json or {}
    e   = Entreprise.query.filter_by(utilisateur_id=uid).first()
    if not e:
        e = Entreprise(utilisateur_id=uid)
        db.session.add(e)
    champs = ['denomination','forme_juridique','rccm','fiscal','siege',
              'representant','fonction','telephone','email_droits','secteur']
    for c in champs:
        if c in d: setattr(e, c, d[c])
    u = Utilisateur.query.get(uid)
    requis = ['denomination','rccm','siege','representant','fonction','telephone','email_droits']
    u.profil_complet = all(getattr(e, r) for r in requis)
    db.session.commit()
    return jsonify({'message': 'Profil sauvegardé', 'profil_complet': u.profil_complet})


# ══════════════════════════════════════════════════════════
# ASSISTANT IA
# ══════════════════════════════════════════════════════════

@app.post('/api/ia/valider-champ')
@jwt_required()
def valider_champ():
    d      = request.json or {}
    champ  = d.get('champ', '')
    valeur = d.get('valeur', '')
    ctx    = d.get('contexte', '')
    mode   = d.get('mode', 'validation')

    api_key = os.getenv('ANTHROPIC_API_KEY', '')
    if not api_key:
        return jsonify({'type': 'info', 'message': 'Clé API non configurée.'})

    if mode == 'chat':
        system = SYSTEM_IA + "\n\nMODE CHAT : Réponds en JSON {\"type\":\"info\",\"message\":\"ta réponse\"} avec markdown."
        prompt = f"Contexte:\n{ctx}\n\nQuestion: {valeur}"
    else:
        system = SYSTEM_IA + "\n\nMODE VALIDATION : JSON {\"type\":\"ok|warn|err|info\",\"message\":\"court\"}. Max 2 phrases."
        prompt = f"Champ: {champ}\nValeur: {valeur}\nContexte: {ctx}"

    try:
        import anthropic
        client   = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=2048 if mode == 'chat' else 150,
            system=system,
            messages=[{'role': 'user', 'content': prompt}]
        )
        text = response.content[0].text.strip()
        text = text.replace('```json', '').replace('```', '').strip()
        try:
            return jsonify(json.loads(text))
        except json.JSONDecodeError:
            import re
            type_match = re.search(r'"type"\s*:\s*"(\w+)"', text)
            msg_match  = re.search(r'"message"\s*:\s*"([\s\S]*)', text)
            if msg_match:
                message = re.sub(r'"\s*}?\s*$', '', msg_match.group(1)).replace('\\"', '"')
                return jsonify({'type': type_match.group(1) if type_match else 'info', 'message': message})
            return jsonify({'type': 'info', 'message': text[:1000]})
    except Exception as e:
        return jsonify({'type': 'info', 'message': f'IA indisponible: {str(e)[:60]}'})


@app.post('/api/ia/valider-formulaire')
@jwt_required()
def valider_formulaire():
    d       = request.json or {}
    donnees = d.get('donnees', {})
    api_key = os.getenv('ANTHROPIC_API_KEY', '')
    if not api_key:
        return jsonify({'checks': [{'type': 'info', 'message': 'Clé API non configurée.'}]})
    prompt = f"Formulaire ARTCI:\n{json.dumps(donnees, ensure_ascii=False, indent=2)}\n\nVérification globale. JSON: {{\"checks\":[{{\"type\":\"ok|warn|err\",\"message\":\"...\"}}]}} max 4."
    try:
        import anthropic
        client   = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model='claude-sonnet-4-6', max_tokens=400,
            system=SYSTEM_IA,
            messages=[{'role': 'user', 'content': prompt}]
        )
        text = response.content[0].text.strip()
        return jsonify(json.loads(text.replace('```json','').replace('```','').strip()))
    except Exception as e:
        return jsonify({'checks': [{'type': 'err', 'message': str(e)[:100]}]})


# ══════════════════════════════════════════════════════════
# DOSSIERS
# ══════════════════════════════════════════════════════════

@app.get('/api/dossiers')
@jwt_required()
def lister_dossiers():
    uid      = get_jwt_identity()
    dossiers = Dossier.query.filter_by(utilisateur_id=uid).order_by(Dossier.cree_le.desc()).all()
    return jsonify([{
        'id': d.id, 'reference': d.reference,
        'type_formulaire': d.type_formulaire, 'statut': d.statut,
        'cree_le': d.cree_le.isoformat() if d.cree_le else None,
        'mis_a_jour_le': d.mis_a_jour_le.isoformat() if d.mis_a_jour_le else None,
    } for d in dossiers])


@app.post('/api/dossiers')
@jwt_required()
def creer_dossier():
    uid = get_jwt_identity()
    d   = request.json or {}
    dos = Dossier(
        utilisateur_id  = uid,
        reference       = gen_reference(),
        type_formulaire = d.get('type_formulaire', 'declaration'),
        statut          = 'brouillon',
        donnees         = json.dumps(d.get('donnees', {}))
    )
    db.session.add(dos)
    db.session.commit()
    return jsonify({'id': dos.id, 'reference': dos.reference}), 201


@app.get('/api/dossiers/<int:dos_id>')
@jwt_required()
def get_dossier(dos_id):
    uid = get_jwt_identity()
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    return jsonify({
        'id': dos.id, 'reference': dos.reference,
        'type_formulaire': dos.type_formulaire, 'statut': dos.statut,
        'donnees': json.loads(dos.donnees or '{}'),
        'cree_le': dos.cree_le.isoformat() if dos.cree_le else None,
        'signe_le': dos.signe_le.isoformat() if dos.signe_le else None,
    })


@app.put('/api/dossiers/<int:dos_id>')
@jwt_required()
def maj_dossier(dos_id):
    uid = get_jwt_identity()
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    d = request.json or {}
    if 'donnees' in d:
        dos.donnees = json.dumps(d['donnees'])
    if 'statut' in d:
        ancien = dos.statut
        dos.statut = d['statut']
        if ancien != dos.statut:
            u = Utilisateur.query.get(uid)
            if u: send_dossier_status(u.email, dos.reference, dos.statut)
    dos.mis_a_jour_le = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Dossier mis à jour'})


# ══════════════════════════════════════════════════════════
# SIGNATURE OTP
# ══════════════════════════════════════════════════════════

@app.post('/api/signature/envoyer-otp')
@jwt_required()
def envoyer_otp_signature():
    uid    = get_jwt_identity()
    d      = request.json or {}
    dos_id = d.get('dossier_id')
    dos    = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404

    u   = Utilisateur.query.get(uid)
    otp = code_otp()
    dos.otp_signature = otp
    db.session.commit()

    envoye = send_otp_a2f(u.email, otp)

    return jsonify({
        'message':      'Code OTP envoyé par email',
        'email_hint':   u.email[:3] + '***' + u.email[u.email.find('@'):],
        'email_envoye': envoye,
        'otp_code':     otp   # retirer en prod
    })


@app.post('/api/signature/confirmer')
@jwt_required()
def confirmer_signature():
    uid    = get_jwt_identity()
    d      = request.json or {}
    dos_id = d.get('dossier_id')
    code   = (d.get('code') or '').strip()
    dos    = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    if dos.otp_signature != code:
        return jsonify({'erreur': 'Code OTP incorrect'}), 401

    dos.otp_signature = None
    dos.statut        = 'en_attente_paiement'
    dos.signe_le      = datetime.utcnow()
    dos.mis_a_jour_le = datetime.utcnow()
    db.session.commit()

    u = Utilisateur.query.get(uid)
    if u: send_dossier_status(u.email, dos.reference, 'en_attente_paiement')

    return jsonify({'message': 'Signature confirmée', 'statut': dos.statut})


# ══════════════════════════════════════════════════════════
# SUIVI PUBLIC
# ══════════════════════════════════════════════════════════

@app.get('/api/suivi/<reference>')
def suivi_public(reference):
    dos = Dossier.query.filter_by(reference=reference).first()
    if not dos: return jsonify({'erreur': 'Référence introuvable'}), 404
    return jsonify({
        'id': dos.id, 'reference': dos.reference,
        'type_formulaire': dos.type_formulaire, 'statut': dos.statut,
        'cree_le': dos.cree_le.isoformat() if dos.cree_le else None,
        'signe_le': dos.signe_le.isoformat() if dos.signe_le else None,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)