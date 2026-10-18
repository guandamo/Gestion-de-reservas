import { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client.js';
import Modal from './Modal.jsx';

/**
 * Modal de confirmación de reserva.
 *
 * Renderiza como bottom sheet en mobile (<md) y como modal centrado en ≥md
 * gracias al wrapper compartido `Modal`.
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

    if (!turno || !cancha) return null;

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
        <Modal
            open={open}
            onClose={onClose}
            title="Confirmar reserva"
            loading={loading}
            footer={
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-blanco font-medium py-3 rounded-lg transition disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleReservar}
                        disabled={loading}
                        className="flex-1 bg-verde-principal hover:bg-verde-principal/90 text-blanco font-bold py-3 rounded-lg transition disabled:opacity-60"
                    >
                        {loading ? 'Reservando...' : 'Reservar y pagar'}
                    </button>
                </div>
            }
        >
            <div className="space-y-3">
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
                <div
                    role="alert"
                    className="mt-4 bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg text-center"
                >
                    {error}
                </div>
            )}
        </Modal>
    );
}

function Fila({ label, valor, destacado = false }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-gray-400 text-sm shrink-0">{label}:</span>
            <span className={`text-sm text-right ${destacado ? 'text-blanco font-bold text-lg' : 'text-blanco font-medium'}`}>
                {valor}
            </span>
        </div>
    );
}
