const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

function getToken() {
  return localStorage.getItem('token')
}


async function req(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.erreur || `Erreur ${res.status}`)
  return data
}

// Détecter session expirée
const params = new URLSearchParams(window.location.search)
if (params.get('session') === 'expiree') {
  // sera affiché dans le state err
}

// ── Auth ────────────────────────────────────────────────────
export const inscription            = (d) => req('/auth/inscription',              { method: 'POST', body: JSON.stringify(d) })
export const verifierEmail          = (d) => req('/auth/verifier-email',            { method: 'POST', body: JSON.stringify(d) })
export const renvoyerVerification   = (d) => req('/auth/renvoyer-verification',    { method: 'POST', body: JSON.stringify(d) })
export const connexion              = (d) => req('/auth/connexion',                 { method: 'POST', body: JSON.stringify(d) })
export const verifierOtp            = (d) => req('/auth/verifier-otp',              { method: 'POST', body: JSON.stringify(d) })
export const renvoyerOtp            = (d) => req('/auth/renvoyer-otp',              { method: 'POST', body: JSON.stringify(d) })
export const activerA2f             = ()  => req('/auth/activer-a2f',               { method: 'POST' })
export const desactiverA2f          = ()  => req('/auth/desactiver-a2f',            { method: 'POST' })
export const getProfil              = ()  => req('/auth/profil')

// ── Password reset ──────────────────────────────────────────
export const motDePasseOublie         = (d)     => req('/auth/mot-de-passe-oublie',        { method: 'POST', body: JSON.stringify(d) })
export const reinitialiserMotDePasse  = (d)     => req('/auth/reinitialiser-mot-de-passe', { method: 'POST', body: JSON.stringify(d) })
export const verifierTokenReset       = (token) => req(`/auth/verifier-token-reset?token=${token}`)

// ── Entreprise ──────────────────────────────────────────────
export const getEntreprise         = ()  => req('/entreprise')
export const sauvegarderEntreprise = (d) => req('/entreprise', { method: 'POST', body: JSON.stringify(d) })

// ── IA ──────────────────────────────────────────────────────
export const validerChamp      = (d) => req('/ia/valider-champ',      { method: 'POST', body: JSON.stringify(d) })
export const validerFormulaire = (d) => req('/ia/valider-formulaire', { method: 'POST', body: JSON.stringify(d) })

// ── Dossiers ────────────────────────────────────────────────
export const listerDossiers = ()      => req('/dossiers')
export const creerDossier   = (d)     => req('/dossiers',       { method: 'POST', body: JSON.stringify(d) })
export const getDossier     = (id)    => req(`/dossiers/${id}`)
export const majDossier     = (id, d) => req(`/dossiers/${id}`, { method: 'PUT',  body: JSON.stringify(d) })

// ── Signature ───────────────────────────────────────────────
export const envoyerOtpSignature = (d) => req('/signature/envoyer-otp', { method: 'POST', body: JSON.stringify(d) })
export const confirmerSignature  = (d) => req('/signature/confirmer',   { method: 'POST', body: JSON.stringify(d) })

// ── Suivi public ────────────────────────────────────────────
export const suiviPublic = (ref) => req(`/suivi/${ref}`)