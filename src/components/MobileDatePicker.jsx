/**
 * MobileDatePicker — barra de navegación de fecha con ◀ fecha ▶ (Images 5/8).
 *
 * Props:
 *  - label: string  (texto central, ej. "Lun 8 de Junio, 2026")
 *  - onPrev: () => void
 *  - onNext: () => void
 *  - esPrimerDia: boolean  (deshabilita ◀)
 *  - esUltimoDia: boolean  (deshabilita ▶)
 */
export default function MobileDatePicker({ label, onPrev, onNext, esPrimerDia, esUltimoDia }) {
    return (
        <div className="flex items-center justify-between gap-2 px-1">
            <button
                type="button"
                onClick={onPrev}
                disabled={esPrimerDia}
                className="w-10 h-10 rounded-lg bg-verde-principal text-blanco text-sm hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
                aria-label="Día anterior"
            >
                ‹
            </button>
            <span className="text-sm text-blanco font-medium text-center flex-1 truncate">
                {label}
            </span>
            <button
                type="button"
                onClick={onNext}
                disabled={esUltimoDia}
                className="w-10 h-10 rounded-lg bg-verde-principal text-blanco text-sm hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
                aria-label="Día siguiente"
            >
                ›
            </button>
        </div>
    );
}