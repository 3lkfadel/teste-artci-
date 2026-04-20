"""Lance ce script depuis le dossier backend avec : python3 creer_agent_direct.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db
from models import AgentARTCI
from werkzeug.security import generate_password_hash

with app.app_context():
    email = 'agent@artci.ci'
    if AgentARTCI.query.filter_by(email=email).first():
        print(f'Agent {email} existe déjà.')
    else:
        agent = AgentARTCI(
            nom          = 'Kouassi',
            prenom       = 'Jean',
            email        = email,
            mot_de_passe = generate_password_hash('artci2026'),
            service      = 'DPO',
        )
        db.session.add(agent)
        db.session.commit()
        print(f'Agent créé ! ID={agent.id}')
        print(f'Email    : {email}')
        print(f'Password : artci2026')
        print(f'URL      : http://localhost:5173/artci/login')
