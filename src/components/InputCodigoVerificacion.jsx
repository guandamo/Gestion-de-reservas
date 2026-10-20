import { forwardRef } from 'react';

/**
 * Input OTP de 6 dígitos.
 *
 * Decisión de UX: input único en lugar de "celdas" separadas, porque:
 *  - Es paste-friendly (copiar/pegar el código del correo funciona siempre).
 *  - Activa el teclado numérico en mobile con `inputMode="numeric"`.
 *  - Mantiene un único foco accesible, evita problemas de navegación con
 *    flechas/tab entre 6 celdas.
 *  - El proyecto no tiene ningún patrón de "celdas múltiples" en otros
 *    formularios, por lo que un input único no rompe consistencia.
 *
 * El padre controla el valor vía `value` + `onChange(value)` y la propaga al
 * backend (que valida exactamente `^\d{6}$`). Este componente solo se
 * encarga de sanitizar la entrada a exactamente 6 dígitos.
 */
const InputCodigoVerificacion = forwardRef(function InputCodigoVerificacion(
    {
        value = '',
        onChange,
        disabled = false,
        error = null,
        label = 'Código de verificación',
        id = 'otp',
        autoFocus = false,
    },
    ref,
) {
    const errorId = `${id}-error`;
    const handleChange = (e) => {
        // Solo dígitos, máximo 6.
        const digits = String(e.target.value || '')
            .replace(/\D/g, '')
            .slice(0, 6);
        onChange?.(digits);
    };

    const handlePaste = (e) => {
        const pasted = (e.clipboardData?.getData('text') || '')
            .replace(/\D/g, '')
            .slice(0, 6);
        if (pasted) {
            e.preventDefault();
            onChange?.(pasted);
        }
    };

    return (
        <div className="flex flex-col gap-1.5 text-sm font-medium text-gray-200">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <input
                ref={ref}
                id={id}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={value}
                onChange={handleChange}
                onPaste={handlePaste}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={error ? errorId : undefined}
                placeholder="------"
                className={`w-full bg-[#171717] text-blanco text-center text-2xl tracking-[0.5em] rounded-lg px-3 py-3 outline-none border transition disabled:opacity-60 ${
                    error ? 'border-red-500/60 focus:border-red-500/60' : 'border-white/10 focus:border-verde-claro'
                }`}
            />
            {error && (
                <span id={errorId} role="alert" className="text-xs text-red-300 text-center">
                    {error}
                </span>
            )}
        </div>
    );
});

export default InputCodigoVerificacion;