import { useState, useEffect, useRef  } from 'react';
import { api, ApiError } from '../api/client.js';

/**
 * Modal de confirmación de reserva.
 *
 * Props:
 *  - turno: { id, fecha, horaInicio, horaFin, precio, ... }
 *  - cancha: { id, nombre, tipo }
 *  - open: boolean
 *  - onClose: () => void
 *  - onSuccess: (reserva) => void
 */
export default function ModalConfirmacionReserva({ turno, cancha, open, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reservaCreada, setReservaCreada] = useState(null);
    const procesando = useRef(false);

    // Limpiar estado al abrir/cerrar
    useEffect(() => {
    if (open) {
        setError('');
        setReservaCreada(null);
    }
}, [open, turno?.id]);

    if (!open || !turno || !cancha) return null;

    const handleCerrar = () => {
    if (procesando.current) return;

    if (reservaCreada) {
        // La reserva existe y sigue pendiente de pago.
        onSuccess?.(reservaCreada);
    } else {
        onClose();
    }
};

const handleReservar = async () => {
    if (procesando.current) return;

    procesando.current = true;
    setLoading(true);
    setError('');

    let reserva = reservaCreada;
    let redirigiendo = false;

    try {
        // Si ya se creó, reintentar únicamente el enlace de pago.
        if (!reserva) {
            reserva = await api.post('/reservations', {
                idTurno: turno.id,
            });

            setReservaCreada(reserva);
        }

        const pago = await api.post('/payments/preference', {
            idReserva: reserva.reservationId,
        });

        const enlace = pago.initPoint;
        
        if (!enlace) {
            throw new Error('Mercado Pago no devolvió el enlace de pago.');
        }
        

        window.location.assign(enlace);
        redirigiendo = true;
    } catch (err) {
        let mensaje = err?.message || 'Error de red. Intentá nuevamente.';

        if (err instanceof ApiError && err.status === 401) {
            mensaje = 'Tu sesión expiró. Volvé a iniciar sesión.';
        } else if (
            !reserva &&
            err instanceof ApiError &&
            err.status === 409
        ) {
            mensaje = 'Ese turno ya no está disponible.';
        }

        setError(
            reserva
                ? `Tu reserva #${reserva.reservationId} quedó pendiente de pago. ${mensaje}`
                : mensaje
        );
    } finally {
        // Mantener bloqueado el modal mientras sale hacia Mercado Pago.
        if (!redirigiendo) {
            procesando.current = false;
            setLoading(false);
        }
    }
};

    const formatearFecha = (fecha) => {
        if (!fecha) return '—';
        const d = new Date(fecha + 'T00:00:00');
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fadeIn"
            onClick={handleCerrar}
        >
            <div
                className="bg-[#222222] rounded-2xl shadow-2xl max-w-md w-full border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-blanco text-lg font-bold">Confirmar reserva</h3>
                    <button
                        onClick={handleCerrar}
                        className="text-gray-400 hover:text-blanco transition"
                        aria-label="Cerrar"
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                    <Fila label="Cancha" valor={cancha.nombre} />
                    <Fila label="Tipo" valor={cancha.tipo?.descripcion ?? '—'} />
                    <Fila label="Fecha" valor={formatearFecha(turno.fecha)} />
                    <Fila label="Horario" valor={`${turno.horaInicio} - ${turno.horaFin}`} />
                    <Fila label="Duración" valor="1 hora" />
                    <Fila
                        label="Precio"
                        valor={`$${Number(turno.precio).toLocaleString('es-AR')}`}
                        destacado
                    />
                    <Fila
                        label="Estado"
                        valor={
                            <span className="text-yellow-300 font-medium">
                                Pendiente de pago
                            </span>
                        }
                    />
                </div>

                {error && (
                    <div className="mx-6 mb-4 bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center">
                        {error}
                    </div>
                )}

                {/* Footer */}
                <div className="flex gap-3 px-6 pb-6">
                    <button
                        onClick={handleCerrar}
                        disabled={loading}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:opacity-60"
                    >
                        {reservaCreada ? 'Ver mis reservas' : 'Cancelar'}
                    </button>
                    <button
                        onClick={handleReservar}
                        disabled={loading}
                        className="flex-1 bg-verde-principal hover:bg-verde-principal/90 text-blanco font-bold py-3 rounded-lg transition disabled:opacity-60"
                    >
                        {loading
                            ? 'Preparando pago...' : reservaCreada
                                ? 'Reintentar pago'
                                : 'Reservar y pagar'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

function Fila({ label, valor, destacado = false }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">{label}:</span>
            <span className={`text-sm ${destacado ? 'text-blanco font-bold text-lg' : 'text-blanco font-medium'}`}>
                {valor}
            </span>
        </div>
    );
}
