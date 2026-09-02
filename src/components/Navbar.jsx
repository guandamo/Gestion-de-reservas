import React, { useState, useEffect, useRef } from 'react';

const config = {
    admin: {
        label: 'Admin',
        nombre: 'Administrador',
        iniciales: 'AD',
        avatarBg: 'bg-verde-claro',
        avatarText: 'text-verde-principal',
    },
    user: {
        label: 'Usuario',
        nombre: 'Usuario',
        iniciales: 'U',
        avatarBg: 'bg-green-200',
        avatarText: 'text-green-900',
    },
};

export default function Navbar({ role = 'admin', onLogout }) {
    const { label, nombre, iniciales, avatarBg, avatarText } = config[role];

    const [menuAbierto, setMenuAbierto] = useState(false);

    const menuRef = useRef(null);

    useEffect(() => {
        function handleClickAfuera(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuAbierto(false);
            }
        }
        document.addEventListener('mousedown', handleClickAfuera);
        return () => document.removeEventListener('mousedown', handleClickAfuera);
    }, []);

    return (
        <header className="bg-verde-principal text-blanco px-6 py-3 flex items-center justify-between shadow-md">

            <div className="flex items-center gap-3">
                <div className="bg-blanco/20 p-2 rounded-full flex items-center justify-center">
                    ⚽
                </div>
                <h1 className="text-xl font-bold tracking-wide">Gestión de canchas</h1>
                <span className="bg-black/30 text-xs px-2.5 py-1 rounded-full text-verde-claro font-medium border border-verde-claro/20">
                    {label}
                </span>
            </div>

            <div className="relative" ref={menuRef}>

                <button
                    onClick={() => setMenuAbierto(!menuAbierto)}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
                >
                    <div className={`${avatarBg} ${avatarText} font-bold w-9 h-9 rounded-full flex items-center justify-center text-sm`}>
                        {iniciales}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{nombre}</span>
                    <span className={`text-xs transition-transform duration-200 ${menuAbierto ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </button>

                {menuAbierto && (
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                        {/* Info del usuario */}
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-800">{nombre}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                        </div>

                        {/* Opción Cerrar Sesión (solo si se pasó la función onLogout) */}
                        {onLogout && (
                            <button
                                onClick={() => {
                                    setMenuAbierto(false);
                                    onLogout();
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                                <span>🚪</span>
                                <span>Cerrar Sesión</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}