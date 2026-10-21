import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import Modal from './Modal.jsx';

const EMPTY_PASSWORD = {
    contrasenaActual: '',
    contrasenaNueva: '',
    confirmarContrasena: '',
};

/**
 * Modal de cambio de contraseña.
 *
 * Renderiza como bottom sheet en mobile (<md) y como modal centrado en ≥md
 * gracias al wrapper compartido `Modal`. Conserva los tres campos y las
 * validaciones del formulario original que vivía dentro de Mi perfil.
 *
 * Props:
 *  - open: boolean (controla la apertura del modal)
 *  - onClose: () => void (se invoca al cerrar, incluso por Escape o clic fuera)
 *  - simulacion?: boolean (default false) — si es true, NO invoca
 *      `PATCH /auth/me/password`; en su lugar muestra el mensaje de éxito
 *      dentro del propio modal y reemplaza el footer por un único botón
 *      "Volver al login" (que invoca `onClose`). Sirve para reproducir el
 *      flujo de "olvidé mi contraseña" en una demo universitaria sin
 *      tocar la base de datos.
 *  - onSimulacionExitosa?: () => void (opcional, solo notificación)
 *      Se invoca por compatibilidad con consumidores que quieran enterarse;
 *      NO se debe usar para cerrar el modal: el cierre queda del lado del
 *      usuario pulsando "Volver al login" (o la X / Cancelar).
 *  - mensajeSimulacion?: string (opcional) — mensaje mostrado al confirmar
 *      en modo simulación. Si se omite, se usa el genérico.
 *
 * Comportamiento del cambio real (no simulación):
 *  La llamada `api.patch('/auth/me/password', ...)` ya está cableada porque el
 *  endpoint existe en el backend. Sin embargo, la lógica real de cambio de
 *  contraseña será implementada por otro desarrollador. Este componente solo
 *  valida los campos en el frontend y delega la operación al servicio que
 *  indique el futuro implementador.
 */
