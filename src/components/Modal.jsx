import { useEffect, useRef } from 'react';

/**
 * Modal — wrapper compartido para diálogos y bottom sheets.
 *
 * Comportamiento:
 *  - <md (mobile): bottom sheet que aparece desde la parte inferior.
 *      · Ancho completo, esquinas superiores redondeadas.
 *      · Altura máxima 90vh, scroll interno.
 *      · "Drag handle" visual.
 *      · Padding inferior respetado para safe-area (env safe-area-inset-bottom).
 *  - ≥md (tablet/desktop): modal centrado (overlay + panel).
 *      · max-w-md (configurable vía `size`).
 *      · Misma estructura de header / body / footer.
 *
 * Accesibilidad y comportamiento común:
 *  - Cierre con Escape (configurable con `closeOnEscape`).
 *  - Cierre al hacer clic en el backdrop (configurable con `closeOnBackdrop`).
 *  - Bloqueo del scroll del body mientras está abierto.
 *  - Foco automático al primer elemento focuseable al abrir; se devuelve al
 *    elemento previamente activo al cerrar.
 *  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al título.
 *  - `preventCloseWhileLoading`: no permite cerrar mientras `loading` sea true.
 *
 * Slots:
 *  - `title`: texto del header (si se omite, no se muestra header).
 *  - `children`: cuerpo principal (scrollable).
 *  - `footer`: acciones (botones).
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title?: string
 *  - titleId?: string (default: 'modal-title')
 *  - size?: 'sm' | 'md' | 'lg'  (default: 'md', aplica solo en ≥md)
 *  - loading?: boolean
 *  - preventCloseWhileLoading?: boolean (default: true si se pasa `loading`)
 *  - closeOnEscape?: boolean (default: true)
 *  - closeOnBackdrop?: boolean (default: true)
 *  - showCloseButton?: boolean (default: true)
 *  - children?: ReactNode
 *  - footer?: ReactNode
 *  - contentClassName?: string — clases extra para el panel
 */
export default function Modal({
    open,
    onClose,
    title,
    titleId = 'modal-title',
    size = 'md',
    loading = false,
    preventCloseWhileLoading,
    closeOnEscape = true,
    closeOnBackdrop = true,
    showCloseButton = true,
    children,
    footer,
    contentClassName = '',
}) {
    const panelRef = useRef(null);
    const previousActiveRef = useRef(null);
    const lockPrevent = preventCloseWhileLoading ?? Boolean(loading);
    const isLocked = lockPrevent && loading;

    // Guardar foco previo + bloquear scroll del body mientras esté abierto.
    useEffect(() => {
        if (!open) return undefined;
        previousActiveRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = prevOverflow;
            // Devolver foco al elemento que abrió el modal
            const prev = previousActiveRef.current;
            if (prev && document.contains(prev) && typeof prev.focus === 'function') {
                prev.focus();
            }
        };
    }, [open]);

    // Escape
    useEffect(() => {
        if (!open || !closeOnEscape) return undefined;
        const handler = (e) => {
            if (e.key === 'Escape' && !isLocked) {
                e.stopPropagation();
                onClose?.();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, closeOnEscape, isLocked, onClose]);

    // Foco al primer elemento focuseable al abrir
    useEffect(() => {
        if (!open) return undefined;
        const id = window.setTimeout(() => {
            const root = panelRef.current;
            if (!root) return;
            const sel =
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const focusable = root.querySelector(sel);
            if (focusable instanceof HTMLElement) {
                focusable.focus();
            } else {
                // Si no hay focuseables, llevamos foco al panel para que lector
                // de pantalla lo lea.
                root.focus();
            }
        }, 30);
        return () => window.clearTimeout(id);
    }, [open]);

    if (!open) return null;

    const handleBackdropMouseDown = (e) => {
        if (!closeOnBackdrop) return;
        if (isLocked) return;
        // Solo cerramos si el mousedown empezó directamente en el backdrop
        if (e.target !== e.currentTarget) return;
        onClose?.();
    };

    const sizeClass = {
        sm: 'md:max-w-sm',
        md: 'md:max-w-md',
        lg: 'md:max-w-lg',
    }[size] ?? 'md:max-w-md';

    const showHeader = Boolean(title) || showCloseButton;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/70 animate-fadeIn"
            onMouseDown={handleBackdropMouseDown}
            role="presentation"
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                className={`
                    bg-[#222222] border border-white/10 shadow-2xl
                    w-full ${sizeClass}
                    flex flex-col
                    rounded-t-2xl md:rounded-2xl
                    max-h-[92dvh] md:max-h-[85vh]
                    animate-slideUp md:animate-fadeIn
                    ${contentClassName}
                `}
            >
                {/* Drag handle (solo mobile) */}
                {showHeader && (
                    <div className="md:hidden pt-2 pb-1 flex justify-center" aria-hidden="true">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>
                )}

                {/* Header */}
                {showHeader && (
                    <div className="flex items-center justify-between px-5 md:px-6 py-3 md:py-4 border-b border-white/10 shrink-0">
                        {title ? (
                            <h3
                                id={titleId}
                                className="text-blanco text-lg font-bold pr-2 truncate"
                            >
                                {title}
                            </h3>
                        ) : (
                            <span />
                        )}
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLocked}
                                className="text-gray-400 hover:text-blanco transition disabled:cursor-not-allowed disabled:opacity-50 p-1 -mr-1 shrink-0"
                                aria-label="Cerrar"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                {/* Body (scrollable) */}
                <div className="px-5 md:px-6 py-4 md:py-5 overflow-y-auto min-h-0 overscroll-contain">
                    {children}
                </div>

                {/* Footer (sticky) */}
                {footer && (
                    <div className="px-5 md:px-6 pt-3 pb-5 md:pb-6 border-t border-white/10 md:border-t-0 shrink-0"
                         style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
