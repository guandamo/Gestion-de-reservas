import { useEffect, useId, useRef, useState } from 'react';
import AppIcon from './AppIcon.jsx';

export default function AccountMenu({ onLogout, roleLabel, inline = false, children }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const panelId = useId();

    useEffect(() => {
        if (!open) return undefined;

        const handleOutside = (event) => {
            if (!containerRef.current?.contains(event.target)) setOpen(false);
        };
        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            // En móvil, el primer Escape cierra este desplegable, no el drawer.
            event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus();
        };

        document.addEventListener('pointerdown', handleOutside);
        document.addEventListener('keydown', handleEscape, true);
        return () => {
            document.removeEventListener('pointerdown', handleOutside);
            document.removeEventListener('keydown', handleEscape, true);
        };
    }, [open]);

    return (
        <div ref={containerRef} className={`relative ${inline ? 'w-full min-w-0' : 'shrink-0'}`}
            onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setOpen(true);
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) setOpen(false);
            }}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}>
            <div className="flex min-w-0 items-center gap-2">
            <button ref={triggerRef} type="button" aria-label={`Opciones de cuenta: ${roleLabel}`}
                aria-expanded={open} aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-verde-claro transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-verde-claro text-verde-principal [&_svg]:h-4 [&_svg]:w-4">
                    <AppIcon name="user-filled" />
                </span>
            </button>
            {children}
            </div>
            {open && (
                <div id={panelId} className={`pt-2 animate-fadeIn ${inline ? 'w-full' : 'absolute right-0 top-full z-50 w-48 max-w-[calc(100vw-2rem)]'}`}>
                    <div className="rounded-xl border border-white/10 bg-[#222222] p-2 shadow-xl">
                    <button type="button" onClick={() => {
                        setOpen(false);
                        onLogout();
                    }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                        <AppIcon name="log-out" />
                        Cerrar sesión
                    </button>
                    </div>
                </div>
            )}
        </div>
    );
}
