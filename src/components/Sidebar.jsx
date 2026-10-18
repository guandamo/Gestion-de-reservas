import React from 'react';
import { NavLink } from 'react-router-dom';
import { adminItems } from './sidebarItems.js';

export default function Sidebar() {
    return (
        <aside className="hidden lg:flex w-52 bg-verde-claro text-negro flex-col min-h-[calc(100vh-60px)] p-3 shadow-inner">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-3">
                Gestión
            </div>

            <nav className="flex flex-col gap-1">
                {adminItems.map((item) => (
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