import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, NetworkError } from '../api/client.js';
import Modal from './Modal.jsx';
import InputCodigoVerificacion from './InputCodigoVerificacion.jsx';
import useCountdown, { formatMmss } from '../hooks/useCountdown.js';

const SEGUNDOS_COOLDOWN = 90; // debe coincidir con el backend

/**
 * Modal de verificación de correo electrónico durante el registro.
 *
 * Comportamiento:
 *  - Reutiliza `<Modal size="sm" loading={...}>` (mismo patrón que
 *    ModalCambiarContrasena).
 *  - Acepta 6 dígitos pegados desde el correo, valida longitud exacta antes
 *    de llamar al backend.
 *  - El cooldown de reenvío es solo UI: el backend lo impone. Si el contador
 *    del frontend está desincronizado, la respuesta del backend será 429.
 *  - Al verificar con éxito emite `onVerificado({ token, usuario })` para que
 *    el padre haga `persistSession(...)` y `navigate(...)`.
 *  - Cancelar dispara `onClose` y NO toca el backend: queda la solicitud
 *    pendiente viva (el usuario puede volver a abrir el modal con el mismo
 *    pendingToken, o reenviar después).
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void                → usuario canceló
 *  - onVerificado: ({ token, usuario }) => void → OTP correcto, usuario creado
 *  - pendingToken: string
 *  - email: string                       (sin enmascarar, es el email que el
 *                                         usuario ya tipeó en el form)
 *  - expiresAt: string (ISO)            → a partir de cuándo el código vence
 *  - cooldownEndsAt?: string (ISO)      → último cooldown conocido. Si no
 *                                         se pasa, se asume 90 s desde ahora.
 */
