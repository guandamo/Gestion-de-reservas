import React from 'react';
import UserLayout from '../layouts/UserLayout';

export default function UserDashboard({ onLogout }) {
    return (
        <UserLayout>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blanco">Vista de Cliente / Reservas</h2>
                <button
                    onClick={onLogout}
                    className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-medium"
                >
                    Cerrar Sesión
                </button>
            </div>

            <div className="border-2 border-dashed border-verde-claro/30 rounded-xl p-8 text-center text-gray-300">
                <h3 className="text-lg font-semibold text-blanco mb-2">¡Bienvenido a la sección de reservas!</h3>
                <p>Acá el cliente va a poder consultar los horarios disponibles y reservar su cancha.</p>
            </div>
        </UserLayout>
    );
}