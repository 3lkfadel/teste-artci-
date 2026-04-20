import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth            from './pages/Auth.jsx'
import ResetPassword   from './pages/ResetPassword.jsx'
import Entreprise      from './pages/Entreprise.jsx'
import Dashboard       from './pages/Dashboard.jsx'
import Formulaire      from './pages/Formulaire.jsx'
import Signature       from './pages/Signature.jsx'
import Suivi           from './pages/Suivi.jsx'
import Parametres      from './pages/Parametres.jsx'
import Admin           from './pages/Admin.jsx'
import Paiement        from './pages/Paiement.jsx'
import ARTCILogin      from './pages/ARTCILogin.jsx'
import ARTCIDashboard  from './pages/ARTCIDashboard.jsx'
import ARTCIDossier    from './pages/ARTCIDossier.jsx'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/auth" replace />
  return children
}

function ARTCIRoute({ children }) {
  const token = localStorage.getItem('artci_token')
  if (!token) return <Navigate to="/artci/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth utilisateurs */}
        <Route path="/auth"                 element={<Auth />} />
        <Route path="/reset-password"       element={<ResetPassword />} />
        <Route path="/suivi/:ref"           element={<Suivi />} />

        {/* Pages protégées utilisateurs */}
        <Route path="/entreprise"           element={<PrivateRoute><Entreprise /></PrivateRoute>} />
        <Route path="/dashboard"            element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/formulaire/:type/:id" element={<PrivateRoute><Formulaire /></PrivateRoute>} />
        <Route path="/signature/:id"        element={<PrivateRoute><Signature /></PrivateRoute>} />
        <Route path="/parametres"           element={<PrivateRoute><Parametres /></PrivateRoute>} />
        <Route path="/paiement/:id"         element={<PrivateRoute><Paiement /></PrivateRoute>} />

        {/* Admin Infinity */}
        <Route path="/admin"                element={<Admin />} />

        {/* Espace Agents ARTCI */}
        <Route path="/artci/login"          element={<ARTCILogin />} />
        <Route path="/artci/dashboard"      element={<ARTCIRoute><ARTCIDashboard /></ARTCIRoute>} />
        <Route path="/artci/dossiers/:id"   element={<ARTCIRoute><ARTCIDossier /></ARTCIRoute>} />

        <Route path="/"                     element={<Navigate to="/dashboard" replace />} />
        <Route path="*"                     element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}