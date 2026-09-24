import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client.js';

export default function MisReservas({ refreshKey = 0 }) {
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState(null);
    const [cancelandoId, setCancelandoId] = useState(null);

    const operacionEnCurso = useRef(false);
    const ultimaCarga = useRef(0);

    const cargar = useCallback(async () => {
        const cargaId = ++ultimaCarga.current;

        try {
            setLoading(true);
            setError('');

            const data = await api.get('/reservations/my');

            if (cargaId !== ultimaCarga.current) return;

            setReservas(Array.isArray(data?.items) ? data.items : []);
        } catch (err) {
            if (cargaId !== ultimaCarga.current) return;

            setError(err.message || 'No se pudieron cargar tus reservas.');
        } finally {
            if (cargaId === ultimaCarga.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        cargar();

        return () => {
            ultimaCarga.current += 1;
        };
    }, [cargar, refreshKey]);

    async function cancelar(reserva) {
        if (operacionEnCurso.current) return;

        const confirmar = window.confirm(
            `¿Querés cancelar tu reserva de ${reserva.cancha.nombre} ` +
            `del ${formatearFecha(reserva.turno.fecha)} ` +
            `a las ${reserva.turno.horaInicio}?`
        );

        if (!confirmar) return;

        operacionEnCurso.current = true;
        setCancelandoId(reserva.id);
        setAviso(null);

        try {
            const resultado = await api.patch(
                `/reservations/${reserva.id}/cancel`
            );

            setReservas((actuales) =>
                actuales.map((item) =>
                    item.id === reserva.id
                        ? {
                            ...item,
                            estado: 'CANCELADA',
                            puedeCancelar: false,
                        }
                        : item
                )
            );

            setAviso({
                tipo: 'exito',
                texto: resultado.resultado === 'ya_cancelada'
                    ? 'La reserva ya estaba cancelada.'
                    : 'La reserva se canceló correctamente.',
            });
        } catch (err) {
            setAviso({
                tipo: 'error',
                texto: err.message || 'No se pudo cancelar la reserva.',
            });
        } finally {
            // También refrescar ante un rechazo: el backend podría
            // haber confirmado un pago encontrado en Mercado Pago.
            await cargar();
            operacionEnCurso.current = false;
            setCancelandoId(null);
        }
    }

    return (
        <div className="space-y-3">
            {aviso && (
                <div
                    role={aviso.tipo === 'error' ? 'alert' : 'status'}
                    className={`border text-sm p-3 rounded-lg ${
                        aviso.tipo === 'exito'
                            ? 'bg-green-500/20 border-green-500/50 text-green-300'
                            : 'bg-red-500/20 border-red-500/50 text-red-300'
                    }`}
                >
                    {aviso.texto}
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg"
                >
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={cargar}
                        disabled={loading || cancelandoId !== null}
                        className="mt-2 underline disabled:opacity-50"
                    >
                        Reintentar carga
                    </button>
                </div>
            )}

            {loading && (
                <div
                    role="status"
                    className="py-4 text-center text-gray-400 text-sm"
                >
                    Actualizando tus reservas...
                </div>
            )}

            {!loading && !error && reservas.length === 0 && (
                <div className="bg-[#222222] border border-white/5 rounded-xl p-10 text-center">
                    <h3 className="text-blanco font-semibold text-lg mb-1">
                        Aún no tenés reservas
                    </h3>
                    <p className="text-gray-400 text-sm">
                        Cuando reserves un turno, va a aparecer acá.
                    </p>
                </div>
            )}

            {reservas.map((reserva) => (
                <ReservaCard
                    key={reserva.id}
                    reserva={reserva}
                    onCancelar={cancelar}
                    cancelando={cancelandoId === reserva.id}
                    bloqueado={loading || cancelandoId !== null}
                />
            ))}
        </div>
    );
}

function ReservaCard({
    reserva,
    onCancelar,
    cancelando,
    bloqueado,
}) {
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

    return (
        <div className="bg-[#222222] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-blanco font-semibold">
                        {reserva.cancha.nombre}
                    </span>

                    {reserva.cancha.tipo && (
                        <span className="text-xs text-gray-400">
                            · {reserva.cancha.tipo}
                        </span>
                    )}
                </div>

                <div className="text-sm text-gray-300">
                    {formatearFecha(reserva.turno.fecha)}
                    {' · '}
                    {reserva.turno.horaInicio} - {reserva.turno.horaFin}
                </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-blanco font-bold">
                    ${Number(reserva.turno.precio).toLocaleString('es-AR')}
                </span>

                <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${style}`}
                >
                    {labelEstado}
                </span>

                {reserva.puedeCancelar && (
                    <button
                        type="button"
                        onClick={() => onCancelar(reserva)}
                        disabled={bloqueado}
                        className="text-sm font-medium px-3 py-2 rounded-lg border border-red-500/50 text-red-300 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {cancelando ? 'Verificando y cancelando...' : 'Cancelar'}
                    </button>
                )}
            </div>
        </div>
    );
}

function formatearFecha(fecha) {
    if (!fecha) return '—';

    const d = new Date(fecha);

    if (!Number.isFinite(d.getTime())) return '—';

    // Es una fecha de calendario almacenada a medianoche UTC.
    // Evita mostrar el día anterior en Argentina.
    return d.toLocaleDateString('es-AR', {
        timeZone: 'UTC',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });
}