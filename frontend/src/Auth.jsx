import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth       from './pages/Auth.jsx'
import Entreprise from './pages/Entreprise.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import Formulaire from './pages/Formulaire.jsx'
import Signature  from './pages/Signature.jsx'
import Suivi      from './pages/Suivi.jsx'

function Protected({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth"                  element={<Auth />} />
        <Route path="/suivi/:ref"            element={<Suivi />} />
        <Route path="/entreprise"            element={<Protected><Entreprise /></Protected>} />
        <Route path="/dashboard"             element={<Protected><Dashboard /></Protected>} />
        <Route path="/formulaire/:type/:id?" element={<Protected><Formulaire /></Protected>} />
        <Route path="/signature/:id"         element={<Protected><Signature /></Protected>} />
        <Route path="*"                      element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  )
}