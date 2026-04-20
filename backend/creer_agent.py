import urllib.request, json

token = 'COLLE_TON_NOUVEAU_TOKEN_ICI'

data = json.dumps({
    'nom': 'Kouassi',
    'prenom': 'Jean',
    'email': 'agent@artci.ci',
    'mot_de_passe': 'artci2026',
    'service': 'DPO'
}).encode()

req = urllib.request.Request(
    'http://localhost:5000/api/artci/agents',
    data=data,
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    },
    method='POST'
)

try:
    res = urllib.request.urlopen(req)
    print('Succès :', res.read().decode())
except urllib.error.HTTPError as e:
    print('Erreur :', e.read().decode())
