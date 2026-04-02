import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const BASE = import.meta.env.VITE_API_URL || 'https://artci-backend.onrender.com/api'

function getToken() { return localStorage.getItem('token') }

function formatTaille(octets) {
  if (octets < 1024)        return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

const ICONES = { pdf: '📄', jpg: '🖼️', png: '🖼️', doc: '📝', docx: '📝' }

export default function PiecesJointes({ dossierId, readOnly = false }) {
  const [pieces, setPieces]   = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr]         = useState('')
  const [ok, setOk]           = useState('')
  const [nomDoc, setNomDoc]   = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    charger()
  }, [dossierId])

  async function charger() {
    if (!dossierId) return
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/dossiers/${dossierId}/pieces-jointes`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (res.ok) setPieces(data)
    } catch {} finally { setLoading(false) }
  }

  async function uploader(e) {
    const fichier = e.target.files[0]
    if (!fichier) return
    setErr(''); setOk('')
    setUploading(true)

    const form = new FormData()
    form.append('fichier', fichier)
    form.append('nom', nomDoc || fichier.name)

    try {
      const res = await fetch(`${BASE}/dossiers/${dossierId}/pieces-jointes`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body:    form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erreur)
      setPieces(p => [...p, data])
      setOk('Document ajouté avec succès.')
      setNomDoc('')
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) { setErr(e.message) } finally { setUploading(false) }
  }

  async function supprimer(pjId) {
    if (!confirm('Supprimer ce document ?')) return
    setErr('')
    try {
      const res = await fetch(`${BASE}/dossiers/${dossierId}/pieces-jointes/${pjId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (res.ok) {
        setPieces(p => p.filter(pj => pj.id !== pjId))
        setOk('Document supprimé.')
      }
    } catch { setErr('Erreur lors de la suppression.') }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        📎 Pièces jointes
        {pieces.length > 0 && <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 8 }}>({pieces.length} document{pieces.length > 1 ? 's' : ''})</span>}
      </h3>

      {err && <div className="alert alert-err" style={{ marginBottom: 12 }}>{err}</div>}
      {ok  && <div className="alert alert-ok"  style={{ marginBottom: 12 }}>{ok}</div>}

      {/* Liste des pièces jointes */}
      {loading ? (
        <div style={{ color: '#888', fontSize: 13 }}>Chargement...</div>
      ) : pieces.length === 0 ? (
        <div style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic', marginBottom: 16 }}>
          Aucun document joint.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {pieces.map(pj => (
            <div key={pj.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f9f9f9', borderRadius: 8, border: '1px solid #eee' }}>
              <span style={{ fontSize: 20 }}>{ICONES[pj.type] || '📎'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pj.nom}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{pj.type.toUpperCase()} · {formatTaille(pj.taille)} · {new Date(pj.cree_le).toLocaleDateString('fr-FR')}</div>
              </div>
              <a href={pj.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#111', textDecoration: 'none', padding: '4px 10px', border: '1px solid #ddd', borderRadius: 4 }}>
                Voir
              </a>
              {!readOnly && (
                <button onClick={() => supprimer(pj.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#ef4444' }} title="Supprimer">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zone d'upload */}
      {!readOnly && (
        <div style={{ border: '2px dashed #ddd', borderRadius: 8, padding: 16 }}>
          <div className="field" style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13 }}>Nom du document (optionnel)</label>
            <input
              type="text"
              value={nomDoc}
              onChange={e => setNomDoc(e.target.value)}
              placeholder="Ex: Statuts de l'entreprise, Pièce d'identité..."
              style={{ fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ fontSize: 13 }}
            >
              {uploading ? 'Upload en cours...' : '📎 Ajouter un document'}
            </button>
            <span style={{ fontSize: 11, color: '#aaa' }}>PDF, JPG, PNG, DOC, DOCX · Max 10 MB</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={uploader}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  )
}