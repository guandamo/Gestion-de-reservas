import React from 'react';
import AdminLayout from '../layouts/AdminLayout';

export default function AdminDashboard({ onLogout }) {
    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blanco">Panel de Control - Administrador</h2>
                <button
                    onClick={onLogout}
                    className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-medium"
                >
                    Cerrar Sesión
                </button>
            </div>

            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center text-gray-400">
                <h3 className="text-lg font-semibold text-blanco mb-2">¡Bienvenido al Panel Admin!</h3>
                <p>Acá se van a cargar las pestañas de Calendario, Reportes, Canchas y Usuarios.</p>
            </div>
        </AdminLayout>
    );
}