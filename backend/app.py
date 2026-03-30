import os, json, random, string
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from models import db, Utilisateur, Entreprise, Dossier

from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI']      = 'sqlite:///artci.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']               = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES']     = timedelta(hours=8)

CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    'https://artci-frontend.onrender.com'
])
db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()

# ── Helpers ───────────────────────────────────────────────────

def code_otp():
    return ''.join(random.choices(string.digits, k=6))

def gen_reference():
    annee = datetime.utcnow().year
    count = Dossier.query.count() + 1
    return f"IC-{annee}-{count:04d}"


# ═══════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════

@app.post('/api/auth/inscription')
def inscription():
    d   = request.json or {}
    email = (d.get('email') or '').strip().lower()
    mdp   = (d.get('mot_de_passe') or '').strip()
    if not email or not mdp:
        return jsonify({'erreur': 'Email et mot de passe requis'}), 400
    if Utilisateur.query.filter_by(email=email).first():
        return jsonify({'erreur': 'Cet email est déjà utilisé'}), 409
    u = Utilisateur(
        email=email,
        mot_de_passe=generate_password_hash(mdp)
    )
    db.session.add(u)
    db.session.commit()
    token = create_access_token(identity=str(u.id))
    return jsonify({'token': token, 'profil_complet': False}), 201


