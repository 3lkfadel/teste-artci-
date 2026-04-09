import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth          from './pages/Auth.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Entreprise    from './pages/Entreprise.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import Formulaire    from './pages/Formulaire.jsx'
import Signature     from './pages/Signature.jsx'
import Suivi         from './pages/Suivi.jsx'
import Parametres    from './pages/Parametres.jsx'
import Admin         from './pages/Admin.jsx'
import Paiement      from './pages/Paiement.jsx'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth"                 element={<Auth />} />
        <Route path="/reset-password"       element={<ResetPassword />} />
        <Route path="/suivi/:ref"           element={<Suivi />} />
        <Route path="/admin"                element={<Admin />} />
        <Route path="/entreprise"           element={<PrivateRoute><Entreprise /></PrivateRoute>} />
        <Route path="/dashboard"            element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/formulaire/:type/:id" element={<PrivateRoute><Formulaire /></PrivateRoute>} />
        <Route path="/signature/:id"        element={<PrivateRoute><Signature /></PrivateRoute>} />
        <Route path="/parametres"           element={<PrivateRoute><Parametres /></PrivateRoute>} />
        <Route path="/paiement/:id"         element={<PrivateRoute><Paiement /></PrivateRoute>} />
        <Route path="/"                     element={<Navigate to="/dashboard" replace />} />
        <Route path="*"                     element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}