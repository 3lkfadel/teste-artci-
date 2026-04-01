import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

APP_NAME = 'Infinity Compliance'
APP_URL  = os.getenv('APP_URL', 'https://artci-frontend.onrender.com')


def send_email(to: str, subject: str, html: str) -> bool:
    gmail_user = os.getenv('GMAIL_USER', '')
    gmail_pwd  = os.getenv('GMAIL_PASSWORD', '')

    if not gmail_user or not gmail_pwd:
        print(f"[EMAIL] Identifiants Gmail manquants — email non envoyé à {to}")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = f'{APP_NAME} <{gmail_user}>'
        msg['To']      = to
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(gmail_user, gmail_pwd)
            server.sendmail(gmail_user, to, msg.as_string())

        print(f"[EMAIL] ✓ Envoyé à {to} — {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] ✗ Erreur — {e}")
        return False


def _base_template(contenu: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {{ font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }}
    .header {{ background: #111; padding: 24px 32px; }}
    .header h1 {{ color: #fff; margin: 0; font-size: 18px; font-weight: 600; }}
    .header p {{ color: #aaa; margin: 4px 0 0; font-size: 12px; }}
    .body {{ padding: 32px; color: #333; line-height: 1.6; }}
    .body h2 {{ font-size: 20px; margin: 0 0 16px; color: #111; }}
    .otp {{ background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #111; font-family: monospace; }}
    .otp-info {{ font-size: 12px; color: #888; margin-top: 8px; }}
    .btn {{ display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }}
    .warning {{ background: #fff8e1; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #856404; margin: 16px 0; }}
    .footer {{ padding: 20px 32px; background: #f9f9f9; border-top: 1px solid #eee; font-size: 11px; color: #aaa; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Infinity Compliance</h1>
      <p>Plateforme de conformité ARTCI — Côte d'Ivoire</p>
    </div>
    <div class="body">
      {contenu}
    </div>
    <div class="footer">
      Cet email a été envoyé automatiquement par Infinity Compliance.<br>
      Ne pas répondre à cet email.
    </div>
  </div>
</body>
</html>
"""


def send_verification_inscription(to: str, code: str) -> bool:
    contenu = f"""
    <h2>Confirmez votre adresse email</h2>
    <p>Bienvenue sur Infinity Compliance !<br>
    Pour activer votre compte, saisissez le code ci-dessous :</p>

    <div class="otp">
      <div class="otp-code">{code}</div>
      <div class="otp-info">Ce code est valable <strong>15 minutes</strong></div>
    </div>

    <div class="warning">
      ⚠️ Si vous n'avez pas créé de compte sur Infinity Compliance, ignorez cet email.
    </div>

    <p style="font-size:13px; color:#888;">
      Heure d'envoi : {datetime.now().strftime('%d/%m/%Y à %H:%M')} (UTC)
    </p>
    """
    return send_email(to, f'[{APP_NAME}] Confirmez votre email — Code : {code}', _base_template(contenu))


def send_otp_a2f(to: str, otp: str) -> bool:
    contenu = f"""
    <h2>Code de vérification</h2>
    <p>Vous tentez de vous connecter à votre espace Infinity Compliance.</p>

    <div class="otp">
      <div class="otp-code">{otp}</div>
      <div class="otp-info">Ce code est valable <strong>10 minutes</strong></div>
    </div>

    <div class="warning">
      ⚠️ Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe immédiatement.
    </div>

    <p style="font-size:13px; color:#888;">
      Heure d'envoi : {datetime.now().strftime('%d/%m/%Y à %H:%M')} (UTC)
    </p>
    """
    return send_email(to, f'[{APP_NAME}] Votre code de connexion : {otp}', _base_template(contenu))


def send_password_reset(to: str, token: str) -> bool:
    reset_url = f"{APP_URL}/reset-password?token={token}"
    contenu = f"""
    <h2>Réinitialisation de votre mot de passe</h2>
    <p>Vous avez demandé la réinitialisation de votre mot de passe Infinity Compliance.</p>

    <div style="text-align:center; margin: 28px 0;">
      <a href="{reset_url}" class="btn">Réinitialiser mon mot de passe</a>
    </div>

    <div class="warning">
      ⚠️ Ce lien est valable <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.<br>
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </div>

    <p style="font-size:12px; color:#aaa; word-break:break-all;">
      Si le bouton ne fonctionne pas, copiez ce lien :<br>{reset_url}
    </p>
    """
    return send_email(to, f'[{APP_NAME}] Réinitialisation de votre mot de passe', _base_template(contenu))


def send_welcome(to: str) -> bool:
    contenu = f"""
    <h2>Bienvenue sur Infinity Compliance !</h2>
    <p>Votre compte a été activé avec succès. Vous pouvez maintenant :</p>
    <ul>
      <li>Remplir vos formulaires ARTCI en ligne</li>
      <li>Bénéficier de l'assistance IA spécialisée sur la loi n°2013-450</li>
      <li>Signer électroniquement vos dossiers</li>
      <li>Suivre l'avancement de vos dossiers en temps réel</li>
    </ul>

    <div style="text-align:center; margin: 28px 0;">
      <a href="{APP_URL}" class="btn">Accéder à mon espace</a>
    </div>
    """
    return send_email(to, f'Bienvenue sur {APP_NAME} !', _base_template(contenu))


def send_dossier_status(to: str, reference: str, statut: str) -> bool:
    labels = {
        'en_attente_signature': ('En attente de signature',  'Votre dossier est prêt. Signez-le électroniquement pour continuer.'),
        'en_attente_paiement':  ('En attente de paiement',   "Votre dossier a été signé. Procédez au paiement pour le transmettre à l'ARTCI."),
        'transmis':             ("Transmis à l'ARTCI",        "Votre dossier a été transmis à l'ARTCI. Délai de traitement : 1 mois."),
        'en_cours':             ("En cours d'instruction",    "L'ARTCI instruit votre dossier."),
        'complet':              ('Récépissé délivré ✓',       "Félicitations ! Votre dossier a été accepté par l'ARTCI."),
        'refuse':               ('Dossier refusé',            "Votre dossier a été refusé. Vous pouvez introduire un recours dans les 30 jours."),
    }
    label, message = labels.get(statut, ('Mise à jour', 'Le statut de votre dossier a été mis à jour.'))
    contenu = f"""
    <h2>Mise à jour de votre dossier</h2>
    <p>Le statut de votre dossier <strong style="font-family:monospace">{reference}</strong> a été mis à jour.</p>

    <div style="background:#f5f5f5; border-radius:8px; padding:16px; margin:20px 0;">
      <div style="font-size:13px; color:#888; margin-bottom:4px;">Nouveau statut</div>
      <div style="font-size:16px; font-weight:600; color:#111;">{label}</div>
      <div style="font-size:13px; color:#555; margin-top:8px;">{message}</div>
    </div>

    <div style="text-align:center; margin:24px 0;">
      <a href="{APP_URL}/suivi/{reference}" class="btn">Suivre mon dossier</a>
    </div>
    """
    return send_email(to, f'[{APP_NAME}] Dossier {reference} — {label}', _base_template(contenu))