import { useNavigate } from 'react-router-dom'

export default function Sidebar({ active }) {
  const nav     = useNavigate()
  const email   = localStorage.getItem('user_email') || ''
  const init    = email ? email.substring(0, 2).toUpperCase() : 'IC'
  const logoUrl = localStorage.getItem('company_logo') || null

  const menu = [
    { key:'dashboard',  label:'Tableau de bord',   path:'/dashboard',  icon:'grid'    },
    { key:'new',        label:'Nouvelle démarche',  path:null,          icon:'plus'    },
    { key:'parametres', label:'Paramètres',         path:'/parametres', icon:'settings'},
  ]

  const icons = {
    grid:     <><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></>,
    plus:     <><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></>,
    building: <><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M5 14V9h6v5"/><rect x="6" y="5" width="1.5" height="2" rx=".5"/><rect x="8.5" y="5" width="1.5" height="2" rx=".5"/></>,
    settings: <><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/></>,
    shield:   <><path d="M8 1L1 4v4c0 3.5 3 6.5 7 7.5 4-1 7-4 7-7.5V4L8 1z"/></>,
    logout:   <><path d="M6 2H2v12h4"/><path d="M11 5l3 3-3 3"/><line x1="7" y1="8" x2="14" y2="8"/></>,
  }

  function Icon({ name }) {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {icons[name]}
      </svg>
    )
  }

  function scrollToNew() {
    const el = document.getElementById('nouvelle-demarche')
    if (el) el.scrollIntoView({ behavior:'smooth' })
    else nav('/dashboard')
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        {logoUrl ? (
          <div className="sidebar-logo-icon" style={{ background:'transparent', padding:2, overflow:'hidden' }}>
            <img src={logoUrl} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:6 }} />
          </div>
        ) : (
          <div className="sidebar-logo-icon">IC</div>
        )}
        <div className="sidebar-logo-title">Infinity Compliance</div>
        <div className="sidebar-logo-sub">Plateforme ARTCI — CI</div>
      </div>

      {/* Menu principal */}
      <div className="sidebar-section">MENU</div>
      {menu.map(item => (
        <div
          key={item.key}
          className={`nav-item ${active === item.key ? 'active' : ''}`}
          onClick={() => item.path ? nav(item.path) : scrollToNew()}
        >
          <Icon name={item.icon} />
          {item.label}
        </div>
      ))}

      {/* Admin */}
     

      {/* Bottom */}
      <div className="sidebar-bottom">
        {email && (
          <div className="user-block" onClick={() => nav('/parametres')}>
            <div className="user-avatar">{init}</div>
            <div>
              <div className="user-name">{email.split('@')[0]}</div>
              <div className="user-email">{email}</div>
            </div>
          </div>
        )}
        <div
          className="nav-item"
          style={{ marginTop: 8, opacity: 0.75 }}
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user_email')
            nav('/auth')
          }}
        >
          <Icon name="logout" />
          Déconnexion
        </div>
      </div>
    </div>
  )
}