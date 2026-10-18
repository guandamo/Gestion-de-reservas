import { forwardRef } from 'react';

/**
 * MobileTopBar — barra superior verde (sticky) para mobile.
 *
 * Sigue el prototipo (Images 5-8): pelota ⚽ + título + pill de rol + hamburguesa.
 *
 * Props:
 *  - roleLabel: string  ("Admin" / "Usuario"). Si no se pasa, no se muestra el pill.
 *  - onOpenDrawer: () => void  (click en hamburguesa)
 *  - title: string  (default "Gestión de canchas")
 */
const MobileTopBar = forwardRef(function MobileTopBar({ roleLabel, onOpenDrawer, title = 'Gestión de canchas' }, ref) {
    return (
        <header
            className="sticky top-0 z-30 bg-verde-principal text-blanco px-4 py-3 flex items-center justify-between shadow-md lg:hidden"
        >
            <div className="flex items-center gap-2 min-w-0">
                <div className="bg-blanco/20 p-2 rounded-full flex items-center justify-center shrink-0">
                    ⚽
                </div>
                <h1 className="text-base font-bold tracking-wide truncate">{title}</h1>
                {roleLabel && (
                    <span className="bg-black/30 text-xs px-2.5 py-1 rounded-full text-verde-claro font-medium border border-verde-claro/20 shrink-0">
                        {roleLabel}
                    </span>
                )}
            </div>

            <button
                ref={ref}
                type="button"
                onClick={onOpenDrawer}
                className="bg-blanco/10 hover:bg-blanco/20 p-2 rounded-lg transition shrink-0"
                aria-label="Abrir menú"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </header>
    );
});

export default MobileTopBar;