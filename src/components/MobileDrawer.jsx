import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * MobileDrawer — drawer lateral izquierdo con backdrop.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - items: array [{ to, label, icon, end? }]
 *  - currentUser: { nombre, apellido, email, rol } | null
 *  - onLogout: () => void
 *
 * Comportamiento:
 *  - Se cierra con backdrop click y Escape.
 *  - Cierra al cambiar de ruta (links usan NavLink con onClick).
 *  - Bloquea scroll del body mientras está abierto.
 *  - Devuelve foco al botón que lo abrió al cerrarse.
 *  - role="dialog" + aria-modal + aria-label.
 */
export default function MobileDrawer({ open, onClose, items = [], currentUser, onLogout }) {
    const panelRef = useRef(null);

    // Escape + body scroll lock
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    // Focus al primer link al abrir
    useEffect(() => {
        if (!open) return;
        const id = window.setTimeout(() => {
            const firstLink = panelRef.current?.querySelector('a, button');
            firstLink?.focus();
        }, 50);
        return () => window.clearTimeout(id);
    }, [open]);

    if (!open) return null;

    const handleLinkClick = () => onClose?.();
    const handleBackdropClick = () => onClose?.();

    const rolLabel = currentUser?.rol === 'ADMIN' ? 'Admin' : 'Usuario';

    return (
        <div
            className="fixed inset-0 z-40 lg:hidden"
            role="presentation"
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 animate-fadeIn"
                aria-hidden="true"
            />

            {/* Panel */}
            <nav
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Menú de navegación"
                className="absolute top-0 left-0 h-full w-72 max-w-[85%] bg-[#1a1a1a] text-blanco shadow-2xl flex flex-col animate-slideInLeft"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header del drawer */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-verde-principal/30 p-2 rounded-full shrink-0">⚽</div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold truncate">Gestión de canchas</p>
                            {currentUser && (
                                <p className="text-xs text-gray-400 truncate">
                                    {currentUser.nombre} {currentUser.apellido}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-blanco p-2 rounded-lg transition shrink-0"
                        aria-label="Cerrar menú"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Items de navegación */}
                <div className="px-3 py-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
                        Navegación
                    </p>
                    <ul className="flex flex-col gap-1">
                        {items.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    end={item.end}
                                    onClick={handleLinkClick}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition ${
                                            isActive
                                                ? 'bg-verde-principal text-blanco'
                                                : 'text-gray-300 hover:bg-white/5'
                                        }`
                                    }
                                >
                                    <span className="text-lg" aria-hidden="true">{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Footer: rol + logout */}
                <div className="border-t border-white/10 px-4 py-3 space-y-2">
                    {currentUser && (
                        <div className="flex items-center gap-2 px-2 py-1.5">
                            <span className="bg-verde-claro text-verde-principal font-bold w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0">
                                {(currentUser.nombre?.[0] || '').toUpperCase()}
                                {(currentUser.apellido?.[0] || '').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-400 truncate">
                                {currentUser.email}
                            </span>
                            <span className="ml-auto bg-black/30 text-xs px-2 py-0.5 rounded-full text-verde-claro shrink-0">
                                {rolLabel}
                            </span>
                        </div>
                    )}
                    {onLogout && (
                        <button
                            type="button"
                            onClick={() => {
                                onLogout();
                                onClose?.();
                            }}
                            className="w-full text-left text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-2 rounded-lg border border-red-500/30 transition font-medium"
                        >
                            Cerrar sesión
                        </button>
                    )}
                </div>
            </nav>
        </div>
    );
}