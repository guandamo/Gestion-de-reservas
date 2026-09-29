import React from 'react';
import { NavLink } from 'react-router-dom';

const items = [
    { to: '/admin', label: 'Calendario', icon: '📅', end: true },
    { to: '/admin/reservas', label: 'Reservas', icon: '📋' },
    { to: '/admin/reportes', label: 'Reportes', icon: '📊' },
    { to: '/admin/canchas', label: 'Canchas y precios', icon: '⚙️' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
    { to: '/admin/perfil', label: 'Mi perfil', icon: '👤' },
];

export default function Sidebar() {
    return (
        <aside className="w-52 bg-verde-claro text-negro flex flex-col min-h-[calc(100vh-60px)] p-3 shadow-inner">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-3">
                Gestión
            </div>

            <nav className="flex flex-col gap-1">
                {items.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${
                                isActive
                                    ? 'bg-verde-principal text-blanco shadow-sm'
                                    : 'text-gray-700 hover:bg-black/5'
                            }`
                        }
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
