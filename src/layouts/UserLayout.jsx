import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Calendario from '../components/Calendario';
import MisReservas from '../components/MisReservas';

export default function UserDashboard({ onLogout }) {

    const [vistaActiva, setVistaActiva] = useState('calendario');

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            <Navbar role="user" onLogout={onLogout} />
            <div className="flex flex-1">
                <aside className="w-64 bg-gray-100 p-4 border-r border-gray-300">
                    <h2 className="text-gray-500 text-xs font-bold mb-4 tracking-wider">MENÚ</h2>

                    <nav className="flex flex-col gap-2">

                        {/* BOTÓN 1: CALENDARIO */}
                        <button
                            onClick={() => setVistaActiva('calendario')}
                            className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${vistaActiva === 'calendario'
                                ? 'bg-green-100 text-green-800'
                                : 'text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            📅 Calendario
                        </button>

                        {/* BOTÓN 2: MIS RESERVAS */}
                        <button
                            onClick={() => setVistaActiva('reservas')}
                            className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${vistaActiva === 'reservas'
                                ? 'bg-green-100 text-green-800'
                                : 'text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            🕒 Mis reservas
                        </button>
                    </nav>
                </aside>

                <main className="flex-1 bg-[#1a1a1a]">
                    {vistaActiva === 'calendario' ? (
                        <Calendario />
                    ) : (
                        <MisReservas />
                    )}

                </main>
            </div>
        </div>
    );
}