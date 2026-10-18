/**
 * MobileLegend — Leyenda de estados (ej. Disponible / Ocupado).
 *
 * Props:
 *  - items: [{ color, label }]
 */
export default function MobileLegend({ items }) {
    return (
        <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
            {items.map((it) => (
                <span key={it.label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${it.color}`} aria-hidden="true" />
                    {it.label}
                </span>
            ))}
        </div>
    );
}