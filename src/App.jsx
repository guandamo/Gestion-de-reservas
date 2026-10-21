import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';

import Calendario from './components/Calendario.jsx';
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
                <Rutas />
            </AuthProvider>
        </BrowserRouter>
    );
}

/**
 * Las rutas van dentro de una frontera de errores.
 *
 * Va DENTRO de `AuthProvider` a propósito: así un fallo de render en una
 * pantalla no puede dejar la app en blanco, y el botón "Reintentar" de la
 * frontera sí puede remontar el subárbol: re-monta la pantalla, que vuelve
 * a disparar su `useEffect` de carga. Si la frontera envolviera también al
 * provider, un error del provider quedaría atrapado y "Reintentar" volvería
 * a fallar en el acto.
 *
 * El `key` por pathname hace que cualquier navegación monte la frontera de
 * nuevo, así el error no "pega" a las pantallas siguientes. Efecto
 * secundario: los layouts (`AdminLayout`, `UserLayout`) se re-montan al
 * navegar y su `drawerOpen` vuelve a `false`. Para un menú lateral móvil
 * eso es lo que se quiere igual (se cierra al navegar), pero es un cambio
 * de comportamiento real.
 */
function Rutas() {
    const location = useLocation();

    return (
        <ErrorBoundary key={location.pathname}>
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
                    <Route
                        index
                        element={
                            <>
                                {/* El admin es de sólo lectura: se muestra el calendario
                                    de grilla en desktop y el vertical en mobile, igual que
                                hace ReservarView. Antes renderizaba siempre el mobile y en
                                    una pantalla grande se veía angosto. */}
                                <div className="hidden lg:block">
                                    <Calendario />
                                </div>
                                <div className="lg:hidden">
                                    <MobileCalendario showReserveCta={false} />
                                </div>
                            </>
                        }
                    />
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
        </ErrorBoundary>
    );
}
