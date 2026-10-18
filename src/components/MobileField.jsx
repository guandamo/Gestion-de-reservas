/**
 * MobileField — wrapper de label + input mobile-first.
 *
 * Variants:
 *  - 'dark' (default): input oscuro `bg-[#222222] text-blanco border-white/10`
 *  - 'inline': input con label arriba y border solo abajo (estilo Perfil)
 *
 * Props:
 *  - label: string
 *  - error: string (opcional, muestra mensaje en rojo)
 *  - icon: ReactNode (opcional, se muestra a la izquierda dentro del input)
 *  - children: contenido custom del campo (si se pasa, no se renderiza el input automático)
 *  - variant: 'dark' | 'inline'
 */
export default function MobileField({ label, error, icon, children, variant = 'dark', htmlFor, className = '', ...props }) {
    const inputBase = variant === 'inline'
        ? 'w-full bg-transparent text-blanco px-1 py-2 outline-none border-b border-white/10 focus:border-verde-claro transition'
        : `w-full bg-[#222222] text-blanco rounded-lg px-3 py-2.5 outline-none transition border ${
            error ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-verde-claro'
        }`;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && variant !== 'inline' && (
                <label htmlFor={htmlFor} className="text-sm font-medium text-gray-200">
                    {label}
                </label>
            )}
            {variant === 'inline' && label && (
                <label htmlFor={htmlFor} className="text-xs text-gray-400">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        {icon}
                    </span>
                )}
                {children ?? (
                    <input
                        id={htmlFor}
                        className={`${inputBase} ${icon ? 'pl-10' : ''}`}
                        {...props}
                    />
                )}
            </div>
            {error && (
                <span role="alert" className="text-xs text-red-300">
                    {error}
                </span>
            )}
        </div>
    );
}