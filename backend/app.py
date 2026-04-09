import os, json, random, string, secrets
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Charger le .env EN PREMIER avant toute lecture de variable d'environnement
load_dotenv(Path(__file__).parent / '.env')

import cloudinary
import cloudinary.uploader
from flask import Flask, request, jsonify
from upload_service import uploader_document, supprimer_document
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
import stripe


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
_jwt_secret = os.getenv('JWT_SECRET_KEY')
if not _jwt_secret:
    raise RuntimeError("JWT_SECRET_KEY non définie. Ajoutez-la dans votre fichier .env")
app.config['JWT_SECRET_KEY']                 = _jwt_secret
app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(hours=8)

CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5000',
    'https://artci-frontend.onrender.com'
])

stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')

db.init_app(app)
jwt = JWTManager(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri='memory://'
)

with app.app_context():
    db.create_all()

# ── Helpers ────────────────────────────────────────────────

def code_otp():
    return ''.join(random.choices(string.digits, k=6))

def gen_reference():
    annee  = datetime.utcnow().year
    suffixe = secrets.token_hex(3).upper()   # 16^6 ≈ 16M combinaisons, pas de race condition
    return f"IC-{annee}-{suffixe}"


# ══════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════

@app.post('/api/auth/inscription')
@limiter.limit('5 per minute')
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
@limiter.limit('3 per minute')
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
    })


@app.post('/api/auth/connexion')
@limiter.limit('10 per minute')
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
            'erreur':            'Email non vérifié. Un nouveau code vous a été envoyé.',
            'email_non_verifie': True,
            'utilisateur_id':    u.id,
            'email_hint':        email[:3] + '***' + email[email.find('@'):],
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
        })

    token = create_access_token(identity=str(u.id))
    return jsonify({
        'token':          token,
        'profil_complet': u.profil_complet,
        'a2f_requis':     False
    })


@app.post('/api/auth/verifier-otp')
@limiter.limit('10 per minute')
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
@limiter.limit('3 per minute')
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
        'telephone': e.telephone, 'email_droits': e.email_droits, 'secteur': e.secteur,
        'logo_url': e.logo_url,
    })


