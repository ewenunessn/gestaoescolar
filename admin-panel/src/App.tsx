import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Institutions from './pages/Institutions';
import InstitutionDetail from './pages/InstitutionDetail';
import CreateInstitution from './pages/CreateInstitution';
import Tenants from './pages/Tenants';
import TenantData from './pages/TenantData';
import GerenciarUsuario from './pages/GerenciarUsuario';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/institutions" element={<ProtectedRoute><Institutions /></ProtectedRoute>} />
          <Route path="/institutions/new" element={<ProtectedRoute><CreateInstitution /></ProtectedRoute>} />
          <Route path="/institutions/:id" element={<ProtectedRoute><InstitutionDetail /></ProtectedRoute>} />
          <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
          <Route path="/tenants/:tenantId" element={<ProtectedRoute><TenantData /></ProtectedRoute>} />
          <Route path="/usuarios/:id" element={<ProtectedRoute><GerenciarUsuario /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
