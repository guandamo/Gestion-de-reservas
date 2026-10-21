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
 * Pantalla de "ingresá el código de 6 dígitos" del flujo de verificación.
 * El OTP en sí es simulado (no se envía correo real), pero la **acción de
 * Continuar** está conectada al backend: la consumidora le pasa por `onContinuar`
 * una función async que decide si crear la cuenta, cambiar la contraseña, etc.
 *
 * Si esa función rechaza, el modal muestra el mensaje en `error` y **no se
 * cierra**, dejando al usuario reintentar (botón Continuar) o cancelar (X).
 *
 * Reutilizable por:
 *  - Registro (`contexto="registro"`): título "Verificá tu email".
 *  - Olvidé mi contraseña (`contexto="recuperacion"`): título "Recupera tu
 *    contraseña".
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onContinuar: () => Promise<void> | void   (se llama al pulsar Continuar)
 *  - email: string                              (email a mostrar)
 *  - contexto?: 'registro' | 'recuperacion'     (default 'registro')
 *  - loading?: boolean                          (default false)
 *  - error?: string                             (mensaje de error del backend)
 */
export default function ModalVerificacionEmail({
    open,
    onClose,
    onContinuar,
    email = '',
    contexto = 'registro',
    loading = false,
    error = '',
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
            // El padre decide si cerrar el modal (éxito) o mostrar el error
            // prop (fracaso). Si tu callback devuelve una promesa rechazada,
            // el catch la absorbe sin cerrar.
            setOtp('');
        } catch {
            // El padre ya setea `error` (prop) si quiere mostrar mensaje.
            setOtp('');
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
                {error && (
                    <div
                        role="alert"
                        className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-2.5 rounded-lg text-center"
                    >
                        {error}
                    </div>
                )}

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