@app.post('/api/auth/connexion')
def connexion():
    d     = request.json or {}
    email = (d.get('email') or '').strip().lower()
    mdp   = (d.get('mot_de_passe') or '').strip()
    u     = Utilisateur.query.filter_by(email=email).first()
    if not u or not check_password_hash(u.mot_de_passe, mdp):
        return jsonify({'erreur': 'Email ou mot de passe incorrect'}), 401
    if u.a2f_active:
        otp = code_otp()
        u.otp_temp = otp
        db.session.commit()
        # En production → envoyer par SMS
        # En test → retourné dans la réponse
        return jsonify({
            'a2f_requis':      True,
            'utilisateur_id':  u.id,
            'otp_code':        otp
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
    if u.otp_temp != code:
        return jsonify({'erreur': 'Code incorrect'}), 401
    u.otp_temp = None
    db.session.commit()
    token = create_access_token(identity=str(u.id))
    return jsonify({'token': token, 'profil_complet': u.profil_complet})


@app.post('/api/auth/activer-a2f')
@jwt_required()
def activer_a2f():
    uid = get_jwt_identity()
    u   = Utilisateur.query.get(uid)
    if not u:
        return jsonify({'erreur': 'Introuvable'}), 404
    u.a2f_active = True
    db.session.commit()
    return jsonify({'message': 'Double authentification activée'})


@app.post('/api/auth/desactiver-a2f')
@jwt_required()
def desactiver_a2f():
    uid = get_jwt_identity()
    u   = Utilisateur.query.get(uid)
    if not u:
        return jsonify({'erreur': 'Introuvable'}), 404
    u.a2f_active = False
    db.session.commit()
    return jsonify({'message': 'Double authentification désactivée'})


@app.get('/api/auth/profil')
@jwt_required()
def get_profil():
    uid = get_jwt_identity()
    u   = Utilisateur.query.get(uid)
    if not u:
        return jsonify({'erreur': 'Introuvable'}), 404
    return jsonify({
        'id':             u.id,
        'email':          u.email,
        'a2f_active':     u.a2f_active,
        'profil_complet': u.profil_complet
    })


# ═══════════════════════════════════════════════════════════════
# ENTREPRISE
# ═══════════════════════════════════════════════════════════════

@app.get('/api/entreprise')
@jwt_required()
def get_entreprise():
    uid = get_jwt_identity()
    e   = Entreprise.query.filter_by(utilisateur_id=uid).first()
    if not e:
        return jsonify(None)
    return jsonify({
        'denomination':    e.denomination,
        'forme_juridique': e.forme_juridique,
        'rccm':            e.rccm,
        'fiscal':          e.fiscal,
        'siege':           e.siege,
        'representant':    e.representant,
        'fonction':        e.fonction,
        'telephone':       e.telephone,
        'email_droits':    e.email_droits,
        'secteur':         e.secteur
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
    champs = [
        'denomination', 'forme_juridique', 'rccm', 'fiscal',
        'siege', 'representant', 'fonction', 'telephone',
        'email_droits', 'secteur'
    ]
    for c in champs:
        if c in d:
            setattr(e, c, d[c])
    u = Utilisateur.query.get(uid)
    requis = ['denomination', 'rccm', 'siege', 'representant', 'fonction', 'telephone', 'email_droits']
    u.profil_complet = all(getattr(e, r) for r in requis)
    db.session.commit()
    return jsonify({'message': 'Profil sauvegardé', 'profil_complet': u.profil_complet})


# ═══════════════════════════════════════════════════════════════
# ASSISTANT IA
# ═══════════════════════════════════════════════════════════════

from system_prompt import SYSTEM_IA



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
        system = """Tu es un assistant DPO expert sur la Loi n°2013-450 de Côte d'Ivoire.
        Tu aides les utilisateurs à remplir leurs formulaires ARTCI.
        Tu connais le contexte du formulaire en cours (champs, étape, valeurs saisies).
        Réponds en JSON : {"type":"info","message":"ta réponse complète et utile"}
        Sois pédagogue, donne des exemples concrets adaptés à la CI.
        Si on te demande d'expliquer un champ, donne: ce que c'est, où le trouver, un exemple."""
        prompt = f"Contexte du formulaire:\n{ctx}\n\nQuestion de l'utilisateur: {valeur}"
    else:
        system = """Tu es l'assistant DPO d'Infinity Compliance, expert sur la Loi n°2013-450 de Côte d'Ivoire.
                    Tu analyses les champs d'un formulaire ARTCI et fournis un feedback concis.
                    Réponds UNIQUEMENT en JSON : {"type":"ok|warn|err|info","message":"ton message"}
                    Sois bref (1-2 phrases max), pratique, en français professionnel."""
        prompt = f"Champ: {champ}\nValeur: {valeur}\nContexte: {ctx}\nAnalyse ce champ pour un formulaire ARTCI."

    
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
            result = json.loads(text)
            return jsonify(result)
        except json.JSONDecodeError:
            # Extraire type et message manuellement
            import re
            type_match = re.search(r'"type"\s*:\s*"(\w+)"', text)
            # Extraire tout ce qui suit "message": " jusqu'à la fin
            msg_match = re.search(r'"message"\s*:\s*"([\s\S]*)', text)
            if msg_match:
                message = msg_match.group(1)
                # Supprimer le dernier " } si présent
                message = re.sub(r'"\s*}?\s*$', '', message)
                # Nettoyer les guillemets échappés
                message = message.replace('\\"', '"')
                return jsonify({
                    'type': type_match.group(1) if type_match else 'info',
                    'message': message
                })
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
    prompt = (
        f"Voici un formulaire ARTCI complet:\n{json.dumps(donnees, ensure_ascii=False, indent=2)}\n\n"
        f"Fais une vérification globale. Réponds en JSON: "
        f'{{\"checks\":[{{\"type\":\"ok|warn|err\",\"message\":\"...\"}}]}} — max 4 vérifications.'
    )
    try:
        import anthropic
        client   = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=400,
            system=SYSTEM_IA,
            messages=[{'role': 'user', 'content': prompt}]
        )
        text = response.content[0].text.strip()
        return jsonify(json.loads(text.replace('```json', '').replace('```', '').strip()))
    except Exception as e:
        return jsonify({'checks': [{'type': 'err', 'message': str(e)[:100]}]})


# ═══════════════════════════════════════════════════════════════
# DOSSIERS
# ═══════════════════════════════════════════════════════════════

@app.get('/api/dossiers')
@jwt_required()
def lister_dossiers():
    uid      = get_jwt_identity()
    dossiers = Dossier.query.filter_by(utilisateur_id=uid).order_by(Dossier.cree_le.desc()).all()
    return jsonify([{
        'id':              d.id,
        'reference':       d.reference,
        'type_formulaire': d.type_formulaire,
        'statut':          d.statut,
        'cree_le':         d.cree_le.isoformat() if d.cree_le else None,
        'mis_a_jour_le':   d.mis_a_jour_le.isoformat() if d.mis_a_jour_le else None,
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
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404
    return jsonify({
        'id':              dos.id,
        'reference':       dos.reference,
        'type_formulaire': dos.type_formulaire,
        'statut':          dos.statut,
        'donnees':         json.loads(dos.donnees or '{}'),
        'cree_le':         dos.cree_le.isoformat() if dos.cree_le else None,
        'signe_le':        dos.signe_le.isoformat() if dos.signe_le else None,
    })


@app.put('/api/dossiers/<int:dos_id>')
@jwt_required()
def maj_dossier(dos_id):
    uid = get_jwt_identity()
    dos = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404
    d = request.json or {}
    if 'donnees' in d:
        dos.donnees = json.dumps(d['donnees'])
    if 'statut' in d:
        dos.statut = d['statut']
    dos.mis_a_jour_le = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Dossier mis à jour'})


# ═══════════════════════════════════════════════════════════════
# SIGNATURE OTP
# ═══════════════════════════════════════════════════════════════

@app.post('/api/signature/envoyer-otp')
@jwt_required()
def envoyer_otp_signature():
    uid    = get_jwt_identity()
    d      = request.json or {}
    dos_id = d.get('dossier_id')
    dos    = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404
    otp = code_otp()
    dos.otp_signature = otp
    db.session.commit()
    # En production → envoyer par SMS via Orange CI API
    return jsonify({
        'message':   'Code OTP généré',
        'otp_code':  otp,   # retirer en production
        'telephone': '*** (simulé en test)'
    })


@app.post('/api/signature/confirmer')
@jwt_required()
def confirmer_signature():
    uid    = get_jwt_identity()
    d      = request.json or {}
    dos_id = d.get('dossier_id')
    code   = (d.get('code') or '').strip()
    dos    = Dossier.query.filter_by(id=dos_id, utilisateur_id=uid).first()
    if not dos:
        return jsonify({'erreur': 'Dossier introuvable'}), 404
    if dos.otp_signature != code:
        return jsonify({'erreur': 'Code OTP incorrect'}), 401
    dos.otp_signature = None
    dos.statut        = 'en_attente_paiement'
    dos.signe_le      = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Signature confirmée', 'statut': dos.statut})


# ═══════════════════════════════════════════════════════════════
# SUIVI PUBLIC
# ═══════════════════════════════════════════════════════════════

@app.get('/api/suivi/<reference>')
def suivi_public(reference):
    dos = Dossier.query.filter_by(reference=reference).first()
    if not dos:
        return jsonify({'erreur': 'Référence introuvable'}), 404
    return jsonify({
        'reference':       dos.reference,
        'type_formulaire': dos.type_formulaire,
        'statut':          dos.statut,
        'cree_le':         dos.cree_le.isoformat() if dos.cree_le else None,
        'signe_le':        dos.signe_le.isoformat() if dos.signe_le else None,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)