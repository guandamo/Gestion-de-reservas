import { useEffect, useRef, useState } from 'react';
import Modal from './Modal.jsx';
import { Field, FieldLabel } from './ui/field.jsx';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from './ui/input-otp.jsx';
import { useCountdownReenvio } from '../hooks/useCountdownReenvio.js';

/**
 * ModalVerificacionEmail
 *
 * Simulación visual del flujo "ingresá el código de 6 dígitos que te
 * enviamos por correo" para una presentación universitaria. **No envía
 * correos reales ni valida contra el backend.**
 *
 * Reutilizable por:
 *  - Registro (`contexto="registro"`): título "Verificá tu email".
 *  - Olvidé mi contraseña (`contexto="recuperacion"`): título "Recupera tu
 *    contraseña" (textual exigido por la demo).
 *
 * Comportamiento:
 *  - Muestra el email que el usuario realmente tipeó.
 *  - 6 casillas tipo `InputOTP` (dos grupos de 3 separados por `Separator`).
 *  - Permite tipear y pegar (input-otp lo soporta nativamente).
 *  - "Volver a enviar código" con cuenta regresiva de 90 s; al pulsarlo se
 *    reinicia el contador y se limpia el OTP tipeado (sin mostrar avisos
 *    adicionales).
 *  - "Continuar" siempre habilitado: no requiere un código correcto (el OTP es
 *    puramente visual). Llama a `onContinuar()` y cierra.
 *  - Estado del OTP se resetea cada vez que se (re)abre.
 *  - El contador pausado se reanuda donde quedó, y se pausa mientras el modal
 *    está cerrado (delegado a `useCountdownReenvio`).
 *  - `loading` opcional deshabilita el botón Continuar mientras se verifica
 *    externamente.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onContinuar: () => void | Promise<void>   (se llama al pulsar Continuar)
 *  - email: string                              (email a mostrar)
 *  - contexto?: 'registro' | 'recuperacion'     (default 'registro')
 *  - loading?: boolean                          (default false)
 */
export default function ModalVerificacionEmail({
    open,
    onClose,
    onContinuar,
    email = '',
    contexto = 'registro',
    loading = false,
}) {
    const [otp, setOtp] = useState('');

    const { formateado, activo, reiniciar } = useCountdownReenvio({
        open,
        duracionSegundos: 90,
    });

    const titulo =
        contexto === 'recuperacion'
            ? 'Recupera tu contraseña'
            : 'Verificá tu email';

    const subtitulo =
        contexto === 'recuperacion'
            ? 'Te enviamos un código para que puedas restablecer tu contraseña.'
            : 'Te enviamos un código para confirmar tu dirección de correo.';

    // Reset del OTP cada vez que el modal se (re)abre, para que pegar un
    // código viejo no quede persistido de una sesión a otra.
    const primerOpenRef = useRef(true);
    useEffect(() => {
        if (open) {
            if (primerOpenRef.current) {
                primerOpenRef.current = false;
            } else {
                setOtp('');
            }
        }
    }, [open]);

    const handleReenviar = () => {
        if (activo) return;
        reiniciar();
        setOtp('');
    };

    const handleContinuar = async () => {
        try {
            await onContinuar?.();
        } finally {
            setOtp('');
            onClose?.();
        }
    };

    const handleClose = () => {
        // Limpiamos el OTP al cerrar para no mostrar un código viejo al reabrir.
        setOtp('');
        onClose?.();
    };

    const emailSeguro = String(email);

    const footer = (
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full">
            <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
                Cancelar
            </button>
            <button
                type="button"
                onClick={handleContinuar}
                disabled={loading}
                className="w-full sm:flex-1 bg-verde-principal hover:brightness-110 text-blanco font-bold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
            >
                {loading ? 'Procesando...' : 'Continuar'}
            </button>
        </div>
    );

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={titulo}
            size="sm"
            footer={footer}
            loading={loading}
        >
            {/*
             * Estructura compactada para evitar scroll dentro del modal:
             *  - `space-y-3` en vez de `space-y-5`.
             *  - Subtítulo en una sola línea (sin `<p>` extra al final).
             *  - Casillas OTP con altura reducida en mobile.
             *  - Resend alineado al centro, sin `pt-1`.
             */}
            <div className="space-y-3">
                <p className="text-gray-300 text-sm leading-snug">
                    {subtitulo} Si no lo ves, revisá la carpeta de spam.
                </p>

                <div
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-blanco break-all"
                    data-testid="otp-email-mostrado"
                >
                    <span className="text-gray-400">Enviado a: </span>
                    {emailSeguro}
                </div>

                <Field>
                    <FieldLabel className="text-blanco text-sm mb-1">
                        Código de verificación
                    </FieldLabel>
                    <div className="flex justify-center sm:justify-start">
                        <InputOTP
                            value={otp}
                            onChange={(value) => {
                                const soloDigitos = value.replace(/\D/g, '');
                                setOtp(soloDigitos);
                            }}
                            maxLength={6}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="^[0-9]{0,6}$"
                            aria-label="Código de verificación de 6 dígitos"
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>
                </Field>

                <div className="flex justify-center sm:justify-start">
                    <button
                        type="button"
                        onClick={handleReenviar}
                        disabled={activo || loading}
                        className="text-sm text-verde-claro hover:text-blanco transition disabled:text-gray-500 disabled:cursor-not-allowed font-medium"
                    >
                        {activo
                            ? `Reenviar código en ${formateado}`
                            : 'Volver a enviar código'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
