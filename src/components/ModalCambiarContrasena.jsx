import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client.js';

const EMPTY_PASSWORD = {
    contrasenaActual: '',
    contrasenaNueva: '',
    confirmarContrasena: '',
};

/**
 * Modal de cambio de contraseña.
 *
 * Reutiliza el patrón visual del ModalConfirmacionReserva (overlay oscuro,
 * panel redondeado con header/body/footer) y conserva los tres campos y las
 * validaciones del formulario original que vivía dentro de Mi perfil.
 *
 * Props:
 *  - open: boolean (controla la apertura del modal)
 *  - onClose: () => void (se invoca al cerrar, incluso por Escape o clic fuera)
 *
 * Punto de integración pendiente:
 *  La llamada `api.patch('/auth/me/password', ...)` ya está cableada porque el
 *  endpoint existe en el backend. Sin embargo, la lógica real de cambio de
 *  contraseña será implementada por otro desarrollador. Este componente solo
 *  valida los campos en el frontend y delega la operación al servicio que
 *  indique el futuro implementador. La operación recibe:
 *    - contrasenaActual: contraseña actual del usuario
 *    - contrasenaNueva: nueva contraseña (mínimo 8 caracteres)
 *    - confirmarContrasena: repetición de la nueva contraseña
 */
export default function ModalCambiarContrasena({ open, onClose }) {
    const [password, setPassword] = useState(EMPTY_PASSWORD);
    const [errores, setErrores] = useState({});
    const [errorGeneral, setErrorGeneral] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');
    const [operacionEnCurso, setOperacionEnCurso] = useState(false);

    const dialogRef = useRef(null);
    const primerCampoRef = useRef(null);

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

    // Cerrar con Escape y enfocar el primer campo al abrir.
    useEffect(() => {
        if (!open) return undefined;

        const manejarTecla = (event) => {
            if (event.key === 'Escape' && !operacionEnCurso) {
                onClose?.();
            }
        };

        document.addEventListener('keydown', manejarTecla);

        // Dar tiempo al montaje antes de mover el foco.
        const idFoco = window.setTimeout(() => {
            primerCampoRef.current?.focus();
        }, 0);

        return () => {
            document.removeEventListener('keydown', manejarTecla);
            window.clearTimeout(idFoco);
        };
    }, [open, operacionEnCurso, onClose]);

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

    /**
     * Manejador preparado para la integración futura del cambio real de
     * contraseña. Hoy valida los campos en el frontend y delega la operación
     * al endpoint ya existente; la lógica definitiva la completará otro
     * desarrollador reemplazando el cuerpo de esta función si corresponde.
     */
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

    const cerrarSiNoOpera = () => {
        if (operacionEnCurso) return;
        onClose?.();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn"
            onClick={cerrarSiNoOpera}
            role="presentation"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-cambiar-contrasena-titulo"
                className="bg-[#222222] rounded-2xl shadow-2xl max-w-md w-full border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3
                        id="modal-cambiar-contrasena-titulo"
                        className="text-blanco text-lg font-bold"
                    >
                        Cambiar contraseña
                    </h3>
                    <button
                        type="button"
                        onClick={cerrarSiNoOpera}
                        disabled={operacionEnCurso}
                        className="text-gray-400 hover:text-blanco transition disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleCambiarContrasena} noValidate className="px-6 py-5">
                    <p className="text-sm text-gray-400">
                        La nueva contraseña debe tener al menos 8 caracteres.
                    </p>

                    <div className="mt-5 grid gap-4">
                        <CampoContrasena
                            label="Contraseña actual"
                            name="contrasenaActual"
                            value={password.contrasenaActual}
                            onChange={handleChange}
                            autoComplete="current-password"
                            error={errores.contrasenaActual}
                            inputRef={primerCampoRef}
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

                    {errorGeneral && (
                        <div
                            role="alert"
                            className="mt-4 bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center"
                        >
                            {errorGeneral}
                        </div>
                    )}
                    {mensajeExito && (
                        <div
                            role="status"
                            className="mt-4 bg-green-500/20 border border-green-500/50 text-green-200 text-sm p-3 rounded-lg text-center"
                        >
                            {mensajeExito}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={cerrarSiNoOpera}
                            disabled={operacionEnCurso}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={operacionEnCurso}
                            className="flex-1 bg-verde-principal hover:brightness-110 text-blanco font-bold py-3 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {operacionEnCurso ? 'Actualizando...' : 'Cambiar contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CampoContrasena({ label, name, value, onChange, autoComplete, error, inputRef }) {
    const id = `campo-${name}`;
    const errorId = `${id}-error`;
    return (
        <div className="flex flex-col gap-1.5 text-sm font-medium text-gray-200">
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                ref={inputRef}
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