export default function ModalCambiarContrasena({
    open,
    onClose,
    simulacion = false,
    onSimulacionExitosa,
    mensajeSimulacion,
}) {
    const [password, setPassword] = useState(EMPTY_PASSWORD);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');
    const [operacionEnCurso, setOperacionEnCurso] = useState(false);

    // En simulación, una vez confirmado el cambio el modal deja de mostrar
    // los campos de carga y solo expone "Volver al login", para que el
    // usuario pueda leer el mensaje de éxito sin que la pantalla se cierre
    // automáticamente.
    const simulacionCompletada = simulacion && Boolean(mensajeExito);

    // Resetear estado al abrir/cerrar para que los campos aparezcan vacíos.
    useEffect(() => {
        if (open) {
            setPassword(EMPTY_PASSWORD);
            setErrores({});
            setErrorGeneral('');
            setMensajeExito('');
            setOperacionEnCurso(false);
        }
    }, [open]);

    if (!open) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setPassword((actual) => ({ ...actual, [name]: value }));
        if (errores[name]) {
            setErrores((actual) => ({ ...actual, [name]: '' }));
        }
        if (errorGeneral) setErrorGeneral('');
        if (mensajeExito) setMensajeExito('');
    };

    const validar = () => {
        const nuevosErrores = {};

        if (!password.contrasenaActual) {
            nuevosErrores.contrasenaActual = 'Ingresá tu contraseña actual.';
        }

        if (!password.contrasenaNueva) {
            nuevosErrores.contrasenaNueva = 'Ingresá una nueva contraseña.';
        } else if (password.contrasenaNueva.length < 8) {
            nuevosErrores.contrasenaNueva = 'La nueva contraseña debe tener al menos 8 caracteres.';
        }

        if (!password.confirmarContrasena) {
            nuevosErrores.confirmarContrasena = 'Repetí la nueva contraseña.';
        } else if (password.confirmarContrasena !== password.contrasenaNueva) {
            nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden.';
        }

        return nuevosErrores;
    };

    const handleCambiarContrasena = async (event) => {
        event.preventDefault();
        if (operacionEnCurso) return;

        setErrorGeneral('');
        setMensajeExito('');

        const nuevosErrores = validar();
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setOperacionEnCurso(true);
        try {
            if (simulacion) {
                // Solo simulación para presentación universitaria.
                // No se escribe en la base ni se invoca el endpoint real.
                setMensajeExito(
                    mensajeSimulacion || 'Contraseña actualizada correctamente.',
                );
                setPassword(EMPTY_PASSWORD);
                // NO cerramos el modal: dejamos que el usuario lea el
                // mensaje adentro y vuelva al login cuando quiera pulsar
                // "Volver al login" (footer) o la X / Cancelar.
                // El callback queda como notificación opcional para
                // consumidores que quieran enterarse del éxito sin
                // intervenir en el cierre.
                onSimulacionExitosa?.();
                return;
            }

            // Punto de integración: la operación real será completada por
            // otro desarrollador. Hoy se delega al endpoint existente del
            // backend para mantener el comportamiento previo.
            const data = await api.patch('/auth/me/password', {
                contrasenaActual: password.contrasenaActual,
                contrasenaNueva: password.contrasenaNueva,
                confirmarContrasena: password.confirmarContrasena,
            });
            setMensajeExito(data?.mensaje || 'Contraseña actualizada correctamente.');
            setPassword(EMPTY_PASSWORD);
        } catch (err) {
            if (err instanceof ApiError) {
                setErrorGeneral(err.message || 'No se pudo actualizar la contraseña.');
            } else {
                setErrorGeneral(err?.message || 'Error de red.');
            }
        } finally {
            setOperacionEnCurso(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={simulacionCompletada ? 'Contraseña cambiada' : 'Cambiar contraseña'}
            titleId="modal-cambiar-contrasena-titulo"
            loading={operacionEnCurso}
            size="sm"
            footer={
                simulacionCompletada ? (
                    // Tras confirmar en simulación, el modal solo expone un
                    // "Volver al login" para que el usuario lea tranquilo
                    // el mensaje antes de salir.
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:flex-1 bg-verde-principal hover:brightness-110 text-blanco font-bold py-3 rounded-lg transition shadow-md"
                        >
                            Volver al login
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={operacionEnCurso}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="form-cambiar-contrasena"
                            disabled={operacionEnCurso}
                            className="flex-1 bg-verde-principal hover:brightness-110 text-blanco font-bold py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {operacionEnCurso
                                ? simulacion
                                    ? 'Simulando...'
                                    : 'Actualizando...'
                                : simulacion
                                    ? 'Continuar'
                                    : 'Cambiar contraseña'}
                        </button>
                    </div>
                )
            }
        >
            <form
                id="form-cambiar-contrasena"
                onSubmit={handleCambiarContrasena}
                noValidate
            >
                {!simulacionCompletada && (
                    <p className="text-sm text-gray-400">
                        La nueva contraseña debe tener al menos 8 caracteres.
                    </p>
                )}

                {!simulacionCompletada && (
                    <div className="mt-3 grid gap-3">
                        <CampoContrasena
                            label="Contraseña actual"
                            name="contrasenaActual"
                            value={password.contrasenaActual}
                            onChange={handleChange}
                            autoComplete="current-password"
                            error={errores.contrasenaActual}
                        />
                        <CampoContrasena
                            label="Nueva contraseña"
                            name="contrasenaNueva"
                            value={password.contrasenaNueva}
                            onChange={handleChange}
                            autoComplete="new-password"
                            error={errores.contrasenaNueva}
                        />
                        <CampoContrasena
                            label="Repetir nueva contraseña"
                            name="confirmarContrasena"
                            value={password.confirmarContrasena}
                            onChange={handleChange}
                            autoComplete="new-password"
                            error={errores.confirmarContrasena}
                        />
                    </div>
                )}

                {errorGeneral && (
                    <div
                        role="alert"
                        className="mt-3 bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center"
                    >
                        {errorGeneral}
                    </div>
                )}
                {mensajeExito && (
                    <div
                        role="alert"
                        className="mt-3 bg-green-500/20 border border-green-500/50 text-green-200 text-sm p-3 rounded-lg text-center"
                    >
                        {mensajeExito}
                    </div>
                )}
            </form>
        </Modal>
    );
}

function CampoContrasena({ label, name, value, onChange, autoComplete, error }) {
    const id = `campo-${name}`;
    const errorId = `${id}-error`;
    return (
        <div className="flex flex-col gap-1 text-sm font-medium text-gray-200">
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                name={name}
                type="password"
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                className={`rounded-lg border bg-[#171717] px-3 py-2 text-blanco outline-none transition focus:border-verde-claro ${
                    error ? 'border-red-500/60' : 'border-white/10'
                }`}
            />
            {error && (
                <span id={errorId} role="alert" className="text-xs font-normal text-red-300">
                    {error}
                </span>
            )}
        </div>
    );
}
