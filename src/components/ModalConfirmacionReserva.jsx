import { useState, useEffect } from 'react';
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

    // Limpiar estado al abrir/cerrar
    useEffect(() => {
        if (open) {
            setLoading(false);
            setError('');
        }
    }, [open]);

    if (!open || !turno || !cancha) return null;

    const handleReservar = async () => {
        setError('');
        try {
            setLoading(true);
            const data = await api.post('/reservations', { idTurno: turno.id });
            onSuccess?.(data);
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 409) {
                    setError('Ese turno ya fue reservado por otro usuario.');
                } else if (err.status === 400) {
                    setError(err.message || 'No se puede reservar este turno.');
                } else if (err.status === 401) {
                    setError('Tu sesión expiró. Volvé a iniciar sesión.');
                } else {
                    setError(err.message || 'Error inesperado.');
                }
            } else {
                setError(err?.message || 'Error de red.');
            }
        } finally {
            setLoading(false);
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
            onClick={onClose}
        >
            <div
                className="bg-[#222222] rounded-2xl shadow-2xl max-w-md w-full border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-blanco text-lg font-bold">Confirmar reserva</h3>
                    <button
                        onClick={onClose}
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
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleReservar}
                        disabled={loading}
                        className="flex-1 bg-verde-principal hover:bg-verde-principal/90 text-blanco font-bold py-3 rounded-lg transition disabled:opacity-60"
                    >
                        {loading ? 'Reservando...' : 'Reservar y pagar'}
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
