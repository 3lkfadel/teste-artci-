// Props : { erreurs, onCorrection, onContinuer }
export default function ValidationPopup({ erreurs, onCorrection, onContinuer }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12,
        width: '100%', maxWidth: 520,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* En-tête orange */}
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', padding: '18px 24px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e' }}>
            ⚠️ Attention — {erreurs.length} champ{erreurs.length > 1 ? 's' : ''} nécessite{erreurs.length > 1 ? 'nt' : ''} votre attention
          </div>
          <div style={{ fontSize: 13, color: '#b45309', marginTop: 6, lineHeight: 1.5 }}>
            Notre IA a détecté des anomalies qui pourraient entraîner un refus de votre dossier par l'ARTCI.
          </div>
        </div>

        {/* Liste des erreurs */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {erreurs.map((e, i) => (
              <div key={i} style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 3 }}>
                    {e.label || e.champ}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                    {e.probleme}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button
              onClick={onCorrection}
              style={{ width: '100%', padding: '11px', background: '#00843D', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Corriger mon formulaire
            </button>
            <button
              onClick={onContinuer}
              style={{ width: '100%', padding: '11px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}
            >
              Continuer quand même →
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            Vous pouvez corriger maintenant ou soumettre quand même.<br />
            L'équipe ARTCI examinera votre dossier.
          </div>
        </div>
      </div>
    </div>
  )
}
