import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client.js';

export default function MisReservas({ refreshKey = 0 }) {
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState(null);
    const [cancelandoId, setCancelandoId] = useState(null);
    const [pagandoId, setPagandoId] = useState(null);

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

        // El botón "Cancelar" ejecuta directamente la acción de cancelación.
        // Antes aquí había un `window.confirm(...)` (diálogo nativo del
        // navegador) que pedía confirmación; se removió para que el handler
        // del botón se ejecute sin popups intermedios. La operación sigue
        // siendo idempotente y el backend decide qué hacer si la reserva
        // ya estaba cancelada (caso `ya_cancelada`).
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

    /**
     * "Pagar" desde Mis reservas: pide una preferencia NUEVA de MP para una
     * reserva que ya existe y sigue PENDIENTE, y redirige al checkout.
     *
     * El backend reutiliza el mismo `Pago` (upsert por idReserva) y **no**
     * toca `vencimientoAt`: el reloj que el usuario ve sigue siendo el de
     * cuando creó la reserva originalmente.
     *
     * Si el backend responde 409 ("venció"), el barrido periódico ya pasó la
     * reserva a CANCELADA; recargamos la lista para que se vea el estado
     * nuevo. Si la respuesta es cualquier otro error (red, 5xx), dejamos
     * el aviso sin tocar la lista.
     */
    async function pagar(reserva) {
        if (operacionEnCurso.current) return;
        if (!reserva?.vencimientoAt) {
            setAviso({
                tipo: 'error',
                texto: 'No se puede iniciar el pago de esta reserva.',
            });
            return;
        }

        // Defensa en el cliente: si la cuenta regresiva ya llegó a 0, no
        // seguimos. El backend igual rechazaría con 409, así que cortamos acá.
        if (new Date(reserva.vencimientoAt).getTime() <= Date.now()) {
            setAviso({
                tipo: 'error',
                texto: 'La reserva venció. Te recargamos la lista.',
            });
            await cargar();
            return;
        }

        operacionEnCurso.current = true;
        setPagandoId(reserva.id);
        setAviso(null);

        try {
            const pago = await api.post('/payments/preference', {
                idReserva: reserva.id,
            });

            const enlace = pago?.checkoutUrl;
            if (!enlace) {
                throw new Error('Mercado Pago no devolvió el enlace de pago.');
            }

            window.location.assign(enlace);
        } catch (err) {
            const mensaje = err?.message || 'No se pudo iniciar el pago.';

            // 409 = la reserva se venció mientras el usuario miraba la lista.
            // La sweep ya la pasó (o está por pasarla) a CANCELADA, así que
            // recargamos para reflejar el estado real.
            if (err?.status === 409) {
                setAviso({
                    tipo: 'error',
                    texto: `${mensaje} Te recargamos la lista.`,
                });
                await cargar();
            } else {
                setAviso({ tipo: 'error', texto: mensaje });
            }
        } finally {
            operacionEnCurso.current = false;
            setPagandoId(null);
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
                        disabled={loading || cancelandoId !== null || pagandoId !== null}
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
                    onPagar={pagar}
                    pagando={pagandoId === reserva.id}
                    bloqueado={loading || cancelandoId !== null || pagandoId !== null}
                />
            ))}
        </div>
    );
}

/**
 * Formatea milisegundos restantes como `mm:ss`.
 *
 * Si quedan más de 60 minutos (caso teórico: el usuario abandonó y volvió
 * días después con la misma reserva, lo cual no debería pasar porque la
 * sweep la cancela) devolvemos `mm:ss` con minutos grandes igual; el patrón
 * `mm` se corta a los 60 minutos y vuelve a contar, lo que es feo pero
 * honesto. En la práctica nunca veremos más de 03:00.
 */
function formatearRestante(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '00:00';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ReservaCard({
    reserva,
    onCancelar,
    cancelando,
    onPagar,
    pagando,
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

    // Cronómetro cliente: tick cada 1 s. La decisión "botón Pagar visible"
    // vive acá (no en el padre) para que reaccione a la cuenta regresiva
    // sin necesidad de recargar nada. El backend es la otra barrera.
    const [ahoraMs, setAhoraMs] = useState(() => Date.now());

    useEffect(() => {
        if (estado !== 'PENDIENTE' || !reserva.vencimientoAt) {
            return undefined;
        }
        const id = setInterval(() => setAhoraMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [estado, reserva.vencimientoAt]);

    const vencimientoMs = reserva.vencimientoAt
        ? new Date(reserva.vencimientoAt).getTime()
        : null;

    const msRestantes =
        vencimientoMs !== null && Number.isFinite(vencimientoMs)
            ? vencimientoMs - ahoraMs
            : null;

    const pendienteyVigente =
        estado === 'PENDIENTE' &&
        vencimientoMs !== null &&
        msRestantes !== null &&
        msRestantes > 0;

    // El reloj se ve aunque la reserva no sea PENDIENTE no tiene sentido;
    // queda fuera de la card. Sólo lo mostramos cuando todavía se puede
    // actuar sobre la reserva.
    const mostrarReloj = pendienteyVigente;

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

                {mostrarReloj && (
                    <p className="text-xs text-yellow-300/80 mt-1">
                        Se libera sola en {formatearRestante(msRestantes)}.
                    </p>
                )}
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

                {pendienteyVigente && (
                    <button
                        type="button"
                        onClick={() => onPagar(reserva)}
                        disabled={bloqueado}
                        className="text-sm font-medium px-3 py-2 rounded-lg border border-verde-principal/60 bg-verde-principal/10 text-verde-claro hover:bg-verde-principal/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {pagando ? 'Conectando con Mercado Pago…' : 'Pagar'}
                    </button>
                )}

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
