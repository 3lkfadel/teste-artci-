const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api'

function getToken() {
  return localStorage.getItem('token')
}

function sessionExpiree() {
  localStorage.removeItem('token')
  // Sauvegarder l'URL actuelle pour y revenir après connexion
  const urlActuelle = window.location.pathname
  window.location.href = `/auth?session=expiree&redirect=${urlActuelle}`
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

  // Session expirée → rediriger automatiquement
  if (res.status === 401 && token) {
    const data = await res.json()
    // Ne pas rediriger si c'est une erreur de mot de passe ou OTP
    const erreur = data.erreur || ''
    const estLoginOuOtp = erreur.includes('mot de passe') || erreur.includes('Code') || erreur.includes('incorrect')
    if (!estLoginOuOtp) {
      sessionExpiree()
      return
    }
    throw new Error(erreur)
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.erreur || `Erreur ${res.status}`)
  return data
}

// ── Auth ────────────────────────────────────────────────────
export const inscription            = (d) => req('/auth/inscription',              { method: 'POST', body: JSON.stringify(d) })
export const verifierEmail          = (d) => req('/auth/verifier-email',           { method: 'POST', body: JSON.stringify(d) })
export const renvoyerVerification   = (d) => req('/auth/renvoyer-verification',   { method: 'POST', body: JSON.stringify(d) })
export const connexion              = (d) => req('/auth/connexion',                { method: 'POST', body: JSON.stringify(d) })
export const verifierOtp            = (d) => req('/auth/verifier-otp',             { method: 'POST', body: JSON.stringify(d) })
export const renvoyerOtp            = (d) => req('/auth/renvoyer-otp',             { method: 'POST', body: JSON.stringify(d) })
export const activerA2f             = ()  => req('/auth/activer-a2f',              { method: 'POST' })
export const desactiverA2f          = ()  => req('/auth/desactiver-a2f',           { method: 'POST' })
export const getProfil              = ()  => req('/auth/profil')

// ── Password reset ──────────────────────────────────────────
export const motDePasseOublie        = (d)     => req('/auth/mot-de-passe-oublie',        { method: 'POST', body: JSON.stringify(d) })
export const reinitialiserMotDePasse = (d)     => req('/auth/reinitialiser-mot-de-passe', { method: 'POST', body: JSON.stringify(d) })
export const verifierTokenReset      = (token) => req(`/auth/verifier-token-reset?token=${token}`)
export const changerMotDePasse = (d) => req('/auth/changer-mot-de-passe', { method: 'POST', body: JSON.stringify(d) })
// ── Entreprise ──────────────────────────────────────────────
export const getEntreprise         = ()  => req('/entreprise')
export const sauvegarderEntreprise = (d) => req('/entreprise', { method: 'POST', body: JSON.stringify(d) })

export async function uploadLogo(formData) {
  const token = getToken()
  const res = await fetch(`${BASE}/entreprise/logo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (res.status === 401 && token) { sessionExpiree(); return }
  const data = await res.json()
  if (!res.ok) throw new Error(data.erreur || `Erreur ${res.status}`)
  return data
}

// ── IA ──────────────────────────────────────────────────────
export const validerChamp      = (d) => req('/ia/valider-champ',      { method: 'POST', body: JSON.stringify(d) })
export const validerFormulaire = (d) => req('/ia/valider-formulaire', { method: 'POST', body: JSON.stringify(d) })

// ── Dossiers ────────────────────────────────────────────────
export const listerDossiers = (page = 1, perPage = 25) => req(`/dossiers?page=${page}&per_page=${perPage}`)
export const creerDossier   = (d)     => req('/dossiers',       { method: 'POST', body: JSON.stringify(d) })
export const getDossier     = (id)    => req(`/dossiers/${id}`)
export const majDossier     = (id, d) => req(`/dossiers/${id}`, { method: 'PUT',  body: JSON.stringify(d) })

// ── Signature ───────────────────────────────────────────────
export const envoyerOtpSignature = (d) => req('/signature/envoyer-otp', { method: 'POST', body: JSON.stringify(d) })
export const confirmerSignature = (d) => req('/signature/confirmer', { method:'POST', body:JSON.stringify(d) })
// ── Suivi public ────────────────────────────────────────────
export const suiviPublic = (ref) => req(`/suivi/${ref}`)

export const stripeCreateIntent = (d) => req('/paiement/stripe/create-intent', { method:'POST', body:JSON.stringify(d) })
export const stripeConfirm      = (d) => req('/paiement/stripe/confirm',         { method:'POST', body:JSON.stringify(d) })
export const soumettreGratuit   = (d) => req('/paiement/gratuit',                { method:'POST', body:JSON.stringify(d) })

export const validerFormulaireComplet = (d) => req('/ia/valider-formulaire-complet', { method: 'POST', body: JSON.stringify(d) })

