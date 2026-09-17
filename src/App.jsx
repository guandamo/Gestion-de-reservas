import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';

import Calendario from './components/Calendario';
import Reportes from './pages/Reportes';
import CanchasYPrecios from './pages/CanchasYPrecios';
import Usuarios from './pages/Usuarios';
import ReservasAdmin from './pages/ReservasAdmin';
import UserLayout from './layouts/UserLayout.jsx';
import ReservarView from './pages/ReservarView.jsx';
import MisReservasView from './pages/MisReservasView.jsx';

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
                        <Route index element={<Calendario />} />
                        <Route path="reservas" element={<ReservasAdmin />} />
                        <Route path="reportes" element={<Reportes />} />
                        <Route path="canchas" element={<CanchasYPrecios />} />
                        <Route path="usuarios" element={<Usuarios />} />
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
                    </Route>

                    {/* Cualquier ruta desconocida -> login */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
