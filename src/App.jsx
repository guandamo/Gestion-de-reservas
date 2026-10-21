import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';

import MobileCalendario from './components/MobileCalendario.jsx';
import Reportes from './pages/Reportes';
import CanchasYPrecios from './pages/CanchasYPrecios';
import Usuarios from './pages/Usuarios';
import ReservasAdmin from './pages/ReservasAdmin';
import UserLayout from './layouts/UserLayout.jsx';
import ReservarView from './pages/ReservarView.jsx';
import MisReservasView from './pages/MisReservasView.jsx';
import Perfil from './pages/Perfil.jsx';
import ResultadoPago from './pages/ResultadoPago.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Login */}
                    <Route path="/login" element={<Login />} />

                    {/* Panel Admin: protegido, solo ADMIN */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requireRole="ADMIN">
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<MobileCalendario showReserveCta={false} />} />
                        <Route path="reservas" element={<ReservasAdmin />} />
                        <Route path="reportes" element={<Reportes />} />
                        <Route path="canchas" element={<CanchasYPrecios />} />
                        <Route path="usuarios" element={<Usuarios />} />
                        <Route path="perfil" element={<Perfil />} />
                    </Route>

                    {/* Panel Usuario: protegido, solo USUARIO */}
                    <Route
                        path="/user"
                        element={
                            <ProtectedRoute requireRole="USUARIO">
                                <UserLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="reservar" replace />} />
                        <Route path="reservar" element={<ReservarView />} />
                        <Route path="mis-reservas" element={<MisReservasView />} />
                        <Route path="perfil" element={<Perfil />} />
                    </Route>

                    {/* Destinos de retorno de Mercado Pago.
                        Van antes del catch-all porque si no, el `*` los
                        mandaría a /login. Son públicas a propósito: la
                        pantalla debe renderizar aunque el usuario haya perdido
                        la sesión durante el redirect. */}
                    <Route path="/pago/exito" element={<ResultadoPago />} />
                    <Route path="/pago/pendiente" element={<ResultadoPago />} />
                    <Route path="/pago/fallo" element={<ResultadoPago />} />

                    {/* Cualquier ruta desconocida -> login */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
