import React from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Calendario from '../components/Calendario';

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

            <Calendario />
        </AdminLayout>
    );
}

import React, { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Calendario from '../components/Calendario';
import Reportes from './Reportes';

export default function AdminDashboard({ onLogout }) {
    const [pagina, setPagina] = useState('calendario');

    return (
        <AdminLayout onNavigate={setPagina}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-blanco">Panel de Control - Administrador</h2>
                <button
                    onClick={onLogout}
                    className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-medium"
                >
                    Cerrar Sesión
                </button>
            </div>

            {pagina === 'calendario' ? <Calendario /> : <Reportes />}
        </AdminLayout>
    );
}