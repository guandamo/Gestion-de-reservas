/**
 * StatusPill — Pill reutilizable para estados del sistema.
 *
 * Variants:
 *  - disponible, reservado, pendiente, confirmada, cancelada,
 *    pagado, fallido, activo, suspendido,
 *    rol-admin, rol-usuario
 *
 * Props:
 *  - variant: clave del estilo (ver VARIANTS más abajo)
 *  - children: texto a mostrar (si no se pasa, se usa el label por variant)
 *  - className: clases adicionales
 *  - size: 'sm' | 'md' (default 'sm')
 */
const VARIANTS = {
    disponible: { label: 'Disponible', classes: 'bg-verde-principal text-blanco' },
    reservado: { label: 'Reservado', classes: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    pendiente: { label: 'Pendiente', classes: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
    confirmada: { label: 'Confirmada', classes: 'bg-green-500/20 text-green-300 border border-green-500/30' },
    cancelada: { label: 'Cancelada', classes: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    pagado: { label: 'Pagado', classes: 'bg-verde-principal text-blanco' },
    fallido: { label: 'Fallido', classes: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    activo: { label: 'Activo', classes: 'bg-green-500/20 text-green-300 border border-green-500/30' },
    suspendido: { label: 'Suspendido', classes: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    'rol-admin': { label: 'Admin', classes: 'bg-verde-principal/20 text-verde-claro border border-verde-principal/30' },
    'rol-usuario': { label: 'Usuario', classes: 'bg-white/10 text-gray-300 border border-white/10' },
};

export default function StatusPill({ variant, children, className = '', size = 'sm' }) {
    const cfg = VARIANTS[variant];
    if (!cfg) return null;
    const sizeClass = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-1 text-xs';
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${sizeClass} ${cfg.classes} ${className}`}
        >
            {children ?? cfg.label}
        </span>
    );
}