@app.post('/api/entreprise/logo')
@jwt_required()
def upload_logo_entreprise():
    uid = get_jwt_identity()
    if 'logo' not in request.files:
        return jsonify({'erreur': 'Aucun fichier envoyé'}), 400
    fichier = request.files['logo']
    if fichier.content_type not in ('image/png', 'image/jpeg'):
        return jsonify({'erreur': 'Format non autorisé. PNG ou JPG uniquement.'}), 400
    fichier.seek(0, 2)
    taille = fichier.tell()
    fichier.seek(0)
    if taille > 2 * 1024 * 1024:
        return jsonify({'erreur': 'Logo trop volumineux. Maximum 2 MB.'}), 400
    cloudinary.config(
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
        api_key    = os.getenv('CLOUDINARY_API_KEY'),
        api_secret = os.getenv('CLOUDINARY_API_SECRET'),
        secure     = True
    )
    result = cloudinary.uploader.upload(
        fichier,
        folder          = f'infinity-compliance/logos/{uid}',
        resource_type   = 'image',
        use_filename    = True,
        unique_filename = True,
        overwrite       = True,
    )
    e = Entreprise.query.filter_by(utilisateur_id=uid).first()
    if not e:
        e = Entreprise(utilisateur_id=uid)
        db.session.add(e)
    e.logo_url = result['secure_url']
    db.session.commit()
    return jsonify({'logo_url': e.logo_url})


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

    if mode == 'chat':
        prompt = f"Contexte:\n{ctx}\n\nQuestion: {valeur}"
    else:
        prompt = f"Champ: {champ}\nValeur: {valeur}\nContexte: {ctx}\nAnalyse ce champ pour un formulaire ARTCI."

    # Ollama en priorité
    try:
        import requests as http_req
        res = http_req.post('http://localhost:11434/api/generate', json={
            'model':  'infinity-dpo',  # ← déjà bon, on a recréé infinity-dpo avec gemma2:9b
            'prompt': prompt,
            'stream': False,
        }, timeout=30)
        if res.status_code == 200:
            text = res.json().get('response', '').strip()
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
        print(f"[OLLAMA] Indisponible: {e} — fallback Anthropic")

    # Fallback Anthropic
    api_key = os.getenv('ANTHROPIC_API_KEY', '')
    if not api_key:
        return jsonify({'type': 'info', 'message': 'IA indisponible.'})

    if mode == 'chat':
        system = SYSTEM_IA + "\n\nMODE CHAT : JSON {\"type\":\"info\",\"message\":\"réponse complète\"}."
    else:
        system = SYSTEM_IA + "\n\nMODE VALIDATION : JSON {\"type\":\"ok|warn|err|info\",\"message\":\"court\"}."

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
        except:
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
    page     = request.args.get('page',     1,  type=int)
    per_page = request.args.get('per_page', 25, type=int)
    per_page = min(per_page, 100)  # plafond de securite

    pagination = (
        Dossier.query
        .filter_by(utilisateur_id=uid)
        .order_by(Dossier.cree_le.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return jsonify({
        'dossiers': [{
            'id': d.id, 'reference': d.reference,
            'type_formulaire': d.type_formulaire, 'statut': d.statut,
            'cree_le': d.cree_le.isoformat() if d.cree_le else None,
            'mis_a_jour_le': d.mis_a_jour_le.isoformat() if d.mis_a_jour_le else None,
        } for d in pagination.items],
        'total': pagination.total,
        'page':  pagination.page,
        'pages': pagination.pages,
    })


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
        donnees         = d.get('donnees', {})
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
        'donnees': dos.donnees or {},
        'signature_image': dos.signature_image,
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
        dos.donnees = d['donnees']
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
    signature_image = d.get('signature_image')  # ← nouveau
    dos    = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    if dos.otp_signature != code:
        return jsonify({'erreur': 'Code OTP incorrect'}), 401

    dos.otp_signature   = None
    dos.statut          = 'en_attente_paiement'
    dos.signe_le        = datetime.utcnow()
    dos.mis_a_jour_le   = datetime.utcnow()
    if signature_image:
        try:
            import cloudinary, cloudinary.uploader
            cloudinary.config(
                cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
                api_key    = os.getenv('CLOUDINARY_API_KEY'),
                api_secret = os.getenv('CLOUDINARY_API_SECRET'),
            )
            result = cloudinary.uploader.upload(
                signature_image,
                folder        = f'infinity-compliance/signatures',
                public_id     = f'sig_{dos.reference}',
                resource_type = 'image',
                overwrite     = True,
            )
            dos.signature_image = result.get('secure_url')
        except Exception:
            pass  # si l'upload echoue, on continue sans image
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


# ══════════════════════════════════════════════════════════
# PIÈCES JOINTES — ajouter dans app.py avant if __name__
# ══════════════════════════════════════════════════════════

from upload_service import uploader_document, supprimer_document
from models import PieceJointe

@app.post('/api/dossiers/<int:dos_id>/pieces-jointes')
@jwt_required()
def ajouter_piece_jointe(dos_id):
    uid = get_jwt_identity()
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404

    if 'fichier' not in request.files:
        return jsonify({'erreur': 'Aucun fichier reçu'}), 400

    fichier  = request.files['fichier']
    nom_doc  = request.form.get('nom', fichier.filename)

    if fichier.filename == '':
        return jsonify({'erreur': 'Fichier vide'}), 400

    try:
        result = uploader_document(fichier, dos_id, nom_doc)
        pj = PieceJointe(
            dossier_id = dos_id,
            nom        = result['nom'],
            url        = result['url'],
            public_id  = result['public_id'],
            type       = result['type'],
            taille     = result['taille'],
        )
        db.session.add(pj)
        db.session.commit()
        return jsonify({
            'id':      pj.id,
            'nom':     pj.nom,
            'url':     pj.url,
            'type':    pj.type,
            'taille':  pj.taille,
            'cree_le': pj.cree_le.isoformat(),
        }), 201
    except ValueError as e:
        return jsonify({'erreur': str(e)}), 400
    except Exception as e:
        return jsonify({'erreur': f'Erreur upload: {str(e)[:100]}'}), 500


@app.get('/api/dossiers/<int:dos_id>/pieces-jointes')
@jwt_required()
def lister_pieces_jointes(dos_id):
    uid = get_jwt_identity()
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404

    return jsonify([{
        'id':      pj.id,
        'nom':     pj.nom,
        'url':     pj.url,
        'type':    pj.type,
        'taille':  pj.taille,
        'cree_le': pj.cree_le.isoformat(),
    } for pj in dos.pieces_jointes])


@app.delete('/api/dossiers/<int:dos_id>/pieces-jointes/<int:pj_id>')
@jwt_required()
def supprimer_piece_jointe(dos_id, pj_id):
    uid = get_jwt_identity()
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404

    pj = PieceJointe.query.filter_by(id=pj_id, dossier_id=dos_id).first()
    if not pj:
        return jsonify({'erreur': 'Pièce jointe introuvable'}), 404

    supprimer_document(pj.public_id)
    db.session.delete(pj)
    db.session.commit()
    return jsonify({'message': 'Pièce jointe supprimée'})

@app.post('/api/auth/changer-mot-de-passe')
@jwt_required()
def changer_mot_de_passe():
    uid = get_jwt_identity()
    d   = request.json or {}
    mdp_actuel = d.get('mot_de_passe_actuel', '')
    mdp_nouveau = d.get('nouveau_mot_de_passe', '')
    u = Utilisateur.query.get(uid)
    if not u: return jsonify({'erreur': 'Introuvable'}), 404
    if not check_password_hash(u.mot_de_passe, mdp_actuel):
        return jsonify({'erreur': 'Mot de passe actuel incorrect'}), 401
    if len(mdp_nouveau) < 8:
        return jsonify({'erreur': 'Minimum 8 caractères'}), 400
    u.mot_de_passe = generate_password_hash(mdp_nouveau)
    db.session.commit()
    return jsonify({'message': 'Mot de passe modifié avec succès.'})




# ══════════════════════════════════════════════════════════
# ADMIN — ajouter dans app.py avant if __name__
# ══════════════════════════════════════════════════════════

_admin_password_hash = os.getenv('ADMIN_PASSWORD_HASH')

@app.post('/api/admin/login')
@limiter.limit('5 per minute')
def admin_login():
    if not _admin_password_hash:
        return jsonify({'erreur': 'Panel admin non configuré'}), 503
    d   = request.json or {}
    mdp = d.get('password', '')
    if not check_password_hash(_admin_password_hash, mdp):
        return jsonify({'erreur': 'Mot de passe incorrect'}), 401
    token = create_access_token(identity='admin', additional_claims={'role': 'admin'})
    return jsonify({'token': token})


def admin_required():
    from flask_jwt_extended import verify_jwt_in_request, get_jwt
    verify_jwt_in_request()
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'erreur': 'Accès refusé'}), 403
    return None


