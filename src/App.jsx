import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import UserDashboard from './pages/UserDashboard';

import Calendario from './components/Calendario';
import Reportes from './pages/Reportes';
import CanchasYPrecios from './pages/CanchasYPrecios';
import Usuarios from './pages/Usuarios';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Login */}
                <Route path="/login" element={<Login />} />

                {/* Panel Admin: AdminLayout es el "padre" de todas estas rutas */}
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Calendario />} />
                    <Route path="reportes" element={<Reportes />} />
                    <Route path="canchas" element={<CanchasYPrecios />} />
                    <Route path="usuarios" element={<Usuarios />} />
                </Route>

                {/* Panel Usuario */}
                <Route path="/user" element={<UserDashboard />} />

                {/* Cualquier ruta desconocida -> login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}