export default function ModalVerificacionCorreo({
    open,
    onClose,
    onVerificado,
    pendingToken,
    email,
    cooldownEndsAt: initialCooldownEndsAt,
}) {
    const [codigo, setCodigo] = useState('');
    const [errorGeneral, setErrorGeneral] = useState('');
    const [verificando, setVerificando] = useState(false);
    const [reenviando, setReenviando] = useState(false);
    const [cooldownEndsAt, setCooldownEndsAt] = useState(
        initialCooldownEndsAt ||
            new Date(Date.now() + SEGUNDOS_COOLDOWN * 1000).toISOString(),
    );
    const [intentosRestantes, setIntentosRestantes] = useState(5);

    // Para evitar race conditions entre dos clicks en "Verificar".
    const verificacionRef = useRef(null);

    // Reset al abrir el modal.
    useEffect(() => {
        if (open) {
            setCodigo('');
            setErrorGeneral('');
            setVerificando(false);
            setReenviando(false);
            setCooldownEndsAt(
                initialCooldownEndsAt ||
                    new Date(Date.now() + SEGUNDOS_COOLDOWN * 1000).toISOString(),
            );
            setIntentosRestantes(5);
        }
    }, [open, initialCooldownEndsAt]);

    const { segundos: cooldownSegundos, terminado: cooldownTerminado } =
        useCountdown(cooldownEndsAt);

    const handleVerificar = useCallback(async () => {
        if (verificando || reenviando) return;
        if (codigo.length !== 6) {
            setErrorGeneral('Ingresá los 6 dígitos del código.');
            return;
        }
        setErrorGeneral('');
        setVerificando(true);
        const controller = new AbortController();
        verificacionRef.current = controller;

        try {
            const data = await api.post(
                '/auth/verify-otp',
                { pendingToken, code: codigo },
                { signal: controller.signal },
            );
            onVerificado?.(data);
        } catch (err) {
            if (err instanceof NetworkError) {
                setErrorGeneral(
                    'No se pudo conectar con el servidor. Verificá tu conexión.',
                );
            } else if (err instanceof ApiError) {
                if (err.status === 400) {
                    setErrorGeneral(err.message || 'El código es incorrecto.');
                    if (typeof err.details?.intentosRestantes === 'number') {
                        setIntentosRestantes(err.details.intentosRestantes);
                    }
                } else if (err.status === 409) {
                    setErrorGeneral(
                        'Esta solicitud ya fue utilizada. Iniciá el registro de nuevo.',
                    );
                } else if (err.status === 404) {
                    setErrorGeneral(
                        'La solicitud ya no existe. Iniciá el registro de nuevo.',
                    );
                } else {
                    setErrorGeneral(err.message || 'No se pudo verificar el código.');
                }
            } else {
                setErrorGeneral(err?.message || 'Error inesperado.');
            }
        } finally {
            setVerificando(false);
            verificacionRef.current = null;
        }
    }, [codigo, pendingToken, onVerificado, verificando, reenviando]);

    const handleReenviar = useCallback(async () => {
        if (reenviando || verificando) return;
        if (!cooldownTerminado) return; // respeto UI
        setErrorGeneral('');
        setReenviando(true);

        try {
            const data = await api.post(
                '/auth/resend-otp',
                { pendingToken },
            );
            setCooldownEndsAt(data.cooldownEndsAt);
            setCodigo('');
            setIntentosRestantes(5);
        } catch (err) {
            if (err instanceof NetworkError) {
                setErrorGeneral('No se pudo conectar con el servidor.');
            } else if (err instanceof ApiError) {
                if (err.status === 429) {
                    // El backend nos corrigió el cooldown: lo sincronizamos.
                    if (err.details?.cooldownEndsAt) {
                        setCooldownEndsAt(err.details.cooldownEndsAt);
                    }
                    setErrorGeneral(
                        err.message || 'Debés esperar antes de pedir otro código.',
                    );
                } else {
                    setErrorGeneral(err.message || 'No se pudo reenviar el código.');
                }
            } else {
                setErrorGeneral(err?.message || 'Error inesperado.');
            }
        } finally {
            setReenviando(false);
        }
    }, [pendingToken, reenviando, verificando, cooldownTerminado]);

    if (!open) return null;

    const cargando = verificando || reenviando;
    const puedeVerificar = codigo.length === 6 && !cargando;
    const bloqueoPorIntentos = intentosRestantes <= 0;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Verificá tu correo electrónico"
            titleId="modal-verificar-correo-titulo"
            loading={cargando}
            size="sm"
            footer={
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={cargando}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleVerificar}
                        disabled={!puedeVerificar || bloqueoPorIntentos}
                        className="flex-1 bg-verde-principal hover:brightness-110 text-blanco font-bold py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {verificando ? 'Verificando...' : 'Verificar correo'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                    Te enviamos un código de verificación a{' '}
                    <span className="text-blanco font-medium break-all">
                        {email}
                    </span>
                    . Ingresá los 6 dígitos que recibiste para activar tu
                    cuenta.
                </p>

                <p className="text-gray-400 text-xs">
                    El código vence a los 10 minutos.
                </p>

                <InputCodigoVerificacion
                    value={codigo}
                    onChange={setCodigo}
                    disabled={cargando}
                    error={null}
                    autoFocus
                />

                {intentosRestantes < 5 && !bloqueoPorIntentos && (
                    <p className="text-xs text-yellow-300 text-center">
                        Te quedan {intentosRestantes} intento
                        {intentosRestantes === 1 ? '' : 's'}.
                    </p>
                )}
                {bloqueoPorIntentos && (
                    <p className="text-xs text-yellow-300 text-center">
                        Agotaste los intentos. Solicitá un código nuevo.
                    </p>
                )}

                {errorGeneral && (
                    <div
                        role="alert"
                        className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center"
                    >
                        {errorGeneral}
                    </div>
                )}

                <div className="text-center pt-1">
                    {!cooldownTerminado ? (
                        <p className="text-gray-400 text-xs">
                            Podés solicitar otro código en{' '}
                            <span className="text-blanco font-medium tabular-nums">
                                {formatMmss(cooldownSegundos)}
                            </span>
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleReenviar}
                            disabled={cargando}
                            className="text-verde-claro hover:text-blanco text-sm font-medium underline underline-offset-2 transition disabled:opacity-60"
                        >
                            {reenviando ? 'Reenviando...' : 'Reenviar código'}
                        </button>
                    )}
                </div>

                {/* Texto auxiliar: que el usuario sepa qué hacer si no llega. */}
                <p className="text-gray-500 text-[11px] text-center pt-1">
                    Si no aparece en tu bandeja, revisá la carpeta de spam.
                </p>
            </div>
        </Modal>
    );
}