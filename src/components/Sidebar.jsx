import React from 'react';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-verde-claro text-negro flex flex-col min-h-[calc(100vh-60px)] p-4 shadow-inner">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-3">
                Gestión
            </div>

            <nav className="flex flex-col gap-1">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-verde-principal text-blanco font-medium shadow-sm transition">
                    <span>📅</span>
                    <span>Calendario</span>
                </button>

                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-black/5 font-medium transition">
                    <span>📊</span>
                    <span>Reportes</span>
                </button>

                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-black/5 font-medium transition">
                    <span>⚙️</span>
                    <span>Canchas y precios</span>
                </button>

                <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-black/5 font-medium transition">
                    <span>👥</span>
                    <span>Usuarios</span>
                </button>
            </nav>
        </aside>
    );
}