@app.get('/api/admin/stats')
def admin_stats():
    err = admin_required()
    if err: return err
    total_users    = Utilisateur.query.count()
    total_dossiers = Dossier.query.count()
    par_statut = {}
    for statut in ['brouillon','en_attente_signature','en_attente_paiement','transmis','en_cours','complet','refuse']:
        par_statut[statut] = Dossier.query.filter_by(statut=statut).count()
    par_type = {}
    for t in ['declaration','autorisation','dpo','transfert']:
        par_type[t] = Dossier.query.filter_by(type_formulaire=t).count()
    return jsonify({
        'total_users':    total_users,
        'total_dossiers': total_dossiers,
        'par_statut':     par_statut,
        'par_type':       par_type,
    })


@app.get('/api/admin/dossiers')
def admin_lister_dossiers():
    err = admin_required()
    if err: return err
    page     = request.args.get('page', 1, type=int)
    statut   = request.args.get('statut', '')
    per_page = 20
    query = Dossier.query.order_by(Dossier.cree_le.desc())
    if statut:
        query = query.filter_by(statut=statut)
    total    = query.count()
    dossiers = query.offset((page-1)*per_page).limit(per_page).all()
    return jsonify({
        'total': total,
        'page':  page,
        'pages': (total + per_page - 1) // per_page,
        'dossiers': [{
            'id':              d.id,
            'reference':       d.reference,
            'type_formulaire': d.type_formulaire,
            'statut':          d.statut,
            'num_recepisse':   d.num_recepisse,
            'cree_le':         d.cree_le.isoformat() if d.cree_le else None,
            'signe_le':        d.signe_le.isoformat() if d.signe_le else None,
            'utilisateur': {
                'id':    d.utilisateur.id,
                'email': d.utilisateur.email,
            } if d.utilisateur else None,
        } for d in dossiers]
    })


