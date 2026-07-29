import React, { useState } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

export default function App() {
  // Estado para simular qué pantalla se muestra: 'login', 'admin' o 'user'
  const [vistaActual, setVistaActual] = useState('login');

  // 1. Si la vista es Admin
  if (vistaActual === 'admin') {
    return <AdminDashboard onLogout={() => setVistaActual('login')} />;
  }

  // 2. Si la vista es Cliente (Usuario)
  if (vistaActual === 'user') {
    return <UserDashboard onLogout={() => setVistaActual('login')} />;
  }

  // 3. Por defecto (Login)
  return <Login onLogin={(rol) => setVistaActual(rol)} />;
}