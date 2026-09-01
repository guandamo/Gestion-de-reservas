import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        // TODO: cuando tengas auth real (JWT), acá también limpiás el token guardado
        navigate('/login');
    };

    return (
        <header className="bg-verde-principal text-blanco px-6 py-3 flex items-center justify-between shadow-md">
            {/* Sección Izquierda: Logo y Título */}
            <div className="flex items-center gap-3">
                <div className="bg-blanco/20 p-2 rounded-full flex items-center justify-center">
                    ⚽
                </div>
                <h1 className="text-xl font-bold tracking-wide">Gestión de canchas</h1>
                <span className="bg-black/30 text-xs px-2.5 py-1 rounded-full text-verde-claro font-medium border border-verde-claro/20">
                    Admin
                </span>
            </div>

            {/* Sección Derecha: Usuario */}
            <div className="flex items-center gap-3">
                <div className="bg-verde-claro text-verde-principal font-bold w-9 h-9 rounded-full flex items-center justify-center text-sm">
                    AD
                </div>
                <span className="text-sm font-medium hidden sm:inline">Administrador</span>

                <button
                    onClick={handleLogout}
                    className="text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-medium"
                >
                    Cerrar Sesión
                </button>
            </div>
        </header>
    );
}