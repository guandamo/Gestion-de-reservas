/**
 * MobileKpiCard — Card KPI mobile (Image 6 de prototipos).
 *
 * Props:
 *  - titulo: string
 *  - valor: string | number
 *  - subtitulo: string (opcional, ej. "+3 vs ayer", "Meta: $1.5M")
 *  - children: opcional (ej: una barra de progreso)
 *  - accent: 'verde' | 'amarillo' | 'azul' | 'gris' (default 'verde')
 */
export default function MobileKpiCard({ titulo, valor, subtitulo, children, accent = 'verde' }) {
    const accentClasses = {
        verde: 'bg-verde-principal',
        amarillo: 'bg-yellow-500',
        azul: 'bg-blue-500',
        gris: 'bg-gray-400',
    }[accent];

    return (
        <div className="bg-[#222222] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium">{titulo}</p>
            <p className="text-2xl font-bold text-blanco mt-1">{valor}</p>
            {subtitulo && (
                <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>
            )}
            {children && <div className="mt-2">{children}</div>}
            <div className={`h-1 w-12 rounded-full mt-3 ${accentClasses}`} aria-hidden="true" />
        </div>
    );
}