@app.get('/api/admin/dossiers/<int:dos_id>')
def admin_get_dossier(dos_id):
    err = admin_required()
    if err: return err
    dos = Dossier.query.get(dos_id)
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    return jsonify({
        'id':              dos.id,
        'reference':       dos.reference,
        'type_formulaire': dos.type_formulaire,
        'statut':          dos.statut,
        'donnees':         dos.donnees or {},
        'num_recepisse':   dos.num_recepisse,
        'cree_le':         dos.cree_le.isoformat() if dos.cree_le else None,
        'signe_le':        dos.signe_le.isoformat() if dos.signe_le else None,
        'recepisse_le':    dos.recepisse_le.isoformat() if dos.recepisse_le else None,
        'utilisateur': {
            'id':    dos.utilisateur.id,
            'email': dos.utilisateur.email,
        } if dos.utilisateur else None,
    })


@app.put('/api/admin/dossiers/<int:dos_id>')
def admin_maj_dossier(dos_id):
    err = admin_required()
    if err: return err
    dos = Dossier.query.get(dos_id)
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    d = request.json or {}

    ancien_statut = dos.statut
    if 'statut' in d:
        dos.statut = d['statut']
    if 'num_recepisse' in d:
        dos.num_recepisse = d['num_recepisse']
        if d['num_recepisse']:
            dos.recepisse_le = datetime.utcnow()

    dos.mis_a_jour_le = datetime.utcnow()
    db.session.commit()

    # Notification email si changement de statut
    if ancien_statut != dos.statut and dos.utilisateur:
        send_dossier_status(dos.utilisateur.email, dos.reference, dos.statut)

    return jsonify({'message': 'Dossier mis à jour'})


@app.delete('/api/admin/dossiers/<int:dos_id>')
def admin_supprimer_dossier(dos_id):
    err = admin_required()
    if err: return err
    dos = Dossier.query.get(dos_id)
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    db.session.delete(dos)
    db.session.commit()
    return jsonify({'message': 'Dossier supprimé'})


@app.get('/api/admin/utilisateurs')
def admin_lister_utilisateurs():
    err = admin_required()
    if err: return err
    users = Utilisateur.query.order_by(Utilisateur.cree_le.desc()).all()
    return jsonify([{
        'id':             u.id,
        'email':          u.email,
        'email_verifie':  u.email_verifie,
        'a2f_active':     u.a2f_active,
        'profil_complet': u.profil_complet,
        'nb_dossiers':    len(u.dossiers),
        'cree_le':        u.cree_le.isoformat() if u.cree_le else None,
    } for u in users])

@app.get('/api/health')
def health():
    return jsonify({'status': 'ok'})




@app.post('/api/paiement/stripe/create-intent')
@jwt_required()
def stripe_create_intent():
    uid = get_jwt_identity()
    d   = request.json or {}
    dos_id = d.get('dossier_id')
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404

    # Frais en FCFA (XOF). Taux fixe officiel : 1 EUR = 655.957 XOF
    FRAIS_FCFA = { 'declaration': 8000, 'autorisation': 16000, 'dpo': 5000, 'transfert': 12000 }
    montant_fcfa = FRAIS_FCFA.get(dos.type_formulaire, 8000)
    # Conversion en centimes EUR pour Stripe (arrondi au centime supérieur)
    montant_eur_centimes = max(50, round(montant_fcfa / 655.957 * 100))

    try:
        intent = stripe.PaymentIntent.create(
            amount=montant_eur_centimes,
            currency='eur',  # XOF non supporté par Stripe
            metadata={ 'dossier_id': dos_id, 'reference': dos.reference }
        )
        return jsonify({ 'client_secret': intent.client_secret, 'montant_fcfa': montant_fcfa, 'montant_eur_centimes': montant_eur_centimes })
    except Exception as e:
        return jsonify({'erreur': str(e)}), 500


@app.post('/api/paiement/stripe/confirm')
@jwt_required()
def stripe_confirm():
    uid = get_jwt_identity()
    d   = request.json or {}
    dos_id = d.get('dossier_id')
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos: return jsonify({'erreur': 'Dossier introuvable'}), 404
    dos.statut        = 'transmis'
    dos.mis_a_jour_le = datetime.utcnow()
    db.session.commit()
    u = Utilisateur.query.get(uid)
    if u: send_dossier_status(u.email, dos.reference, 'transmis')
    return jsonify({'message': 'Paiement confirmé, dossier transmis.'})





if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, port=5000)