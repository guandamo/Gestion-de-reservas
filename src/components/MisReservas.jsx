import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

/**
 * Lista de reservas del usuario autenticado.
 * Refresca cuando cambia `refreshKey` (incrementar para forzar reload).
 */
export default function MisReservas({ refreshKey = 0 }) {
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await api.get('/reservations/my');
            setReservas(Array.isArray(data?.items) ? data.items : []);
        } catch (err) {
            setError(err.message || 'No se pudieron cargar tus reservas.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar, refreshKey]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Cargando tus reservas…
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg">
                {error}
            </div>
        );
    }

    if (reservas.length === 0) {
        return (
            <div className="bg-[#222222] border border-white/5 rounded-xl p-10 text-center">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-blanco font-semibold text-lg mb-1">
                    Aún no tenés reservas
                </h3>
                <p className="text-gray-400 text-sm">
                    Cuando reserves un turno, va a aparecer acá.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reservas.map((r) => (
                <ReservaCard key={r.id} reserva={r} />
            ))}
        </div>
    );
}

function ReservaCard({ reserva }) {
    const estilos = {
        PENDIENTE: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        CONFIRMADA: 'bg-green-500/20 text-green-300 border-green-500/30',
        CANCELADA: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    const estado = reserva.estado || 'PENDIENTE';
    const style = estilos[estado] || estilos.PENDIENTE;
    const labelEstado = {
        PENDIENTE: 'Pendiente de pago',
        CONFIRMADA: 'Confirmada',
        CANCELADA: 'Cancelada',
    }[estado] || estado;

    const fechaFormateada = formatearFecha(reserva.turno.fecha);

    return (
        <div className="bg-[#222222] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-blanco font-semibold">{reserva.cancha.nombre}</span>
                    {reserva.cancha.tipo && (
                        <span className="text-xs text-gray-400">· {reserva.cancha.tipo}</span>
                    )}
                </div>
                <div className="text-sm text-gray-300">
                    {fechaFormateada} · {reserva.turno.horaInicio} - {reserva.turno.horaFin}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-blanco font-bold">
                    ${Number(reserva.turno.precio).toLocaleString('es-AR')}
                </span>
                <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${style}`}
                >
                    {labelEstado}
                </span>
            </div>
        </div>
    );
}

function formatearFecha(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });
}
