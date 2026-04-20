import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import * as api from '../api.js'
import ApercuPDF from './ApercuPDF.jsx'
import Sidebar from './Sidebar.jsx'

const LABELS_TYPE = {
  declaration:  'Déclaration de traitement',
  autorisation: "Demande d'autorisation préalable",
  dpo:          'Enregistrement correspondant DPO',
  transfert:    'Transfert international de données',
  sva:          'Déclaration SVA — Service à Valeur Ajoutée',
  ussd:         'Demande de code USSD',
}

export default function Signature() {
  const { id } = useParams()
  const nav = useNavigate()
  const sigRef = useRef(null)

  const [dossier, setDossier]             = useState(null)
  const [etape, setEtape]                 = useState('recap')
  const [signatureData, setSignatureData] = useState(null)
  const [signatureVide, setSignatureVide] = useState(true)
  const [otpCode, setOtpCode]             = useState('')
  const [otpVisible, setOtpVisible]       = useState(null)
  const [loading, setLoading]             = useState(false)
  const [err, setErr]                     = useState('')

  useEffect(() => {
    api.getDossier(id).then(setDossier).catch(() => nav('/dashboard'))
  }, [id])

  function effacerSignature() {
    sigRef.current?.clear()
    setSignatureVide(true)
    setSignatureData(null)
  }

  async function validerSignature() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setErr('Veuillez signer dans le cadre ci-dessus.')
      return
    }
    const data = sigRef.current.getCanvas().toDataURL('image/png')
    setSignatureData(data)
    setErr('')
    setLoading(true)
    try {
      const r = await api.envoyerOtpSignature({ dossier_id: Number(id) })
      setOtpVisible(r.otp_code)
      setEtape('otp')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function renvoyerOtp() {
    setErr(''); setLoading(true)
    try {
      const r = await api.envoyerOtpSignature({ dossier_id: Number(id) })
      setOtpVisible(r.otp_code)
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  async function confirmer(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      await api.confirmerSignature({ dossier_id: Number(id), code: otpCode })
      setEtape('confirme')
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  if (!dossier) return <div className="page"><p>Chargement...</p></div>
  const donnees = dossier.donnees || {}

  const stepIdx = etape === 'recap' ? 0 : etape === 'signature' ? 1 : etape === 'otp' ? 2 : 3

  return (
    <div className="app-layout">
      <Sidebar active="dashboard" />
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="topbar-title">Signature électronique</div>
              <div className="topbar-sub">{LABELS_TYPE[dossier.type_formulaire]}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:16 }}>
              {['Récapitulatif','Signature','Code OTP','Confirmé'].map((s, i) => (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {i > 0 && <div style={{ width:16, height:1, background: i <= stepIdx ? 'var(--green)' : 'var(--border)' }} />}
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background: i < stepIdx ? 'var(--green)' : i === stepIdx ? 'var(--green)' : 'var(--border)', color: i <= stepIdx ? '#fff' : 'var(--text-3)', fontSize:10, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {i < stepIdx ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize:11, color: i === stepIdx ? 'var(--green)' : 'var(--text-3)', fontWeight: i === stepIdx ? 500 : 400 }}>{s}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={() => nav('/dashboard')}>← Dashboard</button>
          </div>
        </div>

        <div className="page">

          {/* ── RÉCAPITULATIF ── */}
          {etape === 'recap' && (
            <>
              <h1>Récapitulatif du dossier</h1>
              <p className="subtitle">Vérifiez les informations avant de signer électroniquement.</p>

              <div className="card" style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Référence dossier</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:600 }}>{dossier.reference}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>{LABELS_TYPE[dossier.type_formulaire]}</div>
                  </div>
                  <span className={`statut-badge statut-${dossier.statut}`}>{dossier.statut?.replace(/_/g,' ')}</span>
                </div>
              </div>

              <div className="card" style={{ marginBottom:16 }}>
                <div className="card-header"><div className="card-title">Données du formulaire</div></div>
                {Object.entries(donnees).map(([k, v]) => {
                  if (!v || (Array.isArray(v) && v.length === 0)) return null
                  return (
                    <div className="recap-row" key={k} style={{ padding:'10px 0' }}>
                      <span className="recap-label">{k.replace(/_/g,' ')}</span>
                      <span style={{ fontSize:13 }}>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                    </div>
                  )
                })}
              </div>

              <ApercuPDF dossier={{ ...dossier, donnees }} />

              <div className="alert alert-info" style={{ marginBottom:20 }}>
                En signant ce document, vous attestez que les informations fournies sont exactes et conformes à la loi n°2013-450 du 19 juin 2013.
              </div>

              {err && <div className="alert alert-err">{err}</div>}

              <div style={{ display:'flex', gap:12 }}>
                <button className="btn btn-primary" onClick={() => setEtape('signature')}>
                  Procéder à la signature →
                </button>
                <button className="btn btn-secondary" onClick={() => nav(`/formulaire/${dossier.type_formulaire}/${id}`)}>
                  ← Modifier
                </button>
              </div>
            </>
          )}

          {/* ── SIGNATURE MANUSCRITE ── */}
          {etape === 'signature' && (
            <>
              <h1>Signature manuscrite</h1>
              <p className="subtitle">Signez dans le cadre ci-dessous avec votre souris ou votre doigt.</p>

              {err && <div className="alert alert-err">{err}</div>}

              <div className="card" style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, padding:'12px 14px', background:'var(--bg)', borderRadius:8 }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:2 }}>Signataire</div>
                    <div style={{ fontWeight:500, fontSize:13 }}>{donnees.signataire_nom || donnees.rep_nom || '—'}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)' }}>{donnees.signataire_fonction || donnees.rep_qualite || '—'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:2 }}>Dossier</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:500 }}>{dossier.reference}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{new Date().toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, marginBottom:8 }}>
                    Zone de signature <span className="required">*</span>
                  </label>
                  <div style={{ border:'2px dashed var(--border)', borderRadius:8, background:'#fafafa', position:'relative', overflow:'hidden' }}>
                    <SignatureCanvas
                      ref={sigRef}
                      canvasProps={{
                        width: 680,
                        height: 200,
                        style: { width:'100%', height:200, cursor:'crosshair', display:'block' }
                      }}
                      backgroundColor="#fafafa"
                      penColor="#1a1a1a"
                      onEnd={() => setSignatureVide(false)}
                    />
                    {signatureVide && (
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                        <span style={{ fontSize:14, color:'#bbb' }}>✍️ Signez ici</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                    <span style={{ fontSize:11, color:'var(--text-3)' }}>Utilisez votre souris ou votre doigt pour signer</span>
                    <button type="button" className="btn-link" style={{ fontSize:12, color:'#DC2626' }} onClick={effacerSignature}>
                      ✕ Effacer
                    </button>
                  </div>
                </div>

                <div style={{ background:'var(--green-light)', borderRadius:8, padding:12, fontSize:12, color:'var(--green-dark)', marginBottom:16 }}>
                  🔒 Cette signature sera complétée par un code OTP envoyé sur votre email pour validation finale.
                </div>

                <div style={{ display:'flex', gap:12 }}>
                  <button
                    className="btn btn-primary"
                    onClick={validerSignature}
                    disabled={loading}
                  >
                    {loading ? 'Envoi du code OTP...' : 'Valider et recevoir le code OTP →'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { effacerSignature(); setEtape('recap') }}>
                    ← Retour
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── OTP ── */}
          {etape === 'otp' && (
            <>
              <h1>Confirmation par code OTP</h1>
              <p className="subtitle">Saisissez le code à 6 chiffres envoyé sur votre email.</p>

              {signatureData && (
                <div className="card" style={{ marginBottom:16 }}>
                  <div className="card-header"><div className="card-title">Votre signature</div></div>
                  <img src={signatureData} alt="Signature" style={{ maxWidth:300, border:'1px solid var(--border)', borderRadius:6, background:'#fff', padding:8 }} />
                </div>
              )}

              {otpVisible && (
                <div className="alert alert-warn" style={{ marginBottom:20 }}>
                  Code de test : <strong style={{ fontFamily:'var(--mono)', fontSize:22, letterSpacing:8 }}>{otpVisible}</strong>
                  <div style={{ fontSize:11, marginTop:4, color:'var(--text-3)' }}>En production ce code est envoyé uniquement par email.</div>
                </div>
              )}

              {err && <div className="alert alert-err">{err}</div>}

              <div className="card">
                <form onSubmit={confirmer}>
                  <div className="field">
                    <label>Code OTP à 6 chiffres</label>
                    <input
                      type="text" maxLength={6} value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g,''))}
                      style={{ letterSpacing:12, fontSize:28, textAlign:'center', fontFamily:'var(--mono)' }}
                      autoFocus required
                    />
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>Valable 10 minutes — vérifiez vos spams</div>
                  </div>
                  <div style={{ display:'flex', gap:12 }}>
                    <button className="btn btn-primary" disabled={loading || otpCode.length < 6}>
                      {loading ? 'Vérification...' : 'Confirmer la signature'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={renvoyerOtp} disabled={loading}>
                      Renvoyer le code
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── CONFIRMÉ ── */}
          {etape === 'confirme' && (
            <div className="card" style={{ textAlign:'center', padding:48 }}>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <h1 style={{ marginBottom:8 }}>Dossier signé avec succès</h1>
              <p style={{ color:'var(--text-3)', marginBottom:24 }}>
                Votre signature a été confirmée.<br />
                Référence : <strong style={{ fontFamily:'var(--mono)' }}>{dossier.reference}</strong>
              </p>

              {signatureData && (
                <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
                  <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:16, background:'#fafafa', display:'inline-block', textAlign:'left' }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:8 }}>Signature du responsable</div>
                    <img src={signatureData} alt="Signature" style={{ maxWidth:280, display:'block' }} />
                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:8, textAlign:'right' }}>
                      {new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })}
                    </div>
                  </div>
                </div>
              )}

              <div className="alert alert-info" style={{ textAlign:'left', marginBottom:24 }}>
                Prochaine étape : procéder au paiement des frais pour que votre dossier soit transmis à l'ARTCI.
              </div>

              <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                <button type="button" className="btn btn-primary" onClick={() => nav(`/paiement/${id}`)}>
                  💳 Procéder au paiement →
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => nav('/dashboard')}>
                  Tableau de bord
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}