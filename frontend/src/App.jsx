import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth          from './pages/Auth.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Entreprise    from './pages/Entreprise.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import Formulaire    from './pages/Formulaire.jsx'
import Signature     from './pages/Signature.jsx'
import Suivi         from './pages/Suivi.jsx'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/auth"                    element={<Auth />} />
        <Route path="/reset-password"          element={<ResetPassword />} />
        <Route path="/suivi/:ref"              element={<Suivi />} />

        {/* Privé */}
        <Route path="/entreprise"              element={<PrivateRoute><Entreprise /></PrivateRoute>} />
        <Route path="/dashboard"               element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/formulaire/:type/:id"    element={<PrivateRoute><Formulaire /></PrivateRoute>} />
        <Route path="/signature/:id"           element={<PrivateRoute><Signature /></PrivateRoute>} />

        {/* Redirections */}
        <Route path="/"                        element={<Navigate to="/dashboard" replace />} />
        <Route path="*"                        element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}